"""Scrape kreach.me.go.kr chemical list (47K+ chemicals).

Fetches the full KECL (Korea Existing Chemicals List) with:
CAS No, English name, Korean name, KE number, hazard info, regulatory status.

Usage:
  python scripts/scrape_kreach.py
  python scripts/scrape_kreach.py --page-size 40 --delay 2.0
"""

import argparse
import logging
import os
import re
import sqlite3
import time

import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "terminology.db")
BASE_URL = "https://kreach.me.go.kr/repwrt/mttr/en/mttrList.do"


def ensure_table(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS kreach_chemicals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cas_no TEXT,
            name_en TEXT,
            ke_no TEXT,
            hazard_info TEXT,
            regulation_info TEXT,
            notify_date TEXT,
            announce_no TEXT,
            mttr_id TEXT,
            fetched_at TEXT DEFAULT (datetime('now')),
            UNIQUE(cas_no, ke_no)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_kreach_cas ON kreach_chemicals(cas_no)")
    conn.commit()


def parse_rows(html):
    """Extract table rows from HTML."""
    items = []
    # Find tbody rows
    tbody = re.search(r'<tbody>(.*?)</tbody>', html, re.DOTALL)
    if not tbody:
        return items

    rows = re.findall(r'<tr[^>]*>(.*?)</tr>', tbody.group(1), re.DOTALL)
    for row in rows:
        tds = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)
        if len(tds) < 8:
            continue

        # Clean HTML tags
        def clean(s):
            s = re.sub(r'<[^>]+>', ' ', s)
            s = re.sub(r'\s+', ' ', s).strip()
            return s

        cas_no = clean(tds[0])
        name_en = clean(tds[1])
        # Remove [Other names ...] suffix
        name_en = re.sub(r'\[Other names.*', '', name_en).strip()
        ke_no = clean(tds[2])
        hazard = clean(tds[3])
        regulation = clean(tds[4])
        notify_date = clean(tds[5])
        announce = clean(tds[6])

        # Extract mttr_id from detail link
        mttr_match = re.search(r"fn_detail\('([^']+)'\)", row)
        mttr_id = mttr_match.group(1) if mttr_match else ""

        if cas_no or name_en:
            items.append({
                "cas_no": cas_no,
                "name_en": name_en,
                "ke_no": ke_no,
                "hazard_info": hazard,
                "regulation_info": regulation,
                "notify_date": notify_date,
                "announce_no": announce,
                "mttr_id": mttr_id,
            })

    return items


def find_max_page(html, page_size):
    """Find the last page number from pagination links."""
    pages = re.findall(r'fn_list\((\d+)', html)
    if pages:
        return max(int(p) for p in pages)
    return 1


def scrape_page(session, page_no, page_size):
    """Fetch one page of results."""
    for attempt in range(3):
        try:
            r = session.get(BASE_URL, params={
                "currentPageNo": str(page_no),
                "recordCountPerPage": str(page_size),
            }, timeout=30)
            if r.status_code == 200:
                return r.text
            logger.warning("HTTP %d on page %d", r.status_code, page_no)
        except requests.RequestException as e:
            logger.warning("Error page %d attempt %d: %s", page_no, attempt + 1, e)
            time.sleep(3 * (attempt + 1))
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--page-size", type=int, default=40)
    parser.add_argument("--delay", type=float, default=1.5, help="Seconds between requests")
    parser.add_argument("--start-page", type=int, default=1)
    parser.add_argument("--db", default=DB_PATH)
    args = parser.parse_args()

    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=10000")
    ensure_table(conn)
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM kreach_chemicals")
    existing = cur.fetchone()[0]
    logger.info("Existing kreach_chemicals: %d", existing)

    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
        "Accept-Language": "en-US,en;q=0.9",
    })

    # First page to determine total
    html = scrape_page(session, args.start_page, args.page_size)
    if not html:
        logger.error("Failed to fetch first page")
        return

    items = parse_rows(html)
    logger.info("Page %d: %d items", args.start_page, len(items))

    # Binary search for last page (pagination links aren't reliable on this site)
    logger.info("Finding last page via binary search...")
    lo, hi = 1, 1500
    while lo < hi:
        mid = (lo + hi + 1) // 2
        t = scrape_page(session, mid, args.page_size)
        time.sleep(0.5)
        if t and parse_rows(t):
            lo = mid
        else:
            hi = mid - 1
    max_page = lo
    logger.info("Last page with data: %d (est. %d chemicals)", max_page, max_page * args.page_size)

    total_estimate = max_page * args.page_size
    logger.info("Estimated total: ~%d chemicals (%d pages x %d/page)", total_estimate, max_page, args.page_size)

    # Save first page
    inserted = 0
    for item in items:
        cur.execute(
            """INSERT OR IGNORE INTO kreach_chemicals
               (cas_no, name_en, ke_no, hazard_info, regulation_info, notify_date, announce_no, mttr_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (item["cas_no"], item["name_en"], item["ke_no"], item["hazard_info"],
             item["regulation_info"], item["notify_date"], item["announce_no"], item["mttr_id"]),
        )
        if cur.rowcount > 0:
            inserted += 1
    conn.commit()

    # Fetch remaining pages
    for page in range(args.start_page + 1, max_page + 1):
        time.sleep(args.delay)
        html = scrape_page(session, page, args.page_size)
        if not html:
            logger.warning("Skipping page %d", page)
            continue

        items = parse_rows(html)
        if not items:
            logger.info("Empty page %d, likely past end", page)
            break

        for item in items:
            cur.execute(
                """INSERT OR IGNORE INTO kreach_chemicals
                   (cas_no, name_en, ke_no, hazard_info, regulation_info, notify_date, announce_no, mttr_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (item["cas_no"], item["name_en"], item["ke_no"], item["hazard_info"],
                 item["regulation_info"], item["notify_date"], item["announce_no"], item["mttr_id"]),
            )
            if cur.rowcount > 0:
                inserted += 1

        conn.commit()

        if page % 50 == 0:
            logger.info("Page %d/%d: inserted %d total", page, max_page, inserted)

    conn.close()
    logger.info("Done. Inserted: %d", inserted)

    # Stats
    conn2 = sqlite3.connect(args.db)
    c2 = conn2.cursor()
    c2.execute("SELECT COUNT(*) FROM kreach_chemicals")
    logger.info("kreach_chemicals total: %d", c2.fetchone()[0])
    c2.execute("""SELECT COUNT(DISTINCT k.cas_no) FROM kreach_chemicals k
        WHERE k.cas_no != '' AND k.cas_no IN (
            SELECT cas_no FROM chemical_terms WHERE cas_no IS NOT NULL)""")
    logger.info("Matched to chemical_terms: %d", c2.fetchone()[0])
    conn2.close()


if __name__ == "__main__":
    main()
