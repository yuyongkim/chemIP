import sys
import os
import xml.etree.ElementTree as ET

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.api.kosha_msds_adapter import KoshaMsdsAdapter
from backend.core.terminology_db import TerminologyDB

def parse_xml_response(xml_string):
    try:
        root = ET.fromstring(xml_string)
        items = []
        for item in root.findall('.//item'):
            data = {}
            for child in item:
                data[child.tag] = child.text
            items.append(data)
        return items
    except Exception as e:
        print(f"Error parsing XML: {e}")
        return []

def seed_essentials():
    print("Seeding essential chemicals...")
    adapter = KoshaMsdsAdapter()
    db = TerminologyDB()
    
    # List of keywords to seed
    keywords = ["benzene", "벤젠", "toluene", "톨루엔", "황산", "sulfuric acid"]
    
    total_added = 0
    for kw in keywords:
        print(f"Fetching '{kw}'...")
        # Increase limit for Benzene to show more results as user requested
        rows_to_fetch = 300 if "benzene" in kw.lower() or "벤젠" in kw else 50
        
        try:
            # Try search condition 0 (Name)
            # We fetch up to rows_to_fetch (max 100 per page)
            collected = 0
            page = 1
            while collected < rows_to_fetch:
                response = adapter.search_msds(kw, page_no=page, num_of_rows=100, search_condition=0)
                if isinstance(response, dict) and 'data' in response:
                    items = parse_xml_response(response['data'])
                    if not items:
                        break
                        
                    print(f"  Page {page}: Found {len(items)} items.")
                    for item in items:
                        db.upsert_chemical_term(item)
                    
                    collected += len(items)
                    total_added += len(items)
                    page += 1
                else:
                    break
        except Exception as e:
            print(f"  Error: {e}")
            
    print(f"Seeding complete. Added {total_added} terms.")
    db.close()

if __name__ == "__main__":
    seed_essentials()
