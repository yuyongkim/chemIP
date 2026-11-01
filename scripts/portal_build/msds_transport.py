"""MSDS section 14 items → one transport row (pure functions).

The texts are short codes typed by hand (UN "UN1993"/"1993", packing group "Ⅱ"/"II"/"2", marine pollutant "해당(MP)"/
"비해당"/"P", EmS "F-E" + "S-D"). They are normalised to one spelling each; anything not recognised is kept as written.
A row is made only when the UN number is a valid 4-digit number.
"""
from __future__ import annotations

import re

_NONE = {"", "해당없음", "해당 없음", "자료없음", "-", "0", "class or division", "없음", "?", "？"}
_PG = {"Ⅰ": "I", "I": "I", "1": "I", "Ⅱ": "II", "II": "II", "2": "II", "Ⅲ": "III", "III": "III", "3": "III"}
_MP_YES = {"해당(mp)", "mp", "해당", "해당됨", "p", "p(mp)", "해당있음", "해양오염 가능성 물질", "헤당", "？해당", "？해당됨", "y", "yes"}
_MP_NO = {"비해당", "비 해당", "n", "해당없음", "？비해당", "no"}


def _clean(text: str | None) -> str:
    return re.sub(r"\s+", " ", (text or "").strip())


def un_number(text: str | None) -> str | None:
    s = re.sub(r"^UN\s*", "", _clean(text), flags=re.I)
    return s if re.fullmatch(r"\d{4}", s) else None


def hazard_class(text: str | None) -> str | None:
    s = _clean(text)
    return None if s.lower() in _NONE else s


def packing_group(text: str | None) -> str | None:
    s = _clean(text)
    if s.lower() in _NONE:
        return None
    return _PG.get(s.upper() if s.isascii() else s, s)


def marine_pollutant(text: str | None) -> str | None:
    s = _clean(text).lower()
    if s in _MP_YES:
        return "yes"
    if s in _MP_NO:
        return "no"
    return None


def _ems_code(text: str | None, letter: str) -> str | None:
    s = _clean(text).upper().replace("？", "").replace("?", "")
    m = re.fullmatch(rf"{letter}\s*-?\s*([A-Z])", s)
    return f"{letter}-{m.group(1)}" if m else None


def ems(fire: str | None, spill: str | None) -> str | None:
    """'F-E' + 'S-D' → 'F-E, S-D' (IMDG EmS schedule pair)."""
    parts = [p for p in (_ems_code(fire, "F"), _ems_code(spill, "S")) if p]
    return ", ".join(parts) or None


def transport_row(items: dict[str, str]) -> dict | None:
    """{N02, N04, N06, N08, N10, N1202, N1204} → transport fields, or None without a valid UN number."""
    un = un_number(items.get("N02"))
    if not un:
        return None
    name = _clean(items.get("N04"))
    return {
        "un_number": un,
        "proper_name": None if name.lower() in _NONE else name,
        "hazard_class": hazard_class(items.get("N06")),
        "packing_group": packing_group(items.get("N08")),
        "marine_pollutant": marine_pollutant(items.get("N10")),
        "ems": ems(items.get("N1202"), items.get("N1204")),
    }
