"""DOE PAC Rev. 29 (Revision_29.xlsx) → {CAS: PAC record}. Pure parsing, standard library only (xlsx_read).

Record: {name, unit, pac: [p1, p2, p3] (original unit, number or None), flag: ["", "*", "**", "***"] (DOE LEL footnote),
         mg: [p1, p2, p3] (Table 4, mg/m3), basis: "<DOE basis text>", tiers: ["AEGL"|"ERPG"|"TEEL", ...], mw}
DOE footnotes (Table 2/3 introduction): * = 10 % LEL ≤ PAC < 50 % LEL, ** = 50 % ≤ PAC < 100 % LEL, *** = PAC ≥ LEL.
A tier whose basis names an ERPG is the AIHA ERPG reproduced by DOE: shown as "ERPG (via DOE PAC)", values only.
"""
from __future__ import annotations

import os
import re

import el_config as C
from xlsx_read import read_rows

_CAS_RE = re.compile(r"^\d{2,7}-\d{2}-\d$")
_NUM_RE = re.compile(r"^\s*([0-9][0-9,]*\.?[0-9]*(?:[Ee][+-]?\d+)?)\s*(\**)\s*$")


def num(text: str) -> tuple[float | None, str]:
    """'3200*' → (3200.0, '*'); '' / 'NA' → (None, '')."""
    m = _NUM_RE.match(str(text or ""))
    if not m:
        return None, ""
    v = float(m.group(1).replace(",", ""))
    return float(f"{v:.6g}"), m.group(2)


def tier_kinds(basis: str) -> list[str]:
    """Which guideline family each PAC tier comes from, read from DOE's basis text."""
    b = re.sub(r"\s+", " ", basis or "").strip()
    if b.lower().startswith("used ") or "MW-adjusted" in b:
        fam = "AEGL" if "AEGL" in b else "ERPG" if "ERPG" in b else "TEEL"
        return [fam] * 3
    parts = [p.strip() for p in b.split(",")]
    out = []
    for i in range(3):
        p = parts[i] if i < len(parts) else ""
        out.append("AEGL" if p.startswith("AEGL") else "ERPG" if p.startswith("ERPG") else "TEEL")
    return out


def _check_header(rows: list[list[str]], want: str, sheet: str) -> None:
    head = " ".join(" ".join(r) for r in rows[:2])
    if want not in head:
        raise ValueError(f"{sheet}: header changed (no '{want}')")


def parse(path: str | None = None) -> tuple[dict[str, dict], dict]:
    path = path or os.path.join(C.raw_dir("doe_pac_rev29"), C.PAC_FILE)
    orig = read_rows(path, C.PAC_SHEET_ORIGINAL)
    mg = read_rows(path, C.PAC_SHEET_MGM3)
    data = read_rows(path, C.PAC_SHEET_DATA)
    _check_header(orig, "Source of PACs", "Table 2")
    _check_header(mg, "(mg/m3)", "Table 4")
    _check_header(data, "Molecular Weight", "chemical data")

    mg_by: dict[str, list] = {}
    for r in mg[3:]:
        cas = (r[2] if len(r) > 2 else "").strip()
        if _CAS_RE.match(cas):
            mg_by[cas] = [num(x)[0] for x in r[3:6]]
    mw_by: dict[str, float] = {}
    for r in data[3:]:
        cas = (r[2] if len(r) > 2 else "").strip()
        v, _ = num(r[3] if len(r) > 3 else "")
        if _CAS_RE.match(cas) and v:
            mw_by[cas] = v

    out: dict[str, dict] = {}
    skipped = 0
    for r in orig[3:]:
        cas = (r[2] if len(r) > 2 else "").strip()
        if not _CAS_RE.match(cas):
            skipped += 1
            continue
        vals = [num(x) for x in r[3:6]]
        if all(v is None for v, _ in vals):
            skipped += 1
            continue
        basis = re.sub(r"\s+", " ", r[6]).strip()
        rec = {"name": re.sub(r"\s+", " ", r[1]).strip(), "unit": r[7].strip() or "mg/m3",
               "pac": [v for v, _ in vals], "flag": [f for _, f in vals], "mg": mg_by.get(cas),
               "basis": basis, "tiers": tier_kinds(basis), "mw": mw_by.get(cas)}
        if cas in out:  # same CAS twice: keep the first (DOE lists one row per CAS; reported if it ever happens)
            skipped += 1
            continue
        out[cas] = rec
    stats = {"cas": len(out), "skipped": skipped,
             "aegl_based": sum("AEGL" in r["tiers"] for r in out.values()),
             "erpg_based": sum("ERPG" in r["tiers"] for r in out.values())}
    return out, stats
