"""Cache ECHA CLP and CompTox hazard data into regulatory_cache table.

Fetches regulatory classification data for chemicals that have CAS numbers
and stores them locally for fast lookup.

Usage:
  python scripts/cache_regulatory_data.py --source echa --workers 3
  python scripts/cache_regulatory_data.py --source comptox
  python scripts/cache_regulatory_data.py  # both
"""

import argparse
import json
import logging
import os
import sqlite3
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from backend.api.echa_adapter import EchaAdapter
from backend.api.comptox_adapter import CompToxAdapter

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "terminology.db"

_lock = threading.Lock()


def load_uncached(db_path: str, source: str) -> list[dict]:
    """Load chemicals that don't have regulatory_cache entries for this source."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
        SELECT DISTINCT ct.cas_no, ct.name_en, ct.name
        FROM chemical_terms ct
        WHERE ct.cas_no IS NOT NULL AND ct.cas_no != ''
          AND NOT EXISTS (
              SELECT 1 FROM regulatory_cache rc
              WHERE rc.cas_no = ct.cas_no AND rc.source = ?
          )
        ORDER BY ct.id
    """, (source,))
    rows = cur.fetchall()
    conn.close()
    return [{"cas_no": r[0], "name_en": r[1], "name": r[2]} for r in rows]


def save_batch(db_path: str, records: list[tuple]):
    """Save (cas_no, source, data_json) tuples."""
    if not records:
        return
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    for cas_no, source, data_json in records:
        cur.execute(
            "INSERT OR REPLACE INTO regulatory_cache (cas_no, source, data) VALUES (?, ?, ?)",
            (cas_no, source, data_json),
        )
    conn.commit()
    conn.close()


# ------------------------------------------------------------------
# ECHA CLP caching
# ------------------------------------------------------------------

def fetch_echa_clp(echa: EchaAdapter, chem: dict) -> tuple | None:
    """Search ECHA by CAS, get CLP classification if available."""
    cas = chem["cas_no"]
    time.sleep(0.6)

    result = echa.search_substance(cas, page_size=5)
    if result.get("status") != "success" or not result.get("data"):
        return (cas, "ECHA", json.dumps({"status": "not_found"}, ensure_ascii=False))

    # Take the first match
    substance = result["data"][0]
    rml_id = substance.get("rml_id", "")
    if not rml_id:
        return (cas, "ECHA", json.dumps({"status": "no_rml_id", "substance": substance}, ensure_ascii=False))

    # Get CLP classification
    time.sleep(0.4)
    clp = echa.get_clp_classification(rml_id)

    record = {
        "rml_id": rml_id,
        "name": substance.get("name", ""),
        "ec_number": substance.get("ec_number", ""),
        "molecular_formula": substance.get("molecular_formula", ""),
        "regulatory_processes": substance.get("regulatory_processes", []),
        "clp_classifications": clp.get("data", []) if clp.get("status") == "success" else [],
    }
    return (cas, "ECHA", json.dumps(record, ensure_ascii=False))


def cache_echa(db_path: str, workers: int = 3, limit: int = 0):
    chemicals = load_uncached(db_path, "ECHA")
    if limit:
        chemicals = chemicals[:limit]
    logger.info("ECHA: %d chemicals to cache", len(chemicals))
    if not chemicals:
        return

    echa = EchaAdapter(timeout=20)
    batch_buffer: list[tuple] = []
    processed = 0
    start = time.time()

    try:
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {pool.submit(fetch_echa_clp, echa, c): c for c in chemicals}
            for future in as_completed(futures):
                processed += 1
                try:
                    result = future.result()
                    if result:
                        batch_buffer.append(result)
                except Exception as e:
                    logger.debug("ECHA error: %s", e)

                if len(batch_buffer) >= 50:
                    save_batch(db_path, batch_buffer)
                    batch_buffer = []

                if processed % 100 == 0:
                    elapsed = time.time() - start
                    rate = processed / elapsed if elapsed > 0 else 0
                    logger.info("ECHA progress: %d/%d (%.1f/sec)", processed, len(chemicals), rate)

        save_batch(db_path, batch_buffer)
    except KeyboardInterrupt:
        save_batch(db_path, batch_buffer)
        logger.info("ECHA interrupted, saved %d records", processed)

    logger.info("ECHA caching done: %d processed", processed)


# ------------------------------------------------------------------
# CompTox hazard caching (uses batch endpoints)
# ------------------------------------------------------------------

def cache_comptox(db_path: str, limit: int = 0):
    chemicals = load_uncached(db_path, "COMPTOX")
    if limit:
        chemicals = chemicals[:limit]
    logger.info("CompTox: %d chemicals to cache", len(chemicals))
    if not chemicals:
        return

    comptox = CompToxAdapter()
    if not comptox.api_key:
        logger.error("COMPTOX_API_KEY not set — skipping CompTox caching")
        return

    # Phase 1: batch search CAS → DTXSID
    cas_list = [c["cas_no"] for c in chemicals]
    dtxsid_map: dict[str, str] = {}  # CAS → DTXSID

    for i in range(0, len(cas_list), 100):
        batch = cas_list[i:i + 100]
        time.sleep(0.3)
        result = comptox.batch_search(batch)
        if result.get("status") == "success":
            for item in result.get("data", []):
                cas = item.get("casrn", "")
                dtxsid = item.get("dtxsid", "")
                if cas and dtxsid:
                    dtxsid_map[cas] = dtxsid
        logger.info("CompTox CAS→DTXSID: batch %d, mapped %d total",
                     (i // 100) + 1, len(dtxsid_map))

    if not dtxsid_map:
        logger.warning("No DTXSID mappings found")
        return

    # Phase 2: batch detail for DTXSIDs
    dtxsid_list = list(dtxsid_map.values())
    cas_by_dtxsid = {v: k for k, v in dtxsid_map.items()}
    records: list[tuple] = []

    for i in range(0, len(dtxsid_list), 200):
        batch = dtxsid_list[i:i + 200]
        time.sleep(0.3)
        result = comptox.batch_detail(batch)
        if result.get("status") == "success":
            for item in result.get("data", []):
                dtxsid = item.get("dtxsid", "")
                cas = cas_by_dtxsid.get(dtxsid, "")
                if cas:
                    records.append((cas, "COMPTOX", json.dumps(item, ensure_ascii=False)))

        logger.info("CompTox detail: batch %d, %d records total",
                     (i // 200) + 1, len(records))

    save_batch(db_path, records)
    logger.info("CompTox caching done: %d records saved", len(records))


def main():
    parser = argparse.ArgumentParser(description="Cache regulatory data")
    parser.add_argument("--source", type=str, default=None, choices=["echa", "comptox"])
    parser.add_argument("--workers", type=int, default=3, help="Workers for ECHA (CompTox uses batch)")
    parser.add_argument("--limit", type=int, default=0, help="Limit chemicals (0=all)")
    parser.add_argument("--db", type=str, default=str(DB_PATH))
    args = parser.parse_args()

    if args.source in (None, "echa"):
        cache_echa(args.db, workers=args.workers, limit=args.limit)

    if args.source in (None, "comptox"):
        cache_comptox(args.db, limit=args.limit)

    # Summary
    conn = sqlite3.connect(args.db)
    cur = conn.cursor()
    cur.execute("SELECT source, COUNT(*) FROM regulatory_cache GROUP BY source")
    logger.info("=== regulatory_cache summary ===")
    for row in cur.fetchall():
        logger.info("  %s: %d", row[0], row[1])
    conn.close()


if __name__ == "__main__":
    main()
