"""METI 化審法 substance-list PDFs (第一種特定 / 第二種特定 / 監視化学物質一覧): numbered rows, names, as-of date.

The PDFs print no CAS numbers; they are the official count and the item names/numbers.
Table rows: first cell = number (政令の号番号 or 通し番号), second = name; continuation rows have an empty first cell.
"""
from __future__ import annotations

import re
from pathlib import Path

from intl_common import clean

ZEN = str.maketrans("０１２３４５６７８９／", "0123456789/")


DATE_RE = re.compile(r"^(昭和|平成|令和|\d{4}年)")


def _name_cell(cells: list[str]) -> str:
    """First non-empty cell after the number that is not a date (one PDF has an empty spacer column)."""
    for cell in cells[1:3]:
        if cell and not DATE_RE.match(cell):
            return cell
    return ""


def read_rows(path: Path) -> tuple[list[dict], str]:
    """Return ([{no, name, cells}], as_of_text)."""
    import pdfplumber  # S: venv only

    rows: list[dict] = []
    text = ""
    with pdfplumber.open(str(path)) as pdf:
        for page in pdf.pages:
            text += (page.extract_text() or "") + "\n"
            for table in page.extract_tables():
                for raw in table:
                    cells = [clean((c or "").replace("\n", "")) for c in raw]
                    if not cells or not any(cells):
                        continue
                    name = _name_cell(cells)
                    if cells[0].isdigit():
                        rows.append({"no": int(cells[0]), "name": name, "cells": cells})
                    elif rows and not cells[0] and name:
                        rows[-1]["name"] += name
    m = re.search(r"(\d{4}\s*[/年]\s*\d{1,2}\s*[/月]\s*\d{1,2}\s*日?\s*(?:時点|現在)?)", text.translate(ZEN))
    return rows, clean(m.group(1)) if m else ""
