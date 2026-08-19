from __future__ import annotations

import hashlib
import json
import logging
import re
import threading
import unicodedata
from concurrent.futures import ThreadPoolExecutor, wait
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, Callable, Iterable

from pypdf import PdfReader


# How often (in seconds) to emit a "still working" progress update while
# waiting on PDF extraction. Without this, a slow/unresponsive network share
# can leave the UI silent for many minutes with no way to tell a genuine hang
# apart from a slow-but-healthy scan.
HEARTBEAT_SECONDS = 5
# How many files to walk/stat between progress updates during the listing
# phase (also mostly network I/O against UNC shares).
LISTING_PROGRESS_EVERY = 200

# The manual "Indexar agora" button and the periodic background monitor each
# build their own FinancialDocumentIndex instance, so a plain instance lock
# would not stop them from scanning the same folder at the same time (which
# would read every PDF twice over the network for no benefit). Instead we
# keep one lock per cache file: whoever gets there first scans for real, and
# whoever is waiting simply reloads the cache that scan just wrote and finds
# nothing left to do.
_scan_locks: dict[str, threading.Lock] = {}
_scan_locks_guard = threading.Lock()


def _lock_for(cache_path: Path) -> threading.Lock:
    key = str(cache_path.resolve())
    with _scan_locks_guard:
        lock = _scan_locks.get(key)
        if lock is None:
            lock = threading.Lock()
            _scan_locks[key] = lock
        return lock


DOCUMENT_LABELS = {
    "invoice": "Nota/Fatura",
    "statement": "Demonstrativo",
    "boleto": "Boleto",
}


def _normalized(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(char for char in text if not unicodedata.combining(char))
    return re.sub(r"\s+", " ", text).strip().upper()


def _digits(value: Any) -> str:
    return re.sub(r"\D+", "", str(value or ""))


def _date_br(value: Any) -> str | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y")
    text = str(value).strip()
    for candidate in (text[:10], text):
        try:
            return datetime.fromisoformat(candidate).strftime("%d/%m/%Y")
        except ValueError:
            pass
    match = re.search(r"(\d{2})/(\d{2})/(\d{4})", text)
    return match.group(0) if match else None


def _money_variants(value: Any) -> set[str]:
    try:
        amount = Decimal(str(value or 0)).quantize(Decimal("0.01"))
    except Exception:
        return set()
    rendered = f"{amount:,.2f}"
    br = rendered.replace(",", "_").replace(".", ",").replace("_", ".")
    return {br, br.replace(".", ""), f"R$ {br}"}


def _document_type(text: str) -> str | None:
    if "DEMONSTRATIVO DO FATURAMENTO" in text or "DEMONSTRATIVO" in text:
        return "statement"
    if "FICHA DE COMPENSACAO" in text or "NOSSO NUMERO" in text or "RECIBO DO PAGADOR" in text:
        return "boleto"
    if (
        "FATURA DE LOCACAO" in text
        or "NOTA FISCAL" in text
        or "DANFE" in text
        or "NFS-E" in text
        or "NFSE" in text
    ):
        return "invoice"
    return None


def _extract_pdf(path: Path) -> dict[str, Any]:
    reader = PdfReader(str(path))
    raw_text = "\n".join(page.extract_text() or "" for page in reader.pages)
    text = _normalized(raw_text)
    cnpjs = set(re.findall(r"(?<!\d)\d{14}(?!\d)", _digits_with_boundaries(raw_text)))
    cnpjs.update(_digits(item) for item in re.findall(r"\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}", raw_text))
    return {
        "documentType": _document_type(text),
        "text": text[:250_000],
        "cnpjs": sorted(cnpjs),
        "pages": len(reader.pages),
    }


def _digits_with_boundaries(text: str) -> str:
    """Keep separators as spaces so unrelated numeric fields are not joined,
    but first collapse thousand-separator-style dots between digit groups
    (e.g. a DANFE printing "Nº: 048.134.210") into one contiguous run.
    Otherwise a document number that is legitimately dot-grouped in the
    official layout would never match anything: each group would be read as
    three unrelated numbers instead of one.
    """
    collapsed = re.sub(r"(?<=\d)\.(?=\d)", "", text)
    return re.sub(r"[^0-9]", " ", collapsed)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


@dataclass
class MatchResult:
    path: Path
    document_type: str
    score: int
    sha256: str


class FinancialDocumentIndex:
    def __init__(self, roots: Iterable[str], cache_path: Path, own_cnpj: str = ""):
        self.roots = [Path(value.strip()) for value in roots if str(value).strip()]
        self.cache_path = cache_path
        self.own_cnpj = _digits(own_cnpj)
        self.entries: dict[str, dict[str, Any]] = {}
        self.last_scan: str | None = None
        self._load()

    def _load(self) -> None:
        if not self.cache_path.exists():
            return
        try:
            data = json.loads(self.cache_path.read_text(encoding="utf-8"))
            self.entries = data.get("entries", {}) if isinstance(data, dict) else {}
            self.last_scan = data.get("lastScan") if isinstance(data, dict) else None
        except Exception as exc:
            logging.warning("Indice financeiro ignorado por estar invalido: %s", exc)

    def _save(self) -> None:
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.cache_path.with_suffix(self.cache_path.suffix + ".tmp")
        temporary.write_text(
            json.dumps({"lastScan": self.last_scan, "entries": self.entries}, ensure_ascii=False),
            encoding="utf-8",
        )
        temporary.replace(self.cache_path)

    def _reporter(self, on_progress: Callable[[str], None] | None) -> Callable[[str], None]:
        def report(message: str) -> None:
            if on_progress:
                try:
                    on_progress(message)
                except Exception:
                    logging.exception("Falha ao reportar progresso da indexacao financeira")

        return report

    def scan(self, on_progress: Callable[[str], None] | None = None) -> dict[str, int]:
        report = self._reporter(on_progress)
        lock = _lock_for(self.cache_path)
        if not lock.acquire(blocking=False):
            report("Ja existe uma indexacao em andamento (agente ou botao); aguardando ela terminar...")
            lock.acquire()
            # The scan we waited on may have just rewritten the shared cache file;
            # reload it so this call sees that work instead of redoing it.
            self._load()
        try:
            return self._scan_locked(report)
        finally:
            lock.release()

    def scan_if_idle(self, on_progress: Callable[[str], None] | None = None) -> dict[str, int] | None:
        """Best-effort top-up used by interactive, on-demand lookups (a document
        opened from the CRM). It must never make a user wait behind a scan that
        is already running in the background or from the manual button -- on a
        large folder that can take many minutes, far longer than any reasonable
        request timeout. Returns the scan stats, or None if it was skipped
        because another scan already holds the lock.
        """
        lock = _lock_for(self.cache_path)
        if not lock.acquire(blocking=False):
            return None
        try:
            return self._scan_locked(self._reporter(on_progress))
        finally:
            lock.release()

    def _scan_locked(self, report: Callable[[str], None]) -> dict[str, int]:
        seen: set[str] = set()
        added = updated = errors = 0
        pending: list[tuple[str, Path, Any, bool]] = []
        for root in self.roots:
            if not root.exists() or not root.is_dir():
                logging.warning("Pasta financeira indisponivel: %s", root)
                report(f"Pasta indisponivel: {root}")
                continue
            report(f"Verificando pasta {root}...")
            try:
                pdfs = root.rglob("*.pdf")
                for path in pdfs:
                    key = str(path.absolute()).casefold()
                    seen.add(key)
                    try:
                        stat = path.stat()
                        current = self.entries.get(key)
                        if current and current.get("size") == stat.st_size and current.get("mtimeNs") == stat.st_mtime_ns:
                            continue
                        pending.append((key, path, stat, bool(current)))
                    except Exception as exc:
                        errors += 1
                        logging.warning("Nao foi possivel consultar %s: %s", path, exc)
                    if len(seen) % LISTING_PROGRESS_EVERY == 0:
                        report(f"Verificando pasta {root}: {len(seen)} PDF(s) encontrados ate agora...")
            except Exception as exc:
                errors += 1
                logging.warning("Falha ao percorrer a pasta financeira %s: %s", root, exc)
                report(f"Falha ao acessar {root}: {exc}")

        total_pending = len(pending)
        if total_pending:
            report(f"{len(seen)} PDF(s) encontrados, {total_pending} novo(s) ou alterado(s). Lendo conteudo...")
        else:
            report(f"{len(seen)} PDF(s) encontrados, nenhum novo ou alterado desde a ultima indexacao.")

        # PDF extraction is mostly file I/O. A small worker pool significantly reduces
        # the first scan over UNC shares without saturating the customer's server.
        with ThreadPoolExecutor(max_workers=4, thread_name_prefix="financial-pdf") as executor:
            jobs = {executor.submit(_extract_pdf, path): (key, path, stat, existed) for key, path, stat, existed in pending}
            remaining = set(jobs)
            completed = 0
            last_reported = 0
            # `wait(..., timeout=...)` instead of `as_completed(jobs)` so a single slow
            # or unresponsive file (common on flaky UNC shares) can never leave the GUI
            # silent indefinitely: every HEARTBEAT_SECONDS we emit progress even if
            # nothing new finished, and files that do finish are recorded immediately.
            while remaining:
                done, remaining = wait(remaining, timeout=HEARTBEAT_SECONDS)
                if not done:
                    report(
                        f"Lendo PDFs: {completed}/{total_pending} concluido(s). "
                        "Alguns arquivos na rede estao demorando mais que o normal, mas o processo continua."
                    )
                    last_reported = completed
                    continue
                for future in done:
                    key, path, stat, existed = jobs[future]
                    try:
                        extracted = future.result()
                        self.entries[key] = {
                            "path": str(path),
                            "size": stat.st_size,
                            "mtimeNs": stat.st_mtime_ns,
                            **extracted,
                        }
                        if existed:
                            updated += 1
                        else:
                            added += 1
                    except Exception as exc:
                        errors += 1
                        logging.warning("Nao foi possivel indexar %s: %s", path, exc)
                    completed += 1
                    if completed % 100 == 0:
                        self.last_scan = datetime.now().isoformat(timespec="seconds")
                        self._save()
                # Files can finish faster than HEARTBEAT_SECONDS on a healthy network;
                # throttle so a fast scan doesn't flood the GUI/log with an update per file.
                if completed - last_reported >= 20 or not remaining:
                    report(f"Lendo PDFs: {completed}/{total_pending} concluido(s)...")
                    last_reported = completed

        configured_roots = [str(root).casefold() for root in self.roots]
        for key in list(self.entries):
            if any(key.startswith(root) for root in configured_roots) and key not in seen:
                del self.entries[key]

        self.last_scan = datetime.now().isoformat(timespec="seconds")
        self._save()
        report("Indexacao concluida.")
        return {"total": len(self.entries), "added": added, "updated": updated, "errors": errors}

    def find(self, document_type: str, context: dict[str, Any]) -> MatchResult | None:
        customer_document = _digits(context.get("customer_cnpj") or context.get("customer_cpf"))
        invoice_number = _digits(context.get("invoice_number"))
        statement_number = _digits(context.get("seqdemonstrativo"))
        emission = _date_br(context.get("dtemissaonfs") or context.get("dtemissaorec"))
        due = _date_br(context.get("dtvectorec"))
        amount_variants = _money_variants(context.get("valreceita"))
        matches: list[tuple[int, Path]] = []

        for item in self.entries.values():
            if item.get("documentType") != document_type:
                continue
            path = Path(item.get("path") or "")
            if not path.exists():
                continue
            text = str(item.get("text") or "")
            compact = _digits_with_boundaries(text)
            score = 0

            if customer_document:
                if customer_document not in item.get("cnpjs", []) and customer_document not in _digits(text):
                    continue
                score += 50

            expected_number = statement_number if document_type == "statement" else invoice_number
            if expected_number:
                # O Firebird guarda o numero sem zeros a esquerda, mas o layout
                # oficial (DANFE/NFS-e) normalmente imprime com padding fixo
                # (ex.: "048.134.210"). Sem o "0*" aqui, o mesmo numero nunca
                # bateria so por causa do zero a mais no documento impresso.
                if not re.search(rf"(?<!\d)0*{re.escape(expected_number)}(?!\d)", compact):
                    continue
                score += 50

            if emission and emission in text:
                score += 8
            if due and due in text:
                score += 12
            if amount_variants and any(value in text for value in amount_variants):
                score += 10

            if score >= 100:
                matches.append((score, path))

        if not matches:
            return None
        matches.sort(key=lambda item: (item[0], item[1].stat().st_mtime_ns), reverse=True)
        best_score = matches[0][0]
        best_paths = [path for score, path in matches if score == best_score]
        unique: dict[str, Path] = {}
        for path in best_paths:
            unique.setdefault(_sha256(path), path)
        if len(unique) > 1:
            raise ValueError(
                f"Mais de um {DOCUMENT_LABELS.get(document_type, 'documento')} oficial corresponde ao titulo. Revise a pasta monitorada."
            )
        sha, path = next(iter(unique.items()))
        return MatchResult(path=path, document_type=document_type, score=best_score, sha256=sha)


def friendly_filename(document_type: str, context: dict[str, Any]) -> str:
    customer = re.sub(r"[^A-Za-z0-9 ._-]+", " ", str(context.get("customer_name") or "CLIENTE"))
    customer = re.sub(r"\s+", " ", customer).strip()[:70]
    if document_type == "statement":
        number = context.get("seqdemonstrativo") or context.get("invoice_number") or context.get("seqreceita")
        prefix = "DEMONSTRATIVO"
    elif document_type == "boleto":
        number = context.get("invoice_number") or context.get("seqreceita")
        prefix = "BOLETO NF"
    else:
        number = context.get("invoice_number") or context.get("seqreceita")
        prefix = "NF"
    safe_number = re.sub(r"[^A-Za-z0-9_-]+", "", str(number or "SEM-NUMERO"))
    return f"{prefix} {safe_number} - {customer or 'CLIENTE'}.pdf"
