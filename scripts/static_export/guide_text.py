"""Writes gs/ (gzip bytes): the KOSHA technical guide full-text index for the unified search (added 2026-10-31).

Source (read-only), the guide store's folder settings.KOSHA_GUIDE_DATA_DIR:
  guides.json                         metadata (same fields and cleaning as guide_index.py / KoshaGuideStore._load)
  normalized/guide_pages.jsonl.gz     page text extracted from the PDFs (scripts/parse_kosha_guide_pdfs.py)

Output under config.GUIDE_TEXT_DIR (format: CONTRACT.md "gs/ — KOSHA guide full text"; builder guide_text_build.py):
  manifest.json      {v, exported_at, count, shards, norm, fields, rows}
  t_<n>.json         bigram postings shard n
  d_<guide_no>.json  {v, no, title, pages: [text, ...]} — page text for snippets and the exact phrase check
The browser side is frontend/public/chemip/guide_text_core.jsx + api_guide_text.jsx.
"""
from __future__ import annotations

import gzip
import json
import os
import re
import time

import config
import db  # noqa: F401  (puts G:\MSDS on sys.path)
import guide_text_build as gtb
from guide_index import guide_rows
from jsonio import write_gzip

FIELDS = ["guide_no", "title", "ofanc_ymd", "file_download_url", "pages", "chars"]
NORM = "nfkc-lower-alnum-bigram"  # names the normalization, so a client can refuse a format it does not know
GUIDE_NO_RE = re.compile(r"^[A-Za-z0-9-]+$")
OWNED_RE = re.compile(r"^(manifest|t_\d+|d_[A-Za-z0-9-]+)\.json$")


def read_pages(path: str) -> dict[str, list[str]]:
    pages: dict[str, list[tuple[int, str]]] = {}
    with gzip.open(path, "rt", encoding="utf-8") as fh:
        for line in fh:
            r = json.loads(line)
            no = str(r.get("guide_no", "")).strip()
            if no:
                pages.setdefault(no, []).append((int(r.get("page_no") or 0), str(r.get("text") or "")))
    return {no: [t for _, t in sorted(rows)] for no, rows in pages.items()}


def collect(src_dir: str) -> list[dict]:
    """Guides in guides.json order that have page text and a file-safe number."""
    pages = read_pages(os.path.join(src_dir, "normalized", "guide_pages.jsonl.gz"))
    docs = []
    for no, title, date, url in guide_rows(os.path.join(src_dir, "guides.json")):
        if no in pages and GUIDE_NO_RE.match(no):
            docs.append({"no": no, "title": title, "date": date, "url": url, "pages": pages[no]})
    return docs


def _clear(root: str) -> None:
    if os.path.isdir(root):
        for f in os.listdir(root):
            if OWNED_RE.match(f):
                os.remove(os.path.join(root, f))


def export_guide_text(log=print, root: str = config.GUIDE_TEXT_DIR) -> dict:
    from backend.config.settings import settings

    src = str(settings.KOSHA_GUIDE_DATA_DIR)
    docs = collect(src)
    rows, shard_map = gtb.build(docs, config.GUIDE_TEXT_SHARDS)
    _clear(root)
    stats = {"t": [0, 0, 0], "d": [0, 0, 0]}  # files, raw, gzip

    def put(kind, name, body):
        raw, packed = write_gzip(os.path.join(root, name), body)
        s = stats[kind]
        s[0] += 1; s[1] += raw; s[2] += packed

    for n in range(config.GUIDE_TEXT_SHARDS):
        put("t", f"t_{n}.json", shard_map.get(n, {}))
    for d in docs:
        put("d", f"d_{d['no']}.json", {"v": config.GUIDE_TEXT_FORMAT, "no": d["no"], "title": d["title"],
                                        "pages": [gtb.clean_page(p) for p in d["pages"]]})
    manifest = {"v": config.GUIDE_TEXT_FORMAT, "exported_at": time.strftime("%Y-%m-%d"), "count": len(rows),
                "shards": config.GUIDE_TEXT_SHARDS, "norm": NORM, "fields": FIELDS, "rows": rows}
    m_raw, m_gz = write_gzip(os.path.join(root, "manifest.json"), manifest)
    n_bigrams = sum(len(s) for s in shard_map.values())
    log(f"guide_text: {len(rows)} guides, {n_bigrams:,} bigrams, shards {stats['t'][2]:,} B gzip, "
        f"texts {stats['d'][2]:,} B gzip, manifest {m_gz:,} B gzip")
    return {"count": len(rows), "bigrams": n_bigrams, "shards": config.GUIDE_TEXT_SHARDS,
            "shard_files": {"files": stats["t"][0], "raw": stats["t"][1], "gz": stats["t"][2]},
            "doc_files": {"files": stats["d"][0], "raw": stats["d"][1], "gz": stats["d"][2]},
            "manifest": {"raw": m_raw, "gz": m_gz}, "source": src}
