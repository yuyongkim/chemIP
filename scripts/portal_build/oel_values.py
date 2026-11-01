"""Pure helpers shared by the OEL parsers: numbers, units, CAS lists and the row shape.

Row shape (one `oel` table row before insert): {cas, jurisdiction, kind, value, unit, notation}.
kind is TWA | STEL | C | IDLH. Units are normalised to the ones the KOSHA MSDS rows use (msds_oel.py):
ppm, mg/m3, f/cc (fibres per cm³ = f/ml = 개/㎤), plus mppcf (OSHA Table Z-3). µg/m³ and ppb are scaled to mg/m3 / ppm.
"""
from __future__ import annotations

import html
import re

from cas_utils import is_cas

KINDS = ("TWA", "STEL", "C", "IDLH")
CAS_FIND_RE = re.compile(r"\b(\d{2,7}-\d{2}-\d)\b")
_NUM_RE = re.compile(r"^\d+(?:\.\d+)?$")

# unit text as printed → (normalised unit, factor)
_UNITS = {
    "ppm": ("ppm", 1.0), "ppb": ("ppm", 0.001),
    "mg/m3": ("mg/m3", 1.0), "mg/m 3": ("mg/m3", 1.0), "mg/m³": ("mg/m3", 1.0), "mg/㎥": ("mg/m3", 1.0), "㎎/㎥": ("mg/m3", 1.0),
    "µg/m3": ("mg/m3", 0.001), "μg/m3": ("mg/m3", 0.001), "µg/m³": ("mg/m3", 0.001), "μg/m³": ("mg/m3", 0.001),
    "μg/m 3": ("mg/m3", 0.001), "µg/m 3": ("mg/m3", 0.001), "ug/m3": ("mg/m3", 0.001),
    "f/cc": ("f/cc", 1.0), "f/ml": ("f/cc", 1.0), "f/cm3": ("f/cc", 1.0), "개/㎤": ("f/cc", 1.0), "개/cm3": ("f/cc", 1.0),
    "fibers/cc": ("f/cc", 1.0), "fibers/cm3": ("f/cc", 1.0), "mppcf": ("mppcf", 1.0),
}


def clean_text(s: str | None) -> str:
    """HTML fragment or cell text → one line of plain text."""
    s = re.sub(r"<[^>]+>", " ", s or "")
    s = html.unescape(s).replace("\xa0", " ")
    return re.sub(r"\s+", " ", s).strip()


def parse_number(s: str | None) -> float | None:
    """'1 210' / '0,66' / '1,000' / '0.05' → float; '—', '-', '' → None. Footnote marks '( 8 )' are dropped."""
    t = re.sub(r"\(\s*\d+\s*\)", "", s or "").strip()
    t = t.replace(" ", "").replace(" ", "")
    if not t or t in ("-", "—", "–", "−"):
        return None
    if re.fullmatch(r"\d{1,3}(,\d{3})+", t):          # US thousands separator: 1,000
        t = t.replace(",", "")
    elif re.fullmatch(r"\d+,\d+", t):                 # EU decimal comma: 0,66
        t = t.replace(",", ".")
    return float(t) if _NUM_RE.match(t) else None


def norm_unit(unit: str) -> tuple[str, float] | None:
    u = re.sub(r"\s+", " ", (unit or "").strip()).replace("m<sup>3</sup>", "m3")
    return _UNITS.get(u) or _UNITS.get(u.lower()) or _UNITS.get(u.replace(" ", "").lower())


def scaled(value: float, factor: float) -> float:
    return float(f"{value * factor:.10g}")


def cas_list(text: str | None) -> list[str]:
    """Every CAS-shaped number in the text, in order, without duplicates."""
    out = []
    for c in CAS_FIND_RE.findall(text or ""):
        if is_cas(c) and c not in out:
            out.append(c)
    return out


def row(cas: str, jurisdiction: str, kind: str, value: float, unit: str, notation: str | None = None) -> dict:
    if kind not in KINDS:
        raise ValueError(kind)
    return {"cas": cas, "jurisdiction": jurisdiction, "kind": kind, "value": value, "unit": unit,
            "notation": (notation or None)}


def dedupe(rows: list[dict]) -> list[dict]:
    seen, out = set(), []
    for r in rows:
        key = (r["cas"], r["jurisdiction"], r["kind"], r["value"], r["unit"], r["notation"])
        if key not in seen:
            seen.add(key)
            out.append(r)
    return out


def qualify_shared_cas(rows_by_agent: list[tuple[str, list[dict]]]) -> list[dict]:
    """When one CAS has several agents in the same source (e.g. nickel metal / soluble / insoluble compounds), prefix each
    row's notation with its agent name in brackets so the rows stay distinguishable. Others are left as they are."""
    agents_per_cas: dict[str, set[str]] = {}
    for agent, rows in rows_by_agent:
        for r in rows:
            agents_per_cas.setdefault(r["cas"], set()).add(agent)
    out = []
    for agent, rows in rows_by_agent:
        for r in rows:
            if len(agents_per_cas[r["cas"]]) > 1:
                r = {**r, "notation": f"[{agent}]" + (f" {r['notation']}" if r["notation"] else "")}
            out.append(r)
    return out
