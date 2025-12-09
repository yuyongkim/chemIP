import sys
import os
import time

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.api.kosha_msds_adapter import KoshaMsdsAdapter

def test_fetch_batch():
    adapter = KoshaMsdsAdapter()
    
    # Test 1: Korean Name Search (searchCnd=0)
    keyword_kor = "벤젠"
    print(f"\n[Test 1] Searching for '{keyword_kor}' (Korean Name)...")
    result = adapter.search_msds(keyword_kor, search_condition=0)
    print(f"Result: {str(result)[:500]}...")
    
    # Test 2: CAS No Search (searchCnd=1)
    keyword_cas = "71-43-2"
    print(f"\n[Test 2] Searching for '{keyword_cas}' (CAS No)...")
    result = adapter.search_msds(keyword_cas, search_condition=1)
    print(f"Result: {str(result)[:500]}...")

if __name__ == "__main__":
    test_fetch_batch()
