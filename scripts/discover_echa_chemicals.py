"""Discover new chemicals from ECHA and import into chemical_terms.

Crawls ECHA substance search using A-Z letter seeds with pagination.
Only inserts chemicals whose CAS number is not already in the DB.

Usage:
  python scripts/discover_echa_chemicals.py
  python scripts/discover_echa_chemicals.py --seeds A,B,C --limit 500
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

from backend.api.echa_adapter import EchaAdapter

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "terminology.db"
PROGRESS_PATH = Path(__file__).resolve().parent.parent / "data" / "echa_discover_progress.json"

# ECHA requires 3+ chars. Use common chemical prefixes for broad coverage.
DEFAULT_SEEDS = [
    # Common chemical name prefixes (covers most ECHA substances)
    "acet", "acry", "amin", "ammo", "benz", "brom", "buta", "calc",
    "carb", "chlor", "chrom", "cobalt", "copp", "cycl", "dich", "dime",
    "diox", "etha", "ethy", "fluor", "form", "glyc", "hexa", "hydr",
    "iron", "isop", "lead", "lith", "magn", "mang", "merc", "meth",
    "naph", "nick", "nitr", "octa", "oxal", "pent", "phen", "phos",
    "plat", "poly", "pota", "prop", "pyri", "quin", "sili", "sodi",
    "styr", "sulf", "tetr", "thio", "titan", "tolu", "tric", "urea",
    "vana", "vinyl", "xyle", "zinc", "zircon",
    # Broader 2-gram coverage
    "1,2-", "1,3-", "1,4-", "2,4-", "2-am", "2-ch", "2-me", "3-me",
    "4-am", "4-ch", "4-me", "n-bu", "n-he", "n-pr", "tert", "bis(",
    "tri-", "per-", "iso-", "neo-", "orth", "para", "meta",
]
PAGE_SIZE = 100
MAX_PAGES_PER_SEED = 20  # Most new chemicals appear in first few pages
DELAY_BETWEEN_PAGES = 0.6  # seconds


def load_existing_cas(db_path: str) -> set[str]:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT cas_no FROM chemical_terms WHERE cas_no IS NOT NULL AND cas_no != ''")
    cas_set = {r[0] for r in cur.fetchall()}
    conn.close()
    return cas_set


def load_progress() -> dict:
    if PROGRESS_PATH.exists():
        return json.loads(PROGRESS_PATH.read_text(encoding="utf-8"))
    return {"completed_seeds": [], "total_inserted": 0, "total_skipped": 0}


def save_progress(progress: dict):
    PROGRESS_PATH.write_text(json.dumps(progress, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="Discover ECHA chemicals")
    parser.add_argument("--seeds", type=str, default=None, help="Comma-separated seeds (e.g. A,B,C)")
    parser.add_argument("--limit", type=int, default=0, help="Max chemicals to insert (0=unlimited)")
    parser.add_argument("--db", type=str, default=str(DB_PATH))
    parser.add_argument("--reset", action="store_true", help="Reset progress and start fresh")
    args = parser.parse_args()

    seeds = args.seeds.split(",") if args.seeds else DEFAULT_SEEDS
    db_path = args.db

    progress = load_progress() if not args.reset else {"completed_seeds": [], "total_inserted": 0, "total_skipped": 0}
    existing_cas = load_existing_cas(db_path)
    logger.info("Existing CAS numbers in DB: %d", len(existing_cas))

    echa = EchaAdapter(timeout=20)
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    cur = conn.cursor()

    total_inserted = progress["total_inserted"]
    total_skipped = progress["total_skipped"]
    total_api_calls = 0

    try:
        for seed in seeds:
            if seed in progress["completed_seeds"]:
                logger.info("Skipping seed '%s' (already completed)", seed)
                continue

            seed_inserted = 0
            seed_skipped = 0
            page = 1
            empty_pages = 0  # pages with zero new insertions

            while page <= MAX_PAGES_PER_SEED:
                time.sleep(DELAY_BETWEEN_PAGES)
                total_api_calls += 1

                result = echa.search_substance(seed, page=page, page_size=PAGE_SIZE)
                if result.get("status") != "success":
                    logger.warning("ECHA search failed for seed '%s' page %d: %s",
                                   seed, page, result.get("message"))
                    break

                items = result.get("data", [])
                total_items = result.get("total", 0)

                if not items:
                    break

                inserted_before_page = seed_inserted
                for item in items:
                    cas = item.get("cas_number", "").strip()
                    name = item.get("name", "").strip()
                    rml_id = item.get("rml_id", "").strip()
                    ec = item.get("ec_number", "")
                    iupac = item.get("iupac_name", "")
                    formula = item.get("molecular_formula", "")

                    if not rml_id or not name:
                        seed_skipped += 1
                        continue

                    # Skip if CAS already exists
                    if cas and cas in existing_cas:
                        seed_skipped += 1
                        continue

                    # Skip if this ECHA_ID already exists
                    desc = f"ECHA_ID:{rml_id}"
                    cur.execute("SELECT id FROM chemical_terms WHERE description = ?", (desc,))
                    if cur.fetchone():
                        seed_skipped += 1
                        continue

                    # Build display name
                    display_name = name
                    if iupac and iupac != name:
                        display_name = f"{name} ({iupac})"

                    cur.execute(
                        """INSERT INTO chemical_terms (name, cas_no, description, name_en, source, external_id)
                           VALUES (?, ?, ?, ?, 'ECHA', ?)""",
                        (display_name, cas if cas else None, desc, name, rml_id),
                    )
                    row_id = cur.lastrowid
                    cur.execute(
                        """INSERT INTO chemical_terms_fts (rowid, name, cas_no, description, name_en)
                           VALUES (?, ?, ?, ?, ?)""",
                        (row_id, display_name, cas, desc, name),
                    )

                    if cas:
                        existing_cas.add(cas)
                    seed_inserted += 1
                    total_inserted += 1

                    if args.limit and total_inserted >= args.limit:
                        conn.commit()
                        logger.info("Reached limit of %d insertions", args.limit)
                        raise StopIteration

                conn.commit()

                # Count insertions on THIS page
                page_new = seed_inserted - inserted_before_page
                if page_new == 0:
                    empty_pages += 1
                else:
                    empty_pages = 0

                logger.debug("Seed '%s' page %d: %d items, +%d new (cumul %d)",
                             seed, page, len(items), page_new, seed_inserted)

                # Stop conditions
                if page * PAGE_SIZE >= total_items:
                    break
                if empty_pages >= 2:
                    logger.info("Seed '%s': 2 empty pages, moving on (total +%d)", seed, seed_inserted)
                    break

                page += 1

            total_skipped += seed_skipped
            progress["completed_seeds"].append(seed)
            progress["total_inserted"] = total_inserted
            progress["total_skipped"] = total_skipped
            save_progress(progress)

            logger.info("Seed '%s' done: +%d new, %d skipped | Total: %d new, %d API calls",
                         seed, seed_inserted, seed_skipped, total_inserted, total_api_calls)

    except (KeyboardInterrupt, StopIteration):
        conn.commit()
        progress["total_inserted"] = total_inserted
        progress["total_skipped"] = total_skipped
        save_progress(progress)
        logger.info("Stopped. Progress saved.")

    conn.close()

    logger.info("=== ECHA Discovery Complete ===")
    logger.info("  Total inserted: %d", total_inserted)
    logger.info("  Total skipped: %d", total_skipped)
    logger.info("  API calls: %d", total_api_calls)

    # Verify
    conn2 = sqlite3.connect(db_path)
    cur2 = conn2.cursor()
    cur2.execute("SELECT source, COUNT(*) FROM chemical_terms GROUP BY source")
    for row in cur2.fetchall():
        logger.info("  %s: %d", row[0], row[1])
    conn2.close()


if __name__ == "__main__":
    main()
