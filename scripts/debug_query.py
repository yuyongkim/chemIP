import sqlite3
import os

db_path = "data/terminology.db"
print(f"Querying {db_path}...")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Check random sample
print("\n--- Top 5 Sample Rows ---")
cursor.execute("SELECT * FROM chemical_terms LIMIT 5")
for row in cursor.fetchall():
    print(row)

# 2. Check strict match
print("\n--- LIKE '%benzene%' Search ---")
cursor.execute("SELECT * FROM chemical_terms WHERE name LIKE '%benzene%' LIMIT 5")
rows = cursor.fetchall()
if rows:
    for row in rows:
        print(row)
else:
    print("No match found for %benzene%")

# 3. Check what IS in there - maybe Korean names?
print("\n--- LIKE '%벤젠%' Search ---")
cursor.execute("SELECT * FROM chemical_terms WHERE name LIKE '%벤젠%' LIMIT 5")
rows = cursor.fetchall()
if rows:
    for row in rows:
        print(row)
else:
    print("No match found for %벤젠%")

conn.close()
