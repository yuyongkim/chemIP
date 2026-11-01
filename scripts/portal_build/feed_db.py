"""Incident feed: feed_items table in portal_facts.db — schema, writes (short transactions) and reads.

Chem_Eng sources are snapshots (replace all rows of that source_id). Live sources (csb_rss, press_gnews) accumulate:
new rows are upserted and old ones pruned by count / age, so a run that cannot reach the network keeps what it had.
"""
from __future__ import annotations

import datetime as dt
import json
import sqlite3

import feed_config as C

COLUMNS = ["id", "date", "title", "url", "source_id", "cas", "chem_names", "equipment", "discipline", "country",
           "summary", "lang", "fetched_at"]
JSON_COLUMNS = ("cas", "chem_names", "equipment", "discipline")


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(C.SCHEMA)
    conn.commit()


def _cell(it: dict, c: str):
    if c in JSON_COLUMNS:
        return json.dumps(it.get(c) or [], ensure_ascii=False)
    if c == "fetched_at":
        return it.get(c)
    return it.get(c) or ""


def to_row(it: dict) -> tuple:
    return tuple(_cell(it, c) for c in COLUMNS)


def from_row(row: tuple) -> dict:
    it = dict(zip(COLUMNS, row))
    for c in JSON_COLUMNS:
        it[c] = json.loads(it[c] or "[]")
    return it


def replace_source(conn: sqlite3.Connection, source_id: str, items: list[dict]) -> int:
    """One transaction: delete the source's rows, insert `items` (ids unique)."""
    rows = list({it["id"]: to_row(it) for it in items}.values())
    marks = ",".join("?" * len(COLUMNS))
    with conn:
        conn.execute("DELETE FROM feed_items WHERE source_id = ?", (source_id,))
        conn.executemany(f"INSERT INTO feed_items ({','.join(COLUMNS)}) VALUES ({marks})", rows)
    return len(rows)


def upsert(conn: sqlite3.Connection, items: list[dict]) -> int:
    rows = list({it["id"]: to_row(it) for it in items}.values())
    marks = ",".join("?" * len(COLUMNS))
    with conn:
        conn.executemany(f"INSERT OR REPLACE INTO feed_items ({','.join(COLUMNS)}) VALUES ({marks})", rows)
    return len(rows)


def prune_keep_newest(conn: sqlite3.Connection, source_id: str, keep: int) -> int:
    with conn:
        cur = conn.execute(
            "DELETE FROM feed_items WHERE source_id = ? AND id NOT IN "
            "(SELECT id FROM feed_items WHERE source_id = ? ORDER BY date DESC, id DESC LIMIT ?)",
            (source_id, source_id, keep))
    return cur.rowcount


def prune_older_than(conn: sqlite3.Connection, source_id: str, days: int, today: dt.date) -> int:
    cutoff = (today - dt.timedelta(days=days)).isoformat()
    with conn:
        cur = conn.execute("DELETE FROM feed_items WHERE source_id = ? AND (date = '' OR date < ?)", (source_id, cutoff))
    return cur.rowcount


def read_all(conn: sqlite3.Connection) -> list[dict]:
    return [from_row(r) for r in conn.execute(f"SELECT {','.join(COLUMNS)} FROM feed_items")]


def counts(conn: sqlite3.Connection) -> dict[str, int]:
    return dict(conn.execute("SELECT source_id, COUNT(*) FROM feed_items GROUP BY source_id ORDER BY 2 DESC").fetchall())
