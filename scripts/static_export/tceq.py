"""Writes tx/<CAS>.json (gzip bytes) for every CAS in data/tceq_event_cas_index.db: Texas TCEQ emission events.

Body = exact output of GET /api/integrations/tceq-events/{cas}?limit=6 (config.TCEQ_PARAMS), built with the backend
store function the route calls. Only CAS with at least one event get a file; a missing file means "no events"
(the UI shows the empty answer, see CONTRACT.md "tx/<CAS>.json"). Stale files from an earlier run are removed first.
Report: reports/tceq_index.csv (cas, total, raw, gz).
"""
from __future__ import annotations

import csv
import os
import re
import sqlite3
import time

import config
import db  # noqa: F401  (puts G:\MSDS on sys.path)
from jsonio import SizeStats, write_gzip

_CAS_RE = re.compile(config.CAS_PATTERN)


def tceq_path(cas: str, root: str = config.TCEQ_DIR) -> str:
    return os.path.join(root, f"{cas}.json")


def index_cas() -> list[str]:
    from backend.integrations.sources import TCEQ_EVENT_CAS_INDEX_DB

    conn = sqlite3.connect(f"file:{TCEQ_EVENT_CAS_INDEX_DB.as_posix()}?mode=ro", uri=True)
    try:
        return sorted(c for (c,) in conn.execute("SELECT DISTINCT cas FROM event_cas") if _CAS_RE.match(c or ""))
    finally:
        conn.close()


def _clear(root: str) -> int:
    os.makedirs(root, exist_ok=True)
    stale = [f for f in os.listdir(root) if f.endswith(".json")]
    for f in stale:
        os.remove(os.path.join(root, f))
    return len(stale)


def export_tceq(log=print) -> dict:
    from backend.integrations.tceq_event_store import get_tceq_events_by_cas

    t0 = time.time()
    removed = _clear(config.TCEQ_DIR)
    os.makedirs(config.REPORTS, exist_ok=True)
    stats, empty = SizeStats(), []
    cas_list = index_cas()
    with open(os.path.join(config.REPORTS, "tceq_index.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["cas", "total", "raw", "gz"])
        for cas in cas_list:
            body = get_tceq_events_by_cas(cas, **config.TCEQ_PARAMS)
            if not body.get("total"):
                empty.append(cas)
                continue
            raw, packed = write_gzip(tceq_path(cas), body, config.GZIP_LEVEL)
            stats.add("tx", raw, packed)
            w.writerow([cas, body["total"], raw, packed])
    log(f"tceq: {stats.total()['files']} files, removed {removed} stale, empty {len(empty)}")
    return {**stats.to_dict(), "dir": config.TCEQ_DIR, "cas_in_index": len(cas_list), "removed_stale": removed,
            "empty": empty[:20], "secs": round(time.time() - t0, 1)}
