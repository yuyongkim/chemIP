"""EU Drinking Water Directive (EU) 2020/2184 Annex I Part B — chemical parameters and parametric values (EUR-Lex).

The annex names parameters, not CAS numbers. sources/eu_dwd.json maps each parameter (or each member of a sum
parameter) to a CAS together with a name pattern ("check"); a CAS is used only when one of ChemIP's official
name–CAS lists (US TSCA Inventory, AU AIIC, CA DSL in intl_lists/, and the intl_regulatory names: EPA lists, CLP
Annex VI, Bal, Stockholm …) carries a name matching that pattern for that CAS. Otherwise the row stays a family entry
(no CAS) and a note says why. Values, units and notes are the annex text as printed (decimal comma kept).
"""
from __future__ import annotations

import html
import json
import re
import sqlite3
from pathlib import Path

from intl_common import clean, entry, fetch, file_info

CELLAR = "http://publications.europa.eu/resource/celex/{celex}"
NAME_LISTS = ("US_TSCA_INVENTORY.json", "AU_AIIC_INVENTORY.json", "CA_DSL.json")
NOTE_CHARS = 220


def _cells(tr: str) -> list[str]:
    cells = re.findall(r"<td[^>]*>(.*?)</td>", tr, flags=re.S)
    return [clean(html.unescape(re.sub(r"<[^>]+>", " ", c))) for c in cells]


def part_b_rows(page: str) -> list[dict]:
    """Rows of the Part B table: {parameter, value, unit, note}. A row with an empty first cell continues the note above."""
    start = page.find("Chemical parameters")
    end = page.find("Indicator parameters", start)
    if start < 0 or end < 0:
        raise ValueError("Annex I Part B table not found")
    rows: list[dict] = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", page[start:end], flags=re.S):
        cells = _cells(tr)
        if len(cells) < 4 or cells[0] == "Parameter":
            continue
        name, value, unit, note = cells[0], cells[1], cells[2], " ".join(cells[3:])
        if not name and rows:
            rows[-1]["note"] = clean(f"{rows[-1]['note']} {value} {unit} {note}")
            continue
        if name and value and unit and not name.startswith("—"):
            rows.append({"parameter": name, "value": value, "unit": unit, "note": note})
    return rows


def reference_names(project: Path) -> dict[str, list[str]]:
    """CAS → names from ChemIP's official name–CAS lists (used only to confirm a mapping)."""
    ref: dict[str, list[str]] = {}
    base = project / "backend" / "data" / "trade_controls" / "intl_lists"
    for fname in NAME_LISTS:
        data = json.loads((base / fname).read_text(encoding="utf-8"))
        for e in data.get("entries") or []:
            ref.setdefault(e.get("cas") or "", []).append(e.get("name") or "")
    db = (project / "data" / "terminology.db").as_posix()
    with sqlite3.connect(f"file:{db}?mode=ro", uri=True) as conn:
        for cas, name in conn.execute("SELECT cas_no, chemical_name FROM intl_regulatory"):
            ref.setdefault(cas or "", []).append(name or "")
    return ref


def confirmed(cas: str, pattern: str, ref: dict[str, list[str]]) -> bool:
    rx = re.compile(pattern, re.I)
    return any(rx.search(n) for n in ref.get(cas) or [])


def _detail(row: dict, member_of: str = "") -> str:
    note = row["note"] if len(row["note"]) <= NOTE_CHARS else row["note"][: NOTE_CHARS - 1] + "…"
    head = f"Annex I Part B parametric value {row['value']} {row['unit']}"
    if member_of:
        head = f"{head} for '{member_of}' (sum parameter)"
    return "; ".join(p for p in (head, note) if p)


def build_rows(rows: list[dict], mapping: dict, ref: dict[str, list[str]]) -> tuple[list[dict], list[str], list[str]]:
    """Annex rows + mapping → entry rows (CAS confirmed) / family rows, notes, problems (annex rows without mapping)."""
    out, notes, problems = [], [], []
    for row in rows:
        spec = mapping.get(row["parameter"])
        if spec is None:
            problems.append(f"no mapping for parameter '{row['parameter']}'")
            continue
        members = spec.get("members") or []
        sum_name = row["parameter"] if spec.get("sum") else ""
        if not members:
            out.append(entry("", row["parameter"], _detail(row)))
            continue
        for m in members:
            name = m.get("name") or row["parameter"]
            if m.get("cas") and confirmed(m["cas"], m["check"], ref):
                out.append(entry(m["cas"], name, _detail(row, sum_name), match_method="name match: TSCA/AIIC/DSL/intl_regulatory"))
            else:
                out.append(entry("", name, _detail(row, sum_name)))
                notes.append(f"CAS 미확정(공식 명칭 목록에서 확인 안 됨): {name}{' ' + m['cas'] if m.get('cas') else ''}")
    return out, notes, problems


def collect(spec: dict, raw_dir: Path, offline: bool) -> dict:
    project = Path(__file__).resolve().parents[3]
    celex = spec["celex"]
    url = CELLAR.format(celex=celex)
    path = fetch(url, raw_dir / "eurlex" / f"{celex}.html", offline,
                 headers={"Accept": "application/xhtml+xml", "Accept-Language": "eng"})
    rows = part_b_rows(path.read_text(encoding="utf-8"))
    out, notes, problems = build_rows(rows, spec["mapping"], reference_names(project))
    cas_rows = [r for r in out if r["cas"]]
    families = [r for r in out if not r["cas"]]
    return {"part_b": {
        "entries": cas_rows, "family_entries": families, "problems": problems,
        "official_count": len(spec["mapping"]), "official_count_basis": "Annex I Part B rows mapped in sources/eu_dwd.json",
        "counted": len(rows), "source_version": f"CELEX {celex} (OJ L 435, 23.12.2020)",
        "notes": [f"Part B 표 {len(rows)}행, CAS 확인 {len(cas_rows)}건, CAS 없는 항목 {len(families)}건", *notes],
        "files": [file_info(path, url)],
    }}
