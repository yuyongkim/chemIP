"""Writes tp/<CAS>.json (gzip bytes) — temperature-dependent property correlations per substance — plus tp/index.json and
tp/licenses.json. Input: data/portal_raw/tp/build/tp_records.json from scripts/portal_build/thermo_props.py.
Format: CONTRACT.md "tp/". Stale files from an earlier run are removed first. The licence gate runs again here.
"""
from __future__ import annotations

import json
import os
import sys
import time

import config
from jsonio import SizeStats, write_gzip

PORTAL_BUILD = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "portal_build")
sys.path.insert(0, PORTAL_BUILD)

import tp_licence  # noqa: E402
import tp_raw  # noqa: E402

TP_DIR = os.path.join(config.OUT, "tp")   # -> R2 (gzip bytes, .json names)
TP_FORMAT = 1
RECORDS = os.path.join(tp_raw.registry()["raw_dir"], "build", "tp_records.json")
LICENCE_FILES = {   # source id → raw files whose full text goes into tp/licenses.json
    "chemsep_lite": ["Artistic_license_2_0.txt"],
    "nasa_cea": ["NOTICE.txt", "LICENSE.txt"],
}


def _clear(root: str) -> int:
    os.makedirs(root, exist_ok=True)
    stale = [f for f in os.listdir(root) if f.endswith(".json")]
    for f in stale:
        os.remove(os.path.join(root, f))
    return len(stale)


def build_index(files: dict[str, dict], today: str) -> dict:
    """tp/index.json: which CAS have a file, its name and which properties (pure)."""
    rows = [[cas, f.get("name", ""), sorted({c["p"] for c in f["curves"]})] for cas, f in sorted(files.items())]
    return {"v": TP_FORMAT, "exported_at": today, "count": len(rows), "rows": rows}


def build_licenses(registry: dict, today: str) -> dict:
    out = {"v": TP_FORMAT, "exported_at": today, "sources": {}}
    for s in tp_licence.allowed_sources(registry).values():
        texts = {}
        for name in LICENCE_FILES.get(s["source_id"], []):
            with open(tp_raw.raw_path(s["source_id"], name), encoding="utf-8", errors="replace") as fh:
                texts[name] = fh.read()
        out["sources"][s["source_id"]] = {"name": s["name"], "license": s["license"], "license_url": s.get("license_url", ""),
                                          "citation": s["citation"], "note": s.get("modified_version_note", ""),
                                          "notice": s.get("notice", ""), "texts": texts}
    return out


def export_tp(log=print) -> dict:
    t0 = time.time()
    today = time.strftime("%Y-%m-%d")
    registry = tp_raw.registry()
    with open(RECORDS, encoding="utf-8") as fh:
        files = json.load(fh)["files"]
    removed = _clear(TP_DIR)
    stats = SizeStats()
    for cas, body in files.items():
        tp_licence.check_file(body, registry)
        body = {**body, "exported_at": today}
        raw, packed = write_gzip(os.path.join(TP_DIR, f"{cas}.json"), body, config.GZIP_LEVEL)
        stats.add("tp", raw, packed)
    for name, obj in (("index", build_index(files, today)), ("licenses", build_licenses(registry, today))):
        raw, packed = write_gzip(os.path.join(TP_DIR, f"{name}.json"), obj, config.GZIP_LEVEL)
        stats.add("tp_meta", raw, packed)
    log(f"tp: {len(files)} files, removed {removed} stale")
    return {**stats.to_dict(), "dir": TP_DIR, "files": len(files), "removed_stale": removed, "secs": round(time.time() - t0, 1)}
