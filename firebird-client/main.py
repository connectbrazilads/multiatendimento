from __future__ import annotations

import argparse
import json
import logging
from logging.handlers import RotatingFileHandler
import os
import re
from decimal import Decimal
import sys
import time
from collections.abc import Iterator
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

import firebirdsql
import requests
from dotenv import load_dotenv


if getattr(sys, "frozen", False):
    ROOT = Path(sys.executable).resolve().parent
else:
    ROOT = Path(__file__).resolve().parent


def digits(value: Any) -> str | None:
    if value is None:
        return None
    text = re.sub(r"\D+", "", str(value))
    return text or None


def first_non_empty(*values: Any) -> str | None:
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return None


def parse_firebird_timestamp(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat(timespec="seconds")

    text = str(value).strip()
    match = re.match(r"(\d{2})/(\d{2})/(\d{4}) (\d{2}):(\d{2}):(\d{2})", text)
    if not match:
        return None

    dd, mm, yyyy, hh, mi, ss = match.groups()
    return datetime(
        int(yyyy), int(mm), int(dd), int(hh), int(mi), int(ss)
    ).isoformat(timespec="seconds")


def parse_firebird_timestamp_to_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value

    text = str(value).strip()
    match = re.match(r"(\d{2})/(\d{2})/(\d{4}) (\d{2}):(\d{2}):(\d{2})", text)
    if not match:
        return None

    dd, mm, yyyy, hh, mi, ss = match.groups()
    return datetime(int(yyyy), int(mm), int(dd), int(hh), int(mi), int(ss))


def normalize_phone(*values: Any) -> str | None:
    for value in values:
        phone = digits(value)
        if phone:
            # Keep only numeric content; backend will normalize if needed.
            return phone
    return None


def compose_brazil_phone(area_code: Any, number: Any) -> str | None:
    area = digits(area_code)
    local = digits(number)
    if not local:
        return None
    if area:
        return f"{area}{local}"
    return local


def json_safe(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat(timespec="seconds")
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, bytes):
        return value.hex()
    return value


@dataclass
class AppConfig:
    firebird_host: str = "127.0.0.1"
    firebird_port: int = 3050
    firebird_database: str = ""
    firebird_user: str = "SYSDBA"
    firebird_password: str = ""
    firebird_charset: str = "WIN1252"
    crm_base_url: str = ""
    crm_tenant_slug: str = ""
    crm_sync_token: str = ""
    sync_interval_seconds: int = 300
    batch_size: int = 250
    state_file: Path = field(default_factory=lambda: ROOT / "state.json")
    log_dir: Path = field(default_factory=lambda: ROOT / "logs")
    log_file: Path = field(default_factory=lambda: ROOT / "logs" / "client.log")
    log_max_bytes: int = 5 * 1024 * 1024
    log_backup_count: int = 5
    log_level: str = "INFO"

    @classmethod
    def from_env(cls) -> "AppConfig":
        load_dotenv(ROOT / ".env")

        def env_int(name: str, default: int) -> int:
            try:
                return int(os.getenv(name, str(default)))
            except ValueError:
                return default

        def resolve_path(value: str, default: Path) -> Path:
            path = Path(value) if value else default
            if not path.is_absolute():
                path = ROOT / path
            return path

        state_file = Path(os.getenv("STATE_FILE", "state.json"))
        if not state_file.is_absolute():
            state_file = ROOT / state_file

        log_dir = resolve_path(os.getenv("LOG_DIR", "logs"), ROOT / "logs")
        log_file = resolve_path(os.getenv("LOG_FILE", "logs/client.log"), ROOT / "logs" / "client.log")

        return cls(
            firebird_host=os.getenv("FIREBIRD_HOST", "127.0.0.1"),
            firebird_port=env_int("FIREBIRD_PORT", 3050),
            firebird_database=os.getenv("FIREBIRD_DATABASE", ""),
            firebird_user=os.getenv("FIREBIRD_USER", "SYSDBA"),
            firebird_password=os.getenv("FIREBIRD_PASSWORD", ""),
            firebird_charset=os.getenv("FIREBIRD_CHARSET", "WIN1252"),
            crm_base_url=os.getenv("CRM_BASE_URL", "").rstrip("/"),
            crm_tenant_slug=os.getenv("CRM_TENANT_SLUG", ""),
            crm_sync_token=os.getenv("CRM_SYNC_TOKEN", ""),
            sync_interval_seconds=env_int("SYNC_INTERVAL_SECONDS", 300),
            batch_size=env_int("BATCH_SIZE", 250),
            state_file=state_file,
            log_dir=log_dir,
            log_file=log_file,
            log_max_bytes=env_int("LOG_MAX_BYTES", 5 * 1024 * 1024),
            log_backup_count=env_int("LOG_BACKUP_COUNT", 5),
            log_level=os.getenv("LOG_LEVEL", "INFO"),
        )


class StateStore:
    def __init__(self, path: Path):
        self.path = path
        self.data: dict[str, Any] = {
            "cursors": {
                "contacts": 0,
                "equipments": 0,
                "contracts": 0,
                "serviceOrders": 0,
            },
            "last_sync_at": None,
        }
        self.load()

    def load(self) -> None:
        if not self.path.exists():
            return

        try:
            self.data.update(json.loads(self.path.read_text(encoding="utf-8")))
        except Exception as exc:
            logging.warning("Falha ao ler state %s: %s", self.path, exc)

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(
            json.dumps(self.data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def get_cursor(self, key: str) -> int:
        return int(self.data.get("cursors", {}).get(key, 0) or 0)

    def set_cursor(self, key: str, value: int) -> None:
        self.data.setdefault("cursors", {})[key] = int(value)

    def set_last_sync_at(self, value: str | None) -> None:
        self.data["last_sync_at"] = value


class CRMClient:
    def __init__(self, config: AppConfig):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Content-Type": "application/json",
                "x-firebird-token": config.crm_sync_token,
            }
        )

    def push(self, entity: str, records: list[dict[str, Any]]) -> dict[str, Any]:
        if not records:
            return {"ok": True, "stats": {"received": 0}}

        url = f"{self.config.crm_base_url}/api/integrations/firebird/push"
        response = self.session.post(
            url,
            json={
                "tenantSlug": self.config.crm_tenant_slug,
                "entity": entity,
                "records": records,
            },
            timeout=120,
        )
        response.raise_for_status()
        return response.json()


class FirebirdRepository:
    def __init__(self, config: AppConfig):
        self.config = config

    def connect(self):
        if not self.config.firebird_database:
            raise RuntimeError("FIREBIRD_DATABASE não configurado.")

        return firebirdsql.connect(
            host=self.config.firebird_host,
            port=self.config.firebird_port,
            database=self.config.firebird_database,
            user=self.config.firebird_user,
            password=self.config.firebird_password,
            charset=self.config.firebird_charset,
        )

    def _rows(self, sql: str, params: tuple[Any, ...]) -> Iterator[dict[str, Any]]:
        con = self.connect()
        try:
            cur = con.cursor()
            cur.execute(sql, params)
            columns = [desc[0].lower() for desc in cur.description]

            while True:
                batch = cur.fetchmany(self.config.batch_size)
                if not batch:
                    break
                for row in batch:
                    yield dict(zip(columns, row))
        finally:
            try:
                con.close()
            except Exception:
                pass

    def inspect_schema(self, sample_rows: int = 3) -> dict[str, Any]:
        con = self.connect()
        try:
            cur = con.cursor()
            cur.execute(
                """
                select
                    trim(rdb$relation_name) as relation_name,
                    case
                      when rdb$view_blr is null then 'TABLE'
                      else 'VIEW'
                    end as relation_type
                from rdb$relations
                where coalesce(rdb$system_flag, 0) = 0
                order by rdb$relation_name
                """
            )
            relations = [
                {"name": str(row[0]).strip(), "type": str(row[1]).strip()}
                for row in cur.fetchall()
            ]

            cur.execute(
                """
                select
                    trim(rf.rdb$relation_name) as relation_name,
                    trim(rf.rdb$field_name) as field_name,
                    f.rdb$field_type,
                    f.rdb$field_length,
                    f.rdb$field_scale,
                    rf.rdb$field_position
                from rdb$relation_fields rf
                join rdb$fields f on f.rdb$field_name = rf.rdb$field_source
                join rdb$relations r on r.rdb$relation_name = rf.rdb$relation_name
                where coalesce(r.rdb$system_flag, 0) = 0
                order by rf.rdb$relation_name, rf.rdb$field_position
                """
            )
            columns_by_relation: dict[str, list[dict[str, Any]]] = {}
            for row in cur.fetchall():
                relation_name = str(row[0]).strip()
                columns_by_relation.setdefault(relation_name, []).append(
                    {
                        "name": str(row[1]).strip(),
                        "typeCode": row[2],
                        "length": row[3],
                        "scale": row[4],
                        "position": row[5],
                    }
                )

            samples: dict[str, list[dict[str, Any]]] = {}
            for relation in relations:
                name = relation["name"]
                try:
                    cur.execute(f'select first {int(sample_rows)} * from "{name}"')
                    field_names = [desc[0].strip() for desc in cur.description]
                    samples[name] = [
                        {field_names[index]: json_safe(value) for index, value in enumerate(row)}
                        for row in cur.fetchall()
                    ]
                except Exception as exc:
                    samples[name] = [{"error": str(exc)}]

            return {
                "generatedAt": datetime.now().isoformat(timespec="seconds"),
                "relations": relations,
                "columns": columns_by_relation,
                "samples": samples,
            }
        finally:
            try:
                con.close()
            except Exception:
                pass

    def fetch_contacts(self, cursor: int) -> Iterator[dict[str, Any]]:
        sql = """
            select
                CDCLIENTE, NMCLIENTE, FANTASIA, CPF, CNPJ, CIDADE, UF, CEP,
                ENDERECO, COMPLEMENTO, BAIRRO, DDD, FONE1, FONE2, CELULAR, FAX, EMAIL, CONTATO,
                INCLUSAO, ATUALIZADO
            from ICLIENTES
            where CDCLIENTE > ?
            order by CDCLIENTE
        """
        yield from self._rows(sql, (cursor,))

    def fetch_equipments(self, cursor: int) -> Iterator[dict[str, Any]]:
        sql = """
            select
                eq.CDEQUIPAMENTO, eq.CDCLIENTE, eq.CDPRODUTO, eq.SERIE, eq.MODELO, eq.FABRICANTE,
                eq.ENDERECO, eq.LOCALINSTAL, eq.DEPARTAMENTO, eq.CONTATO, eq.FONE, eq.DDD, eq.CIDADE, eq.UF,
                eq.INCLUSAO, eq.ATUALIZADO,
                p.NMPRODUTO as PRODUCT_NAME
            from IXLEQUIPAMENTO eq
            left join IPRODUTO p on p.CDPRODUTO = eq.CDPRODUTO
            where eq.CDEQUIPAMENTO > ?
            order by eq.CDEQUIPAMENTO
        """
        yield from self._rows(sql, (cursor,))

    def fetch_contracts(self, cursor: int) -> Iterator[dict[str, Any]]:
        sql = """
            select
                SEQCONTRATO, NRCONTRATO, CDCLIENTE, STATUS, DTCONTRATOINI, DTCONTRATOFIN,
                TIPOCONTRATO, VALOR_TOTAL_CONTRATO, TFATENDIMENTO, TF_BLOQUEIA_OS,
                INCLUSAO, ATUALIZADO
            from IXLCONTRATOS
            where SEQCONTRATO > ?
            order by SEQCONTRATO
        """
        yield from self._rows(sql, (cursor,))

    def fetch_service_orders(self, cursor: int) -> Iterator[dict[str, Any]]:
        sql = """
            select
                os.CDCLIENTE, os.NMCLIENTE, os.CDEQUIPAMENTO, os.SEQOS,
                os.DTINCLUSAO, os.HRINCLUSAO, os.DTATENDIMENTO, os.HRATENDIMENTO, os.DTFECHAMENTO,
                tp.NMOSTP, st.NMSTATUS, os.STATUS, os.NMSUPORTET, os.OBSDEFEITOCLI, os.OBSDEFEITOATS,
                os.DEPARTAMENTO, os.LOCALINSTAL, os.CIDADE, os.UF, os.ENDERECO, os.CEP,
                os.DDD, os.FONE, os.CELULAR, os.EMAIL,
                eq.CDPRODUTO as CDPRODUTOE, eq.SERIE, eq.MODELO as MODELOE, eq.FABRICANTE
            from IXLOS os
            left join IXLOSTP tp on tp.CDOSTP = os.CDOSTP
            left join IXLOSSTATUS st on st.CDSTATUS = os.CDSTATUS
            left join IXLEQUIPAMENTO eq on eq.CDEQUIPAMENTO = os.CDEQUIPAMENTO
            where os.SEQOS > ?
            order by os.SEQOS
        """
        yield from self._rows(sql, (cursor,))


def normalize_contact(record: dict[str, Any]) -> dict[str, Any]:
    external_id = str(record["cdcliente"]).strip()
    phone = normalize_phone(
        compose_brazil_phone(record.get("ddd"), record.get("celular")),
        compose_brazil_phone(record.get("ddd"), record.get("fone1")),
        record.get("celular"),
        record.get("fone1"),
        record.get("fone2"),
    ) or f"FB-{external_id}"

    return {
        "externalId": external_id,
        "cdCliente": external_id,
        "name": first_non_empty(record.get("nmcliente"), record.get("fantasia")) or f"Cliente {external_id}",
        "fantasyName": first_non_empty(record.get("fantasia")),
        "phone": phone,
        "email": first_non_empty(record.get("email")),
        "cpfCnpj": first_non_empty(record.get("cpf"), record.get("cnpj")),
        "address": first_non_empty(record.get("endereco"), record.get("complemento")),
        "neighborhood": first_non_empty(record.get("bairro")),
        "city": first_non_empty(record.get("cidade")),
        "state": first_non_empty(record.get("uf")),
        "zipCode": first_non_empty(record.get("cep")),
        "contact": first_non_empty(record.get("contato")),
        "updatedAt": parse_firebird_timestamp(record.get("atualizado")),
        "inclusionAt": parse_firebird_timestamp(record.get("inclusao")),
        "raw": record,
    }


def normalize_equipment(record: dict[str, Any]) -> dict[str, Any]:
    external_id = str(record["cdequipamento"]).strip()
    client_external_id = str(record["cdcliente"]).strip() if record.get("cdcliente") is not None else None

    return {
        "externalId": external_id,
        "clientExternalId": client_external_id,
        "clientName": None,
        "name": first_non_empty(record.get("modelo"), record.get("fabricante")) or f"Equipamento {external_id}",
        "model": first_non_empty(record.get("modelo")) or f"Equipamento {external_id}",
        "manufacturer": first_non_empty(record.get("fabricante")),
        "serialNumber": first_non_empty(record.get("serie")),
        "type": first_non_empty(record.get("product_name"), record.get("cdproduto")),
        "sector": first_non_empty(record.get("departamento"), record.get("localinstal")),
        "installLocation": first_non_empty(record.get("localinstal")),
        "address": first_non_empty(record.get("endereco")),
        "city": first_non_empty(record.get("cidade")),
        "state": first_non_empty(record.get("uf")),
        "contact": first_non_empty(record.get("contato")),
        "phone": compose_brazil_phone(record.get("ddd"), record.get("fone")) or normalize_phone(record.get("fone")),
        "contractExternalId": first_non_empty(record.get("seqcontrato")),
        "assetTag": first_non_empty(record.get("patrimonio")),
        "inactive": first_non_empty(record.get("tfinativo")),
        "updatedAt": parse_firebird_timestamp(record.get("atualizado")),
        "inclusionAt": parse_firebird_timestamp(record.get("inclusao")),
        "raw": record,
    }


def normalize_contract(record: dict[str, Any]) -> dict[str, Any]:
    external_id = str(record["seqcontrato"]).strip()
    return {
        "externalId": external_id,
        "clientExternalId": str(record["cdcliente"]).strip() if record.get("cdcliente") is not None else None,
        "contractNumber": first_non_empty(record.get("nrcontrato")),
        "status": first_non_empty(record.get("status")),
        "contractType": first_non_empty(record.get("tipocontrato")),
        "value": record.get("valortotal_contrato") if "valortotal_contrato" in record else record.get("valor_total_contrato"),
        "startsAt": record.get("dtcontratoini"),
        "endsAt": record.get("dtcontratofin"),
        "updatedAt": parse_firebird_timestamp(record.get("atualizado")),
        "inclusionAt": parse_firebird_timestamp(record.get("inclusao")),
        "raw": record,
    }


def normalize_service_order(record: dict[str, Any]) -> dict[str, Any]:
    external_id = str(record["seqos"]).strip()
    client_external_id = str(record["cdcliente"]).strip() if record.get("cdcliente") is not None else None
    equipment_external_id = str(record["cdequipamento"]).strip() if record.get("cdequipamento") is not None else None

    return {
        "externalId": external_id,
        "clientExternalId": client_external_id,
        "clientName": first_non_empty(record.get("nmcliente")),
        "equipmentExternalId": equipment_external_id,
        "equipmentModel": first_non_empty(record.get("modeloe")),
        "manufacturer": first_non_empty(record.get("fabricante")),
        "serialNumber": first_non_empty(record.get("serie")),
        "status": first_non_empty(record.get("nmstatus")),
        "nmSuporteT": first_non_empty(record.get("nmsuportet")),
        "defect": first_non_empty(record.get("obsdefeitocli"), record.get("nmdefeito"), record.get("causa"), record.get("sintoma")),
        "action": first_non_empty(record.get("acao")),
        "observacao": first_non_empty(record.get("observacao"), record.get("obsdefeitoats"), record.get("nmostp")),
        "resolvedAt": parse_firebird_timestamp(record.get("dtatendimento")),
        "updatedAt": parse_firebird_timestamp(record.get("dtatendimento")) or parse_firebird_timestamp(record.get("dtinclusao")),
        "address": first_non_empty(record.get("endereco")),
        "city": first_non_empty(record.get("cidade")),
        "state": first_non_empty(record.get("uf")),
        "zipCode": first_non_empty(record.get("cep")),
        "sector": first_non_empty(record.get("departamento"), record.get("localinstal")),
        "phone": compose_brazil_phone(record.get("ddd"), record.get("fone")) or normalize_phone(record.get("fone"), record.get("celular")),
        "raw": record,
    }


def sync_entity(repo: FirebirdRepository, crm: CRMClient, state: StateStore, entity: str, batch_size: int) -> None:
    cursor_key = entity
    cursor = state.get_cursor(cursor_key)
    rows: list[dict[str, Any]] = []
    total_sent = 0
    max_cursor = cursor

    if entity == "contacts":
        iterator = repo.fetch_contacts(cursor)
        normalizer = normalize_contact
    elif entity == "equipments":
        iterator = repo.fetch_equipments(cursor)
        normalizer = normalize_equipment
    elif entity == "contracts":
        iterator = repo.fetch_contracts(cursor)
        normalizer = normalize_contract
    elif entity == "serviceOrders":
        iterator = repo.fetch_service_orders(cursor)
        normalizer = normalize_service_order
    else:
        raise ValueError(f"Entity desconhecida: {entity}")

    for raw in iterator:
        rows.append(normalizer(raw))

        raw_id = raw.get("cdcliente") or raw.get("cdequipamento") or raw.get("seqcontrato") or raw.get("seqos")
        if raw_id is not None:
            max_cursor = max(max_cursor, int(raw_id))

        if len(rows) >= batch_size:
            crm.push(entity, rows)
            total_sent += len(rows)
            logging.info("%s: enviado lote de %s registros", entity, len(rows))
            rows.clear()
            state.set_cursor(cursor_key, max_cursor)
            state.set_last_sync_at(datetime.now().isoformat(timespec="seconds"))
            state.save()

    if rows:
        crm.push(entity, rows)
        total_sent += len(rows)
        logging.info("%s: enviado lote final de %s registros", entity, len(rows))
        rows.clear()
        state.set_cursor(cursor_key, max_cursor)
        state.set_last_sync_at(datetime.now().isoformat(timespec="seconds"))
        state.save()

    logging.info("%s: sincronização concluída, %s registros enviados", entity, total_sent)


def run_cycle(config: AppConfig, state: StateStore, full: bool = False) -> None:
    repo = FirebirdRepository(config)
    crm = CRMClient(config)

    if full:
        state.data["cursors"] = {
            "contacts": 0,
            "equipments": 0,
        }
        state.save()

    state.data["batch_size"] = config.batch_size

    for entity in ["contacts", "equipments"]:
        logging.info("Iniciando sincronização de %s", entity)
        sync_entity(repo, crm, state, entity, config.batch_size)


def inspect_schema(config: AppConfig) -> Path:
    repo = FirebirdRepository(config)
    report = repo.inspect_schema()
    output_path = ROOT / "schema-report.json"
    output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    logging.info("Relatorio do schema salvo em %s", output_path)
    return output_path


def configure_logging(config: AppConfig) -> None:
    config.log_dir.mkdir(parents=True, exist_ok=True)
    config.log_file.parent.mkdir(parents=True, exist_ok=True)

    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, config.log_level.upper(), logging.INFO))
    root_logger.handlers.clear()

    formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    root_logger.addHandler(stream_handler)

    file_handler = RotatingFileHandler(
        config.log_file,
        maxBytes=config.log_max_bytes,
        backupCount=config.log_backup_count,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)


def validate_config(config: AppConfig) -> None:
    required = {
        "FIREBIRD_DATABASE": config.firebird_database,
        "CRM_BASE_URL": config.crm_base_url,
        "CRM_TENANT_SLUG": config.crm_tenant_slug,
        "CRM_SYNC_TOKEN": config.crm_sync_token,
    }
    missing = [name for name, value in required.items() if not value]
    if missing:
        raise RuntimeError(f"Configuração ausente: {', '.join(missing)}")


def validate_firebird_config(config: AppConfig) -> None:
    missing = []
    if not config.firebird_database:
        missing.append("FIREBIRD_DATABASE")
    if missing:
        raise RuntimeError(f"Configuracao ausente: {', '.join(missing)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Firebird to CRM sync client")
    parser.add_argument("--once", action="store_true", help="Executa apenas um ciclo de sincronização")
    parser.add_argument("--full", action="store_true", help="Força ressincronização completa")
    parser.add_argument("--inspect-schema", action="store_true", help="Gera schema-report.json com tabelas, colunas e amostras")
    args = parser.parse_args()

    config = AppConfig.from_env()
    configure_logging(config)
    if args.inspect_schema:
        validate_firebird_config(config)
        inspect_schema(config)
        return

    validate_config(config)

    state = StateStore(config.state_file)

    if args.once:
        run_cycle(config, state, full=args.full)
        return

    logging.info("Client iniciado. Intervalo: %ss", config.sync_interval_seconds)
    while True:
        try:
            run_cycle(config, state, full=args.full)
        except KeyboardInterrupt:
            raise
        except Exception as exc:
            logging.exception("Falha na sincronização: %s", exc)
        time.sleep(max(30, config.sync_interval_seconds))


if __name__ == "__main__":
    main()
