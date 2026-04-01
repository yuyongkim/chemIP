"""Bulk import PubChem GHS data using FTP bulk files instead of API calls.

Strategy:
  1. Download CID-Synonym-filtered.gz → extract CAS→CID mapping
  2. Download CID-LCSS.xml.gz → extract GHS safety data per CID
  3. Match our DB's CAS numbers → insert into msds_english

This is 100x faster than per-chemical API calls.

Usage:
  python scripts/bulk_pubchem_ghs.py                    # full pipeline
  python scripts/bulk_pubchem_ghs.py --skip-download    # reuse cached files
  python scripts/bulk_pubchem_ghs.py --step synonym     # only build CAS→CID map
  python scripts/bulk_pubchem_ghs.py --step ghs         # only parse GHS
  python scripts/bulk_pubchem_ghs.py --step import      # only import to DB
"""

import argparse
import gzip
import json
import logging
import os
import re
import sqlite3
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
CACHE_DIR = DATA_DIR / "pubchem_cache"
DB_PATH = DATA_DIR / "terminology.db"

SYNONYM_URL = "https://ftp.ncbi.nlm.nih.gov/pubchem/Compound/Extras/CID-Synonym-filtered.gz"
LCSS_URL = "https://ftp.ncbi.nlm.nih.gov/pubchem/Compound/Extras/CID-LCSS.xml.gz"

SYNONYM_FILE = CACHE_DIR / "CID-Synonym-filtered.gz"
LCSS_FILE = CACHE_DIR / "CID-LCSS.xml.gz"
CAS_CID_MAP_FILE = CACHE_DIR / "cas_cid_map.json"
GHS_DATA_FILE = CACHE_DIR / "ghs_by_cid.json"

CAS_RE = re.compile(r"^\d{2,7}-\d{2}-\d$")


def download_file(url: str, dest: Path, chunk_size: int = 1024 * 1024, max_retries: int = 10):
    """Download with resume support and automatic retry on network errors."""
    dest.parent.mkdir(parents=True, exist_ok=True)

    headers_base = {"User-Agent": "ChemIP-Bulk/2.0"}

    # Check remote size
    head = requests.head(url, headers=headers_base, timeout=30, allow_redirects=True)
    remote_size = int(head.headers.get("Content-Length", 0))

    existing_size = dest.stat().st_size if dest.exists() else 0
    if existing_size >= remote_size and remote_size > 0:
        logger.info("Already downloaded: %s (%d MB)", dest.name, remote_size // (1024 * 1024))
        return

    start = time.time()

    for attempt in range(max_retries):
        existing_size = dest.stat().st_size if dest.exists() else 0
        if existing_size >= remote_size and remote_size > 0:
            break

        headers = dict(headers_base)
        if existing_size > 0:
            headers["Range"] = f"bytes={existing_size}-"
            if attempt == 0:
                logger.info("Resuming %s from %d MB", dest.name, existing_size // (1024 * 1024))
            else:
                logger.info("Retry %d: resuming from %d MB", attempt + 1, existing_size // (1024 * 1024))

        try:
            resp = requests.get(url, headers=headers, stream=True, timeout=(15, 60))
            resp.raise_for_status()

            mode = "ab" if existing_size > 0 else "wb"
            downloaded = existing_size
            last_log = time.time()

            with open(dest, mode) as f:
                for chunk in resp.iter_content(chunk_size=chunk_size):
                    f.write(chunk)
                    f.flush()
                    downloaded += len(chunk)

                    now = time.time()
                    if now - last_log >= 5.0:
                        elapsed = now - start
                        speed = (downloaded - existing_size) / (now - start + 0.01) / 1024 / 1024
                        pct = downloaded / remote_size * 100 if remote_size else 0
                        logger.info(
                            "  %s: %.0f%% (%d/%d MB) %.1f MB/s",
                            dest.name, pct, downloaded // (1024 * 1024),
                            remote_size // (1024 * 1024), speed,
                        )
                        last_log = now

            # If we got here cleanly, break
            break

        except (requests.ConnectionError, requests.Timeout, requests.ChunkedEncodingError) as e:
            current = dest.stat().st_size if dest.exists() else 0
            logger.warning("Download interrupted at %d MB: %s", current // (1024 * 1024), e)
            time.sleep(2 * (attempt + 1))
            continue

    final_size = dest.stat().st_size if dest.exists() else 0
    elapsed = time.time() - start
    logger.info("Downloaded: %s (%d MB, %.0fs)", dest.name, final_size // (1024 * 1024), elapsed)


def build_cas_cid_map(target_cas: set[str]) -> dict[str, int]:
    """Parse CID-Synonym-filtered.gz to extract CAS→CID for our target CAS numbers.

    File format: each line is "CID\tSynonym"
    We only keep lines where synonym matches CAS pattern AND is in our target set.
    """
    if CAS_CID_MAP_FILE.exists():
        logger.info("Loading cached CAS→CID map...")
        with open(CAS_CID_MAP_FILE) as f:
            cached = json.load(f)
        logger.info("Cached map: %d entries", len(cached))
        return cached

    logger.info("Parsing CID-Synonym-filtered.gz for %d target CAS numbers...", len(target_cas))
    cas_cid: dict[str, int] = {}
    lines_read = 0
    start = time.time()

    with gzip.open(SYNONYM_FILE, "rt", encoding="utf-8", errors="replace") as f:
        for line in f:
            lines_read += 1
            parts = line.rstrip("\n").split("\t", 1)
            if len(parts) != 2:
                continue

            cid_str, synonym = parts
            synonym = synonym.strip()

            # Quick check: does it look like a CAS number?
            if not CAS_RE.match(synonym):
                continue

            # Is it one of our targets?
            if synonym in target_cas:
                try:
                    cid = int(cid_str)
                    # Keep first (lowest) CID per CAS
                    if synonym not in cas_cid:
                        cas_cid[synonym] = cid
                except ValueError:
                    continue

            if lines_read % 20_000_000 == 0:
                elapsed = time.time() - start
                logger.info(
                    "  %dM lines, %d CAS matched, %.0fs",
                    lines_read // 1_000_000, len(cas_cid), elapsed,
                )

    elapsed = time.time() - start
    logger.info("Parsed %dM lines in %.0fs → %d CAS→CID mappings", lines_read // 1_000_000, elapsed, len(cas_cid))

    # Cache result
    with open(CAS_CID_MAP_FILE, "w") as f:
        json.dump(cas_cid, f)

    return cas_cid


def parse_lcss_for_cids(target_cids: set[int]) -> dict[int, dict]:
    """Parse CID-LCSS.xml.gz to extract GHS data for target CIDs.

    The LCSS XML has one <Record> per compound with GHS classification info.
    """
    if GHS_DATA_FILE.exists():
        logger.info("Loading cached GHS data...")
        with open(GHS_DATA_FILE) as f:
            cached = json.load(f)
        # Keys are strings in JSON, convert to int
        result = {int(k): v for k, v in cached.items()}
        logger.info("Cached GHS data: %d entries", len(result))
        return result

    logger.info("Parsing CID-LCSS.xml.gz for %d target CIDs...", len(target_cids))
    ghs_data: dict[int, dict] = {}
    start = time.time()
    records_seen = 0

    # Stream parse the XML (it's too large for full DOM)
    with gzip.open(LCSS_FILE, "rb") as f:
        context = ET.iterparse(f, events=("end",))
        current_cid = None

        for event, elem in context:
            tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag

            if tag == "Record":
                records_seen += 1
                # Extract CID from RecordNumber
                rn = elem.find(".//{*}RecordNumber")
                if rn is None:
                    rn = elem.find(".//RecordNumber")
                if rn is not None:
                    try:
                        cid = int(rn.text)
                    except (ValueError, TypeError):
                        elem.clear()
                        continue

                    if cid in target_cids:
                        ghs = _extract_ghs_from_record(elem)
                        if ghs and (ghs["signal_word"] or ghs["hazard_statements"]):
                            ghs_data[cid] = ghs

                elem.clear()

                if records_seen % 50_000 == 0:
                    elapsed = time.time() - start
                    logger.info(
                        "  %dk records, %d GHS matched, %.0fs",
                        records_seen // 1000, len(ghs_data), elapsed,
                    )

    elapsed = time.time() - start
    logger.info("Parsed %dk records in %.0fs → %d with GHS data", records_seen // 1000, elapsed, len(ghs_data))

    # Cache result
    with open(GHS_DATA_FILE, "w") as f:
        json.dump({str(k): v for k, v in ghs_data.items()}, f, ensure_ascii=False)

    return ghs_data


def _extract_ghs_from_record(record_elem) -> dict:
    """Extract GHS classification from an LCSS Record XML element."""
    result = {
        "signal_word": "",
        "ghs_classification": [],
        "hazard_statements": [],
        "precautionary_statements": [],
        "pictograms": [],
    }

    # Walk all Section elements looking for GHS-related content
    for section in record_elem.iter():
        tag = section.tag.split("}")[-1] if "}" in section.tag else section.tag

        if tag == "TOCHeading":
            heading = (section.text or "").strip()

        if tag == "Information":
            name_elem = section.find(".//{*}Name")
            if name_elem is None:
                name_elem = section.find(".//Name")
            name = ((name_elem.text or "") if name_elem is not None else "").strip()

            strings = []
            for swm in section.iter():
                swm_tag = swm.tag.split("}")[-1] if "}" in swm.tag else swm.tag
                if swm_tag == "String" and swm.text:
                    strings.append(swm.text.strip())

            if "Hazard Statement" in name or "GHS Hazard" in name:
                for s in strings:
                    if s and s not in result["hazard_statements"]:
                        result["hazard_statements"].append(s)
            elif "Precautionary" in name:
                for s in strings:
                    if s and s not in result["precautionary_statements"]:
                        result["precautionary_statements"].append(s)
            elif name == "Signal":
                for s in strings:
                    if s:
                        result["signal_word"] = s
            elif "Pictogram" in name:
                for swm in section.iter():
                    swm_tag = swm.tag.split("}")[-1] if "}" in swm.tag else swm.tag
                    if swm_tag == "Extra" and swm.text:
                        pic = swm.text.strip()
                        if pic and pic not in result["pictograms"]:
                            result["pictograms"].append(pic)
            elif "GHS Classification" in name or "Hazard Class" in name:
                for s in strings:
                    if s and s not in result["ghs_classification"]:
                        result["ghs_classification"].append(s)

    return result


def import_to_db(cas_cid: dict[str, int], ghs_data: dict[int, dict], db_path: Path):
    """Import matched GHS data into msds_english table."""
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=10000")
    cur = conn.cursor()

    # Load chemicals that need msds_english
    cur.execute("""
        SELECT
            CASE WHEN ct.description LIKE 'KOSHA_ID:%' THEN substr(ct.description, 10)
                 ELSE ct.description END AS chem_id,
            ct.cas_no,
            COALESCE(ct.name_en, ct.name, '')
        FROM chemical_terms ct
        WHERE ct.cas_no IS NOT NULL AND trim(ct.cas_no) != ''
          AND NOT EXISTS (
              SELECT 1 FROM msds_english me WHERE me.chem_id =
                  CASE WHEN ct.description LIKE 'KOSHA_ID:%' THEN substr(ct.description, 10)
                       ELSE ct.description END
          )
    """)
    targets = cur.fetchall()
    logger.info("Chemicals needing msds_english: %d", len(targets))

    inserted = 0
    no_cid = 0
    no_ghs = 0
    batch = []

    for chem_id, cas_no, name_en in targets:
        cid = cas_cid.get(cas_no)
        if not cid:
            no_cid += 1
            continue

        ghs = ghs_data.get(cid)
        if not ghs:
            no_ghs += 1
            continue

        batch.append((
            chem_id, cas_no, name_en, cid,
            ghs["signal_word"],
            json.dumps(ghs["ghs_classification"], ensure_ascii=False),
            json.dumps(ghs["hazard_statements"], ensure_ascii=False),
            json.dumps(ghs["precautionary_statements"], ensure_ascii=False),
            json.dumps(ghs["pictograms"], ensure_ascii=False),
        ))

        if len(batch) >= 500:
            cur.executemany(
                """INSERT OR REPLACE INTO msds_english
                   (chem_id, cas_no, name_en, pubchem_cid, signal_word,
                    ghs_classification, hazard_statements, precautionary_statements, pictograms)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                batch,
            )
            conn.commit()
            inserted += len(batch)
            batch = []

    if batch:
        cur.executemany(
            """INSERT OR REPLACE INTO msds_english
               (chem_id, cas_no, name_en, pubchem_cid, signal_word,
                ghs_classification, hazard_statements, precautionary_statements, pictograms)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            batch,
        )
        conn.commit()
        inserted += len(batch)

    conn.close()
    logger.info("=== Import Complete ===")
    logger.info("  Inserted: %d", inserted)
    logger.info("  No CID mapping: %d", no_cid)
    logger.info("  CID found but no GHS: %d", no_ghs)


def main():
    parser = argparse.ArgumentParser(description="Bulk PubChem GHS import via FTP files")
    parser.add_argument("--skip-download", action="store_true", help="Use cached files")
    parser.add_argument("--step", choices=["synonym", "ghs", "import", "all"], default="all")
    parser.add_argument("--db", type=str, default=str(DB_PATH))
    args = parser.parse_args()

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    db_path = Path(args.db)

    # Step 1: Download bulk files
    if not args.skip_download and args.step in ("all", "synonym"):
        logger.info("=== Step 1a: Downloading CID-Synonym-filtered.gz (903 MB) ===")
        download_file(SYNONYM_URL, SYNONYM_FILE)

    if not args.skip_download and args.step in ("all", "ghs"):
        logger.info("=== Step 1b: Downloading CID-LCSS.xml.gz (448 MB) ===")
        download_file(LCSS_URL, LCSS_FILE)

    # Get target CAS numbers from DB
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT cas_no FROM chemical_terms WHERE cas_no IS NOT NULL AND trim(cas_no) != ''")
    all_cas = {r[0] for r in cur.fetchall()}
    conn.close()
    logger.info("Target CAS numbers in DB: %d", len(all_cas))

    # Step 2: Build CAS→CID mapping
    cas_cid = {}
    if args.step in ("all", "synonym", "import"):
        if SYNONYM_FILE.exists():
            logger.info("=== Step 2: Building CAS→CID map ===")
            cas_cid = build_cas_cid_map(all_cas)
        elif CAS_CID_MAP_FILE.exists():
            with open(CAS_CID_MAP_FILE) as f:
                cas_cid = json.load(f)
            logger.info("Loaded cached CAS→CID map: %d entries", len(cas_cid))
        else:
            logger.error("No synonym file or cache found. Run with --step synonym first.")
            return

    # Step 3: Parse GHS data
    target_cids = set(cas_cid.values()) if cas_cid else set()
    ghs_data = {}
    if args.step in ("all", "ghs", "import"):
        if LCSS_FILE.exists():
            logger.info("=== Step 3: Parsing GHS data for %d CIDs ===", len(target_cids))
            ghs_data = parse_lcss_for_cids(target_cids)
        elif GHS_DATA_FILE.exists():
            with open(GHS_DATA_FILE) as f:
                cached = json.load(f)
            ghs_data = {int(k): v for k, v in cached.items()}
            logger.info("Loaded cached GHS data: %d entries", len(ghs_data))
        else:
            logger.error("No LCSS file or cache found. Run with --step ghs first.")
            return

    # Step 4: Import to DB
    if args.step in ("all", "import"):
        logger.info("=== Step 4: Importing to DB ===")
        import_to_db(cas_cid, ghs_data, db_path)

    # Final stats
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM msds_english")
    total = cur.fetchone()[0]
    conn.close()
    logger.info("msds_english total: %d", total)


if __name__ == "__main__":
    main()
