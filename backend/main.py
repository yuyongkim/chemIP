from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

print(f"LOADING BACKEND FROM: {__file__}")
print(f"CWD: {os.getcwd()}")

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.terminology_db import TerminologyDB

app = FastAPI(title="ChemIP Platform API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = TerminologyDB()

@app.get("/")
def read_root():
    return {"message": "Welcome to ChemIP Platform API"}

@app.get("/api/chemicals")
def search_chemicals(
    q: str = Query(..., min_length=1, description="Search query for chemical name or CAS No"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    print(f"DEBUG: search_chemicals called with q={q}")
    offset = (page - 1) * limit
    result = db.search_chemicals(q, limit, offset)
    return result

@app.get("/api/chemicals/autocomplete")
def autocomplete_chemicals(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(5, ge=1, le=20)
):
    # Reuse search logic but optimized for small payload if needed
    # For now, full search is fast enough for SQLite
    result = db.search_chemicals(q, limit=limit, offset=0)
    return result["items"]


import xml.etree.ElementTree as ET

def parse_msds_xml(xml_string):
    try:
        if not xml_string: return []
        root = ET.fromstring(xml_string)
        # The structure is usually <response><body><items><item>...fields...</item></items></body></response>
        # Or sometimes just fields directly if we stored the inner part?
        # We stored resp['data'] which is the full XML response.
        
        items = []
        # Find all 'item' tags
        for item in root.findall('.//item'):
            item_data = {}
            for child in item:
                item_data[child.tag] = child.text
            items.append(item_data)
        return items
    except Exception as e:
        print(f"XML Parse Error: {e}")
        return []

from backend.api.kosha_msds_adapter import KoshaMsdsAdapter

adapter = KoshaMsdsAdapter()

@app.get("/api/chemicals/{chem_id}")
def get_chemical_details(chem_id: str):
    details = db.get_msds_details_by_chem_id(chem_id)
    
    # If no details found (or incomplete), fetch from API on demand
    if not details:
        print(f"Details for {chem_id} not found in DB. Fetching from API...")
        # Section Titles Mapping
        SECTION_TITLES = {
            1: "Chemical Product and Company Identification",
            2: "Hazards Identification",
            3: "Composition/Information on Ingredients",
            4: "First Aid Measures",
            5: "Fire Fighting Measures",
            6: "Accidental Release Measures",
            7: "Handling and Storage",
            8: "Exposure Controls/Personal Protection",
            9: "Physical and Chemical Properties",
            10: "Stability and Reactivity",
            11: "Toxicological Information",
            12: "Ecological Information",
            13: "Disposal Considerations",
            14: "Transport Information",
            15: "Regulatory Information",
            16: "Other Information"
        }

        # Fetch all 16 sections
        for seq in range(1, 17):
            try:
                resp = adapter.get_msds_detail(chem_id, section_seq=seq)
                if resp['status'] == 'success':
                    # Save to DB with descriptive title
                    title = SECTION_TITLES.get(seq, f"Section {seq}")
                    db.upsert_msds_detail(chem_id, seq, title, resp['data'])
            except Exception as e:
                print(f"Error fetching section {seq}: {e}")
        
        # Re-fetch from DB
        details = db.get_msds_details_by_chem_id(chem_id)

    parsed_sections = []
    for section in details:
        # Parse the XML content
        parsed_content = parse_msds_xml(section['content'])
        parsed_sections.append({
            "section_seq": section['section_seq'],
            "section_name": section['section_name'],
            "content": parsed_content
        })
        
    return {"chem_id": chem_id, "sections": parsed_sections}



@app.get("/api/patents")
def search_patents(q: str):
    """
    Search patents by keyword (KIPRIS)
    """
    from backend.api.patent_fetcher import PatentFetcher
    fetcher = PatentFetcher()
    results = fetcher.search_patents(q)
    return {"query": q, "results": results}

@app.get("/api/uspto/{chem_id}")
def search_uspto(chem_id: str):
    """
    Search local USPTO index by chemical ID
    """
    from backend.api.uspto_adapter import UsptoAdapter
    adapter = UsptoAdapter()
    results = adapter.search_patents_by_chem_id(chem_id)
    return {"chem_id": chem_id, "results": results}

@app.get("/api/global/patents/{chem_id}")
def search_global_patents(chem_id: str):
    """
    Search global patent index (USPTO, EPO, WIPO, etc.) by chemical ID
    """
    from backend.api.global_patent_adapter import GlobalPatentAdapter
    adapter = GlobalPatentAdapter()
    results = adapter.search_patents_by_chem_id(chem_id)
    return {"chem_id": chem_id, "results": results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
