"""One-time data copy: local data/feedback.db + data/usage.db -> SQL file for D1.

Opens both SQLite files READ-ONLY (mode=ro) and never modifies or deletes them.
Writes INSERT statements to the output file; apply with:

    npx wrangler d1 execute chemip --remote --file <output.sql>

Feedback rows keep their ids (INSERT OR IGNORE, so re-running is harmless). Usage rows are merged with
ON CONFLICT ... DO UPDATE SET count = MAX(count, excluded.count), so re-running never double-counts.
Contact addresses are copied as data but never printed.

Usage: python export_local_db.py [--root G:/MSDS] [--out dump.sql]
"""
from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path

FEEDBACK_COLUMNS = (
    "id", "created_at", "category", "title", "body", "cas", "company_size",
    "contact", "status", "admin_reply", "reply_at",
)
USAGE_COLUMNS = ("day", "metric", "subject", "count")


def sql_literal(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def read_rows(db_path: Path, table: str, columns: tuple[str, ...]) -> list[tuple]:
    if not db_path.exists():
        return []
    conn = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)
    try:
        return conn.execute(f"SELECT {', '.join(columns)} FROM {table} ORDER BY 1").fetchall()
    except sqlite3.OperationalError:
        return []
    finally:
        conn.close()


def feedback_sql(rows: list[tuple]) -> list[str]:
    cols = ", ".join(FEEDBACK_COLUMNS)
    return [f"INSERT OR IGNORE INTO feedback ({cols}) VALUES ({', '.join(sql_literal(v) for v in r)});" for r in rows]


def usage_sql(rows: list[tuple]) -> list[str]:
    cols = ", ".join(USAGE_COLUMNS)
    return [
        f"INSERT INTO usage_daily ({cols}) VALUES ({', '.join(sql_literal(v) for v in r)}) "
        "ON CONFLICT(day, metric, subject) DO UPDATE SET count = MAX(count, excluded.count);"
        for r in rows
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[3]))
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    data = Path(args.root) / "data"
    fb = read_rows(data / "feedback.db", "feedback", FEEDBACK_COLUMNS)
    us = read_rows(data / "usage.db", "usage_daily", USAGE_COLUMNS)
    lines = feedback_sql(fb) + usage_sql(us)
    Path(args.out).write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
    print(f"feedback rows: {len(fb)}, usage_daily rows: {len(us)}, statements: {len(lines)} -> {args.out}")


if __name__ == "__main__":
    main()
