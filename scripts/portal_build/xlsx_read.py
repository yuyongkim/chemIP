"""Read the first worksheet of an .xlsx file with the standard library only (zipfile + XML): rows of cell strings.

Used for the ECHA Annex VI table; openpyxl is not installed in the project environments.
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
import zipfile

_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
_COL_RE = re.compile(r"[A-Z]+")


def _col(ref: str) -> int:
    n = 0
    for ch in _COL_RE.match(ref).group(0):
        n = n * 26 + ord(ch) - 64
    return n - 1


def _text(node) -> str:
    return "".join(t.text or "" for t in node.iter(f"{_NS}t"))


def read_rows(path: str, sheet: str = "xl/worksheets/sheet1.xml") -> list[list[str]]:
    """Every row of the sheet as a list of strings ("" for empty cells), widths padded to the widest row."""
    with zipfile.ZipFile(path) as z:
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            shared = [_text(si) for si in ET.fromstring(z.read("xl/sharedStrings.xml")).iter(f"{_NS}si")]
        root = ET.fromstring(z.read(sheet))
    rows: list[list[str]] = []
    for r in root.iter(f"{_NS}row"):
        cells: dict[int, str] = {}
        for c in r.iter(f"{_NS}c"):
            v = c.find(f"{_NS}v")
            kind = c.attrib.get("t")
            if v is not None:
                val = shared[int(v.text)] if kind == "s" else (v.text or "")
            else:
                inline = c.find(f"{_NS}is")
                val = _text(inline) if inline is not None else ""
            cells[_col(c.attrib["r"])] = val
        width = max(cells) + 1 if cells else 0
        rows.append([cells.get(i, "") for i in range(width)])
    widest = max((len(r) for r in rows), default=0)
    return [r + [""] * (widest - len(r)) for r in rows]
