"""Schema migration v2: multi-source chemical support.

Adds source/external_id columns to chemical_terms,
creates niosh_cache and regulatory_cache tables,
backfills existing data, and rebuilds FTS index.

Safe to run multiple times (idempotent).
"""

import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "terminology.db"


def migrate(db_path: str | Path = DB_PATH):
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    cur = conn.cursor()

    # ------------------------------------------------------------------
    # 1. Add source / external_id columns to chemical_terms
    # ------------------------------------------------------------------
    for col, default in [("source", "'KOSHA'"), ("external_id", "NULL")]:
        try:
            cur.execute(f"ALTER TABLE chemical_terms ADD COLUMN {col} TEXT DEFAULT {default}")
            print(f"  Added column: chemical_terms.{col}")
        except sqlite3.OperationalError:
            print(f"  Column already exists: chemical_terms.{col}")

    # ------------------------------------------------------------------
    # 2. Backfill existing KOSHA rows
    # ------------------------------------------------------------------
    cur.execute("""
        UPDATE chemical_terms
        SET source = 'KOSHA',
            external_id = substr(description, 10)
        WHERE description LIKE 'KOSHA_ID:%'
          AND (source IS NULL OR external_id IS NULL)
    """)
    backfilled = cur.rowcount
    print(f"  Backfilled {backfilled} KOSHA rows")

    # ------------------------------------------------------------------
    # 3. CAS lookup indexes (non-unique — KOSHA has 4 legitimate CAS dupes)
    # ------------------------------------------------------------------
    for idx, ddl in [
        ("idx_chemical_terms_cas", "CREATE INDEX IF NOT EXISTS idx_chemical_terms_cas ON chemical_terms(cas_no)"),
        ("idx_chemical_terms_cas_source", "CREATE INDEX IF NOT EXISTS idx_chemical_terms_cas_source ON chemical_terms(cas_no, source)"),
        ("idx_chemical_terms_source", "CREATE INDEX IF NOT EXISTS idx_chemical_terms_source ON chemical_terms(source)"),
    ]:
        cur.execute(ddl)
        print(f"  Index ready: {idx}")

    # ------------------------------------------------------------------
    # 4. niosh_cache table
    # ------------------------------------------------------------------
    cur.execute("""
        CREATE TABLE IF NOT EXISTS niosh_cache (
            cas_no TEXT PRIMARY KEY,
            data TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("  Table ready: niosh_cache")

    # ------------------------------------------------------------------
    # 5. regulatory_cache table
    # ------------------------------------------------------------------
    cur.execute("""
        CREATE TABLE IF NOT EXISTS regulatory_cache (
            cas_no TEXT NOT NULL,
            source TEXT NOT NULL,
            data TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (cas_no, source)
        )
    """)
    print("  Table ready: regulatory_cache")

    conn.commit()

    # ------------------------------------------------------------------
    # 6. Rebuild FTS index (drop and re-insert)
    # ------------------------------------------------------------------
    print("  Rebuilding FTS index...")
    # Drop and recreate FTS table to handle corruption
    cur.execute("DROP TABLE IF EXISTS chemical_terms_fts")
    cur.execute("""
        CREATE VIRTUAL TABLE chemical_terms_fts USING fts5(
            name, cas_no, description, name_en,
            content='chemical_terms', content_rowid='id'
        )
    """)
    cur.execute("""
        INSERT INTO chemical_terms_fts(rowid, name, cas_no, description, name_en)
        SELECT id, name, cas_no, description, name_en FROM chemical_terms
    """)
    conn.commit()
    fts_count = cur.execute("SELECT COUNT(*) FROM chemical_terms_fts").fetchone()[0]
    print(f"  FTS index rebuilt: {fts_count} rows")

    # ------------------------------------------------------------------
    # 7. Summary
    # ------------------------------------------------------------------
    cur.execute("SELECT source, COUNT(*) FROM chemical_terms GROUP BY source")
    print("\n  === chemical_terms by source ===")
    for row in cur.fetchall():
        print(f"    {row[0]}: {row[1]}")

    cur.execute("SELECT COUNT(*) FROM chemical_terms")
    total = cur.fetchone()[0]
    print(f"    TOTAL: {total}")

    conn.close()
    print("\nMigration complete.")


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else DB_PATH
    print(f"Migrating: {path}")
    migrate(path)
