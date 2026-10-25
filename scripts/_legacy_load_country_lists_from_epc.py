"""EPC engineering 로컬 수집본에서 국가별 물질 규제 목록을 뽑아 intl_regulatory 에 적재한다.

원천은 EPC engineering 이 이미 수집한 법령 본문(읽기 전용)이다. 네트워크 접근은 없다.
적재 대상 테이블은 기존 intl_regulatory(cas_no, regulation, detail, source, chemical_name)이며
새 테이블을 만들지 않는다. 국가는 regulation 접두(US_, VN_)와 source 로 구분한다.

- 파서는 PARSERS 에 등록한다. 국가·목록을 추가할 때 이 파일의 파서 한 개와 등록 한 줄만 늘린다.
- 재실행해도 안전하다. 각 파서가 소유한 regulation 코드의 행만 지우고 다시 넣는다.
  (기존 import_intl_regulatory.py 는 테이블 전체를 DELETE 하므로, 그 스크립트를 다시 돌리면
  이 스크립트의 행도 지워진다. 그 뒤에는 이 스크립트를 다시 실행한다.)
- 기본은 dry-run 이다. 실제 적재는 --apply.

사용:
    python scripts/load_country_lists_from_epc.py            # 건수·표본만 출력
    python scripts/load_country_lists_from_epc.py --apply    # DB 적재 + data/country_lists_audit.csv
"""
from __future__ import annotations

import argparse
import csv
import os
import re
import sqlite3
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = Path(os.environ.get("TERMINOLOGY_DB_PATH", ROOT / "data" / "terminology.db"))
EPC_ROOT = Path(os.environ.get("EPC_ROOT", Path.home() / "Desktop" / "EPC engineering"))
AUDIT_CSV = ROOT / "data" / "country_lists_audit.csv"

CAS_RE = re.compile(r"(?<![\d-])(\d{2,7})-(\d{2})-(\d)(?![\d-])")


@dataclass(frozen=True)
class Row:
    cas_no: str
    regulation: str
    detail: str
    source: str
    chemical_name: str


def cas_valid(cas: str) -> bool:
    """CAS 체크섬 검증. 표 파싱 오탐(날짜·번호)을 걸러낸다."""
    m = CAS_RE.fullmatch(cas)
    if not m:
        return False
    digits = (m.group(1) + m.group(2))[::-1]
    return sum(int(d) * (i + 1) for i, d in enumerate(digits)) % 10 == int(m.group(3))


def _ro(path: Path) -> sqlite3.Connection:
    return sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)


# ---------------------------------------------------------------- 미국 OSHA PSM 부록 A
def parse_us_psm() -> Iterable[Row]:
    """29 CFR 1910.119 Appendix A. 행 형식: 이름 | CAS | 임계량(lb)."""
    db = EPC_ROOT / "datasets" / "ecfr_rag" / "ecfr_local_rag.sqlite3"
    with _ro(db) as c:
        rows = c.execute(
            "SELECT content FROM documents WHERE id LIKE 'ecfr-tbl:29-1910-1910.119-%' ORDER BY id"
        ).fetchall()
    for (text,) in rows:
        parts = [p.strip() for p in text.split("|")]
        if len(parts) < 3 or not cas_valid(parts[1]):
            continue
        name, cas, tq = parts[0], parts[1], parts[2]
        yield Row(cas, "US_OSHA_PSM", f"Threshold Quantity: {tq} lb", "OSHA 29 CFR 1910.119 App. A", name)


# ---------------------------------------------------------------- 베트남 법령 24/2026
VN_APPENDIX = {
    "Phụ lục I": ("VN_DECREE24_APP_I", "중점 화학공업 기본 화학물질"),
    "Phụ lục II": ("VN_DECREE24_APP_II", "조건부 생산·거래 화학물질"),
    "Phụ lục III": ("VN_DECREE24_APP_III", "특별 통제 대상 화학물질(마약류 전구체 포함)"),
    "Phụ lục IV": ("VN_DECREE24_APP_IV", "사고예방·대응계획 대상 화학물질"),
}


def parse_vn_decree24() -> Iterable[Row]:
    """Decree 24/2026/ND-CP 부록. 평문 표라 'IUPAC명 / 베트남명 / CAS / 화학식' 순서로 나열된다.
    CAS 바로 앞 두 토큰 전(IUPAC명)을 물질명으로 쓴다. 이름이 비면 건너뛰지 않고 CAS 만 적재한다."""
    db = EPC_ROOT / "datasets" / "jurisdictions" / "vnm" / "index" / "vnm_local_rag.sqlite3"
    with _ro(db) as c:
        rows = c.execute(
            "SELECT section, content FROM documents WHERE instrument = 'vnm_decree_24_2026' ORDER BY id"
        ).fetchall()
    for section, text in rows:
        # "Phụ lục II" 가 "Phụ lục I" 로 시작하므로 긴 키부터 맞춘다.
        key = next((k for k in sorted(VN_APPENDIX, key=len, reverse=True)
                    if section and section.strip() == k), None)
        if key is None:
            continue
        code, label = VN_APPENDIX[key]
        tokens = [t.strip() for t in re.split(r"\s/\s|\n", text) if t.strip()]
        for i, tok in enumerate(tokens):
            if not cas_valid(tok):
                continue
            name = tokens[i - 2] if i >= 2 and not cas_valid(tokens[i - 2]) else ""
            yield Row(tok, code, label, "Vietnam Decree 24/2026/ND-CP", name)


PARSERS: dict[str, Callable[[], Iterable[Row]]] = {
    "us_psm": parse_us_psm,
    "vn_decree24": parse_vn_decree24,
}
OWNED_REGULATIONS = (
    "US_OSHA_PSM",
    *(code for code, _ in VN_APPENDIX.values()),
)


def dedupe(rows: Iterable[Row]) -> list[Row]:
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
