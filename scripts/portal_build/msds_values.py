"""MSDS section 9 item text → property rows (pure functions).

Every row keeps the item's own text (value_text, minus the "※출처 : …" part and "자료없음" fillers). A number and an SI
unit are added only when the text reads as one plain value with a known unit: no "<"/">"/range, unit in UNIT_TABLE.
The number is converted to the property's SI unit (PROPS[prop]["si"]); the converted value is value_num.

    parse_property("I14", "-11 ℃|   ※출처 : ICSC")
    -> [{"prop": "flash_point", "value_text": "-11 ℃", "value_num": -11.0, "unit": "°C", "condition": None, "origin": "ICSC"}]
"""
from __future__ import annotations

import re

# item code → property (and how to read it). si: unit of value_num; None = dimensionless; "text" = text only.
PROPS = {
    "I0202": {"prop": "appearance", "si": "text"},
    "I08": {"prop": "ph", "si": None},
    "I10": {"prop": "melting_point", "si": "°C"},
    "I12": {"prop": "boiling_point", "si": "°C"},
    "I14": {"prop": "flash_point", "si": "°C"},
    "I20": {"prop": "flammability_limits", "si": "%"},   # split into lfl / ufl rows
    "I22": {"prop": "vapor_pressure", "si": "Pa"},
    "I24": {"prop": "solubility", "si": "g/L"},
    "I26": {"prop": "vapor_density", "si": None},
    "I28": {"prop": "relative_density", "si": None},
    "I30": {"prop": "log_kow", "si": None},
    "I32": {"prop": "autoignition", "si": "°C"},
    "I34": {"prop": "decomposition", "si": "°C"},
    "I36": {"prop": "viscosity", "si": "mPa·s"},
    "I38": {"prop": "molar_mass", "si": "g/mol", "assume": "g/mol"},  # a bare number is g/mol
}

# written unit (lower case, spaces removed) → (SI unit, factor, offset): value_num = number * factor + offset
_T = "°C"
UNIT_TABLE = {
    "℃": (_T, 1, 0), "°c": (_T, 1, 0), "c": (_T, 1, 0), "degc": (_T, 1, 0), "도": (_T, 1, 0), "˚c": (_T, 1, 0), "oc": (_T, 1, 0),
    "k": (_T, 1, -273.15), "°f": (_T, 5 / 9, -160 / 9), "℉": (_T, 5 / 9, -160 / 9),
    "pa": ("Pa", 1, 0), "㎩": ("Pa", 1, 0), "kpa": ("Pa", 1e3, 0), "㎪": ("Pa", 1e3, 0), "hpa": ("Pa", 1e2, 0),
    "mpa": ("Pa", 1e6, 0), "㎫": ("Pa", 1e6, 0), "mmhg": ("Pa", 133.322, 0), "㎜hg": ("Pa", 133.322, 0), "torr": ("Pa", 133.322, 0),
    "atm": ("Pa", 101325, 0), "bar": ("Pa", 1e5, 0), "mbar": ("Pa", 1e2, 0), "psi": ("Pa", 6894.76, 0),
    "mg/l": ("g/L", 1e-3, 0), "㎎/ℓ": ("g/L", 1e-3, 0), "㎎/l": ("g/L", 1e-3, 0), "mg/ℓ": ("g/L", 1e-3, 0),
    "g/l": ("g/L", 1, 0), "g/ℓ": ("g/L", 1, 0), "g/100ml": ("g/L", 10, 0), "g/100㎖": ("g/L", 10, 0),
    "µg/l": ("g/L", 1e-6, 0), "㎍/ℓ": ("g/L", 1e-6, 0), "ug/l": ("g/L", 1e-6, 0), "kg/m3": ("g/L", 1, 0),
    "cp": ("mPa·s", 1, 0), "cps": ("mPa·s", 1, 0), "mpas": ("mPa·s", 1, 0), "mpa·s": ("mPa·s", 1, 0), "mpa.s": ("mPa·s", 1, 0),
    "pa·s": ("mPa·s", 1e3, 0), "pas": ("mPa·s", 1e3, 0), "p": ("mPa·s", 100, 0),
    "cst": ("mm²/s", 1, 0), "㎟/s": ("mm²/s", 1, 0), "mm2/s": ("mm²/s", 1, 0), "mm²/s": ("mm²/s", 1, 0),
    "g/mol": ("g/mol", 1, 0), "g/cm3": ("g/cm³", 1, 0), "g/㎤": ("g/cm³", 1, 0), "g/ml": ("g/cm³", 1, 0), "g/㎖": ("g/cm³", 1, 0),
    "g/cm³": ("g/cm³", 1, 0), "g/cc": ("g/cm³", 1, 0), "kg/㎥": ("g/L", 1, 0), "kg/m³": ("g/L", 1, 0),
    "%": ("%", 1, 0), "vol%": ("%", 1, 0),
}
# units that may stand for a dimensionless property (relative density is often written in g/cm³)
_DIMENSIONLESS_OK = {None, "g/cm³", "g/mol"}

_ORIGIN_RE = re.compile(r"^※\s*출처\s*[:：]?\s*(.*)$")
_FILLERS = {"자료없음", "자료 없음", "자료없음.", "자료 없음."}
_NO_DATA_WORDS = re.compile(r"자료\s*없음|해당\s*없음|해당\s*안\s*됨|해당\s*되지\s*않음|^없음$|사용할\s*수\s*없는|not\s*available|no\s*data|n/?a$", re.I)
_NUM = r"[-−–]?\s?\d+(?:,\d{3})*(?:\.\d+)?(?:\s?[eE]\s?[-+−]?\d+)?"
_LABEL_PREFIX_RE = re.compile(r"^[가-힣A-Za-z ]{1,12}\s*[:：]\s*(?=[-−<>≤≥약~\d])")
_VALUE_RE = re.compile(
    rf"^(?P<cmp>[<>≤≥]=?|약|ca\.?|~)?\s*(?P<a>{_NUM})(?:\s*[~∼～]\s*(?P<b>{_NUM}))?\s*(?P<unit>[^()\d\s][^()]*?)?\s*(?:\((?P<cond>.*?)\)?)?\s*$"
)


def split_origin(text: str) -> tuple[str, str | None]:
    """'-11 ℃|   ※출처 : ICSC' → ('-11 ℃', 'ICSC'). The origin part may come first or last. Filler parts are dropped."""
    value_parts, origin = [], None
    for part in (p.strip() for p in (text or "").split("|")):
        m = _ORIGIN_RE.match(part)
        if m:
            origin = origin or (m.group(1).strip() or None)
        elif part and part not in _FILLERS:
            value_parts.append(part)
    return re.sub(r"\s+", " ", " ".join(value_parts)).strip(), origin


def is_no_data(value: str) -> bool:
    """True for texts that only say "no data / not applicable" or hold a unit with no number ("< ℃", "- / -")."""
    s = re.sub(r"[\s()\[\].,;:/\-–~<>≤≥%]", "", value or "")
    if not s:
        return True
    if _NO_DATA_WORDS.search(re.sub(r"[()]", "", value).strip()):
        return not re.search(r"\d", value)
    return not re.search(r"[\d가-힣A-Za-z]", re.sub(r"[℃°㎪㎩㎜ℓ㎖㎎]", "", s))


def _num(s: str) -> float | None:
    try:
        return float(re.sub(r"\s", "", s).replace("−", "-").replace("–", "-").replace(",", ""))
    except ValueError:
        return None


def _unit_key(unit: str | None) -> str | None:
    if not unit:
        return None
    return re.sub(r"\s", "", unit).lower().replace("ｌ", "l")


def parse_value(value: str, si: str | None, assume: str | None = None) -> dict:
    """value_text → {value_num, unit, condition}. value_num only for a plain single value with a usable unit."""
    out = {"value_num": None, "unit": None, "condition": None}
    v = value.strip()
    if v.startswith("(") and v.endswith(")") and v.count("(") == 1:
        v = v[1:-1].strip()
    v = _LABEL_PREFIX_RE.sub("", v)
    m = _VALUE_RE.match(v)
    if not m:
        return out
    cond = (m.group("cond") or "").strip(" ()") or None
    out["condition"] = cond
    unit_raw = (m.group("unit") or "").strip() or None
    known = UNIT_TABLE.get(_unit_key(unit_raw)) if unit_raw else (UNIT_TABLE.get(assume) if assume else None)
    if unit_raw and not known:
        return out                                   # unknown unit: text only
    if si == "text":
        return out
    plain = not m.group("cmp") or m.group("cmp") == "약"
    a = _num(m.group("a"))
    if a is None:
        return out
    if si is None:                                   # dimensionless property
        if known and known[0] not in _DIMENSIONLESS_OK:
            return out
        out["unit"] = known[0] if known else None
        if plain and not m.group("b"):
            out["value_num"] = a
        return out
    if not known:
        return out                                   # property needs a unit and none was written
    unit, factor, offset = known
    if unit != si:
        if not (si == "mPa·s" and unit == "mm²/s"):  # kinematic viscosity is kept with its own unit
            return out
    out["unit"] = unit
    if plain and not m.group("b"):
        out["value_num"] = round(a * factor + offset, 10)
    return out


def _limits(value: str) -> list[tuple[str, str]]:
    """I20 '8.0 / 1.2 %' (upper / lower) → [('ufl', '8.0 %'), ('lfl', '1.2 %')]. A side written '-' is left out."""
    if "/" not in value:
        return []
    upper, _, lower = value.partition("/")
    unit = "%" if "%" in value else ""
    out = []
    for prop, side in (("ufl", upper), ("lfl", lower)):
        side = side.replace("%", "").strip()
        side = re.sub(r"\(.*$", "", side).strip()
        if side and re.search(r"\d", side):
            out.append((prop, f"{side} {unit}".strip()))
    return out


def parse_property(code: str, text: str) -> list[dict]:
    """One section 9 item → 0..2 property rows (I20 gives lfl and ufl)."""
    spec = PROPS.get(code)
    if not spec or not text:
        return []
    value, origin = split_origin(text)
    if not value or is_no_data(value):
        return []
    if spec["prop"] == "flammability_limits":
        rows = []
        for prop, side in _limits(value):
            parsed = parse_value(side, "%")
            rows.append({"prop": prop, "value_text": side, **parsed, "origin": origin})
        return rows
    if spec["si"] not in ("text", None) and re.fullmatch(r"0+(\.0+)?", value):
        return []                                    # a bare "0" is the form's empty value, not a measurement
    parsed = parse_value(value, spec["si"], spec.get("assume"))
    return [{"prop": spec["prop"], "value_text": value, **parsed, "origin": origin}]
