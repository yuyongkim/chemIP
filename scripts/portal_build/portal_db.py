"""portal_facts.db: schema (docs/portal/PORTAL_SERVICES_v1.md 4.3), connections and the shared write helpers.

- The new DB is G:\\MSDS\\data\\portal_facts.db. Every table is created with IF NOT EXISTS, so any build script may call
  ensure_schema() first; nobody drops a table. Each build script replaces only its own rows (by source_id), so the
  scripts of different services can run in any order and at different times.
- Source DBs (terminology.db, ...) are opened read-only with ro_connect() (sqlite URI mode=ro).
- oel_text is an addition to the doc's schema: the original text a row of `oel` was parsed from (the doc's `oel` table
  has no text column). It is keyed like `oel` rows, by (cas, jurisdiction, source_id), plus the chem_id it came from.
"""
from __future__ import annotations

import os
import sqlite3

PROJECT = r"G:\MSDS"
PORTAL_DB = os.path.join(PROJECT, "data", "portal_facts.db")
TERM_DB = os.path.join(PROJECT, "data", "terminology.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS sources (source_id TEXT PRIMARY KEY, name TEXT, url TEXT, license TEXT, retrieved_at TEXT);

CREATE TABLE IF NOT EXISTS identifiers (
  cas TEXT NOT NULL, id_type TEXT NOT NULL,
  value TEXT NOT NULL, source_id TEXT NOT NULL,
  PRIMARY KEY (cas, id_type, value));
CREATE INDEX IF NOT EXISTS identifiers_value ON identifiers (id_type, value);

CREATE TABLE IF NOT EXISTS properties (
  cas TEXT NOT NULL, prop TEXT NOT NULL,
  value_text TEXT NOT NULL,
  value_num REAL, unit TEXT, condition TEXT,
  origin TEXT,
  chem_id TEXT, source_id TEXT NOT NULL,
  PRIMARY KEY (cas, prop, chem_id));

CREATE TABLE IF NOT EXISTS transport (
  cas TEXT NOT NULL, un_number TEXT, proper_name TEXT, hazard_class TEXT, packing_group TEXT,
  marine_pollutant TEXT, ems TEXT, erg_guide TEXT, chem_id TEXT, source_id TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS transport_un ON transport (un_number);

CREATE TABLE IF NOT EXISTS oel (
  cas TEXT NOT NULL, jurisdiction TEXT NOT NULL,
  kind TEXT NOT NULL,
  value REAL, unit TEXT, notation TEXT,
  as_of TEXT, source_id TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS oel_text (
  cas TEXT NOT NULL, jurisdiction TEXT NOT NULL, chem_id TEXT, text TEXT NOT NULL, source_id TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS reg_changes (
  changed_on TEXT NOT NULL, jurisdiction TEXT, list_id TEXT, cas TEXT,
  change TEXT NOT NULL,
  detail TEXT, source_url TEXT, source_id TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS reactive_class (cas TEXT NOT NULL, system TEXT NOT NULL, class_code TEXT NOT NULL, basis TEXT, source_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS class_pair_rules (system TEXT, class_a TEXT, class_b TEXT, outcome TEXT, note TEXT, source_id TEXT NOT NULL);
"""


def ro_connect(path: str) -> sqlite3.Connection:
    """A source DB, read-only."""
    return sqlite3.connect(f"file:{path.replace(os.sep, '/')}?mode=ro", uri=True)


def connect(path: str = PORTAL_DB) -> sqlite3.Connection:
    """The portal DB, read-write, schema ensured. WAL + busy timeout: other build scripts may write at the same time."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    conn = sqlite3.connect(path, timeout=120)
    conn.execute("PRAGMA journal_mode=WAL")
    ensure_schema(conn)
    return conn


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


def put_sources(conn: sqlite3.Connection, sources: dict[str, dict]) -> None:
    """Insert or replace source rows: {source_id: {name, url, license, retrieved_at}}."""
    conn.executemany(
        "INSERT OR REPLACE INTO sources (source_id, name, url, license, retrieved_at) VALUES (?, ?, ?, ?, ?)",
        [(sid, s.get("name"), s.get("url"), s.get("license"), s.get("retrieved_at")) for sid, s in sources.items()],
    )


def replace_rows(conn: sqlite3.Connection, table: str, source_ids: list[str], columns: list[str], rows) -> int:
    """Delete this script's rows (by source_id) from `table`, then insert `rows` (tuples in `columns` order).
    One transaction, so a reader never sees the table half rebuilt. Returns the number of rows inserted."""
    marks = ",".join("?" * len(source_ids))
    cols = ",".join(columns)
    vals = ",".join("?" * len(columns))
    verb = "INSERT OR IGNORE" if table in ("identifiers", "properties") else "INSERT"
    with conn:
        conn.execute(f"DELETE FROM {table} WHERE source_id IN ({marks})", source_ids)
        cur = conn.executemany(f"{verb} INTO {table} ({cols}) VALUES ({vals})", rows)
    return cur.rowcount
