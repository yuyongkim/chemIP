"""Fetch NCIS chemical substance detail from data.go.kr API.

Source: 한국환경공단_화학물질 정보 조회 (B552584/kecoapi/ncissbstn)
Daily limit: 10,000 calls (we use 9,500 to be safe)

Data: 물질명(한/영), 유사명, 분자식, 분자량, 물질분류(유독물/허가대상/사고대비 등)

Usage:
  python scripts/fetch_ncis_substance.py                   # 오늘치 9500건
  python scripts/fetch_ncis_substance.py --limit 100       # 테스트
  python scripts/fetch_ncis_substance.py --source KOSHA    # KOSHA만
"""

import argparse
import json
import logging
import os
import signal
import sqlite3
import sys
import time

import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "terminology.db")
API_URL = "https://apis.data.go.kr/B552584/kecoapi/ncissbstn/chemSbstnList"
from dotenv import load_dotenv
load_dotenv()
API_KEY = os.getenv("KOSHA_SERVICE_KEY_DECODED", "")

DAILY_LIMIT = 9500
_shutdown = False


def _signal_handler(sig, frame):
    global _shutdown
    logger.info("Shutdown requested, finishing current item...")
    _shutdown = True

signal.signal(signal.SIGINT, _signal_handler)
signal.signal(signal.SIGTERM, _signal_handler)


def ensure_table(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ncis_substance (
            cas_no TEXT PRIMARY KEY,
            sbstn_id TEXT,
            ke_no TEXT,
            name_kor TEXT,
            name_eng TEXT,
            name2_kor TEXT,
            name2_eng TEXT,
            molecular_formula TEXT,
            molecular_weight TEXT,
            classifications TEXT,
            fetched_at TEXT DEFAULT (datetime('now'))
        )
    """)
    # Track "no data" to avoid re-querying
    conn.execute("""
        CREATE TABLE IF NOT EXISTS _ncis_nodata (
            cas_no TEXT PRIMARY KEY,
            checked_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.commit()


def fetch_cas(cas_no, retries=3):
    """Fetch substance info for a single CAS number."""
    for attempt in range(retries):
        try:
            r = requests.get(API_URL, params={
                "serviceKey": API_KEY,
                "numOfRows": "5",
                "pageNo": "1",
                "searchGubun": "2",
                "searchNm": cas_no,
            }, timeout=15)

            if r.status_code == 200:
                data = r.json()
                code = data.get("header", {}).get("resultCode", "")
                if code == "200":
                    items = data.get("body", {}).get("items", [])
                    return items
                elif code == "93":
                    # Parameter error
                    return None
                else:
                    return []
            elif r.status_code == 429:
                logger.warning("Rate limited, waiting 60s...")
                time.sleep(60)
                continue
            else:
                logger.debug("HTTP %d for CAS %s", r.status_code, cas_no)
                time.sleep(2 * (attempt + 1))
        except requests.RequestException as e:
            logger.debug("Error for CAS %s: %s", cas_no, e)
            time.sleep(2 * (attempt + 1))

    return None


def main():
    parser = argparse.ArgumentParser(description="Fetch NCIS substance data")
    parser.add_argument("--limit", type=int, default=DAILY_LIMIT)
    parser.add_argument("--delay", type=float, default=0.8, help="Seconds between API calls")
    parser.add_argument("--source", type=str, default=None, help="Filter chemical_terms by source")
    parser.add_argument("--db", default=DB_PATH)
    args = parser.parse_args()

    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=10000")
    ensure_table(conn)
    cur = conn.cursor()

    # Get CAS numbers to process (skip already fetched + nodata)
    source_filter = f"AND ct.source = '{args.source}'" if args.source else ""
    # Prioritize Korean sources first
    cur.execute(f"""
        SELECT DISTINCT ct.cas_no FROM chemical_terms ct
        WHERE ct.cas_no IS NOT NULL AND ct.cas_no != ''
          {source_filter}
          AND NOT EXISTS (SELECT 1 FROM ncis_substance ns WHERE ns.cas_no = ct.cas_no)
          AND NOT EXISTS (SELECT 1 FROM _ncis_nodata nd WHERE nd.cas_no = ct.cas_no)
        ORDER BY
          CASE ct.source
            WHEN 'KOSHA' THEN 1
            WHEN 'KISCHEM' THEN 2
            WHEN 'KREACH' THEN 3
            ELSE 4
          END,
          ct.id
        LIMIT ?
    """, (args.limit,))
    targets = [r[0] for r in cur.fetchall()]

    logger.info("Targets: %d CAS numbers (limit=%d)", len(targets), args.limit)
    if not targets:
        logger.info("Nothing to process")
        conn.close()
        return

    saved = 0
    no_data = 0
    errors = 0
    api_calls = 0
    start = time.time()

    for i, cas_no in enumerate(targets):
        if _shutdown:
            break

        time.sleep(args.delay)
        items = fetch_cas(cas_no)
        api_calls += 1

        if items is None:
            errors += 1
        elif len(items) == 0:
            cur.execute("INSERT OR IGNORE INTO _ncis_nodata (cas_no) VALUES (?)", (cas_no,))
            no_data += 1
        else:
            # Take first matching item
            item = items[0]
            classifications = json.dumps(item.get("typeList", []), ensure_ascii=False)
            cur.execute(
                """INSERT OR REPLACE INTO ncis_substance
                   (cas_no, sbstn_id, ke_no, name_kor, name_eng, name2_kor, name2_eng,
                    molecular_formula, molecular_weight, classifications)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    cas_no,
                    item.get("sbstnId", ""),
                    item.get("korexst", ""),
                    item.get("sbstnNmKor", ""),
                    item.get("sbstnNmEng", ""),
                    item.get("sbstnNm2Kor", ""),
                    item.get("sbstnNm2Eng", ""),
                    item.get("mlcfrm", ""),
                    item.get("mlcwgt", ""),
                    classifications,
                ),
            )
            saved += 1

        # Commit every 50
        if (i + 1) % 50 == 0:
            conn.commit()

        if (i + 1) % 500 == 0:
            elapsed = time.time() - start
            rate = (i + 1) / elapsed
            remaining = (len(targets) - i - 1) / rate if rate > 0 else 0
            logger.info(
                "[%d/%d] saved=%d no_data=%d errors=%d calls=%d speed=%.1f/s ETA=%.0fm",
                i + 1, len(targets), saved, no_data, errors, api_calls, rate, remaining / 60,
            )

    conn.commit()
    conn.close()

    elapsed = time.time() - start
    logger.info("=== Done ===")
    logger.info("  Processed: %d", api_calls)
    logger.info("  Saved: %d", saved)
    logger.info("  No data: %d", no_data)
    logger.info("  Errors: %d", errors)
    logger.info("  Time: %.0fs (%.1f calls/s)", elapsed, api_calls / elapsed if elapsed > 0 else 0)
    if _shutdown:
        logger.info("  [resume] Re-run to continue")

    # Stats
    conn2 = sqlite3.connect(args.db)
    c2 = conn2.cursor()
    c2.execute("SELECT COUNT(*) FROM ncis_substance")
    logger.info("  ncis_substance total: %d", c2.fetchone()[0])
    c2.execute("SELECT COUNT(*) FROM _ncis_nodata")
    logger.info("  ncis_nodata total: %d", c2.fetchone()[0])
    conn2.close()


if __name__ == "__main__":
    main()
