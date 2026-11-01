"""Names from terminology.db tables (synonym_sources.json db_sources): yields (cas, name, code)."""
from __future__ import annotations

import sqlite3
from typing import Iterator

from names import paren_after_name_en, split_names


def sources(spec: dict) -> dict[str, dict]:
    keep = ("tier", "ref", "url", "derived_from")
    return {s["code"]: {k: s[k] for k in keep if k in s} for s in spec["db_sources"]}


def _rows(conn: sqlite3.Connection, s: dict):
    where = f" WHERE {s['where']}" if s.get("where") else ""
    if s.get("extract") == "paren_after_name_en":
        sql = f'SELECT cas_no, paren_after_name_en("{s["column"]}", name_en) FROM "{s["table"]}"{where}'
    else:
        sql = f'SELECT cas_no, "{s["column"]}" FROM "{s["table"]}"{where}'
    return conn.execute(sql)


def names(conn: sqlite3.Connection, spec: dict) -> Iterator[tuple[str, str, str]]:
    conn.create_function("paren_after_name_en", 2, paren_after_name_en, deterministic=True)
    for s in spec["db_sources"]:
        for cas, raw in _rows(conn, s):
            cas = (cas or "").strip()
            for name in split_names(raw, spec, s):
                yield cas, name, s["code"]
