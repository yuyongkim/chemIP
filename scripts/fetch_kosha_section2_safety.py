"""
Fetch KOSHA MSDS Section 2 data and store into msds_english for missing rows.

Usage:
  python scripts/fetch_kosha_section2_safety.py --workers 6
"""

import argparse
import json
import os
import re
import sqlite3
import sys
import threading
import time
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

import requests

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from backend.config.settings import settings


DB_PATH = os.path.join(
    PROJECT_ROOT,
    "data",
    "terminology.db",
)
KOSHA_BASE_URL = settings.KOSHA_API_URL
KOSHA_SERVICE_KEY = settings.KOSHA_SERVICE_KEY
SECTION2_URL = f"{KOSHA_BASE_URL}/chemdetail02"

thread_local = threading.local()


def get_session() -> requests.Session:
    if not hasattr(thread_local, "session"):
        s = requests.Session()
        s.headers.update({"User-Agent": "MSDS-KOSHA-Section2/1.0"})
        thread_local.session = s
    return thread_local.session


def split_tokens(text: str) -> list[str]:
    if not text:
        return []
    parts = re.split(r"[|\n\r]+", text)
    return [p.strip() for p in parts if p and p.strip() and p.strip() != "자료없음"]


def parse_section2_xml(xml_text: str) -> dict:
    result = {
        "signal_word": "",
        "ghs_classification": [],
        "hazard_statements": [],
        "precautionary_statements": [],
        "pictograms": [],
    }
    if not xml_text:
        return result

    root = ET.fromstring(xml_text)
    for item in root.findall(".//item"):
        name = (item.findtext("msdsItemNameKor") or "").strip()
        detail = (item.findtext("itemDetail") or "").strip()
        if not name:
            continue

        if "유해성·위험성 분류" in name:
            result["ghs_classification"].extend(split_tokens(detail))
        elif name == "신호어":
            if detail and detail != "자료없음":
                result["signal_word"] = detail
        elif "유해·위험문구" in name:
            result["hazard_statements"].extend(split_tokens(detail))
        elif name in ("예방", "대응", "저장", "폐기", "예방조치문구"):
            result["precautionary_statements"].extend(split_tokens(detail))
        elif "그림문자" in name:
            codes = re.findall(r"GHS\d{2}", detail)
            for c in codes:
                if c not in result["pictograms"]:
                    result["pictograms"].append(c)

    # de-dup
    for key in ("ghs_classification", "hazard_statements", "precautionary_statements"):
        seen = set()
        uniq = []
        for x in result[key]:
            if x not in seen:
                uniq.append(x)
                seen.add(x)
        result[key] = uniq
    return result


def fetch_section2(chem_id: str, retries: int = 4) -> tuple[str, Optional[str], str]:
    params = {"serviceKey": KOSHA_SERVICE_KEY, "chemId": chem_id}
    for attempt in range(retries):
        try:
            r = get_session().get(SECTION2_URL, params=params, timeout=12)
            if r.status_code == 200:
                txt = r.text or ""
                if "<resultCode>00</resultCode>" in txt:
                    return chem_id, txt, "ok"
                return chem_id, None, "api_not_ok"
            if r.status_code in (429, 500, 502, 503, 504):
                time.sleep(0.6 * (attempt + 1))
                continue
            return chem_id, None, f"http_{r.status_code}"
        except requests.RequestException:
            time.sleep(0.6 * (attempt + 1))
    return chem_id, None, "request_error"


def load_targets(cur: sqlite3.Cursor, limit: int) -> list[tuple[str, str, str]]:
    sql = """
    SELECT
      substr(description, 10) AS chem_id,
      cas_no,
      COALESCE(name_en, '')
    FROM chemical_terms
    WHERE description LIKE 'KOSHA_ID:%'
      AND cas_no IS NOT NULL
      AND trim(cas_no) != ''
      AND NOT EXISTS (
        SELECT 1 FROM msds_english me WHERE me.chem_id = substr(description, 10)
      )
    """
    if limit > 0:
        sql += f" LIMIT {int(limit)}"
    return cur.execute(sql).fetchall()


def ensure_tables(cur: sqlite3.Cursor) -> None:
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS msds_english (
            chem_id TEXT PRIMARY KEY,
            cas_no TEXT,
            name_en TEXT,
            pubchem_cid INTEGER,
            signal_word TEXT,
            ghs_classification TEXT,
            hazard_statements TEXT,
            precautionary_statements TEXT,
            pictograms TEXT,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS msds_details (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chem_id TEXT NOT NULL,
            section_no INTEGER NOT NULL,
            xml_data TEXT,
            UNIQUE(chem_id, section_no)
        )
        """
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--commit-batch", type=int, default=80)
    parser.add_argument("--progress-every", type=int, default=100)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    if not KOSHA_SERVICE_KEY:
        raise RuntimeError("KOSHA_SERVICE_KEY is empty.")

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    ensure_tables(cur)
    conn.commit()

    targets = load_targets(cur, args.limit)
    total = len(targets)
    print(f"[start] kosha section2 targets={total}", flush=True)
    if total == 0:
        conn.close()
        print("[done] nothing to process", flush=True)
        return

    started = time.time()
    processed = 0
    saved = 0
    no_data = 0
    errors = 0
    write_rows = []
    raw_rows = []

    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as ex:
        futures = {ex.submit(fetch_section2, chem_id): (chem_id, cas_no, name_en) for chem_id, cas_no, name_en in targets}

        for fut in as_completed(futures):
            chem_id, cas_no, name_en = futures[fut]
            processed += 1

            try:
                _, xml_text, status = fut.result()
            except Exception:
                errors += 1
                continue

            if not xml_text:
                if status == "api_not_ok":
                    no_data += 1
                else:
                    errors += 1
                continue

            try:
                parsed = parse_section2_xml(xml_text)
            except Exception:
                errors += 1
                continue

            has_meaningful = (
                bool(parsed["signal_word"])
                or bool(parsed["ghs_classification"])
                or bool(parsed["hazard_statements"])
                or bool(parsed["precautionary_statements"])
                or bool(parsed["pictograms"])
            )
            if not has_meaningful:
                no_data += 1
            else:
                write_rows.append(
                    (
                        chem_id,
                        cas_no,
                        name_en,
                        None,
                        parsed["signal_word"],
                        json.dumps(parsed["ghs_classification"], ensure_ascii=False),
                        json.dumps(parsed["hazard_statements"], ensure_ascii=False),
                        json.dumps(parsed["precautionary_statements"], ensure_ascii=False),
                        json.dumps(parsed["pictograms"], ensure_ascii=False),
                    )
                )
                saved += 1

            raw_rows.append((chem_id, 2, xml_text))

            if len(write_rows) >= args.commit_batch:
                cur.executemany(
                    """
                    INSERT OR REPLACE INTO msds_english
                    (chem_id, cas_no, name_en, pubchem_cid, signal_word, ghs_classification,
                     hazard_statements, precautionary_statements, pictograms)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    write_rows,
                )
                cur.executemany(
                    """
                    INSERT OR REPLACE INTO msds_details (chem_id, section_no, xml_data)
                    VALUES (?, ?, ?)
                    """,
                    raw_rows,
                )
                conn.commit()
                write_rows = []
                raw_rows = []

            if processed % max(1, args.progress_every) == 0:
                elapsed = time.time() - started
                speed = processed / elapsed if elapsed > 0 else 0.0
                print(
                    f"[progress] {processed}/{total} saved={saved} no_data={no_data} errors={errors} speed={speed:.2f}/s",
                    flush=True,
                )

    if write_rows:
        cur.executemany(
            """
            INSERT OR REPLACE INTO msds_english
            (chem_id, cas_no, name_en, pubchem_cid, signal_word, ghs_classification,
             hazard_statements, precautionary_statements, pictograms)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            write_rows,
        )
        cur.executemany(
            """
            INSERT OR REPLACE INTO msds_details (chem_id, section_no, xml_data)
            VALUES (?, ?, ?)
            """,
            raw_rows,
        )
        conn.commit()

    total_saved = cur.execute("SELECT count(*) FROM msds_english").fetchone()[0]
    conn.close()
    elapsed = time.time() - started
    print(
        f"[done] processed={processed} saved={saved} no_data={no_data} errors={errors} "
        f"elapsed={elapsed:.1f}s total_saved={total_saved}",
        flush=True,
    )


if __name__ == "__main__":
    main()
