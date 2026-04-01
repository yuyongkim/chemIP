"""Discover new chemicals from EPA CompTox and import into chemical_terms.

Phase 1: Map existing chemicals' CAS numbers to DTXSID via batch search.
Phase 2: Discover new chemicals via partial-name search.

Requires COMPTOX_API_KEY in .env.

Usage:
  python scripts/discover_comptox_chemicals.py
  python scripts/discover_comptox_chemicals.py --phase 1  # CAS→DTXSID mapping only
  python scripts/discover_comptox_chemicals.py --phase 2  # discovery only
  python scripts/discover_comptox_chemicals.py --limit 500
"""

import argparse
import json
import logging
import os
import sqlite3
import sys
import time
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from backend.api.comptox_adapter import CompToxAdapter

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "terminology.db"

# Prefixes for Phase 2 discovery
DISCOVERY_SEEDS = [
    "Acetaldehyde", "Acrylamide", "Aniline", "Arsenic", "Asbestos",
    "Benzidine", "Beryllium", "Biphenyl", "Butadiene", "Cadmium",
    "Carbon disulfide", "Chloroprene", "Chromium", "Cobalt", "Cresol",
    "Cyanide", "Diethyl", "Dimethyl", "Dioxin", "Epoxy",
    "Ethylene glycol", "Formaldehyde", "Furan", "Glycol ether",
    "Hydrazine", "Isocyanate", "Ketone", "Manganese", "Mercury",
    "Naphthalene", "Nickel", "Nitrosamine", "Organophosphate",
    "Perchlorate", "Pesticide", "Phthalate", "Polychlorinated",
    "Selenium", "Siloxane", "Styrene", "Thallium", "Titanium dioxide",
    "Toluene diisocyanate", "Tributyltin", "Uranium", "Vanadium",
    "Vinyl acetate", "Zinc chromate",
]

BATCH_SIZE = 100  # CompTox batch_search max


def load_existing_cas(db_path: str) -> set[str]:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT cas_no FROM chemical_terms WHERE cas_no IS NOT NULL AND cas_no != ''")
    cas_set = {r[0] for r in cur.fetchall()}
    conn.close()
    return cas_set


def load_cas_list_for_mapping(db_path: str) -> list[str]:
    """CAS numbers that don't have a COMPTOX external_id yet."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
        SELECT DISTINCT cas_no FROM chemical_terms
        WHERE cas_no IS NOT NULL AND cas_no != ''
          AND source = 'KOSHA'
          AND cas_no NOT IN (
              SELECT cas_no FROM chemical_terms WHERE source = 'COMPTOX' AND cas_no IS NOT NULL
          )
    """)
    cas_list = [r[0] for r in cur.fetchall()]
    conn.close()
    return cas_list


def phase1_map_cas(comptox: CompToxAdapter, db_path: str, limit: int = 0):
    """Phase 1: Batch-search existing CAS numbers to get DTXSIDs."""
    cas_list = load_cas_list_for_mapping(db_path)
    if limit:
        cas_list = cas_list[:limit]
    logger.info("Phase 1: %d CAS numbers to map", len(cas_list))

    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    cur = conn.cursor()

    mapped = 0
    for i in range(0, len(cas_list), BATCH_SIZE):
        batch = cas_list[i:i + BATCH_SIZE]
        time.sleep(0.3)

        result = comptox.batch_search(batch)
        if result.get("status") != "success":
            logger.warning("Batch search failed at offset %d: %s", i, result.get("message"))
            continue

        for item in result.get("data", []):
            dtxsid = item.get("dtxsid", "")
            cas = item.get("casrn", "")
            name = item.get("preferredName", "")

            if not dtxsid or not cas:
                continue

            # Store DTXSID mapping in regulatory_cache for later use
            cur.execute(
                "INSERT OR REPLACE INTO regulatory_cache (cas_no, source, data) VALUES (?, 'COMPTOX_ID', ?)",
                (cas, json.dumps({"dtxsid": dtxsid, "name": name}, ensure_ascii=False)),
            )
            mapped += 1

        conn.commit()
        logger.info("Phase 1 progress: %d/%d batches, %d mapped",
                     (i // BATCH_SIZE) + 1, (len(cas_list) + BATCH_SIZE - 1) // BATCH_SIZE, mapped)

    conn.close()
    logger.info("Phase 1 complete: %d DTXSID mappings saved", mapped)
    return mapped


def phase2_discover(comptox: CompToxAdapter, db_path: str, limit: int = 0):
    """Phase 2: Discover new chemicals via partial-name search."""
    existing_cas = load_existing_cas(db_path)
    logger.info("Phase 2: %d seeds, %d existing CAS numbers", len(DISCOVERY_SEEDS), len(existing_cas))

    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    cur = conn.cursor()

    total_inserted = 0
    total_skipped = 0

    try:
        for seed in DISCOVERY_SEEDS:
            time.sleep(0.3)
            result = comptox.search_chemical_contains(seed, top=100)

            if result.get("status") != "success":
                logger.warning("Search failed for '%s': %s", seed, result.get("message"))
                continue

            seed_inserted = 0
            for item in result.get("data", []):
                dtxsid = item.get("dtxsid", "")
                cas = item.get("casrn", "")
                name = item.get("preferredName", "")

                if not dtxsid or not name:
                    total_skipped += 1
                    continue

                # Skip if CAS exists
                if cas and cas in existing_cas:
                    total_skipped += 1
                    continue

                # Skip if COMPTOX_ID already exists
                desc = f"COMPTOX_ID:{dtxsid}"
                cur.execute("SELECT id FROM chemical_terms WHERE description = ?", (desc,))
                if cur.fetchone():
                    total_skipped += 1
                    continue

                cur.execute(
                    """INSERT INTO chemical_terms (name, cas_no, description, name_en, source, external_id)
                       VALUES (?, ?, ?, ?, 'COMPTOX', ?)""",
                    (name, cas if cas else None, desc, name, dtxsid),
                )
                row_id = cur.lastrowid
                cur.execute(
                    """INSERT INTO chemical_terms_fts (rowid, name, cas_no, description, name_en)
                       VALUES (?, ?, ?, ?, ?)""",
                    (row_id, name, cas, desc, name),
                )

                if cas:
                    existing_cas.add(cas)
                seed_inserted += 1
                total_inserted += 1

                if limit and total_inserted >= limit:
                    conn.commit()
                    raise StopIteration

            conn.commit()
            if seed_inserted:
                logger.info("Seed '%s': +%d new | Total: %d", seed, seed_inserted, total_inserted)

    except (KeyboardInterrupt, StopIteration):
        conn.commit()
        logger.info("Stopped.")

    conn.close()
    logger.info("Phase 2 complete: %d inserted, %d skipped", total_inserted, total_skipped)
    return total_inserted


def main():
    parser = argparse.ArgumentParser(description="Discover CompTox chemicals")
    parser.add_argument("--phase", type=int, default=0, choices=[0, 1, 2],
                        help="0=both, 1=CAS mapping only, 2=discovery only")
    parser.add_argument("--limit", type=int, default=0, help="Max chemicals (0=unlimited)")
    parser.add_argument("--db", type=str, default=str(DB_PATH))
    args = parser.parse_args()

    comptox = CompToxAdapter()
    if not comptox.api_key:
        logger.error("COMPTOX_API_KEY not set in .env — cannot proceed")
        sys.exit(1)

    if args.phase in (0, 1):
        phase1_map_cas(comptox, args.db, limit=args.limit)

    if args.phase in (0, 2):
        phase2_discover(comptox, args.db, limit=args.limit)

    # Summary
    conn = sqlite3.connect(args.db)
    cur = conn.cursor()
    cur.execute("SELECT source, COUNT(*) FROM chemical_terms GROUP BY source")
    logger.info("=== chemical_terms by source ===")
    for row in cur.fetchall():
        logger.info("  %s: %d", row[0], row[1])
    conn.close()


if __name__ == "__main__":
    main()
