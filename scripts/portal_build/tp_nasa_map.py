"""Make candidate NASA CEA species → CAS pairs for tp_nasa_cas.json (run once, then review the list by hand).

    E:/dev-cache/tp-venv/Scripts/python -B G:\\MSDS\\scripts\\portal_build\\tp_nasa_map.py > candidates.json

thermo.inp has no CAS numbers. For each gas or "(L)" species this tries the species name, the part after a comma
("C4H10,isobutane" → "isobutane") and the first word of the comment, looks each up with chemicals.search_chemical
(identifier lookup only; no property data of chemicals is used), and keeps a pair only when the Hill formula of the hit
equals the NASA formula and the CAS has a ChemIP substance record or is in the ChemSep databank.
Radicals and ions are left out by the formula/CAS checks and by the review. The reviewed result is tp_nasa_cas.json.
"""
from __future__ import annotations

import json
import os
import re
import sqlite3
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import tp_chemsep  # noqa: E402
import tp_nasa  # noqa: E402
import tp_raw  # noqa: E402

PORTAL_DB = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "portal_facts.db")


def chemip_cas() -> set[str]:
    conn = sqlite3.connect(f"file:{PORTAL_DB.replace(os.sep, '/')}?mode=ro", uri=True)
    try:
        return {r[0] for r in conn.execute("SELECT DISTINCT cas FROM identifiers")}
    finally:
        conn.close()


def chemsep_cas() -> set[str]:
    out = set()
    for f in ("chemsep1.xml", "chemsep2.xml"):
        with open(tp_raw.raw_path("chemsep_lite", f), "rb") as fh:
            out |= {c["cas"] for c in tp_chemsep.parse(fh.read())}
    return out


def hill_of(formula: str) -> str:
    parts = re.findall(r"([A-Z][a-z]?)(\d*)", formula or "")
    d: dict[str, float] = {}
    for el, n in parts:
        d[el] = d.get(el, 0) + (int(n) if n else 1)
    return tp_nasa.hill(d)


def main() -> int:
    from chemicals.identifiers import search_chemical  # noqa: PLC0415 (only for this helper)
    known = chemip_cas() | chemsep_cas()
    with open(tp_raw.raw_path("nasa_cea", "thermo.inp"), encoding="latin-1") as fh:
        species = tp_nasa.parse(fh.read())
    out = []
    for sp in species:
        if not sp["intervals"] or not (sp["phase"] == 0 or sp["name"].endswith("(L)")):
            continue
        h = tp_nasa.hill(sp["formula"])
        if not h:
            continue
        base = sp["name"][:-3] if sp["name"].endswith("(L)") else sp["name"]
        fixed = base.replace("CL", "Cl").replace("AL", "Al")   # thermo.inp writes Cl, Al in capitals
        tries = [base, fixed] + ([base.split(",", 1)[1]] if "," in base else []) + [w.strip(".,") for w in sp["comment"].split()[:1]]
        for q in tries:
            try:
                hit = search_chemical(q)
            except Exception:  # noqa: BLE001
                continue
            if hill_of(hit.formula) == h and hit.CASs in known:
                out.append({"species": sp["name"], "cas": hit.CASs, "name": hit.common_name, "how": q})
                break
    json.dump(out, sys.stdout, ensure_ascii=False, indent=1)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
