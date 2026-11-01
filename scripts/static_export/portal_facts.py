"""Writes the portal facts area (services 2-4, added 2026-10-31) from data/portal_facts.db, read-only:

- f/<CAS>.json   identifiers, properties, transport and oel of one CAS (every CAS with a property, transport or oel row)
- f/id_<n>.json  EC / KE / InChIKey → CAS lookup for the unified search, n = fnv1a32(key) % config.FACTS_ID_BUCKETS
- g/un_index.json  UN number → transport summary + CAS list

All gzip bytes with .json names. Stale f/ files of an earlier run are removed first. Formats: CONTRACT.md "f/<CAS>.json".
The DB is built by scripts/portal_build (msds_facts.py, identifiers.py, and the oel / reg builders of other services).
Report: reports/portal_facts_index.csv (cas, props, transport, oel, raw, gz).
"""
from __future__ import annotations

import collections
import csv
import os
import sqlite3
import time

import config
from jsonio import SizeStats, write_gzip
from portal_facts_build import facts_object, id_shards, un_index, best_names, link_id


def _ro(path: str = config.PORTAL_DB) -> sqlite3.Connection:
    conn = sqlite3.connect(f"file:{path.replace(os.sep, '/')}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def _group(conn, sql: str) -> dict[str, list[dict]]:
    out = collections.defaultdict(list)
    for r in conn.execute(sql):
        out[r["cas"]].append(dict(r))
    return out


def read_db(path: str = config.PORTAL_DB) -> dict:
    conn = _ro(path)
    try:
        sources = {r["source_id"]: {"name": r["name"], "url": r["url"], "license": r["license"], "retrieved_at": r["retrieved_at"]}
                   for r in conn.execute("SELECT * FROM sources")}
        ids = collections.defaultdict(list)
        for r in conn.execute("SELECT cas, id_type, value, source_id FROM identifiers ORDER BY cas, id_type, value"):
            ids[r["cas"]].append((r["id_type"], r["value"], r["source_id"]))
        return {
            "sources": sources,
            "ids": ids,
            "props": _group(conn, "SELECT * FROM properties ORDER BY cas, prop, chem_id"),
            "transport": _group(conn, "SELECT * FROM transport WHERE un_number IS NOT NULL ORDER BY cas, chem_id"),
            "oel": _group(conn, "SELECT * FROM oel ORDER BY cas, jurisdiction, kind, source_id, value"),
            "oel_text": _group(conn, "SELECT * FROM oel_text ORDER BY cas, jurisdiction, chem_id"),
        }
    finally:
        conn.close()


def _clear(root: str) -> int:
    os.makedirs(root, exist_ok=True)
    stale = [f for f in os.listdir(root) if f.endswith(".json")]
    for f in stale:
        os.remove(os.path.join(root, f))
    return len(stale)


def export_portal_facts(log=print, root: str = config.FACTS_DIR, global_dir: str = config.GLOBAL_DIR,
                        db_path: str = config.PORTAL_DB) -> dict:
    t0 = time.time()
    d = read_db(db_path)
    removed = _clear(root)
    fact_cas = sorted(set(d["props"]) | set(d["transport"]) | set(d["oel"]))
    card_cas = set(fact_cas) | set(d["ids"])
    card = {}
    for cas in card_cas:
        names = best_names(d["ids"].get(cas, []))
        card[cas] = {"link": link_id(cas, d["ids"].get(cas, [])), "names": [(names["ko"] or [""])[0], (names["en"] or [""])[0]]}
    stats = SizeStats()
    os.makedirs(config.REPORTS, exist_ok=True)
    with open(os.path.join(config.REPORTS, "portal_facts_index.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["cas", "props", "transport", "oel", "raw", "gz"])
        for cas in fact_cas:
            body = facts_object(cas, d["ids"].get(cas, []), d["props"].get(cas, []), d["transport"].get(cas, []),
                                d["oel"].get(cas, []), d["oel_text"].get(cas, []), d["sources"])
            raw, packed = write_gzip(os.path.join(root, f"{cas}.json"), body, config.GZIP_LEVEL)
            stats.add("f", raw, packed)
            w.writerow([cas, len(body["props"]), len(body["transport"]), len(body["oel"]), raw, packed])
    shards = id_shards(d["ids"], card)
    n_keys = 0
    for b, body in sorted(shards.items()):
        raw, packed = write_gzip(os.path.join(root, f"id_{b}.json"), {"v": config.FACTS_FORMAT, "bucket": b, "keys": body},
                                 config.GZIP_LEVEL)
        stats.add("id", raw, packed)
        n_keys += len(body)
    uns = un_index(d["transport"], card)
    un_body = {"v": config.FACTS_FORMAT, "exported_at": time.strftime("%Y-%m-%d"), "count": len(uns),
               "fields": ["CAS", "link", "name_ko", "name_en"], "rows": uns}
    raw, packed = write_gzip(os.path.join(global_dir, f"{config.UN_INDEX_NAME}.json"), un_body, config.GZIP_LEVEL)
    stats.add("un_index", raw, packed)
    cov = collections.Counter()
    for cas in fact_cas:
        cov["props"] += cas in d["props"]
        cov["transport"] += cas in d["transport"]
        cov["oel"] += cas in d["oel"]
    log(f"portal_facts: {len(fact_cas)} CAS files, {len(shards)} id shards ({n_keys} keys), {len(uns)} UN numbers, removed {removed} stale")
    return {**stats.to_dict(), "dir": root, "cas_files": len(fact_cas), "coverage": dict(cov), "id_keys": n_keys,
            "id_buckets": config.FACTS_ID_BUCKETS, "un_numbers": len(uns), "removed_stale": removed, "secs": round(time.time() - t0, 1)}
