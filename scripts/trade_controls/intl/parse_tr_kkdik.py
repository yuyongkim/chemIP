"""Türkiye: KKDİK (Kimyasalların Kaydı, Değerlendirmesi, İzni ve Kısıtlanması Hakkında Yönetmelik) Annex 17
restrictions, from the annex bundle on mevzuat.gov.tr (a zip of .docx files, one per annex / appendix).

- EK-17: table 'Sütun 1 (substance) | Sütun 2 (restriction conditions)'. Column 1 starts with the entry number
  ('2. Kloroetilen (vinil klorür) / CAS No 75-01-4 / EC No 200-831-0'); every CAS in it belongs to that entry.
- EK-17 appendices (ek-I ... ek-IX): tables 'Maddeler | Liste No | EC No | CAS No | Notlar' (column order varies:
  columns are found by header text). Each row = one substance of that appendix.
The .docx files are read as zip + XML text only (w:t runs joined per paragraph); nothing in them is executed.
"""
from __future__ import annotations

import html
import io
import re
import zipfile
from pathlib import Path

from intl_common import cas_tokens, clean, entry, fetch, file_info, split_entries

ENTRY_NO = re.compile(r"^(\d+[a-z]?)\.\s*(.*)$", re.S)


def docx_rows(data: bytes) -> list[list[str]]:
    """Table rows of a .docx: cells = paragraphs joined with ' / '."""
    xml = zipfile.ZipFile(io.BytesIO(data)).read("word/document.xml").decode("utf-8")
    rows = []
    for tr in re.findall(r"<w:tr\b.*?</w:tr>", xml, re.S):
        cells = []
        for tc in re.findall(r"<w:tc\b.*?</w:tc>", tr, re.S):
            paras = ["".join(re.findall(r"<w:t(?:\s[^>]*)?>([^<]*)</w:t>", p)) for p in re.findall(r"<w:p\b.*?</w:p>", tc, re.S)]
            cells.append(" / ".join(clean(html.unescape(p)) for p in paras if p.strip()))
        rows.append(cells)
    return rows


def _members(bundle: zipfile.ZipFile) -> dict[str, str]:
    """Normalised member key ('EK-17', 'EK-17_ek-I') -> member name (file names are cp437-mangled 'KKDİK')."""
    out = {}
    for n in bundle.namelist():
        m = re.search(r"(EK-\d+(?:_\s*ek-[IVX]+)?)\.docx$", n)
        if m:
            out[m.group(1).replace(" ", "")] = n
    return out


def annex17(rows: list[list[str]]) -> tuple[list[dict], list[str]]:
    out, numbers = [], []
    for cells in rows[1:]:
        if len(cells) < 2:
            continue
        m = ENTRY_NO.match(cells[0])
        if not m:
            continue
        no, text = m.group(1), m.group(2)
        numbers.append(no)
        name = re.split(r"\s*/?\s*\bCAS\b", text)[0].strip(" /")
        cas = cas_tokens(cells[0])
        out.append(entry("", name[:300], f"KKDİK Ek-17 madde {no}; {cells[1][:200]}", cas_all=cas,
                         match_method="law_cas" if cas else "no_cas"))
    return out, numbers


def appendix(rows: list[list[str]], label: str) -> list[dict]:
    if not rows:
        return []
    head = [c.lower() for c in rows[0]]
    try:
        c_cas = next(i for i, h in enumerate(head) if h.startswith("cas"))
        c_name = next(i for i, h in enumerate(head) if h.startswith("madde"))
    except StopIteration:
        return []
    out = []
    for cells in rows[1:]:
        if len(cells) <= max(c_cas, c_name) or not cells[c_name]:
            continue
        cas = cas_tokens(cells[c_cas])
        out.append(entry("", cells[c_name][:300], label, cas_all=cas, match_method="law_cas" if cas else "no_cas"))
    return out


def collect(spec: dict, raw_dir: Path, offline: bool) -> dict:
    d = spec["downloads"]
    path = fetch(d["annex_zip"], raw_dir / "tr" / "kkdik_7.5.23694-Ek.zip", offline)
    files = [file_info(path, d["annex_zip"])]
    bundle = zipfile.ZipFile(path)
    members = _members(bundle)
    main, numbers = annex17(docx_rows(bundle.read(members["EK-17"])))
    rows = list(main)
    per_app = {}
    for key, label in spec["appendices"].items():
        if key in members:
            got = appendix(docx_rows(bundle.read(members[key])), label)
            per_app[key] = len(got)
            rows += got
    ek17_date = "-".join(f"{x:02d}" for x in bundle.getinfo(members["EK-17"]).date_time[:3])
    entries, families, bad = split_entries(rows)
    return {"restrictions": {
        "entries": entries, "family_entries": families, "problems": [f"invalid CAS in source: {bad}"] if bad else [],
        "official_count": None, "official_count_basis": "법령에 총 건수 기재 없음 — Ek-17 표의 번호 붙은 항목 수",
        "counted": len(numbers),
        "source_version": f"{spec['version']}; Ek-17 파일 날짜 {ek17_date}",
        "notes": [f"Ek-17 항목 {len(numbers)}개(번호 {numbers[0]}–{numbers[-1]}), 부속 목록 물질 행: "
                  + ", ".join(f"{k} {v}" for k, v in per_app.items())],
        "files": files}}
