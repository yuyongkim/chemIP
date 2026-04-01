"""Batch populate drug_mappings for all chemicals.

Sources: MFDS (Korean FDA), OpenFDA, PubMed
Searches by chemical English name and/or CAS number.

Usage:
  python scripts/populate_drug_mappings_batch.py --workers 4 --commit-batch 50
  python scripts/populate_drug_mappings_batch.py --source openfda  # single source
"""

import argparse
import json
import logging
import os
import re
import sqlite3
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

# Ensure project root is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from backend.api.mfds_client import MFDSClient
from backend.api.fda_client import OpenFDAClient
from backend.api.pubmed_client import PubMedClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "terminology.db")

# Rate limiting per thread
_lock = threading.Lock()
_last_call: dict[str, float] = {}
RATE_DELAYS = {"mfds": 0.25, "openfda": 0.35, "pubmed": 0.4}


def rate_limit(source: str):
    delay = RATE_DELAYS.get(source, 0.3)
    with _lock:
        last = _last_call.get(source, 0)
        now = time.time()
        wait = delay - (now - last)
        if wait > 0:
            time.sleep(wait)
        _last_call[source] = time.time()


def load_remaining(db_path: str, source: str | None = None) -> list[dict]:
    """Load chemicals that don't have drug_mappings yet."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    if source:
        cur.execute("""
            SELECT ct.id, substr(ct.description, 10) as chem_id,
                   ct.name, ct.cas_no, ct.name_en
            FROM chemical_terms ct
            WHERE ct.description LIKE 'KOSHA_ID:%'
              AND NOT EXISTS (
                  SELECT 1 FROM drug_mappings dm
                  WHERE dm.chem_id = substr(ct.description, 10)
                    AND dm.source = ?
              )
            ORDER BY ct.id
        """, (source,))
    else:
        # Load chemicals missing from ANY source
        cur.execute("""
            SELECT ct.id, substr(ct.description, 10) as chem_id,
                   ct.name, ct.cas_no, ct.name_en
            FROM chemical_terms ct
            WHERE ct.description LIKE 'KOSHA_ID:%'
              AND (
                  NOT EXISTS (SELECT 1 FROM drug_mappings dm WHERE dm.chem_id = substr(ct.description, 10) AND dm.source = 'mfds')
                  OR NOT EXISTS (SELECT 1 FROM drug_mappings dm WHERE dm.chem_id = substr(ct.description, 10) AND dm.source = 'openfda')
                  OR NOT EXISTS (SELECT 1 FROM drug_mappings dm WHERE dm.chem_id = substr(ct.description, 10) AND dm.source = 'pubmed')
              )
            ORDER BY ct.id
        """)

    rows = cur.fetchall()
    conn.close()
    return [
        {"id": r[0], "chem_id": r[1], "name": r[2], "cas_no": r[3], "name_en": r[4]}
        for r in rows
    ]


def extract_search_name(name: str, name_en: str | None) -> str:
    """Extract the best search name from Korean chemical name."""
    if name_en:
        return name_en

    # Try extracting English name from parentheses
    matches = re.findall(r'\(([^)]*[a-zA-Z][^)]*)\)', name)
    if matches:
        return matches[0].strip()

    # Remove Korean, return whatever English remains
    en_parts = re.sub(r'[가-힣\s]+', ' ', name).strip()
    return en_parts if en_parts else name


def extract_korean_name(name: str) -> str:
    """Extract Korean part of the name for MFDS search."""
    kor = re.sub(r'\([^)]*\)', '', name).strip()
    return kor if kor else name


def process_chemical(chem: dict, sources: list[str],
                     mfds: MFDSClient, fda: OpenFDAClient, pubmed: PubMedClient,
                     existing_sources: set) -> list[dict]:
    """Process a single chemical across requested sources. Returns mapping records."""
    chem_id = chem["chem_id"]
    name = chem["name"]
    name_en = chem.get("name_en")
    cas_no = chem.get("cas_no")
    search_name = extract_search_name(name, name_en)
    korean_name = extract_korean_name(name)

    results = []

    # MFDS — search by Korean name
    if "mfds" in sources and ("mfds", chem_id) not in existing_sources:
        rate_limit("mfds")
        try:
            r = mfds.search_easy_info(item_name=korean_name, num_of_rows=5)
            if r.get("status") == "success":
                for item in r.get("items", [])[:5]:
                    item_key = item.get("ITEM_SEQ", "") or item.get("itemSeq", "")
                    if item_key:
                        item["_key"] = str(item_key)
                        results.append({"chem_id": chem_id, "source": "mfds", "item": item})
                if not r.get("items"):
                    # Store empty marker so we don't retry
                    results.append({"chem_id": chem_id, "source": "mfds", "item": {"_key": f"_empty_{chem_id}"}})
        except Exception as e:
            logger.debug("MFDS error for %s: %s", chem_id, e)

    # OpenFDA — search by English name or CAS
    if "openfda" in sources and ("openfda", chem_id) not in existing_sources:
        rate_limit("openfda")
        try:
            query = f'openfda.substance_name:"{search_name}"' if search_name else None
            if cas_no:
                # Try CAS-based search first for precision
                query = f'openfda.unii:"{cas_no}" OR openfda.substance_name:"{search_name}"'

            if query:
                r = fda.search_labels(search_query=query, limit=5)
                if r.get("status") == "success":
                    for item in r.get("results", [])[:5]:
                        item_key = item.get("id", "")
                        if item_key:
                            item["_key"] = str(item_key)
                            results.append({"chem_id": chem_id, "source": "openfda", "item": item})
                    if not r.get("results"):
                        results.append({"chem_id": chem_id, "source": "openfda", "item": {"_key": f"_empty_{chem_id}"}})
        except Exception as e:
            logger.debug("OpenFDA error for %s: %s", chem_id, e)

    # PubMed — search by English name + toxicology
    if "pubmed" in sources and ("pubmed", chem_id) not in existing_sources:
        rate_limit("pubmed")
        try:
            term = f"{search_name} toxicology" if search_name else f"{korean_name} toxicology"
            r = pubmed.search(term=term, retmax=5)
            if r.get("status") == "success":
                for article in r.get("articles", [])[:5]:
                    pmid = article.get("pmid", "")
                    if pmid:
                        article["_key"] = str(pmid)
                        results.append({"chem_id": chem_id, "source": "pubmed", "item": article})
                if not r.get("articles"):
                    results.append({"chem_id": chem_id, "source": "pubmed", "item": {"_key": f"_empty_{chem_id}"}})
        except Exception as e:
            logger.debug("PubMed error for %s: %s", chem_id, e)

    return results


def save_batch(db_path: str, records: list[dict]):
    """Save a batch of drug mapping records."""
    if not records:
        return
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    for rec in records:
        try:
            cur.execute(
                """INSERT OR REPLACE INTO drug_mappings (chem_id, source, item_key, data, updated_at)
                   VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)""",
                (rec["chem_id"], rec["source"],
                 rec["item"].get("_key", ""),
                 json.dumps(rec["item"], ensure_ascii=False)),
            )
        except Exception as e:
            logger.warning("Save error: %s", e)
    conn.commit()
    conn.close()


def load_existing_sources(db_path: str) -> set:
    """Load (source, chem_id) pairs already in drug_mappings."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT source, chem_id FROM drug_mappings")
    existing = {(r[0], r[1]) for r in cur.fetchall()}
    conn.close()
    return existing


def main():
    parser = argparse.ArgumentParser(description="Batch populate drug_mappings")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--commit-batch", type=int, default=50)
    parser.add_argument("--limit", type=int, default=0, help="Limit chemicals (0=all)")
    parser.add_argument("--source", type=str, default=None,
                        choices=["mfds", "openfda", "pubmed"],
                        help="Only populate this source")
    parser.add_argument("--db", type=str, default=DB_PATH)
    args = parser.parse_args()

    sources = [args.source] if args.source else ["mfds", "openfda", "pubmed"]
    chemicals = load_remaining(args.db, source=args.source)
    if args.limit:
        chemicals = chemicals[:args.limit]

    existing = load_existing_sources(args.db)
    logger.info("Loaded %d chemicals to process, %d existing mappings, sources=%s",
                len(chemicals), len(existing), sources)

    if not chemicals:
        logger.info("Nothing to do.")
        return

    mfds = MFDSClient()
    fda = OpenFDAClient()
    pubmed = PubMedClient()

    batch_buffer: list[dict] = []
    processed = 0
    total = len(chemicals)
    start_time = time.time()

    def flush():
        nonlocal batch_buffer
        if batch_buffer:
            save_batch(args.db, batch_buffer)
            batch_buffer = []

    try:
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = {
                pool.submit(process_chemical, chem, sources, mfds, fda, pubmed, existing): chem
                for chem in chemicals
            }

            for future in as_completed(futures):
                chem = futures[future]
                processed += 1
                try:
                    results = future.result()
                    batch_buffer.extend(results)
                except Exception as e:
                    logger.warning("Error processing %s: %s", chem["chem_id"], e)

                if len(batch_buffer) >= args.commit_batch:
                    flush()

                if processed % 100 == 0:
                    elapsed = time.time() - start_time
                    rate = processed / elapsed if elapsed > 0 else 0
                    eta = (total - processed) / rate if rate > 0 else 0
                    logger.info(
                        "Progress: %d/%d (%.1f%%) | %.1f/sec | ETA: %.0fs | buffer: %d",
                        processed, total, 100 * processed / total,
                        rate, eta, len(batch_buffer),
                    )

        flush()

    except KeyboardInterrupt:
        logger.info("Interrupted — saving remaining %d records...", len(batch_buffer))
        flush()

    elapsed = time.time() - start_time
    logger.info("Done: %d chemicals in %.1fs", processed, elapsed)

    # Summary
    conn = sqlite3.connect(args.db)
    cur = conn.cursor()
    cur.execute("SELECT source, COUNT(DISTINCT chem_id) FROM drug_mappings GROUP BY source")
    logger.info("=== drug_mappings summary ===")
    for row in cur.fetchall():
        logger.info("  %s: %d chemicals", row[0], row[1])
    conn.close()


if __name__ == "__main__":
    main()
