"""Counts, duplicates and ChemIP coverage, computed from the finished SQLite file."""
from __future__ import annotations

import sqlite3

from . import cas as casmod
from . import config

SAMPLE_CAS = {"benzene": "71-43-2", "toluene": "108-88-3", "acetone": "67-64-1",
              "ammonia": "7664-41-7", "hydrogen fluoride": "7664-39-3"}


def _q(con, sql, *args):
    return con.execute(sql, args).fetchone()[0]


def table_counts(con: sqlite3.Connection) -> dict:
    return {
        "cas_hs_rows": _q(con, "SELECT COUNT(*) FROM cas_hs"),
        "distinct_cas": _q(con, "SELECT COUNT(DISTINCT cas) FROM cas_hs"),
        "distinct_cas_in_single_cas_entries": _q(con, "SELECT COUNT(DISTINCT cas) FROM cas_hs WHERE is_multi_cas=0"),
        "distinct_cas_hs6_pairs": _q(con, "SELECT COUNT(*) FROM (SELECT DISTINCT cas, hs6 FROM cas_hs WHERE hs6 IS NOT NULL)"),
        "cas_with_multiple_hs6": _q(con, "SELECT COUNT(*) FROM (SELECT cas FROM cas_hs WHERE hs6 IS NOT NULL GROUP BY cas HAVING COUNT(DISTINCT hs6)>1)"),
        "cas_with_multiple_cn_codes": _q(con, "SELECT COUNT(*) FROM (SELECT cas FROM cas_hs GROUP BY cas HAVING COUNT(DISTINCT cn_code)>1)"),
        "duplicate_cas_cn_rows": _q(con, "SELECT COALESCE(SUM(n-1),0) FROM (SELECT COUNT(*) n FROM cas_hs GROUP BY cas, cn_code HAVING n>1)"),
        "rows_without_hs6": _q(con, "SELECT COUNT(*) FROM cas_hs WHERE hs6 IS NULL"),
        "rows_code_not_in_cn": _q(con, "SELECT COUNT(*) FROM cas_hs WHERE code_in_cn=0"),
        "rows_hs6_not_in_hsk": _q(con, "SELECT COUNT(*) FROM cas_hs WHERE hs6_in_hsk=0"),
        "hsk10_rows_with_value": _q(con, "SELECT COUNT(*) FROM cas_hs WHERE hsk10 IS NOT NULL"),
        "rejected_rows": _q(con, "SELECT COUNT(*) FROM rejected"),
        "hs6_heading_rows": _q(con, "SELECT COUNT(*) FROM hs6_heading"),
        "hs6_heading_focus_rows": _q(con, "SELECT COUNT(*) FROM hs6_heading WHERE substr(hs6,1,2) IN (%s)"
                                     % ",".join("'%s'" % c for c in config.FOCUS_CHAPTERS)),
        "hsk10_code_rows": _q(con, "SELECT COUNT(*) FROM hsk10_code"),
    }


def ncis_coverage(con: sqlite3.Connection) -> dict:
    """How many ChemIP NCIS substances (read-only source) have an HS code."""
    src = sqlite3.connect(f"file:{config.NCIS_DB.as_posix()}?mode=ro", uri=True)
    try:
        raw = [r[0] for r in src.execute("SELECT cas_no FROM ncis_substance")]
    finally:
        src.close()
    norm = {casmod.normalize(c) for c in raw if c}
    valid = {c for c in norm if casmod.is_valid(c)}
    any_hs = {r[0] for r in con.execute("SELECT DISTINCT cas FROM cas_hs WHERE hs6 IS NOT NULL")}
    single = {r[0] for r in con.execute("SELECT DISTINCT cas FROM cas_hs WHERE hs6 IS NOT NULL AND is_multi_cas=0")}
    return {"ncis_rows": len(raw), "ncis_distinct_valid_cas": len(valid),
            "ncis_invalid_or_blank_cas": len(raw) - len(valid),
            "ncis_with_hs6": len(valid & any_hs),
            "ncis_with_hs6_from_single_cas_entry": len(valid & single)}


def samples(con: sqlite3.Connection) -> dict:
    out = {}
    for name, c in SAMPLE_CAS.items():
        out[f"{name} {c}"] = [
            {"cn_code": r[0], "hs6": r[1], "description": r[2], "multi": r[3]}
            for r in con.execute("SELECT cn_code, hs6, description, is_multi_cas FROM cas_hs "
                                 "WHERE cas=? ORDER BY cn_code", (c,))]
    return out


def build(db_path) -> dict:
    con = sqlite3.connect(db_path)
    try:
        return {"counts": table_counts(con), "coverage": ncis_coverage(con), "samples": samples(con)}
    finally:
        con.close()
