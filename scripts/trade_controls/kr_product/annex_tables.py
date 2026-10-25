"""Walk a long 별표 text: track 부/장 headings and <표N> captions, yield its box tables.

Used for 안전확인대상생활화학제품 지정 및 안전·표시기준 별표 2, where every product chapter has
its own 함유금지물질 / 함량 기준 tables. Cell splitting reuses kr_safety.box_table.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field

from kr_safety import box_table

_PART = re.compile(r"^\s*제(\d+)부\s*(.+?)\s*$")
_CHAPTER = re.compile(r"^\s*제(\d+)장\s*(.+?)\s*$")
_CAPTION = re.compile(r"<표(\d+)>\s*(.+?)\s*$")
_SECTION = re.compile(r"^\s*(\d+)\.\s*(\S.*?)\s*$")
_VBAR = set("┃│┠┨├┤┣┫")
_BOXONLY = re.compile(r"[─━│┃┌┐└┘├┤┬┴┼┏┓┗┛┣┫┳┻╋┠┨┯┷┿┝┥╂┰┸]")


@dataclass
class Table:
    part: str
    chapter: str
    section: str
    caption_no: str
    caption: str
    unit: str
    header: list[str]
    rows: list[dict] = field(default_factory=list)   # {no, name, cells, subgroup}
    raw_numbered_rows: int = 0


def _width(ch: str) -> int:
    return 2 if unicodedata.east_asian_width(ch) in ("W", "F", "A") else 1


def _spans(line: str) -> list[tuple[int, int, str]]:
    """Cells of one table line as (start, end, text) in display columns (Hangul/box = 2)."""
    out, pos, start, buf = [], 0, None, []
    for ch in line.rstrip():
        w = _width(ch)
        if ch in _VBAR:
            if start is not None:
                out.append((start, pos, "".join(buf).strip()))
            start, buf = pos + w, []
        elif start is not None:
            buf.append(ch)
        pos += w
    return out


def _column_names(head_lines: list[str]) -> list[str]:
    """Column names for the deepest header level, prefixed by the spanning upper cells."""
    levels = [[c for c in _spans(ln)] for ln in head_lines if _BOXONLY.sub("", ln).strip()]
    levels = [lv for lv in levels if len(lv) > 1]
    if not levels:
        return []
    # merge wrapped header lines with identical cell layout
    merged: list[list[tuple[int, int, str]]] = []
    for lv in levels:
        if merged and [(a, b) for a, b, _ in merged[-1]] == [(a, b) for a, b, _ in lv]:
            merged[-1] = [(a, b, (t1 + " " + t2).strip()) for (a, b, t1), (_, _, t2) in zip(merged[-1], lv)]
        else:
            merged.append(lv)
    deepest = max(merged, key=len)
    names = []
    for a, b, text in deepest:
        mid = (a + b) / 2
        parts = []
        for lv in merged:
            for a2, b2, t2 in lv:
                if a2 <= mid <= b2 and t2 and t2 not in parts:
                    parts.append(t2)
        names.append(" ".join(parts) if parts else text)
    return [re.sub(r"\s+", " ", n).strip() for n in names]


def _blocks(lines: list[str]) -> list[tuple[str, list[str]]]:
    """Split table lines at separator lines: [(separator kind before block, block lines)]."""
    out, cur, kind = [], [], "top"
    for ln in lines:
        if not _BOXONLY.sub("", ln).strip():
            if cur:
                out.append((kind, cur))
            cur, kind = [], ("heavy" if any(ch in ln for ch in "┣┿━") else "light")
        else:
            cur.append(ln)
    if cur:
        out.append((kind, cur))
    return out


def tables(text: str) -> list[Table]:
    out: list[Table] = []
    part = chapter = "Ⅰ. 공통기준"
    section = caption = unit = ""
    cap_no = ""
    block: list[str] | None = None
    for ln in text.splitlines():
        s = ln.strip()
        if not s:
            continue
        if block is not None:
            block.append(ln)
            if s.startswith("┗"):
                out.append(_table(block, part, chapter, section, cap_no, caption, unit))
                block = None
            continue
        if s.startswith("┏"):
            block = [ln]
            continue
        m = _PART.match(s)
        if m and "│" not in s:
            part, chapter = f"제{m.group(1)}부 {m.group(2)}", ""
            continue
        m = _CHAPTER.match(s)
        if m and "│" not in s:
            chapter = f"제{m.group(1)}장 {m.group(2)}"
            continue
        m = _CAPTION.search(s)
        if m:
            cap_no, caption, unit = m.group(1), m.group(2), ""
            continue
        if s.startswith("(단위"):
            unit = s[1:-1].strip() if s.endswith(")") else s.lstrip("(")
            continue
        m = _SECTION.match(s)
        if m and len(s) < 60:
            section = f"{m.group(1)}. {m.group(2)}"
    return out


def _table(lines: list[str], part, chapter, section, cap_no, caption, unit) -> Table:
    text = "\n".join(lines)
    t = Table(part, chapter, section, cap_no, caption, unit, [])
    t.raw_numbered_rows = len(re.findall(r"(?m)^\s*┃\s*\d+\s*│", text))
    blocks = _blocks(lines)
    names: list[str] = []
    col, sub, head, in_head = -1, "", [], False
    for kind, blk in blocks:
        btext = " ".join(blk)
        if "물질명" in btext or "주성분" in btext:
            head, in_head = list(blk), True
            continue
        if in_head and kind == "light" and not re.match(r"^\s*┃\s*\d", blk[0]):
            head.extend(blk)                       # sub-header level (분사형 → 일반용/특정목적용)
            continue
        if in_head:
            names, in_head = _column_names(head), False
            col = next((i for i, n in enumerate(names) if "물질명" in n or "주성분" in n), -1)
            if not t.header:
                t.header = names
        rows = box_table.rows("\n".join(blk))
        if not rows:
            continue
        c = rows[0].cells
        if len(c) == 1:
            if re.match(r"^[가-하]\.", c[0]):
                sub = c[0]
            continue
        if col < 0 or len(c) <= col:
            continue
        crit = list(zip(names[col + 1:], c[col + 1:])) if len(names) == len(c) else [("", v) for v in c[col + 1:]]
        if col == 1 and re.fullmatch(r"\d+", c[0]):
            t.rows.append({"no": c[0], "name": c[1], "cells": c[2:], "criteria": crit, "subgroup": sub,
                           "header_ok": len(names) == len(c)})
        elif col == 0 and c[0]:
            t.rows.append({"no": str(len(t.rows) + 1), "name": c[0], "cells": c[1:], "criteria": crit,
                           "subgroup": sub, "header_ok": len(names) == len(c)})
    if col == 0:
        t.raw_numbered_rows = len(t.rows)
    return t
