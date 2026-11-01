"""Incident feed collector (service 9). Run:

    python -I -B G:\\MSDS\\scripts\\portal_build\\incident_feed.py [--offline] [--no-press]

1. Chem_Eng incidents DB (read-only, backend/integrations/sources.py CHEMENG_INCIDENTS_DB) → every incident as a
   feed item; each Chem_Eng source (CSB, EPA RMP, eMARS, KOSHA, NICS) replaces its own rows
2. CSB news RSS (public domain) → upsert, keep the newest feed_config.CSB_RSS_KEEP
3. Google News RSS search (press: title + link only) → upsert, drop rows older than PRESS_KEEP_DAYS
   (--offline skips 2 and 3, --no-press skips 3; a source that cannot be reached keeps its previous rows)
4. `sources` rows (name, url, license) for every source_id used

Writes feed_items + sources in G:\\MSDS\\data\\portal_facts.db (short transactions). Then the static exporter writes
v1/feed/ (scripts/static_export/run_all.py --steps feed). Format: scripts/static_export/CONTRACT.md "feed/".
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I drops the script dir from sys.path

import feed_chemeng  # noqa: E402
import feed_config as C  # noqa: E402
import feed_db  # noqa: E402
import feed_fetch  # noqa: E402
import portal_db  # noqa: E402  (shared portal_facts.db connection + sources helper)
from feed_parse import NameTagger  # noqa: E402


def live_source_rows(today: str) -> dict[str, dict]:
    return {sid: {**s, "retrieved_at": today} for sid, s in C.LIVE_SOURCES.items()}


def collect_live(fetched_at: str, tagger: NameTagger, press: bool) -> dict:
    """{source_id: items} for the live sources that answered, plus errors."""
    out, errors = {}, []
    try:
        out["csb_rss"] = feed_fetch.fetch_csb(fetched_at, tagger)
    except Exception as exc:
        errors.append(f"csb_rss: {str(exc)[:200]}")
    if press:
        items, errs = feed_fetch.fetch_press(fetched_at, tagger)
        errors += [f"press_gnews: {e}" for e in errs]
        if items:
            out["press_gnews"] = items
    return {"items": out, "errors": errors}


def run(offline: bool = False, press: bool = True, db_path: str = portal_db.PORTAL_DB, today: dt.date | None = None,
        chemeng_path=None) -> dict:
    today = today or dt.date.today()
    fetched_at = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    chem = feed_chemeng.collect(today, chemeng_path) if chemeng_path else feed_chemeng.collect(today)
    tagger = NameTagger(chem["names"], C.NAME_MATCH_MIN_LATIN, C.NAME_MATCH_MIN_HANGUL, C.NAME_MATCH_SKIP)
    live = {"items": {}, "errors": []} if offline else collect_live(fetched_at, tagger, press)

    conn = portal_db.connect(db_path)
    try:
        feed_db.ensure_schema(conn)
        written = {}
        for sid in sorted(set(C.CHEMENG_SOURCES.values())):
            written[sid] = feed_db.replace_source(conn, sid, [it for it in chem["items"] if it["source_id"] == sid])
        for sid, items in live["items"].items():
            written[sid] = feed_db.upsert(conn, items)
        pruned = {
            "csb_rss": feed_db.prune_keep_newest(conn, "csb_rss", C.CSB_RSS_KEEP),
            "press_gnews": feed_db.prune_older_than(conn, "press_gnews", C.PRESS_KEEP_DAYS, today),
        }
        with conn:
            portal_db.put_sources(conn, {**chem["sources"], **live_source_rows(today.isoformat())})
        totals = feed_db.counts(conn)
    finally:
        conn.close()
    return {"written": written, "pruned": pruned, "totals": totals, "errors": live["errors"], "offline": offline}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true", help="Chem_Eng DB only, no network")
    ap.add_argument("--no-press", action="store_true", help="skip the press headlines")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    print(json.dumps(run(offline=args.offline, press=not args.no_press), ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
