import sys
import os
import xml.etree.ElementTree as ET

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.api.kosha_msds_adapter import KoshaMsdsAdapter

def probe():
    adapter = KoshaMsdsAdapter()
    print("Fetching 'benzene' from KOSHA...")
    resp = adapter.search_msds("benzene", page_no=1, num_of_rows=1)
    
    if isinstance(resp, dict) and 'data' in resp:
        xml_string = resp['data']
        # print("Raw XML:", xml_string)
        
        root = ET.fromstring(xml_string)
        items = root.findall('.//item')
        if items:
            print("\nFields in first item:")
            for child in items[0]:
                print(f"  {child.tag}: {child.text}")
        else:
            print("No items found.")
            
    else:
        print("Error:", resp)

if __name__ == "__main__":
    probe()
