"""이미 적재된 EPA List of Lists 행의 detail 을 epa_lol_detail.format_detail 형식으로 고친다.

import_intl_regulatory.py 는 테이블 전체를 지우고 다시 넣으므로, 단위만 고칠 때는 이 스크립트를 쓴다.
재실행해도 안전하다(이미 고친 행은 그대로 둔다). 기본은 dry-run, 적재는 --apply.
"""
from __future__ import annotations

import argparse
import os
import sqlite3
from pathlib import Path

from epa_lol_detail import PREFIX, TRI_CODES, UNIT, format_detail, raw_from_detail

DB_PATH = Path(os.environ.get("TERMINOLOGY_DB_PATH", Path(__file__).resolve().parents[1] / "data" / "terminology.db"))
REGULATIONS = (*PREFIX, "EPCRA_313")


def already_formatted(regulation: str, detail: str) -> bool:
    if regulation == "EPCRA_313":
        return detail.startswith("TRI ") or detail in TRI_CODES.values()
    return f" {UNIT}" in detail or ";" in detail or "see 40 CFR" in detail or "premanufacture" in detail


def changes(conn: sqlite3.Connection) -> list[tuple[str, int]]:
    marks = ",".join("?" * len(REGULATIONS))
    out = []
    for rid, reg, detail in conn.execute(
        f"SELECT id, regulation, detail FROM intl_regulatory WHERE regulation IN ({marks})", REGULATIONS
    ):
        if detail and not already_formatted(reg, detail):
            new = format_detail(reg, raw_from_detail(reg, detail))
            if new != detail:
                out.append((new, rid))
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    conn = sqlite3.connect(DB_PATH, timeout=60)
    try:
        todo = changes(conn)
        print(f"rows to update: {len(todo)}")
        if args.apply and todo:
            with conn:
                conn.executemany("UPDATE intl_regulatory SET detail = ? WHERE id = ?", todo)
            print("applied")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
