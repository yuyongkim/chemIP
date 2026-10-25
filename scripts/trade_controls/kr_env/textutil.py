"""Parsers for the plain-text renderings of 별표 on law.go.kr.

Two shapes occur:
  * numbered lists      "  1. 카드뮴 및 그 화합물"
  * box-drawn tables    "┃ 1. 카드뮴 │4 │10 │60 ┃"
"""
from __future__ import annotations

import re

_BORDER_CHARS = set("─━┌┐└┘├┤┬┴┼┏┓┗┛┠┨┯┷┿╂┃│ \t")
_SPLIT = re.compile(r"[│┃]")
_ITEM = re.compile(r"^\s*(\d+)(?:의(\d+))?\.\s*(.*)$")
_DELETED = re.compile(r"^삭제\s*<[^>]*>\s*$")


def lines(text: str) -> list[str]:
    """Non-empty lines with trailing spaces removed."""
    return [ln.rstrip() for ln in text.splitlines() if ln.strip()]


def numbered_items(text: str, start_after: str | None = None) -> list[dict]:
    """Top-level numbered items: [{no, text, deleted}] (continuation lines joined).

    Only lines indented like the first item count as new items, so nested
    "1)" / "가." lines become continuation text.
    """
    out: list[dict] = []
    seen_start = start_after is None
    indent = None
    for ln in lines(text):
        if not seen_start:
            seen_start = start_after in ln
            continue
        if ln.lstrip().startswith("■"):
            continue
        m = _ITEM.match(ln)
        lead = len(ln) - len(ln.lstrip())
        if m and (indent is None or lead <= indent + 1):
            indent = lead if indent is None else indent
            no = m.group(1) + (f"의{m.group(2)}" if m.group(2) else "")
            body = m.group(3).strip()
            out.append({"no": no, "text": body, "deleted": bool(_DELETED.match(body))})
        elif out:
            out[-1]["text"] = join_wrapped(out[-1]["text"], ln.strip())
    return out


def join_wrapped(a: str, b: str) -> str:
    """Join a hard-wrapped line. Korean text wraps mid-word, so no space between
    Hangul/digit boundaries; otherwise a single space."""
    if not a:
        return b
    if not b:
        return a
    if _is_hangul(a[-1]) and _is_hangul(b[0]):
        return a + b
    return a + " " + b


def _is_hangul(ch: str) -> bool:
    return "가" <= ch <= "힣"


def is_border(ln: str) -> bool:
    return all(ch in _BORDER_CHARS for ch in ln) and any(ch in "─━" for ch in ln)


def table_rows(text: str) -> list[list[str]]:
    """Raw cell lists for every content line of a box-drawn table (borders dropped).

    Cells keep their raw padding so callers can tell whether a cell was full
    (mid-word wrap) or padded (word boundary).
    """
    rows = []
    for ln in lines(text):
        if is_border(ln) or not _SPLIT.search(ln):
            continue
        parts = _SPLIT.split(ln)
        if parts and not parts[0].strip():
            parts = parts[1:]
        if parts and not parts[-1].strip():
            parts = parts[:-1]
        rows.append(parts)
    return rows


def table_records(text: str) -> list[list[str]]:
    """Group box-table lines into records separated by horizontal borders.

    Each record is a list of joined cell strings (column-wise concatenation of
    the wrapped lines between two border lines).
    """
    records: list[list[list[str]]] = []
    cur: list[list[str]] = []
    for ln in lines(text):
        if is_border(ln):
            if cur:
                records.append(cur)
                cur = []
            continue
        if not _SPLIT.search(ln):
            continue
        parts = _SPLIT.split(ln)
        if parts and not parts[0].strip():
            parts = parts[1:]
        if parts and not parts[-1].strip():
            parts = parts[:-1]
        cur.append(parts)
    if cur:
        records.append(cur)
    out = []
    for rec in records:
        width = max(len(r) for r in rec)
        cols = []
        for c in range(width):
            frags = [r[c] for r in rec if c < len(r) and r[c].strip()]
            cols.append(join_fragments(frags))
        out.append(cols)
    return out


def join_fragments(frags: list[str]) -> str:
    """Join the wrapped fragments of one table cell.

    Hangul-Hangul boundaries and fragments that filled the cell to its edge (no
    right padding) were cut mid-word and join without a space.
    """
    acc = ""
    prev_raw = ""
    for raw in frags:
        piece = raw.strip()
        if not acc:
            acc = piece
        elif (_is_hangul(acc[-1]) and _is_hangul(piece[0])) or not prev_raw.endswith(" "):
            acc += piece
        else:
            acc += " " + piece
        prev_raw = raw
    return acc
