import sqlite3
import time
import os
import sys

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DB_PATH = "data/uspto_index.db"

def monitor():
    if not os.path.exists(DB_PATH):
        print(f"Waiting for database {DB_PATH} to be created...")
        while not os.path.exists(DB_PATH):
            time.sleep(2)
    
    print(f"Monitoring indexing progress in {DB_PATH}...")
    print("Press Ctrl+C to stop monitoring.")
    print("-" * 50)
    
    last_count = -1
    start_time = time.time()
    
    try:
        while True:
            try:
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                
                # Get total count
                cursor.execute("SELECT COUNT(*) FROM patent_index")
                count = cursor.fetchone()[0]
                
                # Get recent entry
                cursor.execute("SELECT title, section, snippet FROM patent_index ORDER BY id DESC LIMIT 1")
                recent = cursor.fetchone()
                
                conn.close()
                
                if count != last_count:
                    elapsed = time.time() - start_time
                    rate = count / elapsed if elapsed > 0 else 0
                    
                    title = recent[0] if recent else 'None'
                    section = recent[1] if recent and recent[1] else 'Unknown'
                    snippet = recent[2][:30] + "..." if recent and recent[2] else ''
                    
                    print(f"\r[Indexed: {count:,}] Rate: {rate:.1f}/sec | Latest: {title[:20]}... ({section}) {snippet}", end="", flush=True)
                    last_count = count
                
                time.sleep(2)
                
            except sqlite3.OperationalError:
                # DB might be locked momentarily
                pass
            except Exception as e:
                print(f"\nError: {e}")
                time.sleep(2)
                
    except KeyboardInterrupt:
        print("\nMonitoring stopped.")

if __name__ == "__main__":
    monitor()
