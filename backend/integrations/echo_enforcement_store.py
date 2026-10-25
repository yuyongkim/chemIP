"""CAS 로 미국 EPA 집행 사건(ECHO ICIS FE&C, Environment 프로젝트 원본)을 찾는다.

색인은 scripts/build_echo_cas_index.py 가 만든 data/echo_cas_index.db 이다. 공공저작물. 읽기 전용.
"""
from __future__ import annotations

import sqlite3
from collections import Counter
from typing import Any

from backend.integrations.sources import ECHO_CAS_INDEX_DB

SUMMARY_CHARS = 360
ECHO_CASE_URL = "https://echo.epa.gov/enforcement-case-report?id={}"


def _case(r: sqlite3.Row) -> dict[str, Any]:
    summary = (r["summary"] or "").strip()
    return {
        "case_number": r["case_number"], "name": r["case_name"], "fiscal_year": r["fiscal_year"],
        "type": r["activity_type"], "outcome": r["outcome"], "status": r["status"], "status_date": r["status_date"],
        "penalty_usd": r["penalty_usd"], "statutes": r["statutes"], "violations": r["violations"],
        "facilities": r["facilities"], "states": r["states"],
        "summary": summary[:SUMMARY_CHARS] + ("…" if len(summary) > SUMMARY_CHARS else ""),
        "url": ECHO_CASE_URL.format(r["case_number"]),
    }


def get_enforcement_by_cas(cas: str, limit: int = 6) -> dict[str, Any]:
    if not ECHO_CAS_INDEX_DB.exists():
        return {"cas_no": cas, "available": False, "total": 0}
    conn = sqlite3.connect(f"file:{ECHO_CAS_INDEX_DB.as_posix()}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            "SELECT c.* FROM cases c JOIN case_cas x ON x.case_number = c.case_number WHERE x.cas = ?", (cas,)
        ).fetchall()
    finally:
        conn.close()
    statutes = Counter(s.strip() for r in rows for s in (r["statutes"] or "").split(";") if s.strip())
    by_penalty = sorted((r for r in rows if r["penalty_usd"]), key=lambda r: -r["penalty_usd"])
    recent = sorted(rows, key=lambda r: r["fiscal_year"] or "", reverse=True)
    return {
        "cas_no": cas, "available": True, "total": len(rows),
        "with_penalty": len(by_penalty), "penalty_total_usd": sum(r["penalty_usd"] or 0 for r in rows),
        "statutes": dict(statutes.most_common(8)),
        "years": [min((r["fiscal_year"] for r in rows if r["fiscal_year"]), default=""),
                  max((r["fiscal_year"] for r in rows if r["fiscal_year"]), default="")],
        "top_penalty": [_case(r) for r in by_penalty[:limit]],
        "recent": [_case(r) for r in recent[:limit]],
        "source": "US EPA ECHO ICIS FE&C case downloads (public domain)",
    }
