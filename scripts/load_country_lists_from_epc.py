"""EPC engineering 로컬 수집본에서 국가별 물질 규제 목록을 뽑아 intl_regulatory 에 적재한다.

파서는 scripts/country_lists/ 의 국가별 모듈에 있고(README.md 책임표), 이 파일은 조립·적재만 한다.
원천은 EPC 수집본(읽기 전용)이며 네트워크 접근은 없다. 기본은 dry-run, 적재는 --apply.
재실행해도 안전하다: 파서가 소유한 regulation 코드의 행만 지우고 다시 넣는다.
(import_intl_regulatory.py 는 테이블 전체를 DELETE 하므로, 그 스크립트 뒤에는 이 스크립트를 다시 실행한다.)

    python scripts/load_country_lists_from_epc.py            # 건수·표본만 출력
    python scripts/load_country_lists_from_epc.py --apply    # DB 적재 + data/country_lists_audit.csv
"""
from __future__ import annotations

import argparse
import csv
import os
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from country_lists import eu, in_, kr, mx, nl, pk, us, vn  # noqa: E402
from country_lists.base import Row  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = Path(os.environ.get("TERMINOLOGY_DB_PATH", ROOT / "data" / "terminology.db"))
AUDIT_CSV = ROOT / "data" / "country_lists_audit.csv"

MODULES = (us, vn, eu, mx, pk, in_, nl, kr)
PARSERS = {name: fn for m in MODULES for name, fn in m.PARSERS.items()}
OWNED_REGULATIONS = tuple(code for m in MODULES for code in m.OWNED)


def dedupe(rows):
    seen: dict[tuple[str, str], Row] = {}
    for r in rows:
        seen.setdefault((r.cas_no, r.regulation), r)
    return list(seen.values())


def apply(rows: list[Row]) -> None:
    conn = sqlite3.connect(DB_PATH, timeout=60)
    try:
        with conn:
            marks = ",".join("?" * len(OWNED_REGULATIONS))
            conn.execute(f"DELETE FROM intl_regulatory WHERE regulation IN ({marks})", OWNED_REGULATIONS)
            conn.executemany(
                "INSERT INTO intl_regulatory (cas_no, regulation, detail, source, chemical_name) VALUES (?,?,?,?,?)",
                [(r.cas_no, r.regulation, r.detail, r.source, r.chemical_name) for r in rows],
            )
    finally:
        conn.close()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--apply", action="store_true", help="DB 에 적재한다(기본은 dry-run)")
    ap.add_argument("--only", choices=sorted(PARSERS), action="append", help="특정 파서만 실행")
    args = ap.parse_args()

    names = args.only or list(PARSERS)
    all_rows: list[Row] = []
    for name in names:
        rows = dedupe(PARSERS[name]())
        by_reg: dict[str, int] = {}
        for r in rows:
            by_reg[r.regulation] = by_reg.get(r.regulation, 0) + 1
        print(f"[{name}] {len(rows)} rows  {by_reg}")
        for r in rows[:2]:
            print("   e.g.", r.cas_no, "|", r.chemical_name, "|", r.detail)
        all_rows += rows

    if not args.apply:
        print("dry-run: --apply 로 적재")
        return 0
    if args.only:
        print("--only 와 --apply 는 함께 쓰지 않는다(소유 코드 전체를 지우기 때문).")
        return 2
    apply(all_rows)
    AUDIT_CSV.parent.mkdir(exist_ok=True)
    with AUDIT_CSV.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["cas_no", "regulation", "detail", "source", "chemical_name"])
        w.writerows([(r.cas_no, r.regulation, r.detail, r.source, r.chemical_name) for r in all_rows])
    print(f"loaded {len(all_rows)} rows -> {DB_PATH.name}; audit -> {AUDIT_CSV.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
