"""Canada National Pollutant Release Inventory (NPRI) substance list 2025-2027 (ECCC Excel, sheet "2025-2027").

Columns (header row = first cell 'Gazette Number (English)'): Gazette number, Name, CAS RN, Part, Mass threshold,
Concentration threshold, Reporting units, VOC / PAH / PFAS flags, then the French columns. CAS RN is printed by ECCC;
rows whose identifier is an NPRI substance ID (NA - xx) instead of a CAS stay out (no CAS to key on).
"""
from __future__ import annotations

from country_lists.base import Row, cas_valid
from xlsx_rows import read_sheets

CODE = "CA_NPRI"
OWNED = (CODE,)


def parse(data: bytes, source: str) -> tuple[list[Row], dict]:
    sheets = read_sheets(data)
    sheet = next(rows for name, rows in sheets.items() if name.strip().startswith("2025"))
    start = next(i for i, r in enumerate(sheet) if r and r[0].startswith("Gazette Number")) + 1
    rows, items, no_cas = [], 0, []
    for r in sheet[start:]:
        r = (r + [""] * 10)[:10]
        no, name, cas, part, mass, conc, units, voc, pah, pfas = (x.strip() for x in r)
        if not name:
            continue
        items += 1
        if not cas_valid(cas):
            no_cas.append(cas or name)
            continue
        flags = ", ".join(f for f in (voc, pah, "PFAS" if pfas else "") if f)
        detail = (f"Part {part} | threshold {mass}" + (f", {conc} % by weight" if conc.replace(".", "", 1).isdigit() else "")
                  + (f" | {flags}" if flags else "") + f" | Gazette no. {no} | match: CAS RN printed by ECCC")
        rows.append(Row(cas, CODE, detail, source, name))
    return rows, {"items": items, "rows": len(rows), "cas": len({r.cas_no for r in rows}),
                  "items_without_cas": len(no_cas)}
