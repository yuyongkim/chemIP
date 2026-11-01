"""EPA RMP Offsite Consequence Analysis Guidance → scripts/portal_build/rmp_oca/rmp_oca_tables.json (the calculator's tables).

    python -I -B G:\\MSDS\\scripts\\portal_build\\rmp_oca_extract.py [--fetch]

--fetch downloads the two PDFs again into data/portal_raw/rmp_oca/ (otherwise the files already there are read).
Writes manifest.json (URL, date, sha256) and pdftotext extractions (*_layout.txt, *_raw.txt) next to the PDFs.
Source: U.S. EPA, Risk Management Program Guidance for Offsite Consequence Analysis, EPA 550-B-99-009
(March 2009 chapters; April 1999 appendices). A U.S. Government work (17 U.S.C. §105), not copyrighted.
The front-end copy (frontend/public/chemip/calc_rmp_data.jsx) is written by gen_frontend_rmp.py from the JSON.
"""
from __future__ import annotations

import argparse
import datetime
import hashlib
import json
import os
import shutil
import subprocess
import sys
import urllib.request

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import rmp_oca_exhibits as ex  # noqa: E402
import rmp_oca_tables as rt  # noqa: E402
from rmp_oca_pdf import find_pages  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(r"G:\MSDS", "data", "portal_raw", "rmp_oca")
OUT = os.path.join(HERE, "rmp_oca", "rmp_oca_tables.json")
SOURCES = {
    "chapters": {"file": "oca-chps.pdf", "url": "https://www.epa.gov/sites/default/files/2013-11/documents/oca-chps.pdf"},
    "appendices": {"file": "oca-apds.pdf", "url": "https://www.epa.gov/sites/default/files/2017-05/documents/oca-apds.pdf"},
}
CITATION = ("U.S. EPA (2009). Risk Management Program Guidance for Offsite Consequence Analysis. EPA 550-B-99-009. "
            "https://www.epa.gov/rmp/rmp-guidance-offsite-consequence-analysis")

# table number → what it is (Exhibits 2, 3, 6 of the guidance and each table's title)
WORST = {"stability": "F", "wind_ms": 1.5}
ALT = {"stability": "D", "wind_ms": 3.0}
TABLES = {
    1: ("ratio", "toxic", "buoyant", "rural", 10, WORST), 2: ("ratio", "toxic", "buoyant", "rural", 60, WORST),
    3: ("ratio", "toxic", "buoyant", "urban", 10, WORST), 4: ("ratio", "toxic", "buoyant", "urban", 60, WORST),
    5: ("grid", "toxic", "dense", "rural", 10, WORST), 6: ("grid", "toxic", "dense", "rural", 60, WORST),
    7: ("grid", "toxic", "dense", "urban", 10, WORST), 8: ("grid", "toxic", "dense", "urban", 60, WORST),
    9: ("chem", "ammonia_pressure", "dense", None, 10, WORST), 10: ("chem", "ammonia", "buoyant", None, 10, WORST),
    11: ("chem", "chlorine", "dense", None, 10, WORST), 12: ("chem", "sulfur_dioxide", "dense", None, 10, WORST),
    14: ("ratio", "toxic", "buoyant", "rural", 10, ALT), 15: ("ratio", "toxic", "buoyant", "rural", 60, ALT),
    16: ("ratio", "toxic", "buoyant", "urban", 10, ALT), 17: ("ratio", "toxic", "buoyant", "urban", 60, ALT),
    18: ("grid", "toxic", "dense", "rural", 10, ALT), 19: ("grid", "toxic", "dense", "rural", 60, ALT),
    20: ("grid", "toxic", "dense", "urban", 10, ALT), 21: ("grid", "toxic", "dense", "urban", 60, ALT),
    22: ("chem", "ammonia_pressure", "dense", None, 10, ALT), 23: ("chem", "ammonia", "buoyant", None, 10, ALT),
    24: ("chem", "chlorine", "dense", None, 10, ALT), 25: ("chem", "sulfur_dioxide", "dense", None, 10, ALT),
    26: ("ratio", "lfl", "buoyant", "rural", None, ALT), 27: ("ratio", "lfl", "buoyant", "urban", None, ALT),
    28: ("grid", "lfl", "dense", "rural", None, ALT), 29: ("grid", "lfl", "dense", "urban", None, ALT),
    30: ("bleve", "radiant", None, None, None, {}),
}
CHEM_CAS = {"ammonia_pressure": "7664-41-7", "ammonia": "7664-41-7", "chlorine": "7782-50-5", "sulfur_dioxide": "7446-09-5"}


def fetch() -> None:
    os.makedirs(RAW, exist_ok=True)
    for src in SOURCES.values():
        req = urllib.request.Request(src["url"], headers={"User-Agent": "Mozilla/5.0 (ChemIP data build)"})
        with urllib.request.urlopen(req, timeout=120) as r, open(os.path.join(RAW, src["file"]), "wb") as fh:
            shutil.copyfileobj(r, fh)


def manifest() -> dict:
    out = {}
    for key, src in SOURCES.items():
        path = os.path.join(RAW, src["file"])
        data = open(path, "rb").read()
        out[key] = {**src, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data),
                    "retrieved": datetime.date.fromtimestamp(os.path.getmtime(path)).isoformat()}
        stem = os.path.splitext(path)[0]
        for flag, suffix in ((["-layout"], "_layout.txt"), ([], "_raw.txt")):
            if shutil.which("pdftotext") and not os.path.exists(stem + suffix):
                subprocess.run(["pdftotext", *flag, path, stem + suffix], check=True)
    with open(os.path.join(RAW, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=1)
    return out


def table_pages(pdf: str, n: int) -> list[int]:
    """Pages that print the title line 'Reference Table N' (the table of contents prints it with dots and a page number)."""
    import fitz
    title = f"Reference Table {n}"
    with fitz.open(pdf) as d:
        return [i for i, p in enumerate(d) if any(line.strip() in (title, f"{title} (continued)") for line in p.get_text().splitlines())]


def build_tables(chps: str) -> dict:
    out = {}
    bleve_pages = []
    for n, (kind, endpoint, density, topo, minutes, met) in TABLES.items():
        pages = table_pages(chps, n)
        if kind == "bleve":
            bleve_pages = pages
            body = rt.bleve_table(chps, pages)
        else:
            words = rt.table_words(chps, pages[0], n)
            if kind == "ratio":
                body = rt.ratio_table(words)
            elif kind == "chem":
                body = rt.chem_table(words)
            elif n == 29:
                body = rt.upright_grid(words)
            else:
                body = rt.sideways_grid(words, (130, 150) if n == 28 else (78, 100))
        out[str(n)] = {"table": n, "kind": kind, "endpoint": endpoint, "density": density, "topography": topo,
                       "minutes": minutes, **({"cas": CHEM_CAS[endpoint]} if kind == "chem" else {}), **met,
                       "pdf_page": (bleve_pages if kind == "bleve" else pages[:1]), **body}
    return out


def build() -> dict:
    chps, apds = (os.path.join(RAW, s["file"]) for s in SOURCES.values())
    toxic_gas = [r for p in find_pages(apds, "Exhibit B-1", 5) for r in ex.sideways_exhibit(apds, p)]
    toxic_liquid = [r for p in find_pages(apds, "Exhibit B-2", 5) for r in ex.sideways_exhibit(apds, p)]
    flam_gas = [r for p in find_pages(apds, "Exhibit C-2", 5) for r in ex.sideways_exhibit(apds, p)]
    flam_liquid = [r for p in find_pages(apds, "Exhibit C-3", 5) for r in ex.sideways_exhibit(apds, p)]
    heat = ex.heat_rows(apds, find_pages(apds, "Exhibit C-1", 5))
    for r in flam_gas + flam_liquid:
        h = heat.get(r["cas"])
        r["hc_kJkg"] = h["hc_kJkg"] if h else None
        r["hc_estimated"] = bool(h and h["estimated"])
    return {
        "v": 1,
        "source": {"citation": CITATION, "license": "U.S. Government work, public domain (17 U.S.C. §105)",
                   "files": manifest(), "built": datetime.date.today().isoformat()},
        "exhibits": {
            "B-1": {"title": "Data for Toxic Gases", "rows": toxic_gas},
            "B-2": {"title": "Data for Toxic Liquids", "rows": toxic_liquid},
            "B-4": {"title": "Temperature Correction Factors for Liquids Evaporating from Pools at Temperatures Between 25 °C and 50 °C",
                    "temps_C": [30, 35, 40, 45, 50], "rows": ex.tcf_rows(apds, find_pages(apds, "Exhibit B-4", 5))},
            "C-2": {"title": "Data for Flammable Gases", "rows": flam_gas},
            "C-3": {"title": "Data for Flammable Liquids", "rows": flam_liquid},
        },
        "tables": build_tables(chps),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fetch", action="store_true")
    args = ap.parse_args()
    if args.fetch:
        fetch()
    body = build()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(body, fh, ensure_ascii=False, indent=1)
    ex_n = {k: len(v["rows"]) for k, v in body["exhibits"].items()}
    print(f"wrote {OUT}: exhibits {ex_n}, tables {sorted(int(k) for k in body['tables'])}")


if __name__ == "__main__":
    main()
