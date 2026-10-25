"""intl_regulatory 테이블 조회. 국가별 물질 규제 목록(미국·EU·베트남·국제협약)을 CAS 로 읽는다.

적재는 scripts/import_intl_regulatory.py(EPA·ECHA·협약)와
scripts/load_country_lists_from_epc.py(미국 OSHA·EU Seveso·베트남·멕시코·파키스탄·인도)가 맡는다. 여기는 읽기만 한다.
"""
from __future__ import annotations

import re
import sqlite3
from typing import Any

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
}

_CAS_RE = re.compile(r"^\d{2,7}-\d{2}-\d$")


def _fetch(conn: sqlite3.Connection, cas_no: str) -> list[sqlite3.Row]:
    cur = conn.execute(
        "SELECT regulation, detail, source, chemical_name FROM intl_regulatory "
        "WHERE cas_no = ? ORDER BY regulation",
        (cas_no,),
    )
    return cur.fetchall()


def get_by_cas(cas_no: str) -> dict[str, Any]:
    """CAS 하나의 국가별 규제 목록 등재 내역을 국가 단위로 묶어 돌려준다."""
    cas_no = (cas_no or "").strip()
    if not _CAS_RE.match(cas_no):
        return {"cas_no": cas_no, "count": 0, "jurisdictions": {}, "error": "invalid_cas"}

    with TerminologyDB() as db:
        rows = _fetch(db.conn, cas_no)

    jurisdictions: dict[str, list[dict[str, Any]]] = {}
    flat: list[dict[str, Any]] = []
    for regulation, detail, source, name in rows:
        country, label = REGULATION_LABELS.get(regulation, ("OTHER", regulation))
        item = {"regulation": regulation, "list": label, "detail": detail or "", "source": source or "", "name": name or ""}
        quantity = parse_quantity(regulation, detail or "")
        if quantity:
            item["quantity"] = quantity
        jurisdictions.setdefault(country, []).append(item)
        flat.append({**item, "country": country})
    return {"cas_no": cas_no, "count": len(rows), "jurisdictions": jurisdictions, "thresholds": threshold_summary(flat)}
