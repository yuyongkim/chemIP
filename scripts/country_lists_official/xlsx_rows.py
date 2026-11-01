"""Read .xlsx sheets with the standard library only (zipfile + ElementTree): {sheet name: [[cell text, ...], ...]}.

Cells are placed by their column letter, so empty cells stay as "". Numbers come back as their stored text
("1", "0.1"). Second copy of this idea (first: scripts/trade_controls/hs_codes/xlsx_reader.py, which is bound to that
package's config) — merge the two if a third reader is ever needed.
"""
from __future__ import annotations

import io
import re
import zipfile
import xml.etree.ElementTree as ET

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
MAX_UNZIPPED = 400 * 1024 * 1024
_COL = re.compile(r"[A-Z]+")


def _col_index(ref: str) -> int:
    n = 0
    for ch in _COL.match(ref).group(0):
        n = n * 26 + ord(ch) - 64
    return n - 1


def _text(node) -> str:
    """Text of a shared/inline string: its <t> and rich-text runs <r><t>; phonetic guides (<rPh>, furigana) skipped."""
    parts = []
    for child in node:
        if child.tag == NS + "t":
            parts.append(child.text or "")
        elif child.tag == NS + "r":
            parts.extend(t.text or "" for t in child.iter(NS + "t"))
    return "".join(parts)


def read_sheets(data: bytes) -> dict[str, list[list[str]]]:
    zf = zipfile.ZipFile(io.BytesIO(data))
    if sum(i.file_size for i in zf.infolist()) > MAX_UNZIPPED:
        raise ValueError("xlsx unpacks beyond the size cap")
    shared = []
    if "xl/sharedStrings.xml" in zf.namelist():
        shared = [_text(si) for si in ET.fromstring(zf.read("xl/sharedStrings.xml")).iter(NS + "si")]
    rels = {r.get("Id"): r.get("Target") for r in ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))}
    out: dict[str, list[list[str]]] = {}
    for sheet in ET.fromstring(zf.read("xl/workbook.xml")).iter(NS + "sheet"):
        target = rels[sheet.get(REL + "id")].lstrip("/")
        target = target if target.startswith("xl/") else "xl/" + target
        rows: list[list[str]] = []
        for row in ET.fromstring(zf.read(target)).iter(NS + "row"):
            cells: dict[int, str] = {}
            for c in row.iter(NS + "c"):
                kind, v = c.get("t"), c.find(NS + "v")
                if kind == "s" and v is not None:
                    val = shared[int(v.text)]
                elif kind == "inlineStr":
                    val = _text(c.find(NS + "is")) if c.find(NS + "is") is not None else ""
                else:
                    val = v.text if v is not None and v.text is not None else ""
                    if re.fullmatch(r"-?\d+\.0", val):
                        val = val[:-2]
                cells[_col_index(c.get("r"))] = val
            rows.append([cells.get(i, "") for i in range(max(cells) + 1)] if cells else [])
        out[sheet.get("name")] = rows
    return out
