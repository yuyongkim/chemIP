"""GHS classification text -> hazard entries (pure functions; rules in safety_rules/ghs_hazards.json).

A hazard entry is the compact string "<hazard key>:<category>" (e.g. "acute_oral:3", "skin:1A", "stot_se:3R"),
with a trailing "*" when CLP Annex VI marks a minimum classification ("Acute Tox. 3 *").

Inputs:
- KOSHA MSDS section 2 item B02: "인화성 액체 : 구분2|피부 부식성/피부 자극성 : 구분2|..." (Korean source text).
- CLP Annex VI: the hazard class and category codes ("Acute Tox. 3 *", one per line) with the classification hazard
  statement codes aligned line by line ("H331"), which fix the route of Acute Tox. and the effect of STOT SE 3.
- CLP Annex VI "M, SCL, ATE" column: specific concentration limits, M-factors and acute toxicity estimates.

The browser has the same parser (frontend/public/chemip/ghs_hazard_parse.jsx) for typed-in classifications; both are
checked against tests/fixtures/safety_parse_cases.json.
"""
from __future__ import annotations

import re

import safety_rules

_SPACE_RE = re.compile(r"[\s ]+")


def _norm(text: str | None) -> str:
    return _SPACE_RE.sub(" ", text or "").strip()


def _num(text: str) -> float | None:
    """'0,01' / ',01' / '1 000' / '10.0' -> float."""
    t = text.replace(" ", "").replace(" ", "")
    if re.fullmatch(r"\d*,\d+", t):
        t = t.replace(",", ".")
    t = t.replace(",", "")
    if t.startswith("."):
        t = "0" + t
    try:
        return float(t)
    except ValueError:
        return None


def _category(rules: dict, cat: str) -> str:
    return rules["category_alias"].get(cat, cat)


# ---------- KOSHA MSDS section 2 ----------

def _kosha_patterns(rules: dict):
    return [(key, re.compile(h["kosha"])) for key, h in rules["hazards"].items() if h.get("kosha")]


def kosha_line(line: str, rules: dict | None = None) -> str | None:
    """One B02 line ("급성 독성(경구) : 구분4") -> "acute_oral:4", or None when the class is not known."""
    rules = rules or safety_rules.ghs()
    text = _norm(line)
    if not text or text == "자료없음":
        return None
    key = next((k for k, rx in _kosha_patterns(rules) if rx.search(text)), None)
    if not key:
        return None
    m = re.search(rules["category_patterns"]["kosha"], text)
    if key == "lact":
        cat = "1"
    elif not m:
        cat = ""
    else:
        cat = next(g for g in m.groups() if g)
        if cat.startswith("불안정"):
            cat = "unst"
    cat = _category(rules, cat)
    if key == "stot_se" and cat == "3":
        cat = "3N" if rules["stot_se3"]["kosha_narc"] in text else "3R"
    return f"{key}:{cat}"


def kosha_classification(text: str | None, rules: dict | None = None) -> list[str]:
    """The whole B02 text ("a : 구분1|b : 구분2") -> hazard entries in order, duplicates removed."""
    out: list[str] = []
    for part in (text or "").split("|"):
        h = kosha_line(part, rules)
        if h and h not in out:
            out.append(h)
    return out


# ---------- CLP codes (Annex VI or typed in) ----------

def _clp_key(code: str, rules: dict) -> str | None:
    for key, h in rules["hazards"].items():
        for prefix in h.get("clp", []):
            if code == prefix or code.startswith(prefix + " ") or code.startswith(prefix.rstrip(".")):
                return key
    return None


def _acute_route(h_code: str, rules: dict) -> str | None:
    for key, h in rules["hazards"].items():
        if h_code[:4] in h.get("h_route", []):
            return key
    return None


def clp_code(code: str, h_code: str = "", rules: dict | None = None) -> str | None:
    """One CLP code ("Acute Tox. 3 *", aligned hazard statement "H331") -> "acute_inh:3*", or None."""
    rules = rules or safety_rules.ghs()
    text = _norm(code)
    if not text:
        return None
    minimum = text.endswith("*")
    text = text.rstrip("* ").strip()
    h = _norm(h_code).split(" ")[0] if h_code else ""
    if text.startswith(rules["clp_acute_tox"]):
        key = _acute_route(h, rules) if h else None
        if not key:
            return None
    else:
        key = _clp_key(text, rules)
        if not key:
            return None
    m = re.search(rules["category_patterns"]["clp"], " " + text)
    cat = m.group(1) if m else ("1" if key == "lact" else ("unst" if text.startswith("Unst") else ""))
    if not m:  # a missing space, as in "Aquatic Acute1"
        tail = re.search(r"(1A|1B|1C|1|2|3|4)$", text)
        cat = tail.group(1) if tail else cat
    cat = _category(rules, cat)
    if key == "stot_se" and cat == "3":
        cat = "3N" if h.startswith(rules["stot_se3"]["h_narc"]) else "3R"
    return f"{key}:{cat}{'*' if minimum else ''}"


def clp_classification(codes: str | None, h_codes: str | None = "", rules: dict | None = None) -> list[str]:
    """Annex VI classification cells (codes and hazard statements, one per line, aligned) -> hazard entries."""
    rules = rules or safety_rules.ghs()
    c_lines = [c for c in (codes or "").split("\n") if c.strip()]
    h_lines = [h for h in (h_codes or "").split("\n") if h.strip()]
    aligned = len(c_lines) == len(h_lines)
    acute_h = [h.strip() for h in h_lines if _acute_route(h.strip(), rules)]
    out: list[str] = []
    for i, c in enumerate(c_lines):
        h = h_lines[i] if aligned else ""
        if not aligned and _norm(c).startswith(rules["clp_acute_tox"]) and acute_h:
            h = acute_h.pop(0)
        if not aligned and _norm(c).startswith("STOT SE 3"):
            h = next((x for x in h_lines if x.strip().startswith(("H335", "H336"))), "")
        entry = clp_code(c, h, rules)
        if entry and entry not in out:
            out.append(entry)
    return out


# ---------- "M, SCL, ATE" column ----------

_SCL_RE = re.compile(r"^(?P<code>[A-Za-z][A-Za-z .\-]*?\s(?:1A|1B|1C|1|2|3|4))\s*;\s*(?P<h>H\d{3}[A-Za-z]*)?\s*[:;]\s*(?P<cond>.+)$")
_LOW_RE = re.compile(r"C\s*[≥>]=?\s*([\d.,\s]+?)\s*%|([\d.,\s]+?)\s*%\s*[≤<]=?\s*C")
_ATE_RE = re.compile(r"(oral|dermal|inhalation)\s*:\s*ATE\s*=\s*([\d.,\s]+?)\s*(mg/kg(?: bw)?|mg/L|mg/l|ppmV|ppm)\s*(.*)", re.I)
_M_RE = re.compile(r"^M\s*=\s*([\d\s]+)$")


def _inhalation_form(text: str) -> str:
    t = text.lower()
    if "gas" in t or "ppm" in t:
        return "gas"
    if "dust" in t or "mist" in t:
        return "dust"
    return "vapour"


def scl_column(text: str | None, rules: dict | None = None) -> dict:
    """The Annex VI "M, SCL, ATE" cell -> {"scl": [[key, cat, lower limit %]], "ate": {route: value}, "m": [M, ...]}.

    route: oral | dermal | gas | vapour | dust (inhalation split by the stated form). A limit with no lower bound
    ("C < 10 %") is not a classification trigger and is left out.
    """
    rules = rules or safety_rules.ghs()
    raw = (text or "").replace(" ", " ").replace("*", "")
    # "oral:\nATE = 500" (older tables) -> one line
    raw = re.sub(r"(oral|dermal|inhalation)\s*:\s*\n\s*ATE", r"\1: ATE", raw, flags=re.I)
    out = {"scl": [], "ate": {}, "m": []}
    for line in raw.split("\n"):
        line = _norm(line)
        if not line:
            continue
        a = _ATE_RE.search(line)
        if a:
            value = _num(a.group(2))
            route = a.group(1).lower()
            if route == "inhalation":
                route = _inhalation_form(a.group(3) + " " + a.group(4))
            if value is not None:
                out["ate"][route] = value
            continue
        m = _M_RE.search(line)
        if m:
            value = _num(m.group(1))
            if value is not None:
                out["m"].append(value)
            continue
        s = _SCL_RE.match(line)
        if s:
            entry = clp_code(s.group("code"), s.group("h") or "", rules)
            low = _LOW_RE.search(s.group("cond"))
            if entry and low:
                value = _num(low.group(1) or low.group(2))
                key, cat = entry.rstrip("*").split(":")
                if value is not None:
                    out["scl"].append([key, cat, value])
    return out


def m_factors(hazards: list[str], m_values: list[float]) -> dict:
    """Assign Annex VI M-factors to Aquatic Acute 1 / Chronic 1. Two values: acute first, then chronic (the order of
    the table); one value: every Category 1 aquatic class of the entry gets it. Returns {"acute": M, "chronic": M}."""
    has_a = any(h.rstrip("*") == "aq_acute:1" for h in hazards)
    has_c = any(h.rstrip("*") == "aq_chronic:1" for h in hazards)
    out: dict[str, float] = {}
    if not m_values:
        return out
    if len(m_values) >= 2 and has_a and has_c:
        out["acute"], out["chronic"] = m_values[0], m_values[1]
        return out
    if has_a:
        out["acute"] = m_values[0]
    if has_c:
        out["chronic"] = m_values[0] if not has_a or len(m_values) < 2 else m_values[1]
    return out
