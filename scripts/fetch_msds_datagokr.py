"""Fetch KOSHA MSDS 16-section detail via data.go.kr proxy.

Bypasses the blocked msds.kosha.or.kr by using apis.data.go.kr/B552468/msdschem.
Daily limit: 1,000 calls per section endpoint (16 endpoints).

Strategy: process 1,000 chemicals per day, all 16 sections each.
Resume-safe: skips chemicals that already have all 16 sections.

Usage:
  python scripts/fetch_msds_datagokr.py                  # today's batch (1000)
  python scripts/fetch_msds_datagokr.py --limit 50       # test
  python scripts/fetch_msds_datagokr.py --section 2      # single section only
"""

import argparse
import logging
import os
import signal
import sqlite3
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "terminology.db")
BASE_URL = "https://apis.data.go.kr/B552468/msdschem"
from dotenv import load_dotenv
load_dotenv()
API_KEY = os.getenv("KOSHA_SERVICE_KEY_DECODED", "")

DAILY_LIMIT = 1000
ALL_SECTIONS = list(range(1, 17))

_shutdown = False


def _signal_handler(sig, frame):
    global _shutdown
    logger.info("Shutdown requested, finishing current item...")
    _shutdown = True

signal.signal(signal.SIGINT, _signal_handler)
signal.signal(signal.SIGTERM, _signal_handler)


def fetch_section(chem_id: str, section_no: int, retries: int = 3) -> str | None:
    """Fetch one MSDS section. Returns XML string or None."""
    url = f"{BASE_URL}/getChemDetail{section_no:02d}"
    for attempt in range(retries):
        try:
            r = requests.get(url, params={
                "serviceKey": API_KEY,
                "chemId": chem_id,
            }, timeout=15)
            if r.status_code == 200:
                if "<resultCode>00</resultCode>" in r.text and "<itemDetail>" in r.text:
                    return r.text
                elif "<resultCode>00</resultCode>" in r.text:
                    return None  # success but no data
                else:
                    # API error
                    logger.debug("API error for %s sec %d: %s", chem_id, section_no, r.text[:200])
                    return None
            elif r.status_code == 429:
                logger.warning("Rate limited, waiting 60s...")
                time.sleep(60)
                continue
            else:
                logger.debug("HTTP %d for %s sec %d", r.status_code, chem_id, section_no)
                time.sleep(2 * (attempt + 1))
        except requests.RequestException as e:
            logger.debug("Error %s sec %d: %s", chem_id, section_no, e)
            time.sleep(2 * (attempt + 1))
    return None


def get_work_items(db_path: str, sections: list[int], limit: int) -> list[tuple[str, list[int]]]:
    """Get (chem_id, missing_sections) pairs to process."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # All KOSHA chem_ids
    cur.execute("SELECT description FROM chemical_terms WHERE description LIKE 'KOSHA_ID:%'")
    all_ids = [r[0].split(":")[1] for r in cur.fetchall()]

    # Already collected sections per chem_id
    cur.execute("SELECT chem_id, GROUP_CONCAT(section_no) FROM msds_details GROUP BY chem_id")
    existing = {}
    for row in cur.fetchall():
        if row[1]:
            existing[row[0]] = set(int(s) for s in row[1].split(",") if s.isdigit())

    conn.close()

    target_sections = set(sections)
    work = []
    for cid in all_ids:
        have = existing.get(cid, set())
        missing = target_sections - have
        if missing:
            work.append((cid, sorted(missing)))

    # Sort: chemicals with most missing sections first (maximize value per API call)
    work.sort(key=lambda x: -len(x[1]))
    return work[:limit]


def _fetch_one(args_tuple):
    """Worker: fetch one (chem_id, section_no) pair."""
    chem_id, sec = args_tuple
    xml_data = fetch_section(chem_id, sec)
    return chem_id, sec, xml_data


def main():
    parser = argparse.ArgumentParser(description="Fetch KOSHA MSDS via data.go.kr")
    parser.add_argument("--limit", type=int, default=DAILY_LIMIT)
    parser.add_argument("--workers", type=int, default=8, help="Parallel workers")
    parser.add_argument("--section", type=int, default=0, help="Specific section (0=all)")
    parser.add_argument("--db", default=DB_PATH)
    args = parser.parse_args()

    sections = [args.section] if args.section > 0 else ALL_SECTIONS

    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")
    cur = conn.cursor()

    work = get_work_items(args.db, sections, args.limit)
    total_calls = sum(len(missing) for _, missing in work)
    logger.info("Work items: %d chemicals, %d API calls, %d workers", len(work), total_calls, args.workers)

    if not work:
        logger.info("Nothing to do")
        conn.close()
        return

    saved = 0
    empty = 0
    errors = 0
    api_calls = 0
    start = time.time()

    # Flatten work into (chem_id, section_no) pairs
    all_tasks = []
    for chem_id, missing_sections in work:
        for sec in missing_sections:
            all_tasks.append((chem_id, sec))

    # Process in chunks to commit periodically
    CHUNK = 500
    for chunk_start in range(0, len(all_tasks), CHUNK):
        if _shutdown:
            break

        chunk = all_tasks[chunk_start:chunk_start + CHUNK]
        batch_results = []

        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = {pool.submit(_fetch_one, task): task for task in chunk}
            for future in as_completed(futures):
                if _shutdown:
                    pool.shutdown(wait=False, cancel_futures=True)
                    break
                try:
                    chem_id, sec, xml_data = future.result(timeout=30)
                    api_calls += 1
                    if xml_data:
                        batch_results.append((chem_id, sec, xml_data))
                        saved += 1
                    else:
                        empty += 1
                except Exception:
                    errors += 1

        # Batch insert
        if batch_results:
            cur.executemany(
                "INSERT OR REPLACE INTO msds_details (chem_id, section_no, xml_data) VALUES (?, ?, ?)",
                batch_results,
            )
            conn.commit()

        done = chunk_start + len(chunk)
        if done % 2000 < CHUNK or done >= len(all_tasks):
            elapsed = time.time() - start
            rate = api_calls / elapsed if elapsed > 0 else 0
            remaining = len(all_tasks) - done
            eta = remaining / rate / 60 if rate > 0 else 0
            logger.info(
                "[%d/%d calls] saved=%d empty=%d errors=%d speed=%.1f/s ETA=%.0fm",
                done, len(all_tasks), saved, empty, errors, rate, eta,
            )

    conn.commit()
    conn.close()

    elapsed = time.time() - start
    logger.info("=== Done ===")
    logger.info("  Chemicals: %d", len(work))
    logger.info("  API calls: %d", api_calls)
    logger.info("  Saved: %d sections", saved)
    logger.info("  Empty: %d", empty)
    logger.info("  Errors: %d", errors)
    logger.info("  Time: %.0fs (%.1f calls/s)", elapsed, api_calls / elapsed if elapsed > 0 else 0)
    if _shutdown:
        logger.info("  [resume] Re-run to continue")

    # Stats
    conn2 = sqlite3.connect(args.db)
    c2 = conn2.cursor()
    c2.execute("SELECT COUNT(DISTINCT chem_id) FROM msds_details")
    total_chems = c2.fetchone()[0]
    c2.execute("SELECT COUNT(*) FROM msds_details")
    total_records = c2.fetchone()[0]
    c2.execute("""SELECT COUNT(*) FROM (
        SELECT chem_id FROM msds_details GROUP BY chem_id HAVING COUNT(DISTINCT section_no) = 16
    )""")
    complete = c2.fetchone()[0]
    conn2.close()
    logger.info("  DB: %d chemicals, %d records, %d complete (16/16)", total_chems, total_records, complete)


if __name__ == "__main__":
    main()
