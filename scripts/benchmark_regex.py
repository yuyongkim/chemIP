import time
import regex as re
import sys
import os

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.terminology_db import TerminologyDB

def benchmark():
    print("Loading keywords...")
    term_db = TerminologyDB()
    keywords = term_db.get_all_keywords()
    term_db.close()
    
    # Extract terms
    terms = set()
    for item in keywords:
        if item['name']: terms.add(item['name'])
        if item['cas_no']: terms.add(item['cas_no'])
    
    term_list = sorted(list(terms), key=len, reverse=True)
    print(f"Unique terms: {len(term_list)}")
    
    print("Compiling regex...")
    start = time.time()
    # Escape and join
    pattern_str = r'(?i)\b(?:' + '|'.join(re.escape(t) for t in term_list) + r')\b'
    pattern = re.compile(pattern_str)
    print(f"Compilation took: {time.time() - start:.4f}s")
    
    # Test Search
    content = """
    This is a test patent for Sodium Chloride and 76-05-1.
    It should not match 1976-05-11 but should match Phosphoric Acid.
    Also testing some random text to see speed.
    """ * 100 # Make it longer
    
    print("Searching...")
    start = time.time()
    matches = pattern.findall(content)
    duration = time.time() - start
    print(f"Search took: {duration:.4f}s")
    print(f"Matches found: {len(matches)}")
    print(f"Sample matches: {matches[:5]}")

if __name__ == "__main__":
    benchmark()
