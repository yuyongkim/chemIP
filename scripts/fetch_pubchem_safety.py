"""
Fetch English MSDS-equivalent safety data from PubChem.
Stores GHS classification, hazard statements, and safety info in English.

Usage: python scripts/fetch_pubchem_safety.py
"""
import sqlite3
import requests
import time
import re
import os
import json

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "terminology.db")

PUBCHEM_PUG_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/{cid}/JSON"
PUBCHEM_CAS_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{cas}/cids/JSON"


def get_cid_from_cas(cas_no: str) -> int | None:
    """Get PubChem CID from CAS number."""
    try:
        r = requests.get(PUBCHEM_CAS_URL.format(cas=cas_no), timeout=10)
        if r.status_code == 200:
            data = r.json()
            cids = data.get("IdentifierList", {}).get("CID", [])
            return cids[0] if cids else None
    except Exception:
        pass
    return None


def extract_ghs_info(pug_data: dict) -> dict:
    """Extract GHS hazard/safety info from PubChem PUG View data."""
    result = {
        "ghs_classification": [],
        "hazard_statements": [],
        "precautionary_statements": [],
        "signal_word": "",
        "pictograms": [],
    }
    
    try:
        sections = pug_data.get("Record", {}).get("Section", [])
        
        for section in sections:
            heading = section.get("TOCHeading", "")
            
            # Recursively search for GHS sections under "Safety and Hazards"
            if heading == "Safety and Hazards":
                def search_ghs(nodes):
                    for node in nodes:
                        h = node.get("TOCHeading", "")
                        # print(f"  Visiting: {h}") # Debugging
                        
                        # Match GHS Classification or Hazard Classes
                        if h in ["GHS Classification", "Hazard Classes and Categories", "UN GHS Classification"]:
                            # print(f"    -> FOUND GHS Section: {h}")
                            for info in node.get("Information", []):
                                name = info.get("Name", "")
                                val = info.get("Value", {})
                                
                                # Check if it's Hazard Statements
                                if name in ["GHS Hazard Statements", "Hazard Statements"]:
                                    for sl in val.get("StringWithMarkup", []):
                                        text = sl.get("String", "")
                                        if text:
                                            result["hazard_statements"].append(text)
                                            
                                # Check if it's Precautionary Statements
                                elif name in ["Precautionary Statement Codes", "Precautionary Statements"]:
                                     for sl in val.get("StringWithMarkup", []):
                                        text = sl.get("String", "")
                                        if text:
                                            result["precautionary_statements"].append(text)
                                            
                                # Check if it's Signal
                                elif name == "Signal":
                                     for sl in val.get("StringWithMarkup", []):
                                        text = sl.get("String", "")
                                        if text:
                                            result["signal_word"] = text
                                            
                                # Otherwise, treat as Classification (e.g. "Flam. Liq. 2")
                                # But ignore if it has a specific Name that we handled above or others
                                elif name not in ["GHS Hazard Statements", "Hazard Statements", "Precautionary Statement Codes", "Precautionary Statements", "Signal", "Pictogram(s)"]:
                                    for sl in val.get("StringWithMarkup", []):
                                        text = sl.get("String", "")
                                        if text:
                                            result["ghs_classification"].append(text)

                                        
                        # Match Hazard Statements
                        elif h in ["GHS Hazard Statements", "Hazard Statements"]:
                            for info in node.get("Information", []):
                                val = info.get("Value", {})
                                for sl in val.get("StringWithMarkup", []):
                                    text = sl.get("String", "")
                                    if text:
                                        result["hazard_statements"].append(text)
                                        
                        # Match Precautionary Statements
                        elif h in ["Precautionary Statement Codes", "Precautionary Statements"]:
                            for info in node.get("Information", []):
                                val = info.get("Value", {})
                                for sl in val.get("StringWithMarkup", []):
                                    text = sl.get("String", "")
                                    if text:
                                        result["precautionary_statements"].append(text)
                                        
                        # Match Signal Word
                        elif h == "Signal":
                            for info in node.get("Information", []):
                                val = info.get("Value", {})
                                for sl in val.get("StringWithMarkup", []):
                                    text = sl.get("String", "")
                                    if text:
                                        result["signal_word"] = text
                                        
                        # Match Pictograms
                        elif h == "Pictogram(s)":
                            for info in node.get("Information", []):
                                val = info.get("Value", {})
                                for sl in val.get("StringWithMarkup", []):
                                    for markup in sl.get("Markup", []):
                                        if markup.get("Type") == "Icon":
                                            result["pictograms"].append(markup.get("Extra", ""))
                        
                        # Recurse
                        if "Section" in node:
                            search_ghs(node["Section"])

                search_ghs(section.get("Section", []))
    except Exception:
        pass
    
    return result


def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # 1. Create English safety data table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS msds_english (
            chem_id TEXT PRIMARY KEY,
            cas_no TEXT,
            name_en TEXT,
            pubchem_cid INTEGER,
            signal_word TEXT,
            ghs_classification TEXT,
            hazard_statements TEXT,
            precautionary_statements TEXT,
            pictograms TEXT,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    print("✓ msds_english table ready")
    
    # 2. Get chemicals with CAS numbers that don't have English MSDS yet
    rows = cur.execute("""
        SELECT ct.id, ct.cas_no, ct.name_en, ct.description
        FROM chemical_terms ct
        LEFT JOIN msds_english me ON ct.description = 'KOSHA_ID:' || me.chem_id
        WHERE ct.cas_no IS NOT NULL AND ct.cas_no != ''
        AND me.chem_id IS NULL
    """).fetchall()
    
    total = len(rows)
    print(f"\n→ {total} chemicals to fetch English safety data for")
    
    success = 0
    fail = 0
    
    for i, (db_id, cas_no, name_en, desc) in enumerate(rows):
        # Extract KOSHA chem_id from description
        chem_id = desc.replace("KOSHA_ID:", "") if desc and desc.startswith("KOSHA_ID:") else None
        if not chem_id:
            continue
        
        # Get PubChem CID
        cid = get_cid_from_cas(cas_no)
        if not cid:
            fail += 1
            if (i + 1) % 50 == 0:
                print(f"  [{i+1:4d}/{total}] ✗ {cas_no} → No CID")
            time.sleep(0.2)
            continue
        
        # Get PUG View data
        try:
            r = requests.get(PUBCHEM_PUG_URL.format(cid=cid), timeout=15)
            if r.status_code != 200:
                fail += 1
                time.sleep(0.2)
                continue
            
            pug_data = r.json()
            ghs = extract_ghs_info(pug_data)
            
            # Only save if we got meaningful data
            if ghs["hazard_statements"] or ghs["ghs_classification"]:
                cur.execute("""
                    INSERT OR REPLACE INTO msds_english 
                    (chem_id, cas_no, name_en, pubchem_cid, signal_word,
                     ghs_classification, hazard_statements, precautionary_statements, pictograms)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    chem_id, cas_no, name_en or "", cid,
                    ghs["signal_word"],
                    json.dumps(ghs["ghs_classification"]),
                    json.dumps(ghs["hazard_statements"]),
                    json.dumps(ghs["precautionary_statements"]),
                    json.dumps(ghs["pictograms"]),
                ))
                success += 1
                if (i + 1) % 20 == 0 or i < 5:
                    print(f"  [{i+1:4d}/{total}] ✓ {cas_no}: {ghs['signal_word']} | {len(ghs['hazard_statements'])} hazards")
            else:
                fail += 1
        except Exception as e:
            fail += 1
        
        # Commit every 50
        if (i + 1) % 50 == 0:
            conn.commit()
        
        # PubChem rate limit: ~3 req/sec (2 calls per item)
        time.sleep(0.4)
    
    conn.commit()
    
    # Summary
    saved = cur.execute("SELECT count(*) FROM msds_english").fetchone()[0]
    print(f"\n=== Summary ===")
    print(f"Total in msds_english: {saved}")
    print(f"This run: {success} success, {fail} fail")
    
    # Sample
    for r in cur.execute("SELECT chem_id, cas_no, name_en, signal_word, hazard_statements FROM msds_english LIMIT 3"):
        print(f"  {r[2] or r[0]} | {r[3]} | {r[4][:60]}")
    
    conn.close()
    print("\n✓ Done!")


if __name__ == "__main__":
    main()
