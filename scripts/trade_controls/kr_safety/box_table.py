"""Parse law.go.kr box-drawing tables (┌─┬─┐ │ ├─┼─┤ ...) into rows of cells.

A row is the block of text lines between two full separator lines. Each line is
split on vertical/junction characters; cell texts of the same column are joined
over the lines of the block (wrapped text). Lines with a different cell count
than the block majority mark the row as irregular (merged / split cells).
"""
from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass

_SPLIT = re.compile(r"[│┃├┤┼┠┨┝┥┿╂┣┫╋┬┴┯┷┰┸]")
_BOX = re.compile(r"[─━│┃┌┐└┘├┤┬┴┼┏┓┗┛┣┫┳┻╋┠┨┯┷┿┝┥╂┰┸┍┑┕┙┎┒┖┚]")


@dataclass
class Row:
    cells: list[str]
    irregular: bool
    lines: list[list[str]]

    @property
    def text(self) -> str:
        return " ".join(c for c in self.cells if c)


def _is_table_line(ln: str) -> bool:
    return bool(_BOX.search(ln))


def _is_separator(ln: str) -> bool:
    return _is_table_line(ln) and not _BOX.sub("", ln).strip()


def _cells(ln: str) -> list[str]:
    parts = _SPLIT.split(ln.strip())
    if parts and not parts[0].strip():
        parts = parts[1:]
    if parts and not parts[-1].strip():
        parts = parts[:-1]
    return [_BOX.sub("", p) for p in parts]


def _join_cell(a: str, b: str, vocab: set[str]) -> str:
    a, b = a.rstrip(), b.strip()
    if not a:
        return b
    if not b:
        return a
    if re.search(r"[가-힣\-(\[]$", a) and re.match(r"[가-힣\-)\]]", b):
        return a + b
    if a[-1].isdigit() and (b[0].isdigit() or b[0] == "-"):
        return a + b
    ma, mb = re.search(r"[A-Za-z]+$", a), re.match(r"[A-Za-z]+", b)
    if ma and mb and (ma.group(0) + mb.group(0)).lower() in vocab:
        return a + b
    return a + " " + b


def rows(text: str) -> list[Row]:
    out: list[Row] = []
    block: list[list[str]] = []
    vocab = {w.lower() for w in re.findall(r"[A-Za-z]{4,}", text)}

    def flush():
        if not block:
            return
        n = Counter(len(c) for c in block).most_common(1)[0][0]
        cols = [""] * n
        irregular = False
        for cells in block:
            if len(cells) != n:
                irregular = True
                continue
            for i, c in enumerate(cells):
                cols[i] = _join_cell(cols[i], c, vocab)
        out.append(Row([re.sub(r"\s+", " ", c).strip() for c in cols], irregular, list(block)))
        block.clear()

    for ln in text.splitlines():
        if not ln.strip():
            continue
        if not _is_table_line(ln):
            flush()
            continue
        if _is_separator(ln):
            flush()
            continue
        block.append(_cells(ln))
    flush()
    return out
