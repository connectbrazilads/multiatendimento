import os
from pathlib import Path
import firebirdsql
from dotenv import load_dotenv

ROOT = Path(r"c:\Projetos\Sistema Multiatendimento\firebird-client")
load_dotenv(ROOT / ".env")

host = os.getenv("FIREBIRD_HOST", "127.0.0.1")
port = int(os.getenv("FIREBIRD_PORT", 3050))
database = os.getenv("FIREBIRD_DATABASE", "")
user = os.getenv("FIREBIRD_USER", "SYSDBA")
password = os.getenv("FIREBIRD_PASSWORD", "")
charset = os.getenv("FIREBIRD_CHARSET", "WIN1252")

try:
    conn = firebirdsql.connect(
        host=host,
        port=port,
        database=database,
        user=user,
        password=password,
        charset=charset
    )
    cur = conn.cursor()
    cur.execute("""
        select trim(rf.rdb$field_name) as field_name
        from rdb$relation_fields rf
        where rf.rdb$relation_name = 'IXLOS'
        order by rf.rdb$field_position
    """)
    for row in cur.fetchall():
        print(row[0])
    conn.close()
except Exception as e:
    print("Error:", e)
