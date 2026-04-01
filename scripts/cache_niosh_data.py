"""Populate niosh_cache table from local niosh_npg.json.

No API calls — reads the bundled static dataset and inserts
matching records into the niosh_cache table keyed by CAS number.
"""

import json
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "terminology.db"
NIOSH_PATH = Path(__file__).resolve().parent.parent / "backend" / "data" / "niosh_npg.json"


def main(db_path: str | Path = DB_PATH):
    raw = NIOSH_PATH.read_text(encoding="utf-8")
    chemicals = json.loads(raw).get("chemicals", [])
    print(f"NIOSH NPG: {len(chemicals)} chemicals loaded")

    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    cur = conn.cursor()

    inserted = 0
    skipped = 0
    for chem in chemicals:
        cas = chem.get("cas", "").strip()
        if not cas:
            skipped += 1
            continue
        cur.execute(
            "INSERT OR REPLACE INTO niosh_cache (cas_no, data) VALUES (?, ?)",
            (cas, json.dumps(chem, ensure_ascii=False)),
        )
        inserted += 1

    conn.commit()
    conn.close()
    print(f"Done: {inserted} inserted, {skipped} skipped (no CAS)")


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else DB_PATH
    main(path)
