"""Sub-row-aware reader for law.go.kr box tables (화장품 안전기준 별표, 농약 등록기준 별표).

box_groups(text) -> tables -> row groups -> columns -> sub-row segments. A row group lies between
two full separators; a border-only cell inside a group starts a new sub-row segment in that column.
"""
from __future__ import annotations

import re

from kr_env import cas as casmod
from kr_env import textutil

_CELL_SPLIT = re.compile(r"[│├┤┼]")
_BORDER_CELL = re.compile(r"^[─━┬┴\s]+$")


def box_groups(text: str, raw: bool = False) -> list[list[list]]:
    """Tables -> row groups -> columns -> sub-row segments (joined text; with raw=True each
    segment is the list of its stripped line fragments, for callers that need both joins).

    A row group lies between two full separators (lines starting with ├ ┌ └). Inside a
    group, a cell made only of border characters (e.g. '├────┼───┤' covering the right
    columns) starts a new sub-row segment in that column.
    """
    tables, groups, cur = [], [], None

    def flush():
        nonlocal cur
        if cur is not None and any(any(seg for seg in col) for col in cur):
            if raw:
                groups.append([[[f.strip() for f in seg] for seg in col if seg] for col in cur])
            else:
                groups.append([[textutil.join_fragments(seg) for seg in col if seg] for col in cur])
        cur = None

    for ln in text.splitlines():
        s = ln.rstrip()
        if not s.strip():
            continue
        head = s.lstrip()[:1]
        if head in "┌├└":
            flush()
            if head == "└":
                tables.append(groups)
                groups = []
            continue
        if head != "│":
            continue
        parts = _CELL_SPLIT.split(s.strip())
        parts = parts[1:-1] if len(parts) >= 2 else parts
        if cur is None:
            cur = [[[]] for _ in parts]
        if len(parts) != len(cur):
            # irregular line (merged cells); pad/truncate to the group width
            parts = (parts + [""] * len(cur))[:len(cur)]
        for i, p in enumerate(parts):
            if _BORDER_CELL.match(p) and "─" in p:
                if cur[i][-1]:
                    cur[i].append([])
            elif p.strip():
                cur[i][-1].append(p)
    flush()
    if groups:
        tables.append(groups)
    return tables


def joined(col: list[str]) -> str:
    return re.sub(r"\s+", " ", " ".join(col)).strip()


def cas_in(text: str) -> list[str]:
    return [casmod.normalize(m.group(0)) for m in casmod.CAS_IN_TEXT.finditer(text or "")]
