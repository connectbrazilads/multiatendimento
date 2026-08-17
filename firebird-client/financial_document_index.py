from __future__ import annotations

import hashlib
import json
import logging
import re
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, Iterable

from pypdf import PdfReader


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
    """Keep separators as spaces so unrelated numeric fields are not joined."""
    return re.sub(r"[^0-9]", " ", text)


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

    def scan(self) -> dict[str, int]:
        seen: set[str] = set()
        added = updated = errors = 0
        pending: list[tuple[str, Path, Any, bool]] = []
        for root in self.roots:
            if not root.exists() or not root.is_dir():
                logging.warning("Pasta financeira indisponivel: %s", root)
                continue
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
            except Exception as exc:
                errors += 1
                logging.warning("Falha ao percorrer a pasta financeira %s: %s", root, exc)

        # PDF extraction is mostly file I/O. A small worker pool significantly reduces
        # the first scan over UNC shares without saturating the customer's server.
        with ThreadPoolExecutor(max_workers=4, thread_name_prefix="financial-pdf") as executor:
            jobs = {executor.submit(_extract_pdf, path): (key, path, stat, existed) for key, path, stat, existed in pending}
            completed = 0
            for future in as_completed(jobs):
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

        configured_roots = [str(root).casefold() for root in self.roots]
        for key in list(self.entries):
            if any(key.startswith(root) for root in configured_roots) and key not in seen:
                del self.entries[key]

        self.last_scan = datetime.now().isoformat(timespec="seconds")
        self._save()
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
                if not re.search(rf"(?<!\d){re.escape(expected_number)}(?!\d)", compact):
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
