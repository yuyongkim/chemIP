"""Writes oel/<CAS>.json (gzip bytes) for every CAS with exposure-limit rows, and g/oel_summary.json (service 5).

Input: data/portal_facts.db (read-only), tables `oel` (all sources: MOEL notice, OSHA, NIOSH, EU, KOSHA MSDS §8),
`sources` (name, url, license, retrieved date) and `properties` molar_mass (for the ppm ↔ mg/m³ toggle).
Format: CONTRACT.md "oel/<CAS>.json". Stale files from an earlier run are removed first.
Values are reference values with their sources; the files carry no compliance judgement.
"""
from __future__ import annotations

import os
import re
import sqlite3
import time
from collections import Counter, defaultdict

import config
from jsonio import SizeStats, write_gzip

_CAS_RE = re.compile(config.CAS_PATTERN)
JURISDICTION_ORDER = ["KR", "US", "EU", "JP", "CN", "GB", "INTL"]
KIND_ORDER = ["TWA", "STEL", "C", "IDLH"]
# row order inside a jurisdiction: official notice / standard first, then the MSDS-quoted value, then advisory values
SOURCE_ORDER = ["kr_moel_notice", "kosha_msds_s8", "us_osha_z", "us_osha_specific", "us_niosh_npg", "eu_boelv", "eu_ioelv"]


def oel_path(cas: str, root: str = config.OEL_DIR) -> str:
    return os.path.join(root, f"{cas}.json")


def _ro(path: str) -> sqlite3.Connection:
    return sqlite3.connect(f"file:{path.replace(os.sep, '/')}?mode=ro", uri=True)


def _order(row: dict, source_rank: dict[str, int]) -> tuple:
    j = row["j"]
    return (JURISDICTION_ORDER.index(j) if j in JURISDICTION_ORDER else len(JURISDICTION_ORDER), j,
            source_rank.get(row["src"], 99), row["src"], KIND_ORDER.index(row["kind"]), row["unit"] or "", row["value"] or 0)


def read_db(path: str = config.PORTAL_DB) -> tuple[dict[str, list[dict]], dict[str, dict], dict[str, float]]:
    conn = _ro(path)
    try:
        by_cas: dict[str, list[dict]] = defaultdict(list)
        for cas, j, kind, value, unit, note, as_of, src in conn.execute(
                "SELECT cas, jurisdiction, kind, value, unit, notation, as_of, source_id FROM oel WHERE value IS NOT NULL"):
            if _CAS_RE.match(cas or "") and kind in KIND_ORDER:
                by_cas[cas].append({"j": j, "src": src, "kind": kind, "value": value, "unit": unit, "note": note or "",
                                    "as_of": as_of or ""})
        sources = {sid: {"name": n or sid, "url": u or "", "license": lic or "", "retrieved_at": r or ""}
                   for sid, n, u, lic, r in conn.execute("SELECT source_id, name, url, license, retrieved_at FROM sources")}
        mw: dict[str, Counter] = defaultdict(Counter)
        try:
            for cas, v in conn.execute("SELECT cas, value_num FROM properties WHERE prop = 'molar_mass' AND value_num > 0"):
                mw[cas][round(v, 4)] += 1
        except sqlite3.OperationalError:
            pass
        return by_cas, sources, {c: cnt.most_common(1)[0][0] for c, cnt in mw.items()}
    finally:
        conn.close()


def link_rows(sources: dict[str, dict]) -> list[dict]:
    """The link-only sources (ACGIH, GESTIS): name, url, license — never values."""
    return [{"src": sid, **{k: sources[sid][k] for k in ("name", "url", "license")}}
            for sid in config.OEL_LINK_ONLY if sid in sources]


def build_file(cas: str, rows: list[dict], sources: dict[str, dict], mw: float | None, today: str) -> dict:
    """One oel/<CAS>.json object (pure)."""
    rank = {sid: i for i, sid in enumerate(SOURCE_ORDER)}
    rows = sorted(rows, key=lambda r: _order(r, rank))
    used = list(dict.fromkeys(r["src"] for r in rows))
    links = link_rows(sources)
    return {"v": config.OEL_FORMAT, "cas": cas, "exported_at": today, "mw": mw,
            "rows": rows, "sources": {sid: sources.get(sid, {"name": sid, "url": "", "license": "", "retrieved_at": ""})
                                      for sid in used},
            "links": links}


def build_summary(files: dict[str, dict], sources: dict[str, dict], today: str) -> dict:
    by_source: dict[str, dict] = {}
    by_j: Counter = Counter()
    for cas, f in files.items():
        for sid in f["sources"]:
            s = by_source.setdefault(sid, {"name": f["sources"][sid]["name"], "cas": 0, "rows": 0})
            s["cas"] += 1
            s["rows"] += sum(1 for r in f["rows"] if r["src"] == sid)
        for j in {r["j"] for r in f["rows"]}:
            by_j[j] += 1
    return {"v": config.OEL_FORMAT, "exported_at": today, "count": len(files), "sources": by_source,
            "jurisdictions": dict(by_j.most_common()), "links": link_rows(sources), "cas": sorted(files)}


def _clear(root: str) -> int:
    os.makedirs(root, exist_ok=True)
    stale = [f for f in os.listdir(root) if f.endswith(".json")]
    for f in stale:
        os.remove(os.path.join(root, f))
    return len(stale)


def export_oel(log=print) -> dict:
    t0 = time.time()
    today = time.strftime("%Y-%m-%d")
    by_cas, sources, mw = read_db()
    removed = _clear(config.OEL_DIR)
    stats = SizeStats()
    files = {cas: build_file(cas, rows, sources, mw.get(cas), today) for cas, rows in by_cas.items()}
    for cas, body in files.items():
        raw, packed = write_gzip(oel_path(cas), body, config.GZIP_LEVEL)
        stats.add("oel", raw, packed)
    summary = build_summary(files, sources, today)
    raw, packed = write_gzip(os.path.join(config.GLOBAL_DIR, f"{config.OEL_SUMMARY_NAME}.json"), summary, config.GZIP_LEVEL)
    stats.add("g", raw, packed)
    log(f"oel: {len(files)} files, removed {removed} stale, summary {packed:,} bytes gz")
    return {**stats.to_dict(), "dir": config.OEL_DIR, "files": len(files), "removed_stale": removed,
            "sources": summary["sources"], "jurisdictions": summary["jurisdictions"], "secs": round(time.time() - t0, 1)}
