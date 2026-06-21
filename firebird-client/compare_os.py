import firebirdsql
import json
import datetime

def default_serializer(obj):
    if isinstance(obj, datetime.datetime):
        return obj.isoformat()
    if isinstance(obj, datetime.date):
        return obj.isoformat()
    if isinstance(obj, datetime.time):
        return obj.isoformat()
    return str(obj)

try:
    conn = firebirdsql.connect(host='26.119.90.177', database=r'C:\ILUX\dados\ILUXBASE.FDB', user='SYSDBA', password='iluxbdib', port=3050, charset='WIN1252')
    cur = conn.cursor()
    
    cur.execute("select trim(rf.rdb$field_name) from rdb$relation_fields rf where rf.rdb$relation_name = 'IXLOS' order by rf.rdb$field_position")
    cols = [r[0] for r in cur.fetchall()]
    
    cur.execute("select * from IXLOS where SEQOS in (17778, 17770)")
    
    rows = cur.fetchall()
    for row in rows:
        os_data = dict(zip(cols, row))
        print("SEQOS", os_data['SEQOS'])
        print(json.dumps(os_data, default=default_serializer, indent=2))
        print("-" * 40)
        
    conn.close()
except Exception as e:
    print('Error:', e)
