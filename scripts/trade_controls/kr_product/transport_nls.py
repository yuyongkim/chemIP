"""선박에서의 오염방지에 관한 규칙 [별표 1] 제2호 유해액체물질의 목록 -> row records.

Box table: each row is a Korean name cell (one or more lines, category X/Y/Z/OS in
the right cell of the first line), a '┠──┤' rule, then the English name cell.
Rows are separated by '┠──┼' rules; the table ends at '┗'.
"""
from __future__ import annotations

import re

from kr_env import textutil

from . import lawsrc

RULE = "선박에서의 오염방지에 관한 규칙"
START = "2. 유해액체물질의 목록"
CATS = {"X", "Y", "Z", "OS"}
_SEP_CAT = re.compile(r"┤\s*(X|Y|Z|OS)\s*┃")
_HANGUL = re.compile(r"[가-힣]")


def _cells(line: str) -> list[str]:
    return [c.strip() for c in re.split(r"[┃│]", line)[1:-1]]


def parse_rows(text: str) -> tuple[list[dict], dict]:
    lines = text.splitlines()
    start = next(i for i, ln in enumerate(lines) if START in ln)
    rows, cur, part, cat_lines = [], None, "ko", 0
    for ln in lines[start + 1:]:
        s = ln.strip()
        if not s:
            continue
        if s.startswith("┗"):
            break
        if s.startswith("┠") or s.startswith("┏"):
            if "┼" in s or "┯" in s:
                if cur and cur["ko"]:
                    rows.append(cur)
                cur, part = {"ko": [], "en": [], "cat": None}, "ko"
            elif "┤" in s:
                part = "en"
                m = _SEP_CAT.search(s)
                if m and cur is not None and cur["cat"] is None:
                    cur["cat"] = m.group(1)
                    cat_lines += 1
            continue
        if not s.startswith("┃") or cur is None:
            continue
        cells = _cells(s)
        if not cells:
            continue
        name = cells[0]
        if name == "품명":
            cur = None
            continue
        if len(cells) > 1 and cells[1] in CATS:
            cur["cat"] = cells[1]
            cat_lines += 1
        if name and part == "ko" and cur["ko"] and not _HANGUL.search(name):
            part = "en"          # English cell printed without its own rule line
        if name:
            cur[part].append(name)
    if cur and cur["ko"]:
        rows.append(cur)
    out = []
    for r in rows:
        ko = re.sub(r"\s+", " ", _join(r["ko"])).strip()
        en = re.sub(r"\s+", " ", _join(r["en"])).strip() or None
        out.append({"name_ko": ko, "name_en": en, "pollution_category": r["cat"]})
    return out, {"rows": len(out), "category_cells": cat_lines}


def _join(parts: list[str]) -> str:
    out = ""
    for p in parts:
        out = out + p if out.endswith(("-", "(", "/")) or p.startswith(")") else textutil.join_wrapped(out, p)
    return out


def load() -> tuple[lawsrc.LawDoc, dict, list[dict], dict]:
    doc = lawsrc.fetch_law(RULE)
    annex = lawsrc.annex(doc, 1)
    rows, stats = parse_rows(annex["text"])
    return doc, annex, rows, stats
