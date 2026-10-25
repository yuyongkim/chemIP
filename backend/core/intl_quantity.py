"""국가별 규제 목록 detail 문자열에서 질량 기준값을 읽어 kg 으로 맞춘다.

나라마다 단위(lb·kg·t)와 숫자 표기(1,000 / 0,1 / 10.000)가 달라 그대로는 비교할 수 없다.
규정별 단위·표기·기준 종류는 QUANTITY_SPECS 한 곳에 둔다. 농도 기준(PEL, μg/m3, mg/kg)은 다루지 않는다.
"""
from __future__ import annotations

import re
from typing import Any

KG_PER = {"lb": 0.45359237, "kg": 1.0, "t": 1000.0}

# 기준 종류 → 화면 이름. 같은 종류끼리만 나라 간 비교가 성립한다.
KIND_LABELS = {
    "inventory": "공정안전 보유 임계량",
    "planning": "비상계획 임계량",
    "response_plan": "유출 대응계획 임계량",
    "release": "누출 보고량",
    "emission_per_year": "연간 배출 보고 기준",
}

# regulation → (기준 종류, 숫자에 단위가 없을 때의 단위 또는 None=숫자마다 단위가 붙음, 숫자 표기).
# 표기: en=1,000.5 / eu=1.000,5
QUANTITY_SPECS: dict[str, tuple[str, str | None, str]] = {
    "CAA_112R": ("inventory", None, "en"),
    "US_OSHA_PSM": ("inventory", None, "en"),
    "KR_OSHA_PSM": ("inventory", None, "en"),
    "EU_SEVESO_III": ("inventory", "t", "eu"),  # "Qualifying quantity (t) lower/upper: 50 / 200"
    "IN_CHEM_ACCIDENT_RULES": ("inventory", None, "en"),
    "MX_NOM028_THRESHOLD": ("inventory", None, "en"),
    "EPCRA_302": ("planning", None, "en"),
    "CWA_311": ("response_plan", None, "en"),
    "CERCLA": ("release", None, "en"),
    "EPCRA_304": ("release", None, "en"),
    "NL_BAL_PRTR": ("emission_per_year", None, "eu"),
}

_NUMBER = {"en": r"\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?", "eu": r"\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?"}
_UNIT_IN_TEXT = re.compile(r"(\d[\d,.]*\d|\d)\s*(kg|T|t|lb)\b")
_SOLIDS_NOTE = re.compile(r"\(solids[^)]*\)")


def _to_float(token: str, style: str) -> float:
    if style == "en":
        return float(token.replace(",", ""))
    return float(token.replace(".", "").replace(",", "."))


def _values_kg(detail: str, unit: str | None, style: str) -> list[float]:
    body = _SOLIDS_NOTE.sub("", detail.split(":", 1)[-1])  # EPCRA 302 괄호 속 고체 기준은 부가 정보
    if unit is None:  # 단위가 붙은 숫자만 읽는다. 조문 번호·농도(%) 같은 다른 숫자를 기준값으로 오인하지 않게 한다
        return [_to_float(n, style) * KG_PER[u.lower()] for n, u in _UNIT_IN_TEXT.findall(body)]
    return [_to_float(n, style) * KG_PER[unit] for n in re.findall(_NUMBER[style], body)]


def parse_quantity(regulation: str, detail: str) -> dict[str, Any] | None:
    """kg 기준값. Seveso 는 하위·상위 두 값, 멕시코처럼 형태별 값이 여러 개면 가장 낮은 값을 기준으로 한다."""
    spec = QUANTITY_SPECS.get(regulation)
    if not spec or not detail:
        return None
    kind, unit, style = spec
    values = _values_kg(detail, unit, style)
    if not values:
        return None
    q: dict[str, Any] = {"kind": kind, "kind_label": KIND_LABELS[kind], "kg": round(min(values), 3)}
    if regulation == "EU_SEVESO_III" and len(values) == 2:
        q["kg"], q["kg_upper"] = round(values[0], 3), round(values[1], 3)
    return q


def threshold_summary(listings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """기준 종류별로 나라·목록의 최저 kg 값을 모은다. 같은 목록이 형태별로 반복되면 가장 낮은 값 하나만 남긴다."""
    best: dict[tuple[str, str], dict[str, Any]] = {}
    for x in listings:
        q = x.get("quantity")
        if not q:
            continue
        key = (q["kind"], x["regulation"])
        if key not in best or q["kg"] < best[key]["kg"]:
            best[key] = {"kind": q["kind"], "kind_label": q["kind_label"], "country": x["country"],
                         "regulation": x["regulation"], "list": x["list"], "kg": q["kg"],
                         **({"kg_upper": q["kg_upper"]} if "kg_upper" in q else {})}
    order = list(KIND_LABELS)
    return sorted(best.values(), key=lambda r: (order.index(r["kind"]), r["kg"]))
