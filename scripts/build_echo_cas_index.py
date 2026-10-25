"""Environment 프로젝트의 EPA ECHO 집행 사건 원본(CSV)에서 CAS 로 찾을 수 있는 사건 색인을 만든다.

원본: Desktop/Environment/Environment_1/data/extracted/case_downloads (ECHO ICIS FE&C, 공공저작물). 읽기만 한다.
결과: data/echo_cas_index.db (case_cas, cases). 원본이 바뀌면 다시 돌리면 된다(매번 새로 만든다).

    python scripts/build_echo_cas_index.py
"""
from __future__ import annotations

import csv
import sqlite3
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.integrations.sources import ECHO_CAS_INDEX_DB, ECHO_EXTRACTED_DIR  # noqa: E402

CASE_DIR = ECHO_EXTRACTED_DIR / "case_downloads"
csv.field_size_limit(10_000_000)


def rows(name: str):
    with open(CASE_DIR / f"{name}.csv", encoding="latin-1", newline="") as f:
        yield from csv.DictReader(f)


def dashed_cas(raw: str) -> str:
    """ECHO 는 CAS 를 하이픈 없이 적는다(7664417 → 7664-41-7)."""
    d = raw.strip().lstrip("0")
    return f"{d[:-3]}-{d[-3:-1]}-{d[-1]}" if d.isdigit() and len(d) >= 5 else ""


def collect_case_cas() -> dict[str, set[str]]:
    by_case: dict[str, set[str]] = defaultdict(set)
    for r in rows("CASE_POLLUTANTS"):
        cas = dashed_cas(r["CHEMICAL_ABSTRACT_SERVICE_NMBR"])
        if cas:
            by_case[r["CASE_NUMBER"]].add(cas)
    return by_case


def grouped(name: str, cases: set[str], field: str, limit: int = 4) -> dict[str, list[str]]:
    out: dict[str, list[str]] = defaultdict(list)
    for r in rows(name):
        c, v = r["CASE_NUMBER"], (r.get(field) or "").strip()
        if c in cases and v and v not in out[c] and len(out[c]) < limit:
            out[c].append(v)
    return out


def money(v: str) -> float:
    try:
        return float(v or 0)
    except ValueError:
        return 0.0


def build() -> None:
    case_cas = collect_case_cas()
    cases = set(case_cas)
    statutes = grouped("CASE_LAW_SECTIONS", cases, "STATUTE_CODE")
    violations = grouped("CASE_VIOLATIONS", cases, "VIOLATION_TYPE_DESC")
    facilities = grouped("CASE_FACILITIES", cases, "FACILITY_NAME", limit=3)
    states = grouped("CASE_FACILITIES", cases, "STATE_CODE", limit=3)

    ECHO_CAS_INDEX_DB.parent.mkdir(parents=True, exist_ok=True)
    tmp = ECHO_CAS_INDEX_DB.with_suffix(".tmp")
    tmp.unlink(missing_ok=True)
    conn = sqlite3.connect(tmp)
    with conn:
        conn.execute("CREATE TABLE case_cas (cas TEXT NOT NULL, case_number TEXT NOT NULL, PRIMARY KEY (cas, case_number))")
        conn.execute("""CREATE TABLE cases (case_number TEXT PRIMARY KEY, case_name TEXT, fiscal_year TEXT,
            activity_type TEXT, outcome TEXT, status TEXT, status_date TEXT, penalty_usd REAL, cost_recovery_usd REAL,
            compliance_action_usd REAL, summary TEXT, statutes TEXT, violations TEXT, facilities TEXT, states TEXT)""")
        conn.executemany("INSERT INTO case_cas VALUES (?, ?)", [(cas, c) for c, s in case_cas.items() for cas in s])
        seen = set()
        for r in rows("CASE_ENFORCEMENTS"):
            c = r["CASE_NUMBER"]
            if c not in cases or c in seen:
                continue
            seen.add(c)
            conn.execute("INSERT INTO cases VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (
                c, r["CASE_NAME"].strip(), r["FISCAL_YEAR"], r["ACTIVITY_TYPE_DESC"], r["ENF_OUTCOME_DESC"],
                r["ACTIVITY_STATUS_DESC"], r["CASE_STATUS_DATE"] or r["ACTIVITY_STATUS_DATE"],
                money(r["TOTAL_PENALTY_ASSESSED_AMT"]), money(r["TOTAL_COST_RECOVERY_AMT"]),
                money(r["TOTAL_COMP_ACTION_AMT"]), " ".join(r["ENF_SUMMARY_TEXT"].split()),
                "; ".join(statutes.get(c, [])), "; ".join(violations.get(c, [])),
                "; ".join(facilities.get(c, [])), "; ".join(states.get(c, [])),
            ))
        conn.execute("CREATE INDEX ix_case_cas_cas ON case_cas(cas)")
    conn.close()
    tmp.replace(ECHO_CAS_INDEX_DB)
    print(f"cases with CAS: {len(cases)}, CAS: {len({x for s in case_cas.values() for x in s})}, "
          f"enforcement rows: {len(seen)} -> {ECHO_CAS_INDEX_DB}")


if __name__ == "__main__":
    build()
