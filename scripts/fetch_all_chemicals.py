import sys
import os
import time
import xml.etree.ElementTree as ET
from tqdm import tqdm

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.api.kosha_msds_adapter import KoshaMsdsAdapter
from backend.core.terminology_db import TerminologyDB

def parse_xml_response(xml_string):
    try:
        root = ET.fromstring(xml_string)
        items = []
        # Check for items
        for item in root.findall('.//item'):
            data = {}
            for child in item:
                data[child.tag] = child.text
            items.append(data)
        
        # Get total count
        total_count_node = root.find('.//totalCount')
        total_count = int(total_count_node.text) if total_count_node is not None else 0
        
        return items, total_count
    except Exception as e:
        print(f"Error parsing XML: {e}")
        return [], 0

def fetch_all_chemicals():
    adapter = KoshaMsdsAdapter()
    db = TerminologyDB()
    
    # Seeds to cover most chemicals
    # We use a mix of Korean syllables and Alphanumeric
    # This is a heuristic. Ideally we want a "List All" but we have to search.
    # Common starting characters for chemical names.
    seeds = [
        "가", "나", "다", "라", "마", "바", "사", "아", "자", "차", "카", "타", "파", "하",
        "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", 
        "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
        "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"
    ]
    
    # Or maybe just iterate through a comprehensive list of syllables if needed.
    # For now, let's try these seeds.
    
    total_chemicals_collected = 0
    
    print(f"Starting collection with {len(seeds)} seeds...")
    
    for seed in seeds:
        print(f"\n[Seed: {seed}] Processing...")
        page = 1
        while True:
            # Fetch page
            try:
                # searchCnd=0 (Korean Name) for Korean seeds, but for English seeds maybe we need searchCnd?
                # Actually, searchCnd=0 might search in Korean Name field.
                # If we search "A" in Korean Name, does it work?
                # Let's assume searchCnd=0 searches the name field which might contain English too?
                # Or we should switch searchCnd based on seed type.
                
                cnd = 0 # Default to Korean Name
                # If seed is ASCII and not digit, maybe searchCnd=0 still works if names have English?
                # But wait, searchCnd=4 is EN No. searchCnd=1 is CAS No.
                # There is no "English Name" search condition explicitly listed in user's text (only EN No).
                # But chemNameKor might contain English?
                # Let's stick to cnd=0 for now.
                
                response = adapter.search_msds(seed, page_no=page, num_of_rows=100, search_condition=cnd)
                
                if isinstance(response, dict) and 'data' in response:
                    items, total_count = parse_xml_response(response['data'])
                    
                    if not items:
                        break
                        
                    # Save to DB
                    for item in items:
                        db.upsert_chemical_term(item)
                    
                    collected_in_page = len(items)
                    total_chemicals_collected += collected_in_page
                    print(f"  Page {page}: Fetched {collected_in_page} items. (Total in DB: {db.get_stats()})")
                    
                    # Check if we reached the end for this seed
                    # If we got fewer rows than requested, we are done
                    if collected_in_page < 100:
                        break
                    
                    # Safety break
                    if page > 100: # Limit to 10000 items per seed to prevent infinite loops
                        print("  Reached page limit for this seed.")
                        break
                        
                    page += 1
                    time.sleep(0.2) # Rate limit
                else:
                    print(f"  Error fetching page {page}: {response}")
                    break
            except Exception as e:
                print(f"  Exception on page {page}: {e}")
                break
                
    print(f"\nCollection Complete. Total items in DB: {db.get_stats()}")
    db.close()

if __name__ == "__main__":
    fetch_all_chemicals()
