"""China 各类监控化学品名录 (工业和信息化部令第52号, 2020) — State Council Gazette text on gov.cn.

The 名录 prints CAS in parentheses after each name. Structure per category (第一类…第四类):
  （n）item [(CAS)]           -> numbered item; with CAS = entry, without = family entry
  例如： name (CAS)            -> examples of the item above = entries (member of item n)
  例外： name (CAS) [+ next]   -> excluded from control; recorded in notes, never as entries
第四类 is a definition (特定有机化学品, DOC) with no CAS list -> one family entry.
"""
from __future__ import annotations

import html
import re
from pathlib import Path

from intl_common import cas_tokens, clean, entry, fetch, file_info, split_entries

CATS = ("第一类", "第二类", "第三类", "第四类")


def _paragraphs(page: str) -> list[str]:
    body = page[page.find('id="UCAP-CONTENT"'):]
    body = body[:body.find('<div style="display:none">')]
    return [clean(html.unescape(re.sub(r"<[^>]+>", "", p))) for p in re.findall(r"<p[^>]*>(.*?)</p>", body, re.S)]


def _name(text: str) -> str:
    return clean(re.sub(r"[（(]\s*\d{2,7}-\d{2}-\d\s*[)）]", "", text)).rstrip("：:")


def parse(page: str) -> tuple[list[dict], dict[str, int], list[str], list[str]]:
    rows: list[dict] = []
    items: dict[str, int] = {}
    exceptions: list[str] = []
    problems: list[str] = []
    cat, item, item_name, mode = "", 0, "", "item"
    for p in _paragraphs(page):
        head = next((c for c in CATS if p.startswith(c)), None)
        if head:
            cat, item, mode = p, 0, "item"
            items[head] = 0
            if head == "第四类":
                rows.append(entry("", p, f"{head}: definition only (no CAS list in 名录)", category=head, match_method="no_cas"))
            continue
        if not cat or re.fullmatch(r"[ＡＢA-B]．?", p):
            continue
        m = re.match(r"[（(](\d+)[)）]\s*(.*)", p)
        short = cat[:3]
        if m:
            n = int(m.group(1))
            if n != items[short] + 1:
                problems.append(f"{short}: item number {n} after {items[short]}")
            items[short] = n
            item, item_name, mode = n, _name(m.group(2)), "item"
            cas = cas_tokens(m.group(2))
            rows.append(entry("", item_name, f"{short} ({n})", cas_all=cas, category=short,
                              match_method="law_cas" if cas else "no_cas"))
            continue
        if p.startswith("例如"):
            mode = "example"
            p = p.split("：", 1)[1] if "：" in p else ""
            if not p:
                continue
        elif p.startswith("例外"):
            mode = "exception"
            p = p.split("：", 1)[1] if "：" in p else ""
        if not item or short == "第四类":
            continue
        cas = cas_tokens(p)
        if mode == "exception":
            exceptions.append(f"{short} ({item}) 例外: {p}")
        elif cas:
            rows.append(entry("", _name(p), f"{short} ({item}) {item_name[:60]} 例", cas_all=cas, category=short,
                              match_method="law_cas"))
    return rows, items, exceptions, problems


def collect(spec: dict, raw_dir: Path, offline: bool) -> dict:
    d = spec["downloads"]["catalog_2020"]
    path = fetch(d["url"], raw_dir / d["file"], offline)
    rows, items, exceptions, problems = parse(path.read_text(encoding="utf-8", errors="replace"))
    entries, families, bad = split_entries(rows)
    if bad:
        problems.append(f"invalid CAS in source: {bad}")
    expected = spec.get("expected_items") or {}
    for cat, n in expected.items():
        if items.get(cat) != n:
            problems.append(f"{cat}: parsed {items.get(cat)} numbered items, expected {n}")
    numbered = sum(v for k, v in items.items() if k != "第四类")
    return {"monitored": {
        "entries": entries, "family_entries": families, "problems": problems,
        "official_count": sum(expected.values()) if expected else None,
        "official_count_basis": "numbered items （n） in 第一~三类 of the 名录 text (counted by hand from the gazette page)",
        "counted": numbered, "source_version": "各类监控化学品名录(工业和信息化部令第52号, 2020-06-03 施行)",
        "notes": [f"numbered items per category: {items}", *exceptions,
                  "第四类(특정 유기화학물질, DOC)은 정의 조항만 있고 CAS 목록이 없어 family_entries 1건."],
        "files": [file_info(path, d["url"])],
    }}
