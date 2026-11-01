"""Writes prtr/index.json and prtr/<CAS>.json (gzip bytes): the PRTR facility map (portal service 13).

Bodies come from backend/core/prtr_map.py (the same function the PC route /api/prtr serves), read from the local PRTR
cache data/prtr/prtr_facilities.sqlite opened read-only. A CAS gets a file only when it has facility rows; the index
lists exactly those CAS. Stale files from an earlier run are removed first. Format: CONTRACT.md "prtr/".
Report: reports/prtr_index.csv (cas, facilities, regions, sigungu, raw, gz).
"""
from __future__ import annotations

import csv
import os
import time

import config
import db  # noqa: F401  (puts G:\MSDS on sys.path)
from jsonio import SizeStats, write_gzip


def prtr_path(name: str, root: str = config.PRTR_DIR) -> str:
    return os.path.join(root, f"{name}.json")


def _clear(root: str) -> int:
    os.makedirs(root, exist_ok=True)
    stale = [f for f in os.listdir(root) if f.endswith(".json")]
    for f in stale:
        os.remove(os.path.join(root, f))
    return len(stale)


def export_prtr(log=print, root: str = config.PRTR_DIR, source_db: str = config.PRTR_DB) -> dict:
    from backend.core.prtr_map import build_all, connect_ro

    t0 = time.time()
    removed = _clear(root)
    os.makedirs(config.REPORTS, exist_ok=True)
    conn = connect_ro(source_db)
    try:
        index, bodies = build_all(conn, exported_at=time.strftime("%Y-%m-%d"))
    finally:
        conn.close()
    stats = SizeStats()
    sites, sigungu = set(), set()
    with open(os.path.join(config.REPORTS, "prtr_index.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["cas", "facilities", "regions", "sigungu", "raw", "gz"])
        for cas in sorted(bodies):
            body = bodies[cas]
            raw, packed = write_gzip(prtr_path(cas, root), body, config.GZIP_LEVEL)
            stats.add("prtr", raw, packed)
            w.writerow([cas, body["totals"]["facilities"], len(body["regions"]), len(body["sigungu"]), raw, packed])
            sites.update((f[0], f[3]) for f in body["facilities"])
            sigungu.update((s["iso"], s["name"]) for s in body["sigungu"])
    raw, packed = write_gzip(prtr_path(config.PRTR_INDEX_NAME, root), index, config.GZIP_LEVEL)
    stats.add("index", raw, packed)
    regions = {r["iso"] for b in bodies.values() for r in b["regions"]}
    log(f"prtr: {len(bodies)} substances, {len(sites)} distinct sites, {len(regions)} regions, {len(sigungu)} 시군구, removed {removed} stale")
    return {**stats.to_dict(), "dir": root, "year": index["year"], "substances": len(bodies),
            "facility_rows": sum(b["totals"]["facilities"] for b in bodies.values()), "distinct_sites": len(sites),
            "regions": len(regions), "sigungu": len(sigungu),
            "unparsed": sum(b["unparsed"] for b in bodies.values()), "removed_stale": removed, "secs": round(time.time() - t0, 1)}
