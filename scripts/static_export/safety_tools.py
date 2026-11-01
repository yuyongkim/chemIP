"""Writes the safety-tool files of services 7 and 8 (added 2026-10-31), gzip bytes with .json names under g/:

- g/reactive_class.json  CAS -> reactive classes for the storage compatibility matrix, from data/portal_facts.db
                         (tables reactive_class + sources, built by scripts/portal_build/reactive_class.py), read-only
- g/clp_annex6.json      CAS -> CLP Annex VI harmonised entries (hazard entries, SCLs, M-factors, ATEs), for the mixture
                         GHS helper; parsed from the ECHA Annex VI table by scripts/portal_build/annex6.py

Formats: CONTRACT.md "g/reactive_class.json" and "g/clp_annex6.json". The pair rules and hazard-class tables are not
here: the browser has them in frontend/public/chemip/safety_rules_data.jsx (generated from scripts/portal_build/safety_rules).
"""
from __future__ import annotations

import collections
import os
import sqlite3
import sys
import time

import config
from jsonio import write_gzip

PORTAL_BUILD = os.path.join(config.PROJECT, "scripts", "portal_build")


def _portal_build():
    if PORTAL_BUILD not in sys.path:
        sys.path.insert(0, PORTAL_BUILD)


def reactive_class_body(db_path: str = config.PORTAL_DB) -> dict:
    conn = sqlite3.connect(f"file:{db_path.replace(os.sep, '/')}?mode=ro", uri=True)
    try:
        rows = conn.execute("SELECT cas, system, class_code, basis, source_id FROM reactive_class ORDER BY cas, system, class_code, source_id").fetchall()
        used = sorted({r[4] for r in rows})
        sources = {}
        for sid, name, url, lic, at in conn.execute("SELECT source_id, name, url, license, retrieved_at FROM sources"):
            if sid in used:
                sources[sid] = {"name": name, "url": url, "license": lic, "retrieved_at": at}
    finally:
        conn.close()
    index = {sid: i for i, sid in enumerate(used)}
    classes: dict[str, list] = collections.defaultdict(list)
    for cas, system, code, basis, sid in rows:
        classes[cas].append([system, code, basis or "", index[sid]])
    return {"v": config.SAFETY_FORMAT, "exported_at": time.strftime("%Y-%m-%d"), "source_ids": used, "sources": sources,
            "fields": ["system", "class", "basis", "source"], "count": len(classes), "classes": dict(classes)}


def clp_annex6_body(xlsx: str | None = None) -> dict:
    _portal_build()
    import annex6

    path = xlsx or annex6.ANNEX6_XLSX
    res = annex6.read_annex6(path)
    return {"v": config.SAFETY_FORMAT, "exported_at": time.strftime("%Y-%m-%d"),
            "table_date": time.strftime("%Y-%m-%d", time.localtime(os.path.getmtime(path))),
            "atp": res["atp_max"], "source": annex6.SOURCE, "count": len(res["entries"]),
            "rows": res["rows"], "rows_no_cas": res["rows_no_cas"], "entries": res["entries"]}


def export_safety_tools(log=print, root: str = config.GLOBAL_DIR) -> dict:
    out = {}
    for name, body in ((config.REACTIVE_CLASS_NAME, reactive_class_body()), (config.CLP_ANNEX6_NAME, clp_annex6_body())):
        raw, packed = write_gzip(os.path.join(root, f"{name}.json"), body)
        log(f"safety_tools: g/{name}.json {body['count']:,} CAS, {raw:,} B raw, {packed:,} B gzip")
        out[name] = {"count": body["count"], "raw": raw, "gz": packed}
    return out
