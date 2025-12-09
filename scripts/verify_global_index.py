import sqlite3
import os
import sys

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DB_PATH = "data/global_patent_index.db"

def verify_index():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # 1. Total Count
        cursor.execute("SELECT COUNT(*) FROM patent_index")
        total_count = cursor.fetchone()[0]
        print(f"Total Records: {total_count:,}")

        # 2. Jurisdiction Distribution
        print("\nRecords by Jurisdiction:")
        cursor.execute("SELECT jurisdiction, COUNT(*) FROM patent_index GROUP BY jurisdiction")
        rows = cursor.fetchall()
        for jurisdiction, count in rows:
            print(f"  - {jurisdiction}: {count:,}")

        # 3. Sample Data
        print("\nSample Data (Top 3):")
        cursor.execute("SELECT jurisdiction, patent_id, title, matched_term FROM patent_index LIMIT 3")
        rows = cursor.fetchall()
        for row in rows:
            print(f"  [{row[0]}] {row[1]} - {row[2]} (Term: {row[3]})")

    except Exception as e:
        print(f"Error querying database: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    verify_index()
