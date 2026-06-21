import firebirdsql
try:
    conn = firebirdsql.connect(host='26.119.90.177', database=r'C:\ILUX\dados\ILUXBASE.FDB', user='SYSDBA', password='iluxbdib', port=3050, charset='WIN1252')
    cur = conn.cursor()
    cur.execute('select first 5 * from IXLOSDEFEITOTP')
    for row in cur.fetchall():
        print(row)
    conn.close()
except Exception as e:
    print('Error:', e)
