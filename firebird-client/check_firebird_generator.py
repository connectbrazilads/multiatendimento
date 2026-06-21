import os
from pathlib import Path
import firebirdsql
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")

def run():
    host = os.getenv("FIREBIRD_HOST", "127.0.0.1")
    port = int(os.getenv("FIREBIRD_PORT", 3050))
    database = os.getenv("FIREBIRD_DATABASE", "")
    user = os.getenv("FIREBIRD_USER", "SYSDBA")
    password = os.getenv("FIREBIRD_PASSWORD", "")
    charset = os.getenv("FIREBIRD_CHARSET", "WIN1252")

    print(f"Connecting to Firebird at {host}:{port} - Database: {database}...")
    con = firebirdsql.connect(
        host=host,
        port=port,
        database=database,
        user=user,
        password=password,
        charset=charset
    )
    
    try:
        cur = con.cursor()
        
        # 1. Check triggers on IXLOS
        print("\n--- TRIGGERS ON IXLOS ---")
        cur.execute("""
            select rdb$trigger_name, rdb$trigger_source, rdb$trigger_type, rdb$trigger_inactive
            from rdb$triggers
            where rdb$relation_name = 'IXLOS'
        """)
        triggers = cur.fetchall()
        for trig in triggers:
            name = trig[0].strip()
            inactive = trig[3]
            print(f"Trigger: {name} (Inactive: {inactive})")
            if trig[1]:
                print(f"Source:\n{trig[1]}")
            print("-" * 40)
            
        # 2. Check generators
        print("\n--- GENERATORS ---")
        cur.execute("""
            select rdb$generator_name
            from rdb$generators
            where rdb$system_flag = 0
        """)
        generators = cur.fetchall()
        for gen in generators:
            name = gen[0].strip()
            print(f"Generator: {name}")

        # 3. Check column definition for SEQOS
        print("\n--- COLUMN DEFINITION FOR SEQOS ---")
        cur.execute("""
            select f.rdb$field_name, f.rdb$validation_source, f.rdb$null_flag
            from rdb$relation_fields f
            where f.rdb$relation_name = 'IXLOS' and f.rdb$field_name = 'SEQOS'
        """)
        col = cur.fetchone()
        if col:
            print(f"Field: {col[0].strip()} (Null Flag: {col[2]})")
            if col[1]:
                print(f"Validation:\n{col[1]}")
        else:
            print("SEQOS field not found in relation fields!")

    except Exception as e:
        print("Error:", e)
    finally:
        con.close()

if __name__ == '__main__':
    run()
