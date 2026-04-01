"""Fetch PubChem GHS safety data for ALL chemicals (not just KOSHA).

Extends the original fetch_pubchem_safety_batch.py to cover ECHA and
other non-KOSHA chemicals in chemical_terms.

Features:
  - Resume-safe: tracks "no data" results in _pubchem_nodata table to skip on restart
  - Chunked submission: processes in batches to limit memory usage
  - Rate limiting: respects PubChem's 5 req/s limit
  - Graceful shutdown: commits progress on Ctrl+C

Usage:
  python scripts/fetch_pubchem_safety_all_sources.py --workers 5
  python scripts/fetch_pubchem_safety_all_sources.py --source ECHA --limit 500
  python scripts/fetch_pubchem_safety_all_sources.py --reset-nodata   # clear nodata cache
"""

import argparse
import json
import logging
import os
import re
import signal
import sqlite3
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

import requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

# Graceful shutdown flag
_shutdown = threading.Event()

DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data", "terminology.db",
)

PUBCHEM_CAS_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{cas}/cids/JSON"
PUBCHEM_PUG_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/{cid}/JSON"
REQUEST_HEADERS = {"User-Agent": "ChemIP-BatchFetcher/2.0"}

thread_local = threading.local()


def get_session() -> requests.Session:
    if not hasattr(thread_local, "session"):
        s = requests.Session()
        s.headers.update(REQUEST_HEADERS)
        thread_local.session = s
    return thread_local.session


# Simple rate limiter: max N requests per second across all threads
_rate_lock = threading.Lock()
_rate_tokens = 4.5  # slightly under PubChem's 5/s limit
_rate_last = time.monotonic()


def _rate_wait():
    global _rate_tokens, _rate_last
    with _rate_lock:
        now = time.monotonic()
        elapsed = now - _rate_last
        _rate_tokens = min(4.5, _rate_tokens + elapsed * 4.5)
        _rate_last = now
        if _rate_tokens < 1:
            wait = (1 - _rate_tokens) / 4.5
            time.sleep(wait)
            _rate_tokens = 0
        else:
            _rate_tokens -= 1


def fetch_json(url: str, timeout: int = 10, retries: int = 3) -> Optional[dict]:
    for attempt in range(retries):
        if _shutdown.is_set():
            return None
        _rate_wait()
        try:
            resp = get_session().get(url, timeout=timeout)
            if resp.status_code == 200:
                return resp.json()
            if resp.status_code == 429:
                wait = min(30, 3.0 * (attempt + 1))
                logger.debug("Rate limited (429), waiting %.1fs", wait)
                time.sleep(wait)
                continue
            if resp.status_code in (500, 502, 503, 504):
                time.sleep(2.0 * (attempt + 1))
                continue
            return None
        except requests.ConnectionError:
            logger.warning("Connection error (attempt %d/%d): %s", attempt + 1, retries, url[:80])
            time.sleep(3.0 * (attempt + 1))
        except requests.Timeout:
            logger.debug("Timeout (attempt %d/%d)", attempt + 1, retries)
            time.sleep(1.0 * (attempt + 1))
        except requests.RequestException as e:
            logger.warning("Request error: %s", e)
            time.sleep(1.0 * (attempt + 1))
    return None


def get_cid(cas_no: str, name_en: str) -> Optional[int]:
    """Try CAS first, then English name."""
    if cas_no:
        data = fetch_json(PUBCHEM_CAS_URL.format(cas=cas_no))
        if data:
            cids = data.get("IdentifierList", {}).get("CID", [])
            if cids:
                return cids[0]

    if name_en:
        safe_name = requests.utils.quote(name_en, safe="")
        data = fetch_json(PUBCHEM_CAS_URL.format(cas=safe_name))
        if data:
            cids = data.get("IdentifierList", {}).get("CID", [])
            if cids:
                return cids[0]

    return None


def extract_ghs(pug_data: dict) -> dict:
    result = {
        "signal_word": "",
        "ghs_classification": [],
        "hazard_statements": [],
        "precautionary_statements": [],
        "pictograms": [],
    }

    def add(dst, text):
        if text and text not in dst:
            dst.append(text)

    def walk(nodes):
        for node in nodes:
            heading = node.get("TOCHeading", "")

            if heading in ("GHS Classification", "Hazard Classes and Categories", "UN GHS Classification"):
                for info in node.get("Information", []):
                    name = info.get("Name", "")
                    items = info.get("Value", {}).get("StringWithMarkup", [])
                    if name in ("GHS Hazard Statements", "Hazard Statements"):
                        for s in items: add(result["hazard_statements"], s.get("String", ""))
                    elif name in ("Precautionary Statement Codes", "Precautionary Statements"):
                        for s in items: add(result["precautionary_statements"], s.get("String", ""))
                    elif name == "Signal":
                        for s in items:
                            if s.get("String"): result["signal_word"] = s["String"]
                    elif name == "Pictogram(s)":
                        for s in items:
                            for m in s.get("Markup", []):
                                if m.get("Type") == "Icon": add(result["pictograms"], m.get("Extra", ""))
                    else:
                        for s in items: add(result["ghs_classification"], s.get("String", ""))

            if "Section" in node:
                walk(node["Section"])

    sections = pug_data.get("Record", {}).get("Section", [])
    for sec in sections:
        if sec.get("TOCHeading") in ("Safety and Hazards", "Chemical Safety"):
            walk(sec.get("Section", []))
            break

    return result


def process_chemical(chem_id: str, cas_no: str, name_en: str) -> Optional[tuple]:
    """Fetch PubChem GHS data for a single chemical. Returns save tuple or None."""
    cid = get_cid(cas_no, name_en)
    if not cid:
        return None

    pug = fetch_json(PUBCHEM_PUG_URL.format(cid=cid), timeout=15)
    if not pug:
        return None

    ghs = extract_ghs(pug)
    if not ghs["signal_word"] and not ghs["ghs_classification"] and not ghs["hazard_statements"]:
        return None

    return (
        chem_id, cas_no, name_en, cid,
        ghs["signal_word"],
        json.dumps(ghs["ghs_classification"], ensure_ascii=False),
        json.dumps(ghs["hazard_statements"], ensure_ascii=False),
        json.dumps(ghs["precautionary_statements"], ensure_ascii=False),
        json.dumps(ghs["pictograms"], ensure_ascii=False),
    )


def ensure_nodata_table(conn: sqlite3.Connection):
    """Create tracking table for chemicals with no PubChem GHS data."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS _pubchem_nodata (
            chem_id TEXT PRIMARY KEY,
            checked_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.commit()


def load_remaining(db_path: str, source: str | None, limit: int) -> list[tuple]:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=10000")
    cur = conn.cursor()

    ensure_nodata_table(conn)

    source_filter = f"AND ct.source = '{source}'" if source else ""

    sql = f"""
        SELECT
            CASE
                WHEN ct.description LIKE 'KOSHA_ID:%' THEN substr(ct.description, 10)
                ELSE ct.description
            END AS chem_id,
            ct.cas_no,
            COALESCE(ct.name_en, ct.name, '')
        FROM chemical_terms ct
        WHERE ct.cas_no IS NOT NULL AND trim(ct.cas_no) != ''
          {source_filter}
          AND NOT EXISTS (
              SELECT 1 FROM msds_english me WHERE me.chem_id =
                  CASE
                      WHEN ct.description LIKE 'KOSHA_ID:%' THEN substr(ct.description, 10)
                      ELSE ct.description
                  END
          )
          AND NOT EXISTS (
              SELECT 1 FROM _pubchem_nodata nd WHERE nd.chem_id =
                  CASE
                      WHEN ct.description LIKE 'KOSHA_ID:%' THEN substr(ct.description, 10)
                      ELSE ct.description
                  END
          )
        ORDER BY ct.id
    """
    if limit > 0:
        sql += f" LIMIT {int(limit)}"

    rows = cur.execute(sql).fetchall()
    conn.close()
    return rows


def _commit_batch(cur, conn, save_batch, nodata_batch):
    """Commit both save and nodata batches atomically."""
    if save_batch:
        cur.executemany(
            """INSERT OR REPLACE INTO msds_english
               (chem_id, cas_no, name_en, pubchem_cid, signal_word,
                ghs_classification, hazard_statements, precautionary_statements, pictograms)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            save_batch,
        )
    if nodata_batch:
        cur.executemany(
            "INSERT OR IGNORE INTO _pubchem_nodata (chem_id) VALUES (?)",
            [(cid,) for cid in nodata_batch],
        )
    conn.commit()


def main():
    parser = argparse.ArgumentParser(description="Fetch PubChem GHS for all sources")
    parser.add_argument("--workers", type=int, default=5, help="Parallel workers (keep ≤5 for PubChem rate limit)")
    parser.add_argument("--commit-batch", type=int, default=80)
    parser.add_argument("--chunk-size", type=int, default=500, help="Submit futures in chunks to limit memory")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--source", type=str, default=None, help="Filter by source (ECHA, COMPTOX)")
    parser.add_argument("--reset-nodata", action="store_true", help="Clear nodata cache and re-check all")
    parser.add_argument("--db", type=str, default=DB_PATH)
    args = parser.parse_args()

    # Set up graceful shutdown
    def _signal_handler(sig, frame):
        logger.info("Shutdown requested (signal %s), finishing current batch...", sig)
        _shutdown.set()
    signal.signal(signal.SIGINT, _signal_handler)
    signal.signal(signal.SIGTERM, _signal_handler)

    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=10000")
    cur = conn.cursor()

    ensure_nodata_table(conn)

    if args.reset_nodata:
        cur.execute("DELETE FROM _pubchem_nodata")
        conn.commit()
        logger.info("Cleared _pubchem_nodata cache")

    targets = load_remaining(args.db, args.source, args.limit)
    total = len(targets)
    logger.info("[start] %d chemicals to process (source=%s)", total, args.source or "all")
    if not targets:
        logger.info("[done] nothing to process")
        conn.close()
        return

    saved = 0
    no_ghs = 0
    errors = 0
    save_batch: list[tuple] = []
    nodata_batch: list[str] = []
    start = time.time()
    processed = 0

    # Process in chunks to avoid submitting all 80K futures at once
    for chunk_start in range(0, total, args.chunk_size):
        if _shutdown.is_set():
            break

        chunk = targets[chunk_start : chunk_start + args.chunk_size]

        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = {
                pool.submit(process_chemical, row[0], row[1], row[2]): row[0]
                for row in chunk
            }

            for future in as_completed(futures):
                if _shutdown.is_set():
                    pool.shutdown(wait=False, cancel_futures=True)
                    break

                chem_id = futures[future]
                processed += 1

                try:
                    result = future.result(timeout=60)
                    if result:
                        save_batch.append(result)
                        saved += 1
                    else:
                        nodata_batch.append(chem_id)
                        no_ghs += 1
                except Exception as e:
                    logger.debug("Error processing %s: %s", chem_id, e)
                    errors += 1

                if len(save_batch) + len(nodata_batch) >= args.commit_batch:
                    _commit_batch(cur, conn, save_batch, nodata_batch)
                    save_batch = []
                    nodata_batch = []

                if processed % 200 == 0:
                    elapsed = time.time() - start
                    rate = processed / elapsed if elapsed > 0 else 0
                    remaining = total - processed
                    eta = remaining / rate if rate > 0 else 0
                    logger.info(
                        "[progress] %d/%d saved=%d no_data=%d errors=%d speed=%.1f/s ETA=%.0fs",
                        processed, total, saved, no_ghs, errors, rate, eta,
                    )

    # Final batch
    _commit_batch(cur, conn, save_batch, nodata_batch)
    conn.close()

    elapsed = time.time() - start
    logger.info(
        "[done] %d/%d processed, %d saved, %d no_data, %d errors, %.1f s",
        processed, total, saved, no_ghs, errors, elapsed,
    )
    if _shutdown.is_set():
        logger.info("[resumed] Re-run to continue from where we left off")


if __name__ == "__main__":
    main()
