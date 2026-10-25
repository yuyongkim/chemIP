"""Parse the OPCW 'Annex on Chemicals' Schedule 1/2/3 web pages.

Each page holds two tables (A. Toxic chemicals, B. Precursors). Rows are
[number-or-marker, name, (CAS)]. A numbered row without CAS is a family; the
following 'e.g.' / blank-marker rows with CAS are its named members.
'Exemption(s):' rows are exemptions, not controlled entries.
"""
from __future__ import annotations

import re
from pathlib import Path

from common import html_to_text, normalize_cas

ITEM_RE = re.compile(r"^\((\d+)\)$")


def _tables(page_html: str) -> list[tuple[str, str]]:
    """Return [(part_letter, table_html)] for 'A. Toxic Chemicals' and 'B. Precursors'."""
    body = re.sub(r"<script.*?</script>|<style.*?</style>", "", page_html, flags=re.S)
    out = []
    for m in re.finditer(r"<h2[^>]*>\s*([AB])\.\s*[^<]*</h2>\s*(<table.*?</table>)", body, flags=re.S):
        out.append((m.group(1), m.group(2)))
    return out


def _rows(table_html: str) -> list[list[str]]:
    rows = []
    for r in re.findall(r"<tr[^>]*>(.*?)</tr>", table_html, flags=re.S):
        cells = [html_to_text(c) for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", r, flags=re.S)]
        if cells:
            rows.append(cells + [""] * (3 - len(cells)))
    return rows


def parse_schedule(path: Path, schedule: int) -> dict:
    """Return {'items': [...], 'entries': [...], 'families': [...], 'exemptions': [...]}."""
    page = path.read_text(encoding="utf-8")
    items, entries, families, exemptions = [], [], [], []
    tables = _tables(page)
    if [p for p, _ in tables] != ["A", "B"]:
        raise ValueError(f"schedule {schedule}: expected tables A and B, got {[p for p, _ in tables]}")
    for part, table in tables:
        item_no, item_name, mode = None, None, "listed"
        for marker, name, cas_cell in _rows(table):
            if "CAS" in cas_cell and not name:          # header row
                continue
            cas = normalize_cas(cas_cell)
            m = ITEM_RE.match(marker)
            if m:
                item_no, item_name, mode = int(m.group(1)), name, "listed"
                items.append({"schedule": schedule, "part": part, "item": item_no, "name": name})
                category = f"Schedule {schedule}{part} ({item_no})"
                if cas:
                    entries.append({"cas": cas, "name": name, "category": category, "detail": ""})
                else:
                    families.append({"name": name, "category": category})
                continue
            if marker.lower().startswith("exemption"):
                mode = "exemption"
            elif marker.lower().startswith("e.g"):
                mode = "example"
            if not name or item_no is None:
                continue
            category = f"Schedule {schedule}{part} ({item_no})"
            if mode == "exemption":
                if cas:
                    exemptions.append({"cas": cas, "name": name, "category": category,
                                       "detail": f"Exempted from Schedule {schedule}{part} ({item_no}): {item_name}"})
                continue
            if cas:
                kind = "example of family" if mode == "example" else "listed member of group"
                entries.append({"cas": cas, "name": name, "category": category,
                                "detail": f"{kind}: {item_name}"})
            elif families and families[-1]["category"] == category:
                # descriptive sub-line without CAS (e.g. 'and corresponding ... salts', sub-family text)
                families[-1].setdefault("sub_items", []).append(name)
            elif entries and entries[-1]["category"] == category:
                entries[-1]["detail"] = (entries[-1]["detail"] + " " + name).strip()
    # Footnote marker '(*)' on Schedule 2 BZ: Part VII special thresholds (stated in KR annex too)
    for e in entries:
        if "(*)" in e["name"]:
            e["name"] = e["name"].replace("(*)", "").strip()
            e["detail"] = (e["detail"] + " (*) subject to special thresholds for declaration and verification, Verification Annex Part VII").strip()
    return {"items": items, "entries": entries, "families": families, "exemptions": exemptions}

