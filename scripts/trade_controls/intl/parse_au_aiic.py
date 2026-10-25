"""Australia AICIS — Australian Inventory of Industrial Chemicals (AIIC), downloadable spreadsheet.

The AICIS search page carries a "Download the Inventory" link (/_entity/annotation/<id>) to one .xlsx sheet:
row 1 = disclaimer, row 2 = header (CR No. / CAS No / Chemical Name / AICIS Approved Chemical Name /
Molecular Formula / Specific Information Requirements / Defined Scope of Assessment /
Conditions of Introduction and Use / Prescribed Information), then one row per listed chemical.
Rows whose CAS is blank or 'Confidential' are counted but not stored (nothing to match on).
The annotation id is read from the search page on every run, so a new half-yearly file is picked up.
"""
from __future__ import annotations

import re
from pathlib import Path

from intl_common import cas_tokens, clean, entry, fetch, file_info, split_entries

HEADER = "CR No."
TERMS = (("Specific Information Requirements", "특정 정보 제출 요건"),
         ("Defined Scope of Assessment", "평가 범위 한정"),
         ("Conditions of Introduction and Use", "도입·사용 조건"),
         ("Prescribed Information", "규정 정보"))


def download_url(search_page: Path, base: str) -> str:
    text = search_page.read_text(encoding="utf-8", errors="replace")
    m = re.search(r'id="downloadInventoryId"[^>]*value="([0-9a-f-]{36})"', text)
    if not m:
        raise ValueError("AICIS search page: downloadInventoryId not found")
    return f"{base}/_entity/annotation/{m.group(1)}"


def read_rows(path: Path) -> tuple[list[dict], str]:
    import openpyxl  # S: venv only

    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    start = next(i for i, r in enumerate(rows) if r and str(r[0] or "").strip() == HEADER)
    head = [clean(h) for h in rows[start]]
    out = [dict(zip(head, r)) for r in rows[start + 1:] if any(v not in (None, "") for v in r)]
    return out, ws.title


def _detail(r: dict) -> str:
    parts = [f"CR No. {r.get('CR No.')}"]
    for col, label in TERMS:
        val = clean(r.get(col) or "")
        if val:
            parts.append(f"{label}: {val[:240]}{'…' if len(val) > 240 else ''}")
    return "; ".join(parts)


def collect(spec: dict, raw_dir: Path, offline: bool) -> dict:
    d = spec["downloads"]
    page = fetch(d["search_page"]["url"], raw_dir / d["search_page"]["file"], offline)
    url = download_url(page, d["search_page"]["base"])
    path = fetch(url, raw_dir / d["inventory"]["file"], offline)
    rows, sheet = read_rows(path)
    items, no_cas = [], 0
    for r in rows:
        cas_cell = clean(r.get("CAS No") or "")
        cas = cas_tokens(cas_cell)
        if not cas:
            no_cas += 1
            continue
        name = clean(r.get("Chemical Name") or "") or clean(r.get("AICIS Approved Chemical Name") or "")
        items.append(entry("", name[:300], _detail(r), cas_all=cas, match_method="official CAS"))
    entries, families, bad = split_entries(items)
    confidential = sum(1 for r in rows if clean(r.get("CAS No") or "").lower() == "confidential")
    return {"inventory": {
        "entries": entries, "family_entries": [],
        "problems": [f"invalid CAS in source: {bad[:20]}"] if bad else [],
        "official_count": len(rows), "official_count_basis": f"시트 '{sheet}' 데이터 행 수(공개 목록 전체)",
        "counted": len(items) + no_cas,
        "source_version": f"AICIS downloadable Inventory, sheet '{sheet}'",
        "notes": [f"CAS 없는 행 {no_cas}건(폴리머·UVCB·AICIS 승인명만 있는 항목 등, 그중 'Confidential' {confidential}건)은 CAS 로 맞출 수 없어 저장하지 않음",
                  *([f"CAS 체크디지트 오류로 제외: {len(bad)}건"] if bad else [])],
        "files": [file_info(page, d["search_page"]["url"]), file_info(path, url)],
    }}
