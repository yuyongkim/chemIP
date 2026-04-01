"""Discover new chemicals from PubChem that have GHS safety data.

Uses PubChem PUG REST API to find compounds with GHS hazard
classifications, then imports those not already in our DB.

Features:
  - Resume-safe: tracks discovered CIDs in _pubchem_discovered table
  - Chunked processing: limits memory usage for large batches
  - Rate limiting: respects PubChem's 5 req/s limit
  - Graceful shutdown: commits progress on Ctrl+C

Usage:
  python scripts/discover_pubchem_chemicals.py --limit 5000
  python scripts/discover_pubchem_chemicals.py --workers 4
  python scripts/discover_pubchem_chemicals.py --reset  # clear discovery cache
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

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

_shutdown = threading.Event()

DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data", "terminology.db",
)

# PubChem APIs
PUGREST_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
CLASSIFICATION_URL = f"{PUGREST_BASE}/compound/listkey/{{listkey}}/cids/JSON"
PROPERTY_URL = f"{PUGREST_BASE}/compound/cid/{{cid}}/property/IUPACName,Title,MolecularFormula,CAS/JSON"

# GHS classification tree node IDs in PubChem
# These are top-level GHS hazard class nodes
GHS_HEADINGS = [
    "Flammable Liquids",
    "Acute Toxicity",
    "Skin Corrosion/Irritation",
    "Serious Eye Damage/Eye Irritation",
    "Carcinogenicity",
    "Reproductive Toxicity",
    "Specific Target Organ Toxicity",
    "Oxidizing Liquids",
    "Oxidizing Solids",
    "Organic Peroxides",
    "Explosives",
]

REQUEST_HEADERS = {"User-Agent": "ChemIP-Discovery/2.0"}

thread_local = threading.local()


def get_session() -> requests.Session:
    if not hasattr(thread_local, "session"):
        s = requests.Session()
        s.headers.update(REQUEST_HEADERS)
        thread_local.session = s
    return thread_local.session


_rate_lock = threading.Lock()
_rate_tokens = 4.5
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


def fetch_json(url: str, params: dict | None = None, timeout: int = 15, retries: int = 3) -> Optional[dict]:
    for attempt in range(retries):
        if _shutdown.is_set():
            return None
        _rate_wait()
        try:
            resp = get_session().get(url, params=params, timeout=timeout)
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


def discover_cids_by_ghs(limit: int = 10000) -> list[int]:
    """Use PubChem compound search to find CIDs with GHS annotations.

    PubChem doesn't have a direct 'list all GHS compounds' API,
    so we search for common hazard-related terms to discover compounds.
    """
    search_terms = [
        "GHS classification",
        "flammable",
        "oxidizer",
        "corrosive",
        "toxic",
        "carcinogen",
        "mutagen",
        "explosive",
        "irritant",
        "sensitizer",
        "environmental hazard",
        "acute toxicity",
        "reproductive toxicity",
        "aspiration hazard",
    ]

    all_cids: set[int] = set()

    for term in search_terms:
        if len(all_cids) >= limit:
            break

        # Use PubChem PUG REST substance search
        url = f"{PUGREST_BASE}/compound/name/{requests.utils.quote(term, safe='')}/cids/JSON"
        data = fetch_json(url, timeout=15)
        if data:
            cids = data.get("IdentifierList", {}).get("CID", [])
            all_cids.update(cids[:500])  # cap per term
            logger.info("Term '%s': %d CIDs (total unique: %d)", term, len(cids), len(all_cids))

        time.sleep(0.3)

    # Also get CIDs by searching common chemical categories
    category_searches = [
        "solvent", "pesticide", "herbicide", "fungicide", "monomer",
        "catalyst", "surfactant", "plasticizer", "dye", "pigment",
        "preservative", "antioxidant", "flame retardant", "biocide",
        "pharmaceutical intermediate", "reagent",
    ]

    for term in category_searches:
        if len(all_cids) >= limit:
            break

        url = f"{PUGREST_BASE}/compound/name/{requests.utils.quote(term, safe='')}/cids/JSON"
        data = fetch_json(url, timeout=15)
        if data:
            cids = data.get("IdentifierList", {}).get("CID", [])
            all_cids.update(cids[:200])
            logger.info("Category '%s': %d CIDs (total unique: %d)", term, len(cids), len(all_cids))

        time.sleep(0.3)

    return list(all_cids)[:limit]


def get_compound_properties(cid: int) -> Optional[dict]:
    """Fetch basic properties for a compound."""
    url = f"{PUGREST_BASE}/compound/cid/{cid}/property/IUPACName,Title,MolecularFormula/JSON"
    time.sleep(0.2)
    data = fetch_json(url, timeout=10)
    if not data:
        return None

    props = data.get("PropertyTable", {}).get("Properties", [])
    if not props:
        return None

    p = props[0]
    return {
        "cid": cid,
        "name": p.get("Title", ""),
        "iupac": p.get("IUPACName", ""),
        "formula": p.get("MolecularFormula", ""),
    }


def get_cas_for_cid(cid: int) -> Optional[str]:
    """Try to get CAS number for a CID via synonyms."""
    url = f"{PUGREST_BASE}/compound/cid/{cid}/synonyms/JSON"
    data = fetch_json(url, timeout=10)
    if not data:
        return None

    synonyms = data.get("InformationList", {}).get("Information", [])
    if not synonyms:
        return None

    cas_pattern = re.compile(r"^\d{2,7}-\d{2}-\d$")
    for syn_entry in synonyms:
        for syn in syn_entry.get("Synonym", []):
            if cas_pattern.match(syn):
                return syn

    return None


def process_cid(cid: int, existing_cas: set, existing_cids: set) -> Optional[dict]:
    """Process a single CID: get properties, check duplication, return record."""
    if cid in existing_cids:
        return None

    props = get_compound_properties(cid)
    if not props or not props["name"]:
        return None

    time.sleep(0.2)
    cas = get_cas_for_cid(cid)

    # Skip if CAS already in DB
    if cas and cas in existing_cas:
        return None

    return {
        "cid": cid,
        "name": props["name"],
        "iupac": props.get("iupac", ""),
        "formula": props.get("formula", ""),
        "cas": cas,
    }


def ensure_discovery_table(conn: sqlite3.Connection):
    """Track which CIDs have been attempted (to skip on resume)."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS _pubchem_discovered (
            cid INTEGER PRIMARY KEY,
            status TEXT DEFAULT 'skip',
            checked_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.commit()


def load_existing(db_path: str) -> tuple[set[str], set[int]]:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=10000")
    cur = conn.cursor()

    ensure_discovery_table(conn)

    cur.execute("SELECT cas_no FROM chemical_terms WHERE cas_no IS NOT NULL AND cas_no != ''")
    cas_set = {r[0] for r in cur.fetchall()}

    cur.execute("SELECT pubchem_cid FROM msds_english WHERE pubchem_cid IS NOT NULL")
    cid_set = {r[0] for r in cur.fetchall()}

    # Also check description for existing PubChem IDs
    cur.execute("SELECT external_id FROM chemical_terms WHERE source = 'PUBCHEM'")
    for r in cur.fetchall():
        try:
            cid_set.add(int(r[0]))
        except (ValueError, TypeError):
            pass

    # Include previously attempted CIDs
    cur.execute("SELECT cid FROM _pubchem_discovered")
    for r in cur.fetchall():
        cid_set.add(r[0])

    conn.close()
    return cas_set, cid_set


def _insert_batch(cur, conn, batch, existing_cas, existing_cids, skip_cids):
    """Insert a batch of discovered chemicals and track skipped CIDs."""
    inserted = 0
    for rec in batch:
        desc = f"PUBCHEM_ID:{rec['cid']}"
        name = rec["name"]
        if rec["iupac"] and rec["iupac"] != name:
            display = f"{name} ({rec['iupac']})"
        else:
            display = name

        cur.execute(
            """INSERT OR IGNORE INTO chemical_terms
               (name, cas_no, description, name_en, source, external_id)
               VALUES (?, ?, ?, ?, 'PUBCHEM', ?)""",
            (display, rec["cas"], desc, name, str(rec["cid"])),
        )
        if cur.rowcount > 0:
            row_id = cur.lastrowid
            cur.execute(
                """INSERT INTO chemical_terms_fts (rowid, name, cas_no, description, name_en)
                   VALUES (?, ?, ?, ?, ?)""",
                (row_id, display, rec["cas"], desc, name),
            )
            inserted += 1
            if rec["cas"]:
                existing_cas.add(rec["cas"])
            existing_cids.add(rec["cid"])

    # Track all attempted CIDs (both inserted and skipped)
    if skip_cids:
        cur.executemany(
            "INSERT OR IGNORE INTO _pubchem_discovered (cid, status) VALUES (?, 'skip')",
            [(c,) for c in skip_cids],
        )
    for rec in batch:
        cur.execute(
            "INSERT OR REPLACE INTO _pubchem_discovered (cid, status) VALUES (?, 'inserted')",
            (rec["cid"],),
        )

    conn.commit()
    return inserted


def main():
    parser = argparse.ArgumentParser(description="Discover PubChem chemicals")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--limit", type=int, default=5000, help="Max CIDs to discover")
    parser.add_argument("--commit-batch", type=int, default=50)
    parser.add_argument("--chunk-size", type=int, default=300, help="Submit futures in chunks")
    parser.add_argument("--reset", action="store_true", help="Clear discovery cache")
    parser.add_argument("--db", type=str, default=DB_PATH)
    args = parser.parse_args()

    # Graceful shutdown
    def _signal_handler(sig, frame):
        logger.info("Shutdown requested, finishing current batch...")
        _shutdown.set()
    signal.signal(signal.SIGINT, _signal_handler)
    signal.signal(signal.SIGTERM, _signal_handler)

    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=10000")
    cur = conn.cursor()
    ensure_discovery_table(conn)

    if args.reset:
        cur.execute("DELETE FROM _pubchem_discovered")
        conn.commit()
        logger.info("Cleared discovery cache")

    existing_cas, existing_cids = load_existing(args.db)
    logger.info("Existing: %d CAS numbers, %d PubChem CIDs (incl. previously attempted)", len(existing_cas), len(existing_cids))

    # Phase 1: Discover CIDs
    logger.info("Phase 1: Discovering CIDs from PubChem...")
    cids = discover_cids_by_ghs(limit=args.limit)
    # Filter out already-known CIDs
    cids = [c for c in cids if c not in existing_cids]
    logger.info("Discovered %d new CIDs to process", len(cids))

    if not cids or _shutdown.is_set():
        logger.info("Nothing to process. Done.")
        conn.close()
        return

    # Phase 2: Fetch properties and insert (chunked)
    logger.info("Phase 2: Fetching properties and inserting...")
    total_inserted = 0
    total_skipped = 0
    total_errors = 0
    total = len(cids)
    processed = 0
    start = time.time()

    for chunk_start in range(0, total, args.chunk_size):
        if _shutdown.is_set():
            break

        chunk = cids[chunk_start : chunk_start + args.chunk_size]
        batch: list[dict] = []
        skip_cids: list[int] = []

        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = {
                pool.submit(process_cid, cid, existing_cas, existing_cids): cid
                for cid in chunk
            }

            for future in as_completed(futures):
                if _shutdown.is_set():
                    pool.shutdown(wait=False, cancel_futures=True)
                    break

                cid = futures[future]
                processed += 1

                try:
                    result = future.result(timeout=60)
                    if result:
                        batch.append(result)
                    else:
                        skip_cids.append(cid)
                        total_skipped += 1
                except Exception as e:
                    logger.debug("Error processing CID %d: %s", cid, e)
                    skip_cids.append(cid)
                    total_errors += 1

                if len(batch) + len(skip_cids) >= args.commit_batch:
                    total_inserted += _insert_batch(cur, conn, batch, existing_cas, existing_cids, skip_cids)
                    batch = []
                    skip_cids = []

                if processed % 100 == 0:
                    elapsed = time.time() - start
                    rate = processed / elapsed if elapsed > 0 else 0
                    logger.info(
                        "[progress] %d/%d inserted=%d skipped=%d errors=%d speed=%.1f/s",
                        processed, total, total_inserted, total_skipped, total_errors, rate,
                    )

        # Commit remaining chunk batch
        if batch or skip_cids:
            total_inserted += _insert_batch(cur, conn, batch, existing_cas, existing_cids, skip_cids)

    conn.close()
    elapsed = time.time() - start

    logger.info("=== PubChem Discovery Complete ===")
    logger.info("  Processed: %d/%d", processed, total)
    logger.info("  Inserted: %d", total_inserted)
    logger.info("  Skipped: %d", total_skipped)
    logger.info("  Errors: %d", total_errors)
    logger.info("  Time: %.1fs", elapsed)
    if _shutdown.is_set():
        logger.info("  [resume] Re-run to continue from where we left off")

    # Verify
    conn2 = sqlite3.connect(args.db)
    cur2 = conn2.cursor()
    cur2.execute("SELECT source, COUNT(*) FROM chemical_terms GROUP BY source")
    for r in cur2.fetchall():
        logger.info("  %s: %d", r[0], r[1])
    conn2.close()


if __name__ == "__main__":
    main()
