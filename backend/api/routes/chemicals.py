from fastapi import APIRouter, HTTPException, Query
import xml.etree.ElementTree as ET
from backend.core.terminology_db import TerminologyDB
from backend.api.kosha_msds_adapter import KoshaMsdsAdapter

router = APIRouter()

adapter = KoshaMsdsAdapter()

def parse_msds_xml(xml_string):
    try:
        if not xml_string: return []
        root = ET.fromstring(xml_string)
        # The structure is usually <response><body><items><item>...fields...</item></items></body></response>
        
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

@router.get("")
def search_chemicals(
    q: str = Query(..., min_length=1, description="Search query for chemical name or CAS No"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    db = TerminologyDB()
    print(f"DEBUG: search_chemicals called with q={q}")
    offset = (page - 1) * limit
    result = db.search_chemicals(q, limit, offset)
    return result

@router.get("/autocomplete")
def autocomplete_chemicals(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(5, ge=1, le=20)
):
    db = TerminologyDB()
    # Reuse search logic but optimized for small payload if needed
    # For now, full search is fast enough for SQLite
    result = db.search_chemicals(q, limit=limit, offset=0)
    return result["items"]

@router.get("/{chem_id}")
def get_chemical_details(chem_id: str):
    db = TerminologyDB()
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
