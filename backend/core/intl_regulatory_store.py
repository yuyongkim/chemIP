"""intl_regulatory 테이블 조회. 국가별 물질 규제 목록(미국·EU·베트남·국제협약)을 CAS 로 읽는다.

적재는 scripts/import_intl_regulatory.py(EPA·ECHA·협약)와
scripts/load_country_lists_from_epc.py(미국 OSHA·EU Seveso·베트남·멕시코·파키스탄·인도)가 맡는다. 여기는 읽기만 한다.
"""
from __future__ import annotations

import re
import sqlite3
from typing import Any

from backend.core.intl_dedupe import item_details, merge_rows
from backend.core.intl_quantity import parse_quantity, threshold_summary
from backend.core.terminology_db import TerminologyDB

# regulation 코드 -> (국가/기구, 목록 이름). 새 목록을 적재하면 여기에 한 줄을 추가한다.
REGULATION_LABELS: dict[str, tuple[str, str]] = {
    "EU_CLP": ("EU", "CLP 부록 VI 조화 분류"),
    "EPCRA_313": ("US", "EPCRA 313 TRI"),
    "EPCRA_302": ("US", "EPCRA 302 극위험물질"),
    "EPCRA_304": ("US", "EPCRA 304 보고량"),
    "CERCLA": ("US", "CERCLA 유해물질"),
    "CWA_311": ("US", "CWA 311(j)(5) 대응계획 임계량"),
    "CAA_112R": ("US", "CAA 112(r) RMP 임계량"),
    "US_OSHA_PSM": ("US", "OSHA PSM 부록 A 임계량"),
    "KR_OSHA_PSM": ("KR", "산업안전보건법 시행령 별표 13 PSM 규정량"),
    "US_OSHA_PEL": ("US", "OSHA 공기 중 허용기준(PEL) Z-1"),
    "US_TSCA_SNUR": ("US", "TSCA 중요 신규용도 규칙(SNUR) 40 CFR 721"),
    "EU_SEVESO_III": ("EU", "Seveso III 부록 I 지정 물질 임계량"),
    "MX_NOM028_THRESHOLD": ("MX", "NOM-028-STPS 부록 A 임계량"),
    "PK_SINDH_HAZSUB": ("PK", "Sindh 유해물질 규칙 2014 열거 물질"),
    "IN_CHEM_ACCIDENT_RULES": ("IN", "화학사고 규칙 1996 임계량"),
    "NL_BAL_STOFKLASSE": ("NL", "Bal 부록 III 배출 물질등급(MVP 1 = ZZS)"),
    "NL_BAL_ZZS_IMMISSION": ("NL", "Bal 부록 VIa ZZS 대기 농도 한계"),
    "NL_BAL_SOIL_INTERVENTION": ("NL", "Bal 부록 IIa 토양 개입값"),
    "NL_BAL_PRTR": ("NL", "Bal 부록 V PRTR 추가 보고 기준"),
    "MONTREAL_ODS": ("INTL", "몬트리올 의정서 오존층파괴물질"),
    "ROTTERDAM_PIC": ("INTL", "로테르담 협약 PIC"),
    "STOCKHOLM_POP": ("INTL", "스톡홀름 협약 POPs"),
    "VN_DECREE24_APP_I": ("VN", "법령 24/2026 부록 I 중점 화학공업 기본 화학물질"),
    "VN_DECREE24_APP_II": ("VN", "법령 24/2026 부록 II 조건부 생산·거래"),
    "VN_DECREE24_APP_III": ("VN", "법령 24/2026 부록 III 특별 통제"),
    "VN_DECREE24_APP_IV": ("VN", "법령 24/2026 부록 IV 사고예방·대응계획"),
    # scripts/load_country_lists_official.py (공식 원문: eCFR·NITE·MHLW·e-Gov·J-CHECK·ECCC)
    "US_DOT_HMT": ("US", "DOT 위험물 운송표(49 CFR 172.101 HMT)"),
    "US_DOT_HMT_RQ": ("US", "DOT 유해물질 보고량(49 CFR 172.101 부록 A RQ)"),
    "JP_PRTR_CLASS1": ("JP", "화관법(化管法) 제1종 지정화학물질"),
    "JP_PRTR_CLASS2": ("JP", "화관법(化管法) 제2종 지정화학물질"),
    "JP_ISHL_LABEL_SDS": ("JP", "안위법 라벨 표시·SDS 교부 대상물질"),
    "JP_ISHL_TOKKA": ("JP", "안위법 특정화학물질(特化則, 시행령 별표 3)"),
    "JP_ISHL_ORGANIC": ("JP", "안위법 유기용제(有機則, 시행령 별표 6의2)"),
    "JP_CSCL_PRIORITY": ("JP", "화심법(化審法) 우선평가화학물질"),
    "CA_NPRI": ("CA", "NPRI 국가오염물질배출목록 보고 대상물질 2025-2027"),
}

_CAS_RE = re.compile(r"^\d{2,7}-\d{2}-\d$")


def _fetch(conn: sqlite3.Connection, cas_no: str) -> list[sqlite3.Row]:
    cur = conn.execute(
        "SELECT regulation, detail, source, chemical_name FROM intl_regulatory "
        "WHERE cas_no = ? ORDER BY regulation, id",
        (cas_no,),
    )
    return cur.fetchall()


def _min_quantity(regulation: str, details: list[str]) -> dict[str, Any] | None:
    """형태별 기준이 여럿이면 가장 낮은(엄격한) kg 값."""
    qs = [q for q in (parse_quantity(regulation, d) for d in details) if q]
    return min(qs, key=lambda q: q["kg"]) if qs else None


def get_by_cas(cas_no: str) -> dict[str, Any]:
    """CAS 하나의 국가별 규제 목록 등재 내역을 국가 단위로 묶어 돌려준다.

    같은 목록에 이름 표기만 다른 줄(Ethene / Ethylene)은 한 항목으로 합치고 다른 이름은 aka 로 둔다(intl_dedupe.py).
    count 는 목록 수(한 목록은 한 번)다.
    """
    cas_no = (cas_no or "").strip()
    if not _CAS_RE.match(cas_no):
        return {"cas_no": cas_no, "count": 0, "jurisdictions": {}, "error": "invalid_cas"}

    with TerminologyDB() as db:
        rows = [tuple(r) for r in _fetch(db.conn, cas_no)]

    jurisdictions: dict[str, list[dict[str, Any]]] = {}
    flat: list[dict[str, Any]] = []
    items = merge_rows([(r[0], r[1] or "", r[2] or "", r[3] or "") for r in rows])
    for merged in items:
        regulation = merged["regulation"]
        country, label = REGULATION_LABELS.get(regulation, ("OTHER", regulation))
        item = {"regulation": regulation, "list": label, **{k: v for k, v in merged.items() if k != "regulation"}}
        quantity = _min_quantity(regulation, item_details(merged))
        if quantity:
            item["quantity"] = quantity
        jurisdictions.setdefault(country, []).append(item)
        flat.append({**item, "country": country})
    return {"cas_no": cas_no, "count": len(items), "jurisdictions": jurisdictions, "thresholds": threshold_summary(flat)}
