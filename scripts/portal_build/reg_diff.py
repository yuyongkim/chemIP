"""Regulation change tracker (service 6). Run:

    python -I -B G:\\MSDS\\scripts\\portal_build\\reg_diff.py [--no-official] [--dry-run]

1. collect every list (reg_lists.collect_lists) and build a snapshot of it (reg_snapshot.build)
2. diff it with the stored latest snapshot → added / removed / modified rows (none on the first run = baseline)
3. fetch the official change sources (reg_official.fetch_all; --no-official skips them)
4. append the new rows to portal_facts.db reg_changes (rows already present are skipped: the table is append-only
   and has no key, so a row is "present" when every column matches), upsert this service's `sources` rows
5. save the snapshot as <date>.json.gz + latest.json.gz (reg_config.SNAPSHOT_DIR)

Then the static exporter writes v1/reg/ (scripts/static_export/run_all.py --steps reg). Refresh plan: README.md here.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I drops the script dir from sys.path

import portal_db  # noqa: E402  (P1's shared portal_facts.db schema + helpers)
import reg_config as C  # noqa: E402
import reg_lists  # noqa: E402
import reg_official  # noqa: E402
import reg_snapshot  # noqa: E402

COLUMNS = ("changed_on", "jurisdiction", "list_id", "cas", "change", "detail", "source_url", "source_id")
REPORT = r"E:\dev-cache\chemip-static\reports\reg_diff.json"
BATCH = 500


def _present(conn, row: tuple) -> bool:
    where = " AND ".join(f"{c} IS ?" for c in COLUMNS)
    return conn.execute(f"SELECT 1 FROM reg_changes WHERE {where} LIMIT 1", row).fetchone() is not None


def append_changes(conn, rows: list[tuple]) -> int:
    """Insert rows not already in reg_changes, in short transactions (other build scripts share the DB)."""
    added = 0
    with conn:  # an index only (the table itself stays exactly the doc's schema)
        conn.execute("CREATE INDEX IF NOT EXISTS reg_changes_day_list ON reg_changes (changed_on, list_id)")
    for i in range(0, len(rows), BATCH):
        chunk = [r for r in dict.fromkeys(rows[i:i + BATCH]) if not _present(conn, r)]
        if chunk:
            with conn:
                conn.executemany(f"INSERT INTO reg_changes ({','.join(COLUMNS)}) VALUES ({','.join('?' * len(COLUMNS))})", chunk)
            added += len(chunk)
    return added


def put_sources(conn, today: str) -> None:
    with conn:
        portal_db.put_sources(conn, {sid: {**s, "retrieved_at": today} for sid, s in C.SOURCES.items()})


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-official", action="store_true", help="skip law.go.kr / Federal Register / ECHA")
    ap.add_argument("--dry-run", action="store_true", help="no DB write, no snapshot")
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    today = dt.date.today()
    day = today.isoformat()

    lists = reg_lists.collect_lists()
    snap = reg_snapshot.build(lists, day)
    old = reg_snapshot.load_latest()
    diff_rows = reg_snapshot.diff(old, snap, day) if old else []
    official, official_report = ([], {"skipped": "--no-official"}) if a.no_official else reg_official.fetch_all(lists, today)
    report = {"day": day, "lists": len(lists), "rows": sum(len(x["rows"]) for x in lists),
              "baseline": old is None, "previous": old and old.get("taken_at"), "diff_rows": len(diff_rows),
              "official_rows": len(official), "official": official_report}
    if not a.dry_run:
        conn = portal_db.connect()
        try:
            put_sources(conn, day)
            report["inserted"] = append_changes(conn, diff_rows + official)
            report["reg_changes_total"] = conn.execute("SELECT COUNT(*) FROM reg_changes").fetchone()[0]
        finally:
            conn.close()
        report["snapshot"] = reg_snapshot.save(snap)
    os.makedirs(os.path.dirname(REPORT), exist_ok=True)
    with open(REPORT, "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)
    print(json.dumps(report, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
