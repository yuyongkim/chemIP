import sqlite3
import os

db_path = "terminology.db"
print(f"Checking DB: {os.path.abspath(db_path)}")

if not os.path.exists(db_path):
    print("ERROR: terminology.db file not found!")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print("Tables:", tables)

# Check row counts
for table in tables:
    table_name = table[0]
    try:
        cursor.execute(f"SELECT count(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        print(f"Table '{table_name}' has {count} rows.")
    except Exception as e:
        print(f"Error counting '{table_name}': {e}")

# Check sample data if chemicals exists
if ('chemicals',) in tables:
    print("\nSample data from chemicals:")
    cursor.execute("SELECT * FROM chemicals LIMIT 5")
    rows = cursor.fetchall()
    for row in rows:
        print(row)

conn.close()
