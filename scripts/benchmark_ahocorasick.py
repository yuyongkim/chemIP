import time
import ahocorasick
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
    
    print(f"Total keywords: {len(keywords)}")
    
    print("Building Automaton...")
    start = time.time()
    A = ahocorasick.Automaton()
    for item in keywords:
        term = item['name'] if item['name'] else item['cas_no']
        if term:
            # Store (chem_id, term) as value
            A.add_word(term.lower(), (item['chem_id'], term))
            
    A.make_automaton()
    print(f"Build took: {time.time() - start:.4f}s")
    
    # Test Search
    content = """
    This is a test patent for Sodium Chloride and 76-05-1.
    It should not match 1976-05-11 but should match Phosphoric Acid.
    Also testing some random text to see speed.
    """ * 1000 # Make it 10x larger (200KB)
    
    print("Searching...")
    start = time.time()
    
    matches = []
    content_lower = content.lower()
    
    for end_index, (chem_id, original_term) in A.iter(content_lower):
        start_index = end_index - len(original_term) + 1
        
        # Boundary Check
        # Check char before
        if start_index > 0:
            char_before = content_lower[start_index - 1]
            if char_before.isalnum() or char_before == '-': # Assuming - is part of word for chemicals?
                continue
                
        # Check char after
        if end_index < len(content_lower) - 1:
            char_after = content_lower[end_index + 1]
            if char_after.isalnum() or char_after == '-':
                continue
                
        matches.append((chem_id, original_term, start_index))
        
    duration = time.time() - start
    print(f"Search took: {duration:.4f}s")
    print(f"Matches found: {len(matches)}")
    # Sample check
    print(f"Sample matches: {matches[:5]}")

if __name__ == "__main__":
    benchmark()
