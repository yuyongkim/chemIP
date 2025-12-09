import sqlite3
import os
import sys

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.terminology_db import TerminologyDB

def check_keywords():
    term_db = TerminologyDB()
    keywords = term_db.get_all_keywords()
    term_db.close()
    
    print(f"Total keywords: {len(keywords)}")
    
    term_map = {}
    for item in keywords:
        if item['name']: term_map[item['name'].lower()] = item['chem_id']
        if item['cas_no']: term_map[item['cas_no']] = item['chem_id']
        
    print(f"Unique terms in map: {len(term_map)}")
    
    # Analyze lengths
    lengths = [len(t) for t in term_map.keys()]
    print(f"Min length: {min(lengths)}")
    print(f"Max length: {max(lengths)}")
    print(f"Avg length: {sum(lengths)/len(lengths):.2f}")
    
    # Show short keywords
    short_terms = [t for t in term_map.keys() if len(t) < 4]
    print(f"\nShort terms (<4 chars): {len(short_terms)}")
    print(sorted(short_terms)[:50])

if __name__ == "__main__":
    check_keywords()
