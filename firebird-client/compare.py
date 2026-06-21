import firebirdsql

con = firebirdsql.connect(
    host="26.119.90.177",
    database=r"C:\ILUX\dados\ILUXBD.FDB",
    user="SYSDBA",
    password="iluxbdib",
    charset="WIN1252"
)
cur = con.cursor()

cur.execute("SELECT * FROM IXLOS WHERE SEQOS IN (17770, 17773) ORDER BY SEQOS")
desc = [d[0] for d in cur.description]
rows = cur.fetchall()

if len(rows) == 2:
    row1 = dict(zip(desc, rows[0])) # 17770 (Good)
    row2 = dict(zip(desc, rows[1])) # 17773 (Bad)
    
    print(f"{'COLUMN':<25} | {'17770 (Good)':<30} | {'17773 (Bad)':<30}")
    print("-" * 90)
    for col in desc:
        val1 = str(row1[col]).strip() if row1[col] is not None else 'NULL'
        val2 = str(row2[col]).strip() if row2[col] is not None else 'NULL'
        if val1 != val2:
            print(f"{col:<25} | {val1:<30} | {val2:<30}")
else:
    print("Could not find both rows. Rows found: ", len(rows))

con.close()
