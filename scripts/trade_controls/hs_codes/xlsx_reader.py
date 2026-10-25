"""Read .xlsx worksheets with the standard library only (zipfile + ElementTree).

Rows are yielded as {column_letter: text}. Empty cells are absent, so callers
must look values up by column letter, never by position.
"""
from __future__ import annotations

import io
import re
import zipfile
import xml.etree.ElementTree as ET
from typing import Iterator

from . import config

_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
_REL_NS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
_COL_RE = re.compile(r"[A-Z]+")


def open_xlsx(data: bytes) -> zipfile.ZipFile:
    zf = zipfile.ZipFile(io.BytesIO(data))
    if sum(i.file_size for i in zf.infolist()) > config.MAX_UNZIPPED_BYTES:
        raise ValueError("xlsx unpacks beyond size cap")
    return zf


def _shared_strings(zf: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in zf.namelist():
        return []
    out = []
    for si in ET.fromstring(zf.read("xl/sharedStrings.xml")).iter(_NS + "si"):
        # Plain <t>, or rich-text runs <r><t>; skip phonetic <rPh> runs.
        parts = [t.text or "" for t in si.findall(_NS + "t")]
        parts += [t.text or "" for r in si.findall(_NS + "r") for t in r.findall(_NS + "t")]
        out.append("".join(parts))
    return out


def sheet_paths(zf: zipfile.ZipFile) -> list[tuple[str, str]]:
    """Return [(sheet_name, zip_path)] in workbook order."""
    wb = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    targets = {r.get("Id"): r.get("Target") for r in rels}
    result = []
    for sh in wb.iter(_NS + "sheet"):
        target = targets[sh.get(_REL_NS + "id")].lstrip("/")
        if not target.startswith("xl/"):
            target = "xl/" + target
        result.append((sh.get("name"), target))
    return result


def iter_rows(zf: zipfile.ZipFile, sheet_path: str) -> Iterator[dict[str, str]]:
    strings = _shared_strings(zf)
    with zf.open(sheet_path) as fh:
        for _, elem in ET.iterparse(fh, events=("end",)):
            if elem.tag != _NS + "row":
                continue
            row: dict[str, str] = {}
            for c in elem.iter(_NS + "c"):
                kind = c.get("t")
                if kind == "inlineStr":
                    val = "".join(t.text or "" for t in c.iter(_NS + "t"))
                else:
                    v = c.find(_NS + "v")
                    if v is None or v.text is None:
                        continue
                    val = strings[int(v.text)] if kind == "s" else v.text
                row[_COL_RE.match(c.get("r")).group()] = val
            elem.clear()
            yield row


def header_map(header_row: dict[str, str]) -> dict[str, str]:
    """{header_text_stripped: column_letter}"""
    return {(v or "").strip(): k for k, v in header_row.items()}
