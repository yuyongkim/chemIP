"""PDF word helpers for the EPA RMP Offsite Consequence Analysis Guidance (rmp_oca_extract.py).

PyMuPDF gives every word with its box. The guidance has two page shapes:
- upright tables: one record per printed line (rows = same y);
- landscape exhibits printed sideways: one record per printed column (cols = same x), fields at fixed y.
Pure helpers only: word lists in, rows/columns/numbers out.
"""
from __future__ import annotations

import re

import fitz  # PyMuPDF

CAS_RE = re.compile(r"^\d{2,7}-\d{2}-\d$")
NUM_RE = re.compile(r"^[<>]?\d[\d,]*(\.\d+)?$")


def page_words(pdf_path: str, page: int) -> list[tuple]:
    """[(x0, y0, x1, y1, text), ...] for one 0-based page."""
    with fitz.open(pdf_path) as doc:
        return [(w[0], w[1], w[2], w[3], w[4]) for w in doc[page].get_text("words")]


def find_pages(pdf_path: str, marker: str, within: int = 150) -> list[int]:
    """0-based pages whose text starts (within `within` characters) with `marker`."""
    out = []
    with fitz.open(pdf_path) as doc:
        for i, p in enumerate(doc):
            j = p.get_text().find(marker)
            if 0 <= j < within:
                out.append(i)
    return out


def group(words: list[tuple], axis: str, tol: float = 2.5) -> list[tuple[float, list[tuple]]]:
    """Cluster words by centre y (axis 'y': printed lines) or centre x (axis 'x'), sorted along that axis."""
    key = (lambda w: (w[1] + w[3]) / 2) if axis == "y" else (lambda w: w[0])
    groups: list[list] = []
    for w in sorted(words, key=key):
        c = key(w)
        if groups and abs(groups[-1][0] - c) <= tol:
            groups[-1][1].append(w)
        else:
            groups.append([c, [w]])
    other = (lambda w: w[0]) if axis == "y" else (lambda w: -(w[1] + w[3]) / 2)
    return [(c, sorted(ws, key=other)) for c, ws in groups]


def num(text: str):
    """'1,000' → 1000.0, '0.0019' → 0.0019, '41c' / '45,200*' → number (footnote marks dropped); else None."""
    t = re.sub(r"[a-z*]+$", "", text.strip())
    if not NUM_RE.match(t) or t[0] in "<>":
        return None
    return float(t.replace(",", ""))


def distance(text: str):
    """Reference-table distance cell → miles. '>25' / '*' / '**' → 25 (report as 25 mi); '#' / '<0.1' / '<0.1*' → 0.1."""
    t = text.strip()
    if t in ("*", "**", ">25", ">25*"):
        return 25.0
    if t in ("#", "<0.1", "<0.1*"):
        return 0.1
    return num(t)
