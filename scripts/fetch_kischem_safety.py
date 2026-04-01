"""Fetch chemical safety management info from 화학물질안전원 (KISCHEM) API.

Source: data.go.kr dataset 15072442
Endpoint: apis.data.go.kr/1480802/iciskischem/kischemlist
Daily limit: 5,000 calls

Data includes: chemEn, chemKo, casNo, symptom, inhale, skin, eyeball, oral, etc.

Usage:
  python scripts/fetch_kischem_safety.py
  python scripts/fetch_kischem_safety.py --page-size 100
"""

import argparse
import logging
import os
import sqlite3
import sys
import time
import xml.etree.ElementTree as ET

import requests

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "terminology.db")

API_URL = "http://apis.data.go.kr/1480802/iciskischem/kischemlist"
from dotenv import load_dotenv
load_dotenv()
API_KEY = os.getenv("KOSHA_SERVICE_KEY_DECODED", "")


def ensure_table(conn: sqlite3.Connection):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS kischem_safety (
            data_no INTEGER PRIMARY KEY,
            chem_en TEXT,
            chem_ko TEXT,
            cas_no TEXT,
            symptom TEXT,
            inhale TEXT,
            skin TEXT,
            eyeball TEXT,
            oral TEXT,
            etc TEXT,
            fetched_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_kischem_cas ON kischem_safety(cas_no)")
    conn.commit()


def fetch_page(page_no: int, page_size: int) -> tuple[list[dict], int]:
    """Fetch one page. Returns (items, total_count)."""
    for attempt in range(3):
        try:
            resp = requests.get(API_URL, params={
                "ServiceKey": API_KEY,
                "numOfRows": str(page_size),
                "pageNo": str(page_no),
            }, timeout=30)

            if resp.status_code != 200:
                logger.warning("HTTP %d on page %d (attempt %d)", resp.status_code, page_no, attempt + 1)
                time.sleep(2 * (attempt + 1))
                continue

            root = ET.fromstring(resp.text)
            code = root.findtext(".//resultCode")
            if code != "00":
                msg = root.findtext(".//resultMsg")
                logger.warning("API error %s: %s (page %d)", code, msg, page_no)
                time.sleep(2 * (attempt + 1))
                continue

            total = int(root.findtext(".//totalCount") or "0")
            items = []
            for item in root.findall(".//item"):
                items.append({
                    "data_no": int(item.findtext("dataNo") or "0"),
                    "chem_en": (item.findtext("chemEn") or "").strip(),
                    "chem_ko": (item.findtext("chemKo") or "").strip(),
                    "cas_no": (item.findtext("casNo") or "").strip(),
                    "symptom": (item.findtext("symptom") or "").strip(),
                    "inhale": (item.findtext("inhale") or "").strip(),
                    "skin": (item.findtext("skin") or "").strip(),
                    "eyeball": (item.findtext("eyeball") or "").strip(),
                    "oral": (item.findtext("oral") or "").strip(),
                    "etc": (item.findtext("etc") or "").strip(),
                })
            return items, total

        except (requests.RequestException, ET.ParseError) as e:
            logger.warning("Error on page %d (attempt %d): %s", page_no, attempt + 1, e)
            time.sleep(2 * (attempt + 1))

    return [], 0


def main():
    parser = argparse.ArgumentParser(description="Fetch KISCHEM safety data")
    parser.add_argument("--page-size", type=int, default=100)
    parser.add_argument("--delay", type=float, default=0.5, help="Delay between API calls (seconds)")
    parser.add_argument("--db", type=str, default=DB_PATH)
    args = parser.parse_args()

    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=10000")
    ensure_table(conn)
    cur = conn.cursor()

    # Check how many we already have
    cur.execute("SELECT COUNT(*) FROM kischem_safety")
    existing = cur.fetchone()[0]
    logger.info("Existing kischem_safety records: %d", existing)

    # Fetch first page to get total count
    items, total = fetch_page(1, args.page_size)
    if not items:
        logger.error("Failed to fetch first page")
        return

    logger.info("Total records: %d, page size: %d", total, args.page_size)
    total_pages = (total + args.page_size - 1) // args.page_size

    # Insert first page
    inserted = 0
    for item in items:
        cur.execute(
            """INSERT OR REPLACE INTO kischem_safety
               (data_no, chem_en, chem_ko, cas_no, symptom, inhale, skin, eyeball, oral, etc)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (item["data_no"], item["chem_en"], item["chem_ko"], item["cas_no"],
             item["symptom"], item["inhale"], item["skin"], item["eyeball"],
             item["oral"], item["etc"]),
        )
        inserted += 1
    conn.commit()
    logger.info("Page 1/%d: %d items inserted", total_pages, len(items))

    # Fetch remaining pages
    for page in range(2, total_pages + 1):
        time.sleep(args.delay)
        items, _ = fetch_page(page, args.page_size)
        if not items:
            logger.warning("Empty page %d, skipping", page)
            continue

        for item in items:
            cur.execute(
                """INSERT OR REPLACE INTO kischem_safety
                   (data_no, chem_en, chem_ko, cas_no, symptom, inhale, skin, eyeball, oral, etc)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (item["data_no"], item["chem_en"], item["chem_ko"], item["cas_no"],
                 item["symptom"], item["inhale"], item["skin"], item["eyeball"],
                 item["oral"], item["etc"]),
            )
            inserted += 1

        conn.commit()
        if page % 10 == 0 or page == total_pages:
            logger.info("Page %d/%d: total inserted %d", page, total_pages, inserted)

    conn.close()
    logger.info("Done. Total inserted: %d", inserted)

    # Verify & match stats
    conn2 = sqlite3.connect(args.db)
    cur2 = conn2.cursor()
    cur2.execute("SELECT COUNT(*) FROM kischem_safety")
    total_k = cur2.fetchone()[0]
    cur2.execute("""SELECT COUNT(DISTINCT k.cas_no) FROM kischem_safety k
        JOIN chemical_terms ct ON k.cas_no = ct.cas_no""")
    matched = cur2.fetchone()[0]
    conn2.close()
    logger.info("kischem_safety: %d records, %d matched to chemical_terms by CAS", total_k, matched)


if __name__ == "__main__":
    main()
