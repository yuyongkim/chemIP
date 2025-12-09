import sys
import os
import time
import xml.etree.ElementTree as ET
from tqdm import tqdm

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.api.kosha_msds_adapter import KoshaMsdsAdapter
from backend.core.terminology_db import TerminologyDB

def fetch_details_for_existing():
    adapter = KoshaMsdsAdapter()
    db = TerminologyDB()
    
    # Get all chem_ids from DB
    # We stored chem_id in description as "KOSHA_ID:xxxxxx"
    cursor = db.conn.cursor()
    cursor.execute("SELECT description, name FROM chemical_terms WHERE description LIKE 'KOSHA_ID:%'")
    rows = cursor.fetchall()
    
    print(f"Found {len(rows)} chemicals in DB. Starting detail fetch...")
    
    for row in tqdm(rows):
        desc = row[0]
        chem_name = row[1]
        chem_id = desc.split(":")[1]
        
        # Fetch all 16 sections? Or just critical ones?
        # User said "All needed". Let's try fetching all but maybe prioritize.
        # Fetching 16 requests per chemical is slow. 
        # Let's fetch Section 1 (Product), 2 (Hazards), 11 (Toxicity), 15 (Regulations) first as priority.
        # Or just loop 1-16.
        
        # Fetch all 16 sections as requested by user.
        sections = list(range(1, 17))
        
        for seq in sections:
            try:
                # Check if already exists? (Optimization)
                # cursor.execute("SELECT 1 FROM msds_details WHERE chem_id=? AND section_seq=?", (chem_id, seq))
                # if cursor.fetchone(): continue
                
                resp = adapter.get_msds_detail(chem_id, section_seq=seq)
                if resp['status'] == 'success':
                    # Parse XML to get clean content if possible, or store raw XML
                    # Storing raw XML for now to ensure no data loss
                    db.upsert_msds_detail(chem_id, seq, f"Section {seq}", resp['data'])
                
                time.sleep(0.1) # Rate limit
            except Exception as e:
                print(f"Error fetching {chem_id} section {seq}: {e}")
        
    print("Detail fetch complete.")
    stats = db.get_stats()
    print(f"DB Stats: {stats}")
    db.close()

if __name__ == "__main__":
    fetch_details_for_existing()
