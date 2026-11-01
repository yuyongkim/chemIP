"""CLP Annex VI Table 3 (harmonised classification) -> entries by CAS, for the mixture GHS helper (service 8) and the
compatibility matrix (service 7).

    python -B G:\\MSDS\\scripts\\portal_build\\annex6.py [--xlsx path] [--report path.json]

Input: the ECHA table "Annex VI to CLP" (xlsx, one row per index number), kept at ANNEX6_XLSX. ECHA states the table
is unofficial and for information; the legal text is Regulation (EC) No 1272/2008 Annex VI as amended by the ATPs
(EUR-Lex, reuse authorised by Commission Decision 2011/833/EU). The static file records both, with the ATP.
Rows without a CAS number (group entries such as "lead compounds") cannot be keyed and are counted, not exported.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ghs_parse  # noqa: E402
from cas_utils import is_cas  # noqa: E402
from xlsx_read import read_rows  # noqa: E402

PROJECT = r"G:\MSDS"
ANNEX6_XLSX = os.path.join(PROJECT, "data", "echa_annex_vi_clp_atp23.xlsx")
SOURCE_ID = "clp_annex6"
SOURCE = {
    "name": "CLP Annex VI Table 3 — harmonised classification and labelling (ECHA table, ATP23)",
    "url": "https://echa.europa.eu/information-on-chemicals/annex-vi-to-clp",
    "legal": "https://eur-lex.europa.eu/eli/reg/2008/1272/oj",
    "license": "EU legislation: reuse authorised (Commission Decision 2011/833/EU). Table compiled by the European Chemicals Agency (ECHA), "
               "which states it is unofficial and for information; the Official Journal text prevails. Source: ECHA.",
}

# header text -> field (both the ATP23 layout and the older two-row ATP21 layout)
HEADERS = {
    "Index No": "index",
    "Chemical Name": "name",
    "International Chemical Identification": "name",
    "EC No": "ec",
    "CAS No": "cas",
    "Hazard Class and Category Code(s)": "classes",
    "Classification Hazard Statement Code(s)": "class_h",
    "Hazard Statement Code(s)": "class_h",
    "Labelling Suppl. Hazard Statement Code(s)": "euh",
    "Suppl. Hazard statement Code(s)": "euh",
    "M, SCL, ATE": "scl",
    "Specific Conc. Limits, M-factors": "scl",
    "Notes": "notes",
    "ATP": "atp",
    "ATP inserted/ATP Updated": "atp",
}
_INDEX_RE = re.compile(r"^\d{3}-\d{3}-\d{2}-[\dX]$")
_CAS_SPLIT_RE = re.compile(r"[\s;,]+")
_EUH_RE = re.compile(r"EUH\d{3}")


def column_map(rows: list[list[str]]) -> tuple[dict[str, int], int]:
    """({field: column}, first data row). The header row is the one that has "CAS No"."""
    for i, row in enumerate(rows[:30]):
        if any(c.strip() == "CAS No" for c in row):
            labels = [c.strip() for c in row]
            nxt = rows[i + 1] if i + 1 < len(rows) else []
            two_rows = nxt and not _INDEX_RE.match((nxt[0] or "").strip())
            if two_rows:  # older layout: sub-headers under "Classification" / "Labelling"
                labels = [(nxt[j].strip() or labels[j]) if j < len(nxt) else labels[j] for j in range(len(labels))]
            cols: dict[str, int] = {}
            for j, label in enumerate(labels):
                field = HEADERS.get(label)
                if field and field not in cols:
                    cols[field] = j
            return cols, i + (2 if two_rows else 1)
    raise ValueError("no header row with 'CAS No'")


def parse_row(row: list[str], cols: dict[str, int]) -> tuple[list[str], dict]:
    """(valid CAS numbers, entry) for one table row."""
    get = lambda f: (row[cols[f]] if f in cols and cols[f] < len(row) else "") or ""  # noqa: E731
    cas = [c for c in _CAS_SPLIT_RE.split(get("cas").strip()) if is_cas(c)]
    hazards = ghs_parse.clp_classification(get("classes"), get("class_h"))
    col = ghs_parse.scl_column(get("scl"))
    entry = {
        "index": get("index").strip(),
        "name": " ".join(get("name").split())[:200],
        "ec": get("ec").strip(),
        "hazards": hazards,
        "scl": col["scl"],
        "ate": col["ate"],
        "m": ghs_parse.m_factors(hazards, col["m"]),
        "euh": sorted(set(_EUH_RE.findall(get("euh")))),
        "notes": " ".join(get("notes").split()),
        "atp": get("atp").strip(),
    }
    return cas, entry


def read_annex6(path: str = ANNEX6_XLSX) -> dict:
    """{"entries": {CAS: [entry, ...]}, "rows", "rows_no_cas", "atp_max"}. A CAS can have several entries
    (e.g. nitric acid ...% [C > 70 %] and [C ≤ 70 %])."""
    rows = read_rows(path)
    cols, start = column_map(rows)
    entries: dict[str, list[dict]] = {}
    n_rows = n_no_cas = 0
    atps = set()
    for row in rows[start:]:
        if not any(c.strip() for c in row):
            continue
        n_rows += 1
        cas, entry = parse_row(row, cols)
        atps.update(re.findall(r"ATP(\d+)", entry["atp"]))
        if not cas:
            n_no_cas += 1
            continue
        for c in cas:
            entries.setdefault(c, []).append(entry)
    return {"entries": entries, "rows": n_rows, "rows_no_cas": n_no_cas,
            "atp_max": f"ATP{max(int(a) for a in atps)}" if atps else ""}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--xlsx", default=ANNEX6_XLSX)
    ap.add_argument("--report")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    res = read_annex6(args.xlsx)
    summary = {"rows": res["rows"], "rows_no_cas": res["rows_no_cas"], "cas": len(res["entries"]), "atp_max": res["atp_max"],
               "with_scl": sum(1 for es in res["entries"].values() if any(e["scl"] for e in es)),
               "with_m": sum(1 for es in res["entries"].values() if any(e["m"] for e in es)),
               "with_ate": sum(1 for es in res["entries"].values() if any(e["ate"] for e in es))}
    print(json.dumps(summary, ensure_ascii=False))
    if args.report:
        with open(args.report, "w", encoding="utf-8") as fh:
            json.dump(summary, fh, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
