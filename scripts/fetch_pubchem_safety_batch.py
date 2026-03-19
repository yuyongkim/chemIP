"""
Bulk fetch of English safety data from PubChem for remaining chemicals.

Usage:
  python scripts/fetch_pubchem_safety_batch.py --workers 6
"""

import argparse
import json
import os
import re
import sqlite3
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

import requests


DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    "terminology.db",
)
PUBCHEM_PUG_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/{cid}/JSON"
PUBCHEM_CAS_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{cas}/cids/JSON"
REQUEST_HEADERS = {"User-Agent": "MSDS-BatchFetcher/1.0"}
NIOSH_CAS_INDEX_URL = "https://www.cdc.gov/niosh/npg/npgdcas.html"


thread_local = threading.local()
NIOSH_NAME_BY_CAS: dict[str, str] = {}


def get_session() -> requests.Session:
    if not hasattr(thread_local, "session"):
        session = requests.Session()
        session.headers.update(REQUEST_HEADERS)
        thread_local.session = session
    return thread_local.session


def fetch_json(url: str, timeout: int, retries: int = 4) -> Optional[dict]:
    for attempt in range(retries):
        try:
            resp = get_session().get(url, timeout=timeout)
            if resp.status_code == 200:
                return resp.json()
            if resp.status_code in (429, 500, 502, 503, 504):
                time.sleep(1.2 * (attempt + 1))
                continue
            return None
        except requests.RequestException:
            time.sleep(0.8 * (attempt + 1))
    return None


def get_cid_from_cas(cas_no: str) -> Optional[int]:
    data = fetch_json(PUBCHEM_CAS_URL.format(cas=cas_no), timeout=10)
    if not data:
        return None
    cids = data.get("IdentifierList", {}).get("CID", [])
    return cids[0] if cids else None


def get_cid_from_name(name: str) -> Optional[int]:
    if not name:
        return None
    data = fetch_json(PUBCHEM_CAS_URL.format(cas=requests.utils.quote(name, safe="")), timeout=10)
    if not data:
        return None
    cids = data.get("IdentifierList", {}).get("CID", [])
    return cids[0] if cids else None


def clean_text_for_query(text: str) -> str:
    t = (text or "").strip()
    t = re.sub(r"<br\s*/?>", " ", t, flags=re.IGNORECASE)
    t = re.sub(r"\(\s*관용명\s*:[^)]+\)", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def build_name_candidates(name: str, name_en: str) -> list[str]:
    candidates: list[str] = []

    def add(value: str) -> None:
        v = clean_text_for_query(value)
        if v and v not in candidates:
            candidates.append(v)

    add(name_en or "")
    base = clean_text_for_query(name or "")
    add(base)

    # English text in parentheses first, then plain latin chunks.
    for m in re.findall(r"\(([^)]*[A-Za-z][^)]*)\)", base):
        add(m)
    for m in re.findall(r"[A-Za-z][A-Za-z0-9,\-\s'./]{2,}", base):
        add(m)

    return candidates[:12]


def load_niosh_name_by_cas() -> dict[str, str]:
    out: dict[str, str] = {}
    try:
        r = requests.get(NIOSH_CAS_INDEX_URL, timeout=20, headers=REQUEST_HEADERS)
        if r.status_code != 200:
            return out
        html = r.text
        # Pattern example:
        # <tr><td>100-00-5</td><td><a href='npgd0452.html'>p-Nitrochlorobenzene</a></td></tr>
        for cas, name in re.findall(
            r"<tr>\s*<td>([0-9]{2,7}-[0-9]{2}-[0-9])</td>\s*<td>\s*<a href=['\"]npgd[0-9a-z]+\.html['\"]>([^<]+)</a>",
            html,
            flags=re.IGNORECASE,
        ):
            cas_key = cas.strip()
            nm = re.sub(r"\s+", " ", name).strip()
            if cas_key and nm and cas_key not in out:
                out[cas_key] = nm
    except Exception:
        return {}
    return out


def extract_ghs_info(pug_data: dict) -> dict:
    result = {
        "ghs_classification": [],
        "hazard_statements": [],
        "precautionary_statements": [],
        "signal_word": "",
        "pictograms": [],
    }

    def add_unique(dst: list[str], text: str) -> None:
        if text and text not in dst:
            dst.append(text)

    def walk(nodes: list[dict]) -> None:
        for node in nodes:
            heading = node.get("TOCHeading", "")

            if heading in ("GHS Classification", "Hazard Classes and Categories", "UN GHS Classification"):
                for info in node.get("Information", []):
                    name = info.get("Name", "")
                    val = info.get("Value", {})
                    items = val.get("StringWithMarkup", [])

                    if name in ("GHS Hazard Statements", "Hazard Statements"):
                        for sl in items:
                            add_unique(result["hazard_statements"], sl.get("String", ""))
                    elif name in ("Precautionary Statement Codes", "Precautionary Statements"):
                        for sl in items:
                            add_unique(result["precautionary_statements"], sl.get("String", ""))
                    elif name == "Signal":
                        for sl in items:
                            text = sl.get("String", "")
                            if text:
                                result["signal_word"] = text
                    elif name == "Pictogram(s)":
                        for sl in items:
                            for markup in sl.get("Markup", []):
                                if markup.get("Type") == "Icon":
                                    add_unique(result["pictograms"], markup.get("Extra", ""))
                    else:
                        for sl in items:
                            add_unique(result["ghs_classification"], sl.get("String", ""))

            elif heading in ("GHS Hazard Statements", "Hazard Statements"):
                for info in node.get("Information", []):
                    for sl in info.get("Value", {}).get("StringWithMarkup", []):
                        add_unique(result["hazard_statements"], sl.get("String", ""))

            elif heading in ("Precautionary Statement Codes", "Precautionary Statements"):
                for info in node.get("Information", []):
                    for sl in info.get("Value", {}).get("StringWithMarkup", []):
                        add_unique(result["precautionary_statements"], sl.get("String", ""))

            elif heading == "Signal":
                for info in node.get("Information", []):
                    for sl in info.get("Value", {}).get("StringWithMarkup", []):
                        text = sl.get("String", "")
                        if text:
                            result["signal_word"] = text

            elif heading == "Pictogram(s)":
                for info in node.get("Information", []):
                    for sl in info.get("Value", {}).get("StringWithMarkup", []):
                        for markup in sl.get("Markup", []):
                            if markup.get("Type") == "Icon":
                                add_unique(result["pictograms"], markup.get("Extra", ""))

            if "Section" in node:
                walk(node["Section"])

    sections = pug_data.get("Record", {}).get("Section", [])
    for section in sections:
        if section.get("TOCHeading", "") == "Safety and Hazards":
            walk(section.get("Section", []))

    return result


def fetch_one(row: tuple[str, str, str, str]) -> tuple[str, Optional[tuple], str]:
    chem_id, cas_no, name_en, name = row

    cid = get_cid_from_cas(cas_no)
    if not cid:
        for candidate in build_name_candidates(name, name_en):
            cid = get_cid_from_name(candidate)
            if cid:
                break
    if not cid and cas_no in NIOSH_NAME_BY_CAS:
        cid = get_cid_from_name(NIOSH_NAME_BY_CAS[cas_no])
    if not cid:
        return chem_id, None, "no_cid"

    pug_data = fetch_json(PUBCHEM_PUG_URL.format(cid=cid), timeout=15)
    if not pug_data:
        return chem_id, None, "pug_error"

    ghs = extract_ghs_info(pug_data)
    if not ghs["hazard_statements"] and not ghs["ghs_classification"]:
        return chem_id, None, "no_ghs"

    save_tuple = (
        chem_id,
        cas_no,
        name_en or "",
        cid,
        ghs["signal_word"],
        json.dumps(ghs["ghs_classification"], ensure_ascii=False),
        json.dumps(ghs["hazard_statements"], ensure_ascii=False),
        json.dumps(ghs["precautionary_statements"], ensure_ascii=False),
        json.dumps(ghs["pictograms"], ensure_ascii=False),
    )
    return chem_id, save_tuple, "saved"


def ensure_table(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
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
    conn.commit()


def load_remaining(cur: sqlite3.Cursor, limit: int) -> list[tuple[str, str, str, str]]:
    sql = """
        SELECT
            substr(ct.description, 10) AS chem_id,
            ct.cas_no,
            COALESCE(ct.name_en, ''),
            COALESCE(ct.name, '')
        FROM chemical_terms ct
        WHERE ct.description LIKE 'KOSHA_ID:%'
          AND ct.cas_no IS NOT NULL
          AND trim(ct.cas_no) != ''
          AND NOT EXISTS (
              SELECT 1
              FROM msds_english me
              WHERE me.chem_id = substr(ct.description, 10)
          )
    """
    if limit > 0:
        sql += f" LIMIT {int(limit)}"
    return cur.execute(sql).fetchall()


def save_batch(cur: sqlite3.Cursor, rows: list[tuple]) -> None:
    cur.executemany(
        """
        INSERT OR REPLACE INTO msds_english (
            chem_id, cas_no, name_en, pubchem_cid, signal_word,
            ghs_classification, hazard_statements, precautionary_statements, pictograms
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--commit-batch", type=int, default=100)
    parser.add_argument("--progress-every", type=int, default=100)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()
    global NIOSH_NAME_BY_CAS
    NIOSH_NAME_BY_CAS = load_niosh_name_by_cas()
    print(f"[init] niosh cas-name entries: {len(NIOSH_NAME_BY_CAS)}")

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    ensure_table(conn)

    target_rows = load_remaining(cur, limit=args.limit)
    total = len(target_rows)
    print(f"[start] remaining targets: {total}", flush=True)
    if total == 0:
        conn.close()
        print("[done] nothing to process", flush=True)
        return

    processed = 0
    saved_count = 0
    no_cid = 0
    no_ghs = 0
    pug_error = 0
    write_buffer: list[tuple] = []
    started_at = time.time()

    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
        futures = [executor.submit(fetch_one, row) for row in target_rows]
        for future in as_completed(futures):
            chem_id, payload, status = future.result()
            processed += 1

            if payload is not None:
                write_buffer.append(payload)
                saved_count += 1
            elif status == "no_cid":
                no_cid += 1
            elif status == "no_ghs":
                no_ghs += 1
            else:
                pug_error += 1

            if len(write_buffer) >= args.commit_batch:
                save_batch(cur, write_buffer)
                conn.commit()
                write_buffer = []

            if processed % max(1, args.progress_every) == 0:
                elapsed = time.time() - started_at
                speed = processed / elapsed if elapsed > 0 else 0.0
                print(
                    f"[progress] {processed}/{total} "
                    f"saved={saved_count} no_cid={no_cid} no_ghs={no_ghs} errors={pug_error} "
                    f"speed={speed:.2f}/s",
                    flush=True,
                )

    if write_buffer:
        save_batch(cur, write_buffer)
        conn.commit()

    total_saved = cur.execute("SELECT count(*) FROM msds_english").fetchone()[0]
    conn.close()

    elapsed = time.time() - started_at
    print(
        f"[done] processed={processed} saved={saved_count} no_cid={no_cid} "
        f"no_ghs={no_ghs} errors={pug_error} elapsed={elapsed:.1f}s total_saved={total_saved}",
        flush=True,
    )


if __name__ == "__main__":
    main()
