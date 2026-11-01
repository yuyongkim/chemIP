"""Critical / normal-point constants from the two constant-only sources → {CAS: [constant rows]}.

Wikidata (CC0): critical_points.json written by tp_fetch.py (P873 = critical point, normalised SI qualifiers).
CoolProp constants (MIT): heos_constants.tsv (CAS, ID, name, Tc, Pc, Vc, Tt, Pt, Tb, omega; SI, Vc in m³/mol).
Pure functions: text in, rows out. Row = {k, v, unit, src} as in tp_chemsep.py.
"""
from __future__ import annotations

import json
import re

CAS_RE = re.compile(r"^\d{2,7}-\d{2}-\d$")
WIKIDATA = "wikidata"
COOLPROP = "coolprop_heos"
HEOS_COLUMNS = {"Tc": "K", "Pc": "Pa", "Vc": "m3/mol", "Tt": "K", "Pt": "Pa", "Tb": "K", "omega": "-"}


def _pos(text: str | None) -> float | None:
    try:
        v = float(text)
    except (TypeError, ValueError):
        return None
    return v if v > 0 and v == v else None


def _finite(text: str | None) -> float | None:
    try:
        v = float(text)
    except (TypeError, ValueError):
        return None
    return v if v == v and abs(v) != float("inf") else None


def wikidata_rows(raw_json: str) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for r in json.loads(raw_json).get("rows", []):
        cas = (r.get("cas") or "").strip()
        if not CAS_RE.match(cas):
            continue
        item = (r.get("item") or "").rsplit("/", 1)[-1]
        rows = out.setdefault(cas, [])
        for key, unit in (("T", "K"), ("P", "Pa")):
            v = _pos(r.get(key))
            k = "Tc" if key == "T" else "Pc"
            if v is not None and not any(x["k"] == k for x in rows):
                rows.append({"k": k, "v": v, "unit": unit, "src": WIKIDATA, "ref": item})
    return {c: rows for c, rows in out.items() if rows}


def coolprop_rows(tsv: str) -> dict[str, list[dict]]:
    lines = [ln for ln in tsv.splitlines() if ln.strip()]
    if not lines:
        return {}
    head = lines[0].split("\t")
    out: dict[str, list[dict]] = {}
    for ln in lines[1:]:
        rec = dict(zip(head, ln.split("\t")))
        cas = (rec.get("CAS") or "").strip()
        if not CAS_RE.match(cas):
            continue
        rows = []
        for k, unit in HEOS_COLUMNS.items():
            v = _pos(rec.get(k)) if k != "omega" else _finite(rec.get(k))   # ω may be ≤ 0 (H2, He)
            if v is not None:
                rows.append({"k": k, "v": v, "unit": unit, "src": COOLPROP, "ref": rec.get("ID", "")})
        if rows:
            out[cas] = rows
    return out
