"""
Populate English chemical names using PubChem REST API.
Maps CAS numbers from terminology.db to English IUPAC names.

Usage: python scripts/populate_english_names.py
"""
import sqlite3
import requests
import time
import re
import sys
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "terminology.db")

def get_english_name_from_pubchem(cas_no: str) -> dict | None:
    """Fetch English name from PubChem using CAS number."""
    if not cas_no or not re.match(r'^\d+-\d+-\d+$', cas_no.strip()):
        return None
    
    cas = cas_no.strip()
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{cas}/property/IUPACName,MolecularFormula,Title/JSON"
    
    try:
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            data = r.json()
            props = data.get("PropertyTable", {}).get("Properties", [{}])[0]
            return {
                "iupac": props.get("IUPACName", ""),
                "title": props.get("Title", ""),
                "formula": props.get("MolecularFormula", ""),
            }
        return None
    except Exception:
        return None


def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # 1. Add name_en column if not exists
    cols = [c[1] for c in cur.execute("PRAGMA table_info(chemical_terms)").fetchall()]
    if "name_en" not in cols:
        cur.execute("ALTER TABLE chemical_terms ADD COLUMN name_en TEXT")
        conn.commit()
        print("✓ Added name_en column")
    else:
        print("✓ name_en column already exists")
    
    # 2. Get all chemicals without English name
    rows = cur.execute("""
        SELECT id, name, cas_no FROM chemical_terms 
        WHERE (name_en IS NULL OR name_en = '')
        AND cas_no IS NOT NULL AND cas_no != ''
    """).fetchall()
    
    total = len(rows)
    print(f"\n→ {total} chemicals to process (have CAS, missing name_en)")
    
    success = 0
    fail = 0
    
    for i, (chem_id, name_kr, cas_no) in enumerate(rows):
        result = get_english_name_from_pubchem(cas_no)
        
        if result and (result["title"] or result["iupac"]):
            # Prefer common name (Title), fallback to IUPAC
            name_en = result["title"] or result["iupac"]
            cur.execute("UPDATE chemical_terms SET name_en = ? WHERE id = ?", (name_en, chem_id))
            success += 1
            if (i + 1) % 20 == 0 or i < 5:
                print(f"  [{i+1:4d}/{total}] ✓ {cas_no}: {name_kr[:30]} → {name_en}")
        else:
            fail += 1
            if (i + 1) % 50 == 0:
                print(f"  [{i+1:4d}/{total}] ✗ {cas_no}: {name_kr[:30]} (not found)")
        
        # Commit every 50 rows
        if (i + 1) % 50 == 0:
            conn.commit()
        
        # PubChem rate limit: ~5 req/sec
        time.sleep(0.2)
    
    conn.commit()
    
    # 3. Rebuild FTS5 with name_en included
    print(f"\n→ Rebuilding FTS index with English names...")
    
    # Drop old FTS table and recreate with name_en
    cur.execute("DROP TABLE IF EXISTS chemical_terms_fts")
    cur.execute("""
        CREATE VIRTUAL TABLE chemical_terms_fts USING fts5(
            name, cas_no, description, name_en,
            content='chemical_terms', content_rowid='id'
        )
    """)
    
    # Populate FTS
    cur.execute("""
        INSERT INTO chemical_terms_fts (rowid, name, cas_no, description, name_en)
        SELECT id, name, cas_no, description, name_en FROM chemical_terms
    """)
    conn.commit()
    print("✓ FTS index rebuilt")
    
    # 4. Summary
    total_en = cur.execute("SELECT count(*) FROM chemical_terms WHERE name_en IS NOT NULL AND name_en != ''").fetchone()[0]
    total_all = cur.execute("SELECT count(*) FROM chemical_terms").fetchone()[0]
    print(f"\n=== Summary ===")
    print(f"Total chemicals: {total_all}")
    print(f"With English name: {total_en}")
    print(f"This run: {success} success, {fail} fail")
    
    # Test search
    print(f"\n=== Quick Search Test ===")
    for q in ["Toluene", "Benzene", "톨루엔"]:
        safe_q = q.replace('"', '')
        fts_query = f'"{safe_q}"*'
        try:
            results = cur.execute("""
                SELECT rowid, name, cas_no, name_en FROM chemical_terms_fts 
                WHERE chemical_terms_fts MATCH ? LIMIT 3
            """, (fts_query,)).fetchall()
            print(f'  "{q}" → {len(results)} results', end="")
            if results:
                print(f" (first: {results[0][1][:40]}, en: {results[0][3]})")
            else:
                print()
        except Exception as e:
            print(f'  "{q}" → Error: {e}')
    
    conn.close()
    print("\n✓ Done!")


if __name__ == "__main__":
    main()
