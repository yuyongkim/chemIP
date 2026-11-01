"""Writes g/guide_index.json (gzip bytes): the KOSHA technical guide list for the unified search (added 2026-10-30).

One row per guide, [guide_no, title, ofanc_ymd, file_download_url], read from the guide store's metadata file
(settings.KOSHA_GUIDE_DATA_DIR / guides.json, the same fields and the same cleaning as
backend/core/kosha_guide_store.KoshaGuideStore._load). Document text, page counts and local file paths are not included.
The browser reads it in frontend/public/chemip/api_usearch.jsx (fetchGuideIndexRows); without the file it calls
GET /api/guides/search on the home PC.
"""
from __future__ import annotations

import json
import os
import time

import config
import db  # noqa: F401  (puts G:\MSDS on sys.path)
from jsonio import write_gzip

FIELDS = ["guide_no", "title", "ofanc_ymd", "file_download_url"]


def guide_rows(path: str) -> list[list[str]]:
    with open(path, encoding="utf-8") as fh:
        raw = json.load(fh)
    rows, seen = [], set()
    for row in raw:
        if not isinstance(row, dict):
            continue
        no = str(row.get("techGdlnNo", "")).strip()
        if not no or no in seen:
            continue
        seen.add(no)
        rows.append([
            no,
            str(row.get("techGdlnNm", "")).strip(),
            str(row.get("techGdlnOfancYmd", "")).strip(),
            str(row.get("fileDownloadUrl", "")).strip(),
        ])
    return rows


def export_guide_index(log=print, root: str = config.GLOBAL_DIR) -> dict:
    from backend.config.settings import settings

    src = os.path.join(str(settings.KOSHA_GUIDE_DATA_DIR), "guides.json")
    rows = guide_rows(src)
    body = {"v": config.GUIDE_INDEX_FORMAT, "exported_at": time.strftime("%Y-%m-%d"), "count": len(rows), "fields": FIELDS, "rows": rows}
    raw, packed = write_gzip(os.path.join(root, f"{config.GUIDE_INDEX_NAME}.json"), body)
    log(f"guide_index: {len(rows)} guides, {raw:,} B raw, {packed:,} B gzip")
    return {"count": len(rows), "raw": raw, "gz": packed, "source": src}
