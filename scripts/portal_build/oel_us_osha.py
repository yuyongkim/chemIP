"""United States, OSHA PELs from the eCFR XML of 29 CFR 1910 subpart Z → oel rows (two sources).

us_osha_z (1910.1000):
- Table Z-1: Substance | CAS | ppm | mg/m³ | Skin. "(C)" before a value = ceiling. Rows "…; see 1910.10xx" carry no value
  (the substance-specific standard applies, source us_osha_specific). Skin "X" → notation "skin".
- Table Z-2: Substance | 8-h TWA | acceptable ceiling | peak above the ceiling | max duration. No CAS in the table, so the
  name maps through oel_osha_map.json "z2_cas"; rows that apply only where a specific standard is stayed are skipped.
  The peak is kept as the ceiling row's notation.
- Table Z-3 (mineral dusts): only the fixed mppcf values of the named silicates (formula limits are not values).
us_osha_specific (1910.1001…1910.1053): the PELs in oel_osha_map.json "specific", each checked against its section text.
"""
from __future__ import annotations

import json
import os
import re

import oel_raw
from oel_values import cas_list, clean_text, norm_unit, parse_number, qualify_shared_cas, row, scaled

SOURCE_Z = "us_osha_z"
SOURCE_SPECIFIC = "us_osha_specific"
JURISDICTION = "US"
MAP_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "oel_osha_map.json")
Z_FILE = "1910.1000.xml"
_CEIL_RE = re.compile(r"^\(C\)\s*")
_Z2_VALUE_RE = re.compile(r"^(?P<num>[\d.,]+)\s*(?P<unit>.+)$")


def osha_map() -> dict:
    with open(MAP_FILE, encoding="utf-8") as fh:
        return json.load(fh)


def _cell_text(fragment: str) -> str:
    """Cell XML → text: 'm<sup>3</sup>' kept as m3, footnote superscripts dropped."""
    s = re.sub(r"m\s*<(sup|SU)>3</(sup|SU)>", "m3", fragment)
    s = re.sub(r"<(sup|SU)>[^<]*</(sup|SU)>", "", s)
    return clean_text(s)


def tables(xml: str) -> list[list[dict]]:
    """Every <TABLE> as rows of {cells: [text], indent: bool}; footers dropped."""
    out = []
    for tb in re.findall(r"<TABLE.*?</TABLE>", xml, re.S):
        tb = re.sub(r"<TFOOT>.*?</TFOOT>", "", tb, flags=re.S)
        caption = clean_text(" ".join(re.findall(r"<CAPTION>(.*?)</CAPTION>", tb, re.S)))
        rows = []
        for tr in re.findall(r"<TR.*?</TR>", tb, re.S):
            cells = re.findall(r"<T[DH]([^>]*)>(.*?)</T[DH]>", tr, re.S)
            if cells:
                rows.append({"cells": [_cell_text(c) for _, c in cells], "indent": "indent" in cells[0][0]})
        out.append({"caption": caption, "rows": rows})
    return out


def _z1_value(text: str) -> tuple[str, float] | None:
    t = text.strip()
    kind = "C" if _CEIL_RE.match(t) else "TWA"
    num = parse_number(_CEIL_RE.sub("", t))
    return (kind, num) if num is not None else None


def parse_z1(rows: list[dict]) -> list[dict]:
    agents, parent = [], None
    for r in rows:
        c = r["cells"]
        if len(c) < 5 or c[0] == "Substance":
            continue
        name, cas = c[0], cas_list(c[1])
        if not r["indent"]:
            parent = (name, cas)
        elif not cas and parent and parent[1]:
            name, cas = f"{parent[0]} — {name}", parent[1]
        if not cas or "; see " in name.lower():
            continue
        notation = "skin" if c[4].strip().upper() == "X" else None
        out = []
        for col, unit in ((2, "ppm"), (3, "mg/m3")):
            v = _z1_value(c[col])
            if v:
                out += [row(x, JURISDICTION, v[0], v[1], unit, notation) for x in cas]
        agents.append((name, out))
    return qualify_shared_cas(agents)


def _z2_value(text: str) -> tuple[float, str] | None:
    t = text.replace("mg/10m3", "mg/10 m3").strip()
    m = _Z2_VALUE_RE.match(t)
    if not m:
        return None
    num, unit = parse_number(m.group("num")), m.group("unit").strip()
    if num is None:
        return None
    if unit == "mg/10 m3":  # chromic acid, mercury: "1 mg/10m³" = 0.1 mg/m³
        return scaled(num, 0.1), "mg/m3"
    nu = norm_unit(unit)
    if not nu:
        raise ValueError(f"Z-2 unit {text!r}")
    return scaled(num, nu[1]), nu[0]


def _lookup(name: str, table: dict) -> str | None:
    for key, cas in table.items():
        if name.startswith(key):
            return cas
    return None


def parse_z2(rows: list[dict], m: dict) -> list[dict]:
    out = []
    for r in rows:
        c = r["cells"]
        if len(c) < 5 or c[0] == "Substance":
            continue
        if any(c[0].startswith(s) for s in m["z2_skip"]):
            continue
        cas = _lookup(c[0], m["z2_cas"])
        if not cas:
            continue
        twa, ceil, peak = _z2_value(c[1]), _z2_value(c[2]), _z2_value(c[3])
        if twa:
            out.append(row(cas, JURISDICTION, "TWA", twa[0], twa[1]))
        if ceil:
            note = f"peak {peak[0]:g} {peak[1]}, {c[4].rstrip('.')}" if peak else None
            out.append(row(cas, JURISDICTION, "C", ceil[0], ceil[1], note))
    return out


def parse_z3(rows: list[dict], m: dict) -> list[dict]:
    out = []
    for r in rows:
        c = r["cells"]
        if len(c) < 3:
            continue
        cas = m["z3_cas"].get(c[0])
        num = parse_number(c[1])
        if cas and num is not None:
            out.append(row(cas, JURISDICTION, "TWA", num, "mppcf", "Table Z-3"))
    return out


def parse_z() -> tuple[list[dict], dict]:
    xml = oel_raw.read_file(SOURCE_Z, Z_FILE).decode("utf-8")
    m = osha_map()
    by_caption = {t["caption"].split("—")[0].strip(): t["rows"] for t in tables(xml) if t["caption"]}
    z1, z2, z3 = parse_z1(by_caption["Table Z-1"]), parse_z2(by_caption["Table Z-2"], m), parse_z3(by_caption["Table Z-3"], m)
    rows = z1 + z2 + z3
    return rows, {"z1": len(z1), "z2": len(z2), "z3": len(z3), "rows": len(rows), "cas": len({r["cas"] for r in rows})}


def _section_text(section: str) -> str:
    xml = oel_raw.read_file(SOURCE_SPECIFIC, f"{section}.xml").decode("utf-8")
    return clean_text(re.sub(r"<(?:sup|SU)>([^<]*)</(?:sup|SU)>", r" \1", xml))


def parse_specific() -> tuple[list[dict], dict]:
    rows, missing, texts = [], [], {}
    for e in osha_map()["specific"]:
        text = texts.setdefault(e["section"], _section_text(e["section"]))
        if clean_text(e["evidence"]) not in text:
            missing.append(f"{e['section']} {e['cas']} {e['kind']}")
            continue
        note = " ".join(x for x in (e.get("notation"), f"29 CFR {e['section']}") if x)
        rows.append(row(e["cas"], JURISDICTION, e["kind"], float(e["value"]), e["unit"], note))
    if missing:
        raise ValueError(f"OSHA specific standards: evidence not found in eCFR text: {missing}")
    return rows, {"rows": len(rows), "cas": len({r["cas"] for r in rows}), "sections": len(texts)}
