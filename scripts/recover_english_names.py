"""
Recover missing English names using CAS -> CID -> Title approach.
This is a second pass for chemicals that failed the direct name lookup.

Usage: python scripts/recover_english_names.py
"""
import sqlite3
import requests
import time
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "terminology.db")

def get_english_name_via_cid(cas_no: str) -> str | None:
    """Fetch English name by first resolving CAS to CID."""
    try:
        # 1. Get CID
        url_cid = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{cas_no}/cids/JSON"
        r = requests.get(url_cid, timeout=10)
        if r.status_code != 200:
            return None
        
        data = r.json()
        cids = data.get("IdentifierList", {}).get("CID", [])
        if not cids:
            return None
        
        cid = cids[0]
        
        # 2. Get Title/Synonyms from CID
        url_props = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/property/Title,IUPACName/JSON"
        r2 = requests.get(url_props, timeout=10)
        if r2.status_code == 200:
            props = r2.json().get("PropertyTable", {}).get("Properties", [{}])[0]
            return props.get("Title") or props.get("IUPACName")
            
    except Exception:
        pass
    return None


def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # Get all chemicals still missing name_en
    rows = cur.execute("""
        SELECT id, name, cas_no FROM chemical_terms 
        WHERE (name_en IS NULL OR name_en = '')
        AND cas_no IS NOT NULL AND cas_no != ''
    """).fetchall()
    
    total = len(rows)
    print(f"\n→ {total} chemicals still missing English name (2nd pass)")
    
    success = 0
    fail = 0
    
    for i, (chem_id, name_kr, cas_no) in enumerate(rows):
        name_en = get_english_name_via_cid(cas_no)
        
        if name_en:
            cur.execute("UPDATE chemical_terms SET name_en = ? WHERE id = ?", (name_en, chem_id))
            success += 1
            if (i + 1) % 20 == 0 or i < 5:
                print(f"  [{i+1:4d}/{total}] ✓ {cas_no}: {name_kr[:20]}... → {name_en}")
        else:
            fail += 1
            if (i + 1) % 50 == 0:
                print(f"  [{i+1:4d}/{total}] ✗ {cas_no} (still not found)")
        
        if (i + 1) % 50 == 0:
            conn.commit()
        
        time.sleep(0.25)
    
    conn.commit()
    
    # Rebuild FTS for new additions
    if success > 0:
        print("\nUpdating FTS index...")
        cur.execute("DELETE FROM chemical_terms_fts")
        cur.execute("""
            INSERT INTO chemical_terms_fts (rowid, name, cas_no, description, name_en)
            SELECT id, name, cas_no, description, name_en FROM chemical_terms
        """)
        conn.commit()
    
    # Final count
    total_en = cur.execute("SELECT count(*) FROM chemical_terms WHERE name_en IS NOT NULL AND name_en != ''").fetchone()[0]
    total_all = cur.execute("SELECT count(*) FROM chemical_terms").fetchone()[0]
    
    print(f"\n=== Final Summary ===")
    print(f"Total chemicals: {total_all}")
    print(f"With English name: {total_en} ({total_en/total_all*100:.1f}%)")
    print(f"This run: {success} recovered, {fail} still missing")
    
    conn.close()

if __name__ == "__main__":
    main()
