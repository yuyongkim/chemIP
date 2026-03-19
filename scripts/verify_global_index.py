"""Verification script for ChemIP global patent index DB."""

from __future__ import annotations

import argparse
import sys
import time
from dataclasses import dataclass
from pathlib import Path
import sqlite3


@dataclass
class CheckResult:
    label: str
    ok: bool
    detail: str = ""


REQUIRED_COLUMNS = [
    "id",
    "chem_id",
    "patent_id",
    "title",
    "section",
    "snippet",
    "file_path",
    "matched_term",
    "jurisdiction",
    "created_at",
]


def _format_gb(size: int) -> float:
    return size / (1024**3)


def check_db_file(db_path: Path) -> CheckResult:
    if not db_path.exists():
        return CheckResult("DB file", False, f"not found: {db_path}")
    if db_path.stat().st_size == 0:
        return CheckResult("DB file", False, f"empty file: {db_path}")
    return CheckResult("DB file", True, f"size={_format_gb(db_path.stat().st_size):.2f} GB")


def check_schema(conn: sqlite3.Connection) -> CheckResult:
    try:
        cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='patent_index'")
        if not cur.fetchone():
            return CheckResult("schema: table", False, "missing table: patent_index")

        rows = conn.execute("PRAGMA table_info(patent_index)").fetchall()
        columns = {r[1] for r in rows}
        missing = [c for c in REQUIRED_COLUMNS if c not in columns]
        if missing:
            return CheckResult(
                "schema: columns",
                False,
                f"missing columns: {', '.join(missing)}",
            )
        return CheckResult("schema", True, f"patent_index columns={len(columns)}")
    except Exception as exc:
        return CheckResult("schema", False, str(exc))


def check_indexes(conn: sqlite3.Connection) -> CheckResult:
    try:
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='patent_index'"
        ).fetchall()
        indexes = {row[0] for row in rows}
        required = {"idx_chem_id"}
        missing = [idx for idx in required if idx not in indexes]
        if missing:
            return CheckResult("indexes", False, f"missing index: {', '.join(missing)}")
        return CheckResult("indexes", True, f"indexes={len(indexes)}")
    except Exception as exc:
        return CheckResult("indexes", False, str(exc))


def check_sample_query(conn: sqlite3.Connection) -> CheckResult:
    try:
        row = conn.execute(
            "SELECT chem_id, patent_id, jurisdiction, title FROM patent_index LIMIT 1"
        ).fetchone()
        if not row:
            return CheckResult("sample query", False, "no rows in patent_index")
        return CheckResult(
            "sample query",
            True,
            f"sample chem_id={row[0]}, patent_id={row[1]}",
        )
    except Exception as exc:
        return CheckResult("sample query", False, str(exc))


def check_last_rowid(conn: sqlite3.Connection) -> CheckResult:
    try:
        row = conn.execute("SELECT MAX(rowid) FROM patent_index").fetchone()
        if row and row[0] is not None:
            return CheckResult("rowid", True, f"max rowid={row[0]}")
        return CheckResult("rowid", False, "table has no rows")
    except Exception as exc:
        return CheckResult("rowid", False, str(exc))


def check_row_counts(conn: sqlite3.Connection) -> CheckResult:
    return check_row_counts_exact(conn)


def check_row_counts_exact(conn: sqlite3.Connection) -> CheckResult:
    try:
        total = conn.execute("SELECT COUNT(*) FROM patent_index").fetchone()[0]
        if total <= 0:
            return CheckResult("row count (exact)", False, "patent_index is empty")
        return CheckResult("row count (exact)", True, f"rows={total}")
    except Exception as exc:
        return CheckResult("row count (exact)", False, str(exc))


def check_row_counts_quick(conn: sqlite3.Connection) -> CheckResult:
    """
    Quick estimate by ROWID range. This avoids full table scan.
    """
    try:
        min_row = conn.execute("SELECT MIN(id) FROM patent_index").fetchone()
        max_row = conn.execute("SELECT MAX(id) FROM patent_index").fetchone()
        if (
            min_row is None
            or max_row is None
            or min_row[0] is None
            or max_row[0] is None
        ):
            return CheckResult("row count (quick)", False, "patent_index is empty")
        estimated = int(max_row[0]) - int(min_row[0]) + 1
        if estimated <= 0:
            return CheckResult("row count (quick)", False, "invalid rowid range")
        return CheckResult(
            "row count (quick)",
            True,
            f"estimated rows={estimated} (id range: {min_row[0]}..{max_row[0]})",
        )
    except Exception as exc:
        return CheckResult("row count (quick)", False, str(exc))


def check_distinct_chem_count(conn: sqlite3.Connection) -> CheckResult:
    try:
        total = conn.execute("SELECT COUNT(DISTINCT chem_id) FROM patent_index").fetchone()[0]
        if total <= 0:
            return CheckResult("distinct chem_id", False, "no distinct chem_id values")
        return CheckResult("distinct chem_id", True, f"count={total}")
    except Exception as exc:
        return CheckResult("distinct chem_id", False, str(exc))


def check_nulls(conn: sqlite3.Connection) -> CheckResult:
    try:
        missing_chem = conn.execute(
            "SELECT 1 FROM patent_index WHERE chem_id IS NULL OR TRIM(chem_id) = '' LIMIT 1"
        ).fetchone()
        missing_patent = conn.execute(
            "SELECT 1 FROM patent_index WHERE patent_id IS NULL OR TRIM(patent_id) = '' LIMIT 1"
        ).fetchone()
        if missing_chem or missing_patent:
            return CheckResult(
                "null check",
                False,
                "empty chem_id or patent_id rows exist",
            )
        return CheckResult("null check", True, "chem_id/patent_id are non-empty")
    except Exception as exc:
        return CheckResult("null check", False, str(exc))


def run_integrity(conn: sqlite3.Connection, mode: str) -> CheckResult:
    pragma = "PRAGMA quick_check"
    if mode == "full":
        pragma = "PRAGMA integrity_check"
    try:
        result = conn.execute(pragma).fetchone()
        value = str(result[0]) if result else ""
        ok = value == "ok"
        return CheckResult(f"sqlite {mode}_check", ok, f"{pragma} => {value}")
    except Exception as exc:
        return CheckResult(f"sqlite {mode}_check", False, str(exc))


def run_checks(
    db_path: Path,
    *,
    sample: bool,
    full: bool,
    include_counts: bool,
    counts_mode: str,
    integrity_mode: str,
) -> int:
    file_check = check_db_file(db_path)
    print(f"[{'PASS' if file_check.ok else 'FAIL'}] {file_check.label}: {file_check.detail}")
    if not file_check.ok:
        return 1

    conn = sqlite3.connect(str(db_path), timeout=5.0)
    conn.execute("PRAGMA busy_timeout = 5000")

    def _run(label: str, check_fn):
        start = time.perf_counter()
        result = check_fn()
        elapsed = round(time.perf_counter() - start, 2)
        print(
            f"[{ 'PASS' if result.ok else 'FAIL' }] {label}: {result.detail} ({elapsed}s)"
        )
        return result

    try:
        failed = False
        for item in [
            _run("schema", lambda: check_schema(conn)),
            _run("indexes", lambda: check_indexes(conn)),
            _run("rowid", lambda: check_last_rowid(conn)),
        ]:
            failed = failed or (not item.ok)

        if sample:
            failed = failed or (not _run("sample query", lambda: check_sample_query(conn)).ok)
        if full:
            failed = failed or (not _run("sample query", lambda: check_sample_query(conn)).ok)
            if include_counts:
                if counts_mode == "quick":
                    failed = failed or (not _run("row count", lambda: check_row_counts_quick(conn)).ok)
                else:
                    failed = failed or (not _run("row count", lambda: check_row_counts_exact(conn)).ok)
                    failed = failed or (not _run("distinct chem_id", lambda: check_distinct_chem_count(conn)).ok)
            if integrity_mode != "none":
                failed = failed or (not _run(f"sqlite {integrity_mode}_check", lambda: run_integrity(conn, integrity_mode)).ok)

        return 1 if failed else 0
    finally:
        conn.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify ChemIP global patent index DB.")
    parser.add_argument(
        "--db-path",
        default="data/global_patent_index.db",
        help="Path to global_patent_index.db",
    )
    parser.add_argument(
        "--sample",
        action="store_true",
        help="Run a sample record check.",
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="Run rowid/sample/null checks. Includes expensive checks depending on flags.",
    )
    parser.add_argument(
        "--counts",
        action="store_true",
        help="Run expensive COUNT(*) and DISTINCT checks (optional).",
    )
    parser.add_argument(
        "--counts-mode",
        choices=["exact", "quick"],
        default="exact",
        help="Count mode for --counts: exact (full scan, heavy) or quick (ROWID-range estimate).",
    )
    parser.add_argument(
        "--integrity",
        choices=["none", "quick", "full"],
        default="none",
        help="sqlite integrity mode",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(__file__).resolve().parents[1]
    db_path = Path(args.db_path)
    if not db_path.is_absolute():
        db_path = (root / db_path).resolve()

    print(f"Project root: {root}")
    print(f"Target DB: {db_path}")
    return run_checks(
        db_path,
        sample=args.sample,
        full=args.full,
        include_counts=args.counts,
        counts_mode=args.counts_mode,
        integrity_mode=args.integrity if args.full else "none",
    )


if __name__ == "__main__":
    sys.exit(main())
