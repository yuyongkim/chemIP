import sqlite3
import os

db_path = "data/terminology.db"
print(f"Rebuilding FTS for {db_path}...")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # 1. Clear FTS table
    print("Clearing old FTS data...")
    cursor.execute("DELETE FROM chemical_terms_fts")
    
    # 2. Re-populate
    print("Populating FTS from chemical_terms...")
    cursor.execute('''
        INSERT INTO chemical_terms_fts(rowid, name, cas_no, description)
        SELECT id, name, cas_no, description FROM chemical_terms
    ''')
    
    conn.commit()
    print("FTS Rebuild Complete.")
    
    # 3. Optimize (optional but good)
    print("Optimizing FTS index...")
    cursor.execute("INSERT INTO chemical_terms_fts(chemical_terms_fts) VALUES('optimize')")
    conn.commit()
    print("Optimization Complete.")
    
    # 4. Verification
    cursor.execute("SELECT count(*) FROM chemical_terms_fts")
    cnt = cursor.fetchone()[0]
    print(f"New FTS Row Count: {cnt}")
    
    print("Running verification search for 'Benzene'...")
    cursor.execute("SELECT rowid, name FROM chemical_terms_fts WHERE chemical_terms_fts MATCH 'Benzene' LIMIT 5")
    res = cursor.fetchall()
    print("Matches:", res)

except Exception as e:
    print(f"Error: {e}")
    
conn.close()
