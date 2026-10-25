"""EPA List of Lists 셀 값 → 사람이 읽는 detail 문자열(단위·각주 해석 포함).

원본 엑셀은 열 머리에 단위를 적지 않는다. 단위는 각 규정 본문이 정한다(모두 파운드):
CAA 112(r) 40 CFR 68.130, CERCLA 40 CFR 302.4, CWA 311(j)(5) 40 CFR 118, EPCRA 302/304 40 CFR 355.
각주 기호의 뜻은 같은 엑셀의 'Codes for List of Lists' 표에서 옮겼다.
"""
from __future__ import annotations

import re

UNIT = "lb"

# regulation 코드 → detail 접두어. EPCRA_313 은 수량이 아니라 등재 코드라 접두어가 없다.
PREFIX = {
    "CAA_112R": "Threshold Quantity",
    "CERCLA": "Reportable Quantity",
    "CWA_311": "Threshold Quantity",
    "EPCRA_302": "Threshold Planning Quantity",
    "EPCRA_304": "Reportable Quantity",
}

# 수량 칸에 숫자 대신, 또는 숫자 뒤에 붙는 각주 기호.
QUANTITY_CODES = {
    "&": "no RQ assigned to this broad class; it is still a CERCLA hazardous substance",
    "@": "NOx combustion releases under 1,000 lb/24 h are exempt",
    "§": "radionuclide RQs in curies, see 40 CFR 302.4 Appendix B",
    "PMN": "identified from a confidential premanufacture notice",
    "i": "structural isomer of a substance listed in 40 CFR 117.3",
}

# EPCRA 313 칸 코드.
TRI_CODES = {
    "313": "TRI listed",
    "313c": "TRI reportable under a chemical category",
    "313s": "TRI listed, reporting under administrative stay",
    "313i": "TRI reportable as an isomer of a listed CAS",
    "X": "TRI listed under another name on this list",
}

_NUM = r"\d[\d,]*"
_QTY = re.compile(rf"^({_NUM})(?:/({_NUM}))?\s*(.*)$")
_TRI_CATEGORY = re.compile(r"^313-(N\d+)$")


def _quantity(raw: str) -> str:
    if raw in QUANTITY_CODES:
        return QUANTITY_CODES[raw]
    m = _QTY.match(raw)
    if not m:
        return raw  # 예: "See ammonium hydroxide"
    low, high, code = m.groups()
    text = f"{low} {UNIT}"
    if high:  # EPCRA 302: 분말·용융·용액 고체는 낮은 값, 그 밖의 고체는 높은 값
        text += f" (solids not powder/molten/solution: {high} {UNIT})"
    note = QUANTITY_CODES.get(code.strip())
    return f"{text} ({note})" if note else (f"{text} {code}".strip())


def _tri(raw: str) -> str:
    parts = []
    for tok in raw.split():
        m = _TRI_CATEGORY.match(tok)
        parts.append(f"TRI chemical category {m.group(1)}" if m else TRI_CODES.get(tok.lower() if tok != "X" else tok, tok))
    return "; ".join(dict.fromkeys(parts))


def format_detail(regulation: str, raw: str) -> str:
    raw = str(raw).strip()
    if regulation == "EPCRA_313":
        return _tri(raw)
    return f"{PREFIX[regulation]}: {_quantity(raw)}"


def raw_from_detail(regulation: str, detail: str) -> str:
    """옛 적재 형식("접두어: 값")에서 원본 셀 값을 되돌린다."""
    prefix = PREFIX.get(regulation)
    return detail[len(prefix) + 2:] if prefix and detail.startswith(prefix + ": ") else detail
