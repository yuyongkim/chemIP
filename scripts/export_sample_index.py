import sqlite3
import csv
import os
import sys

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DB_PATH = "data/uspto_index.db"
CSV_PATH = "data/uspto_index_sample.csv"

def export_sample():
    print(f"Connecting to {DB_PATH}...")
    try:
        # Connect in read-only mode to minimize locking
        conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True, timeout=10)
        cursor = conn.cursor()
        
        print("Fetching latest 100 records...")
        cursor.execute('''
            SELECT id, chem_id, patent_id, title, section, matched_term, file_path 
            FROM patent_index 
            ORDER BY id DESC 
            LIMIT 100
        ''')
        
        rows = cursor.fetchall()
        
        if not rows:
            print("No records found in database.")
            return

        print(f"Writing {len(rows)} records to {CSV_PATH}...")
        with open(CSV_PATH, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            # Write Header
            writer.writerow(['ID', 'ChemID', 'PatentID', 'Title', 'Section', 'MatchedTerm', 'FilePath'])
            # Write Data
            writer.writerows(rows)
            
        print("Export complete!")
        print(f"You can open '{CSV_PATH}' to inspect the data.")
        
    except sqlite3.OperationalError as e:
        print(f"Database error (likely locked): {e}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    export_sample()
