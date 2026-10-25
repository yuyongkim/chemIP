"""Australia — chemical lists printed in Commonwealth legislation (Federal Register of Legislation).

- Customs (Prohibited Imports) Regulations 1956, Schedule 9 (regulation 5I): organochlorine chemicals whose
  import needs permission. Table: Item / Common name / CAS Registry Number (13 items).
  Schedule 11 (CWC chemicals) is not repeated here: CWC is already in controlled_lists.
- Industrial Chemicals (General) Rules 2019, Chapter 6: introduction (s 71) and export (s 73) of industrial
  chemicals subject to the Rotterdam Convention need prior approval of the AICIS Executive Director;
  mercury import (s 75A) / export (s 75B) under the Minamata Convention. Only mercury carries a CAS
  (s 70A); the named groups go to family_entries — their CAS are not printed, so none are added.

The "latest" page of each instrument names the current compilation's epub HTML; that HTML is parsed.
CAS numbers there are written with non-breaking hyphens and spaces ("309 \u2011 00 \u2011 2").
"""
from __future__ import annotations

import html
import re
from pathlib import Path

from intl_common import cas_tokens, clean, entry, fetch, file_info, split_entries

EPUB = re.compile(r'https://www\.legislation\.gov\.au/(F\w+)/(\d{4}-\d{2}-\d{2})/\d{4}-\d{2}-\d{2}/text/original/epub/OEBPS/document_1/document_1\.html')
SCH9_ITEMS = 13
SYMBOL_FONT = {"\uf061": "α", "\uf062": "β", "\uf067": "γ", "\uf064": "δ"}


def current_text(latest_page: Path) -> tuple[str, str]:
    m = EPUB.search(latest_page.read_text(encoding="utf-8", errors="replace"))
    if not m:
        raise ValueError(f"{latest_page.name}: compilation epub link not found")
    return m.group(0), m.group(2)


def plain(path: Path) -> str:
    text = html.unescape(re.sub(r"<[^>]+>", " ", path.read_text(encoding="utf-8", errors="replace")))
    for pua, greek in SYMBOL_FONT.items():  # Greek letters set in the Symbol font come out as private-use code points
        text = text.replace(pua, greek)
    # the non-breaking hyphen sits in its own span, so it comes out as " \u2011 " once tags become spaces
    text = re.sub(r"\s+", " ", text.replace("\u00a0", " "))
    return re.sub(r" ?\u2011 ?", "-", text)


def compilation(text: str) -> str:
    no = re.search(r"Compilation No\. ?(\d+)", text)
    date = re.search(r"Compilation date: ?(\d{1,2} \w+ \d{4})", text)
    return f"Compilation No. {no.group(1) if no else '?'}, {date.group(1) if date else ''}".strip(", ")


def schedule9(text: str) -> tuple[list[dict], int]:
    start = text.find("Schedule 9 — Goods, being certain organochlorine chemicals")
    end = text.find("Schedule 11 — Chemical compounds", start)
    if start < 0 or end < 0:
        raise ValueError("Schedule 9 body not found")
    body = text[start:end]
    body = body[body.find("CAS Registry Number") + len("CAS Registry Number"):]
    rows, items = [], set()
    # "1 aldrin (HHDN) 309-00-2 2 HCH ..." — item number, name, one or more CAS numbers
    for m in re.finditer(r"(?:^|\s)(\d{1,2}) (.+?) ((?:\d{2,7}-\d{2}-\d\s*)+)(?=\s\d{1,2} \D|\s*$)", body):
        no, name, cas = m.group(1), m.group(2), cas_tokens(m.group(3))
        items.add(no)
        rows.append(entry("", name, f"Schedule 9 item {no}; regulation 5I 수입 허가 대상", cas_all=cas, match_method="official CAS"))
    return rows, len(items)


def _section(text: str, head: str, stop: str) -> str:
    i = text.find(head, text.find("Chapter 6 — "))
    j = text.find(stop, i)
    if i < 0 or j < 0:
        raise ValueError(f"IC Rules section not found: {head}")
    return text[i:j]


ROMAN = {"i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"}


def _groups(sec: str) -> list[str]:
    """Top-level paragraphs (a), (b), (ba) … of subsection (2); roman sub-items (i), (ii) … are folded in.

    '(i)' is a sub-item only when the open paragraph says 'including:' (s 73(2)(i) is a paragraph)."""
    body = sec[sec.find("the industrial chemicals are the following"):]
    body = body[:body.find(". ", body.find("(a) ")) + 1] if "(a) " in body else body
    marks = list(re.finditer(r"\(([a-z]{1,4})\) ", body))
    groups: list[dict] = []
    for k, m in enumerate(marks):
        label = m.group(1)
        seg = body[m.end(): marks[k + 1].start() if k + 1 < len(marks) else len(body)]
        seg = clean(re.sub(r"(;\s*(and)?|\.|,? including:)\s*$", "", seg.strip()))
        is_sub = label in ROMAN and groups and (label != "i" or "including:" in groups[-1]["raw"])
        if is_sub:
            groups[-1]["subs"].append(seg)
            groups[-1]["raw"] += " " + seg
        else:
            groups.append({"head": seg, "subs": [], "raw": body[m.end(): marks[k + 1].start() if k + 1 < len(marks) else len(body)]})
    return [g["head"] + (f" (포함: {'; '.join(g['subs'])})" if g["subs"] else "") for g in groups]


def ic_rules(text: str) -> tuple[list[dict], list[dict], list[str]]:
    s71 = _section(text, "71 Introduction of certain industrial chemicals subject to conditions", "72 Introduction of tetraethyl lead")
    s73 = _section(text, "73 Export of certain industrial chemicals subject to conditions", "74 Applying for approval")
    s70a = _section(text, "70A Definitions", "Part 2 — Movement")
    imp, exp = _groups(s71), _groups(s73)
    families = []
    for name in sorted(set(imp) | set(exp) | {"tetraethyl lead"}):
        where = [w for w, lst in (("s 71 도입(수입) 사전승인", imp), ("s 73 수출 사전승인", exp)) if name in lst]
        if name == "tetraethyl lead":  # s 72: its own introduction conditions
            where.insert(0, "s 72 도입(수입) 조건: 사전승인 또는 항공유 용도 등")
        families.append(entry("", name, "; ".join(where) + "; 로테르담협약 대상(CAS 미기재)"))
    hg = cas_tokens(s70a)
    rows = [entry("", "mercury (elemental, ≥95 % w/w mixtures and alloys)",
                  "s 75A 수입 승인(미나마타협약 비당사국에서 수입 시), s 75B 수출 승인(모든 수출); s 70A 정의",
                  cas_all=hg, match_method="official CAS")]
    return rows, families, imp + exp


def collect(spec: dict, raw_dir: Path, offline: bool) -> dict:
    d = spec["downloads"]
    out, files = {}, {}
    for key in ("customs_pi", "ic_rules"):
        latest = fetch(d[key]["latest"], raw_dir / d[key]["latest_file"], offline)
        url, comp_date = current_text(latest)
        path = fetch(url, raw_dir / d[key]["file_pattern"].format(date=comp_date), offline)
        files[key] = ([file_info(latest, d[key]["latest"]), file_info(path, url)], plain(path))

    cfiles, ctext = files["customs_pi"]
    rows, n_items = schedule9(ctext)
    entries, families, bad = split_entries(rows)
    families = [{k: v for k, v in f.items() if k != "match_method"} for f in families]
    problems = [f"invalid CAS in source: {bad}"] if bad else []
    sch = ctext[ctext.find("Schedule 9 — Goods"):ctext.find("Schedule 11 — Chemical compounds", ctext.find("Schedule 9 — Goods"))]
    missing = sorted(set(cas_tokens(sch)) - {e["cas"] for e in entries})
    if missing:
        problems.append(f"CAS printed in Schedule 9 but not parsed: {missing}")
    out["organochlorine"] = {
        "entries": entries, "family_entries": families, "problems": problems,
        "official_count": SCH9_ITEMS, "official_count_basis": "Schedule 9 item 1–13", "counted": n_items,
        "source_version": f"Customs (Prohibited Imports) Regulations 1956, {compilation(ctext)}",
        "notes": [], "files": cfiles,
    }

    rfiles, rtext = files["ic_rules"]
    rows, fam, groups = ic_rules(rtext)
    entries, _, bad = split_entries(rows)
    out["intl_agreements"] = {
        "entries": entries, "family_entries": fam,
        "problems": ([f"invalid CAS in source: {bad}"] if bad else []) + ([] if entries else ["mercury CAS (s 70A) not found"]),
        "official_count": None, "official_count_basis": "법정 품목 수 미공표 — s 71(2)·s 73(2) 항목 수만 기록",
        "counted": len(groups),
        "source_version": f"Industrial Chemicals (General) Rules 2019, {compilation(rtext)}",
        "notes": [f"s 71(2) 도입 대상 {len(_groups(_section(rtext, '71 Introduction of certain', '72 Introduction')))}개 항목, "
                  f"s 73(2) 수출 대상 {len(_groups(_section(rtext, '73 Export of certain', '74 Applying')))}개 항목은 CAS 가 법령에 없어 family_entries 로만 둔다",
                  "연구·분석용 연 100 kg 이하 예외(s 71(1A), s 73(1A))"],
        "files": rfiles,
    }
    return out
