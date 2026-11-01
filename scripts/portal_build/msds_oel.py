"""MSDS section 8 item H0202 (국내규정, the Korean exposure limit the MSDS quotes) → oel rows (pure functions).

Text shape: "|TWA : 0.5ppm |STEL : 2.5ppm(허용기준)", "| |STEL : C25ppm", "|TWA : 5ppm19mg/m3",
"|TWA : 1mg/m3망간 및 무기 화합물". Segments are split on "|"; each "TWA :" / "STEL :" segment gives one row per value
(a "C" before the number = ceiling, kind "C"). Whatever follows the values (a substance group such as "망간 및 무기
화합물", "(허용기준)", "Skin") is kept as the row's notation. The full original text is kept separately (oel_text).
These are the values printed in the MSDS, not the MOEL notice itself (that table is built by oel_public.py).
"""
from __future__ import annotations

import re

_NUM = r"\d+(?:\.\d+)?"
_UNIT = r"ppm|mg/m3|mg/㎥|mg/m³|f/cc|f/㎤|개/㎤|개/cm3"
_SEG_RE = re.compile(r"^(?P<kind>TWA|STEL)\s*[:：]\s*(?P<rest>.*)$", re.I)
_VAL_RE = re.compile(rf"^\s*(?P<c>C\s*)?(?P<num>{_NUM})\s*(?P<unit>{_UNIT})", re.I)
_UNIT_NORM = {"mg/㎥": "mg/m3", "mg/m³": "mg/m3", "f/㎤": "f/cc", "개/㎤": "f/cc", "개/cm3": "f/cc"}


def has_text(text: str | None) -> bool:
    s = re.sub(r"[|\s]", "", text or "")
    return bool(s) and s not in ("자료없음", "해당없음", "없음")


def _notation(rest: str) -> str | None:
    s = re.sub(r"\s+", " ", rest).strip(" ,;")
    if s.startswith("(") and s.endswith(")") and s.count("(") == 1:
        s = s[1:-1].strip()
    return s or None


def parse_oel(text: str | None) -> list[dict]:
    """[{kind, value, unit, notation}] in text order, duplicates removed."""
    rows, seen = [], set()
    for seg in (s.strip() for s in (text or "").split("|")):
        m = _SEG_RE.match(seg)
        if not m:
            continue
        kind, rest = m.group("kind").upper(), m.group("rest")
        values = []
        while True:
            v = _VAL_RE.match(rest)
            if not v:
                break
            unit = v.group("unit").lower().replace("㎥", "m3")
            values.append(("C" if v.group("c") else kind, float(v.group("num")), _UNIT_NORM.get(unit, unit)))
            rest = rest[v.end():]
        note = _notation(rest)
        for k, num, unit in values:
            key = (k, num, unit, note)
            if key not in seen:
                seen.add(key)
                rows.append({"kind": k, "value": num, "unit": unit, "notation": note})
    return rows
