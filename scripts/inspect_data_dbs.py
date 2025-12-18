import sqlite3
import os

def inspect(db_path):
    print(f"\n--- Inspecting {db_path} ---")
    if not os.path.exists(db_path):
        print("File does not exist.")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"Tables: {[t[0] for t in tables]}")
        
        for table in tables:
            t_name = table[0]
            try:
                cursor.execute(f"SELECT count(*) FROM {t_name}")
                count = cursor.fetchone()[0]
                print(f"  {t_name}: {count} rows")
                
                # Print schema
                cursor.execute(f"PRAGMA table_info({t_name})")
                cols = cursor.fetchall()
                col_names = [c[1] for c in cols]
                print(f"    Columns: {col_names}")
                
            except Exception as e:
                print(f"  Error reading {t_name}: {e}")
        conn.close()
    except Exception as e:
        print(f"Connection failed: {e}")

inspect("data/terminology.db")
inspect("data/global_patent_index.db")
