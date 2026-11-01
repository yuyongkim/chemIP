"""Static files for the incident feed (service 9) → v1/feed/ (gzip bytes, .json names).

    v1/feed/latest.json          newest items (feed_config.LATEST_N, plus LATEST_PER_SOURCE of every source),
                                 source names/licenses, discipline names, top substances, country counts
    v1/feed/by-cas/<CAS>.json    every substance with feed items: its newest BY_CAS_MAX items and the full count

Input: portal_facts.db feed_items / sources (read-only; written by scripts/portal_build/incident_feed.py).
Format: CONTRACT.md "feed/". Stale by-cas files of an earlier run are removed first. Run: run_all.py --steps feed.
The Worker cron (cloudflare/worker/src/cron_feed.js) later rewrites latest.json in R2 with new CSB RSS items.
"""
from __future__ import annotations

import os
import sqlite3
import sys
import time
from collections import Counter

import config
from jsonio import SizeStats, write_gzip

PORTAL_BUILD = os.path.join(config.PROJECT, "scripts", "portal_build")
if PORTAL_BUILD not in sys.path:
    sys.path.append(PORTAL_BUILD)  # appended, so static_export modules (config, db, ...) are never shadowed

import feed_config as FC  # noqa: E402
import feed_db  # noqa: E402

FEED_DIR = os.path.join(config.OUT, "feed")
BY_CAS_DIR = os.path.join(FEED_DIR, "by-cas")


def _discipline_names() -> dict[str, str]:
    if config.PROJECT not in sys.path:
        sys.path.append(config.PROJECT)
    from backend.integrations.equipment_disciplines import DISCIPLINES
    return {k: v[0] for k, v in DISCIPLINES.items()}


def newest_first(items: list[dict]) -> list[dict]:
    """By date, newest first ("" sorts lowest, so items without a date come last); ties by id, descending."""
    return sorted(items, key=lambda it: (it["date"], it["id"]), reverse=True)


def public_item(it: dict) -> dict:
    return {"id": it["id"], "date": it["date"], "title": it["title"], "url": it["url"], "source": it["source_id"],
            "cas": it["cas"], "names": it["chem_names"], "equipment": it["equipment"], "disciplines": it["discipline"],
            "country": it["country"], "summary": it["summary"]}


def select_latest(items: list[dict], n: int, per_source: int, per_source_max: int) -> list[dict]:
    """The newest n items (at most per_source_max from one source), plus the newest per_source of every source."""
    ordered = newest_first(items)
    picked: dict[str, dict] = {}
    taken: Counter = Counter()
    for it in ordered:
        if len(picked) >= n:
            break
        if taken[it["source_id"]] < per_source_max:
            taken[it["source_id"]] += 1
            picked[it["id"]] = it
    for it in ordered:
        if taken[it["source_id"]] < per_source and it["id"] not in picked:
            taken[it["source_id"]] += 1
            picked[it["id"]] = it
    return newest_first(list(picked.values()))


def by_cas(items: list[dict]) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for it in items:
        for c in it["cas"]:
            out.setdefault(c, []).append(it)
    return {c: newest_first(v) for c, v in out.items()}


def cas_name(cas: str, items: list[dict], max_len: int = 40) -> str:
    """The most frequent name of the CAS among its items (names longer than max_len only when there is no other)."""
    names = Counter(n for it in items for c, n in zip(it["cas"], it["chem_names"]) if c == cas and n)
    short = [(k, v) for k, v in names.most_common() if len(k) <= max_len]
    if short:
        return short[0][0]
    return min(names, key=len) if names else ""


def read_sources(conn: sqlite3.Connection, ids: set[str], n_by_source: Counter) -> dict[str, dict]:
    out = {}
    for sid, name, url, lic, retrieved in conn.execute("SELECT source_id, name, url, license, retrieved_at FROM sources"):
        if sid in ids:
            out[sid] = {"name": name or sid, "url": url or "", "license": lic or "", "retrieved_at": retrieved or "",
                        "n": n_by_source[sid]}
    return out


def latest_body(items: list[dict], sources: dict, groups: dict[str, list[dict]], today: str) -> dict:
    latest = select_latest(items, FC.LATEST_N, FC.LATEST_PER_SOURCE, FC.LATEST_PER_SOURCE_MAX)
    top = sorted(groups.items(), key=lambda kv: (-len(kv[1]), kv[0]))[:FC.TOP_SUBSTANCES]
    return {
        "v": FC.EXPORT_FORMAT, "exported_at": today, "updated_at": today, "total": len(items), "count": len(latest),
        "sources": sources, "disciplines": _discipline_names(),
        "countries": dict(Counter(it["country"] for it in items if it["country"]).most_common()),
        "substances": [[c, cas_name(c, v), len(v)] for c, v in top],
        "items": [public_item(it) for it in latest],
    }


def cas_body(cas: str, rows: list[dict], today: str) -> dict:
    return {"v": FC.EXPORT_FORMAT, "cas": cas, "name": cas_name(cas, rows), "exported_at": today, "total": len(rows),
            "by_source": dict(Counter(it["source_id"] for it in rows).most_common()),
            "items": [public_item(it) for it in rows[:FC.BY_CAS_MAX]]}


def _clear(root: str) -> int:
    os.makedirs(root, exist_ok=True)
    stale = [f for f in os.listdir(root) if f.endswith(".json")]
    for f in stale:
        os.remove(os.path.join(root, f))
    return len(stale)


def export_feed(log=print, db_path: str = config.PORTAL_DB, out_dir: str = FEED_DIR) -> dict:
    t0 = time.time()
    conn = sqlite3.connect(f"file:{db_path.replace(os.sep, '/')}?mode=ro", uri=True)
    try:
        items = feed_db.read_all(conn)
        n_by_source = Counter(it["source_id"] for it in items)
        sources = read_sources(conn, set(n_by_source), n_by_source)
    finally:
        conn.close()
    today = time.strftime("%Y-%m-%d")
    groups = by_cas(items)
    stats = SizeStats()
    raw, packed = write_gzip(os.path.join(out_dir, "latest.json"), latest_body(items, sources, groups, today), config.GZIP_LEVEL)
    stats.add("latest", raw, packed)
    cas_dir = os.path.join(out_dir, "by-cas")
    removed = _clear(cas_dir)
    for cas, rows in groups.items():
        raw, packed = write_gzip(os.path.join(cas_dir, f"{cas}.json"), cas_body(cas, rows, today), config.GZIP_LEVEL)
        stats.add("by-cas", raw, packed)
    log(f"feed: {len(items)} items, {len(groups)} by-cas files, removed {removed} stale")
    return {**stats.to_dict(), "dir": out_dir, "items": len(items), "by_source": dict(n_by_source.most_common()),
            "cas_files": len(groups), "removed_stale": removed, "secs": round(time.time() - t0, 1)}
