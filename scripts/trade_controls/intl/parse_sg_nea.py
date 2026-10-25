"""Singapore NEA — hazardous substances controlled under the EPMA (Pollution Control Department, PCD(HS)).

- "Chemicals classified under HS codes controlled by PCD(HS) or jointly controlled with other CAs",
  sorted by chemical names (TradeNet product-code list, PDF). Table: marker / HS code (AHTN 2022) /
  product code description / product code / CAS number(s). This is NEA's own CAS list for the
  EPMA Second Schedule substances; NEA notes it is not exhaustive.
- Table 1 "List of controlled hazardous substances" (EPMA 2nd Schedule names + exclusions, no CAS) is kept
  as provenance only.
Cells may break a CAS across lines ("108-\\n39-4"); a row that runs over a page continues in a row with
no product code, which is joined to the row before it. Rows whose CAS is 'NA' (articles such as
batteries, RoHS goods) are counted, not stored.
"""
from __future__ import annotations

import re
from pathlib import Path

from intl_common import cas_is_valid, cas_tokens, clean, entry, fetch, file_info, split_entries

MARKERS = {
    "A": "PCD(HS) 단독 통제 HS",
    "B": "PCD(HS)·타 기관 공동 통제 HS",
    "*": "2023-08-21 시행",
    "#": "클로로피크린: 화학물질로 수입 시 NA(CWC) 통제 HS 목록 확인",
    "®": "PCD(HS)·타 기관 비통제 물질이면 'MISC' 신고",
    "◙": "PCD(HS)·중앙마약국(CNB) 공동 통제(환적은 CNB)",
    "α": "PCD(HS)·IMDA 공동 통제",
}


def read_rows(path: Path) -> tuple[list[list[str]], str]:
    import pdfplumber  # S: venv only

    rows, text = [], []
    with pdfplumber.open(str(path)) as pdf:
        for page in pdf.pages:
            text.append(page.extract_text() or "")
            for table in page.extract_tables():
                rows.extend([c or "" for c in r] for r in table if len(r) == 5)
    return rows, "\n".join(text)


def merge(rows: list[list[str]]) -> list[dict]:
    items: list[dict] = []
    for mark, hs, desc, code, cas in rows:
        code, hs = clean(code), clean(hs)
        if code in ("PRODUCT", "CODE") or "HS CODE" in hs or hs.endswith("2022)") or hs == "(AHTN":
            continue
        if not code and not hs:
            if items and (cas.strip() or desc.strip()):  # continuation of the previous row over a page break
                items[-1]["cas_raw"] += cas
                items[-1]["desc"] += " " + desc
            continue
        items.append({"mark": clean(mark), "hs": hs, "desc": desc, "code": code, "cas_raw": cas})
    return items


def _cas(raw: str) -> list[str]:
    # line breaks inside a cell may split one number ("108-\n39-4"); separators are ';' or ','.
    # The PDF wraps only after a hyphen; a newline after a complete number separates two numbers.
    # Some cells come out with two numbers run together ("28699-88-91321-65-9"); the check digit is a
    # single digit, so a digit right after "-NN-N" starts the next number.
    text = re.sub(r"-\s*\n\s*", "-", raw).replace("\n", " ")
    return cas_tokens(re.sub(r"(-\d{2}-\d)(?=\d)", r"\1 ", text))


def collect(spec: dict, raw_dir: Path, offline: bool) -> dict:
    d = spec["downloads"]
    page = fetch(d["page"]["url"], raw_dir / d["page"]["file"], offline)
    table1 = fetch(d["table1"]["url"], raw_dir / d["table1"]["file"], offline)
    path = fetch(d["product_codes"]["url"], raw_dir / d["product_codes"]["file"], offline)
    rows, text = read_rows(path)
    items = merge(rows)
    out, no_cas = [], 0
    for it in items:
        cas = _cas(it["cas_raw"])
        if not cas:
            no_cas += 1
            continue
        mark = MARKERS.get(it["mark"], it["mark"])
        detail = "; ".join(p for p in (f"HS {it['hs']}", f"제품코드 {it['code']}", mark) if p)
        name = clean(re.sub(r"-\s*\n\s*", "-", it["desc"]))  # names wrap after a hyphen too
        out.append(entry("", name[:300], detail, cas_all=cas, match_method="official CAS"))
    entries, families, bad = split_entries(out)
    problems = [f"invalid CAS in source: {bad}"] if bad else []
    # page text interleaves columns, so only whole, valid numbers on one line are used as a cross-check
    printed = {c for c in cas_tokens(text) if cas_is_valid(c)}
    missing = sorted(printed - {e["cas"] for e in entries} - {b.split(' ')[0] for b in bad})
    version = re.search(r"Last updated on ([0-9A-Za-z ]+?)\)", text)
    return {"hazardous_substances": {
        "entries": entries, "family_entries": [], "problems": problems + ([f"CAS printed but not parsed: {missing[:30]}"] if missing else []),
        "official_count": None,
        "official_count_basis": "NEA 문서는 CAS 목록이 완전하지 않다고 명시(Note 10) — 표 행 수만 기록",
        "counted": len(items),
        "source_version": f"NEA PCD(HS) product codes sorted by chemical names, last updated {version.group(1) if version else '?'} (TradeNet 4.1)",
        "notes": [f"표 행 {len(items)}건 중 CAS 없음(NA·물품) {no_cas}건은 저장하지 않음",
                  "NEA 안내: CAS 목록은 망라적이지 않으며 제품코드 선택 보조용 — 목록에 없다고 비통제가 아님(EPMA 제2부속서 물질명·제외 기준이 기준)"],
        "files": [file_info(page, d["page"]["url"]), file_info(table1, d["table1"]["url"]), file_info(path, d["product_codes"]["url"])],
    }}
