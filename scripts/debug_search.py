from backend.core.terminology_db import TerminologyDB
import os

print(f"Checking DB integrity...")
try:
    db = TerminologyDB()
    print(f"DB Path: {db.db_path}")
    
    print("Running test search 'benzene'...")
    res = db.search_chemicals('benzene')
    print("Search Result:", res)
    
except Exception as e:
    import traceback
    traceback.print_exc()
