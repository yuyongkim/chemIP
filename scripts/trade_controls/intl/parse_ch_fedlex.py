"""Switzerland: Fedlex (official publication platform) files, German text (legally binding; EN is unofficial).

- PIC-Verordnung (ChemPICV, SR 814.82) consolidated Akoma Ntoso XML: Annex 1 (banned / severely restricted in CH ->
  export notification) and Annex 2 (PIC procedure) tables 'Stoff | Relevante CAS-Nummer(n) | Kategorie'.
  Rows whose name is a bullet ('– Aktinolith') are members of the row above and are named '<lead> — <member>'.
- ChemRRV (SR 814.81) consolidated XML: restrictions are written partly as tables, partly in the legal text.
  Every CAS printed in Annex 1.x / 2.x becomes an entry with that annex number. Table rows give the substance name
  (first cell); in running text the name is the words just before the CAS ('... Verwendung von Toluol (CAS-Nr.').
  Footnotes (<authorialNote>) are dropped first.
- ChemV Annex 3 Candidate List xlsx (attachment of the amending act, fedlex 'oce'): one row per substance,
  group entries in several rows; one ECHA decision link per entry (= official entry count).
The German text writes CAS with U+2011 (non-breaking hyphen); it is read as '-'.
"""
from __future__ import annotations

import html
import re
from pathlib import Path

from intl_common import cas_tokens, clean, entry, fetch, file_info, split_entries
from intl_xlsx import cas_in_cell, cell, sheet_rows

NOTE = re.compile(r"<authorialNote\b.*?</authorialNote>", re.S)


def _plain(fragment: str) -> str:
    return clean(html.unescape(re.sub(r"<[^>]+>", " ", fragment)).replace("‑", "-"))


def _read(path: Path) -> str:
    return NOTE.sub(" ", path.read_text(encoding="utf-8")).replace("‑", "-")


def _segments(xml: str, pattern: str) -> list[tuple[str, str]]:
    """[(eId, text)] for every top level eId matching pattern (e.g. 'annex_\\d+' or 'annex_\\d+_\\d+'), in order."""
    first: dict[str, int] = {}
    for m in re.finditer(rf'eId="({pattern})[/"]', xml):
        first.setdefault(m.group(1), m.start())
    items = sorted(first.items(), key=lambda x: x[1])
    return [(e, xml[s:(items[i + 1][1] if i + 1 < len(items) else len(xml))]) for i, (e, s) in enumerate(items)]


def _rows(seg: str) -> list[list[str]]:
    return [[_plain(c) for c in re.findall(r"<t[dh]\b[^>]*>(.*?)</t[dh]>|<t[dh]\b[^>]*/>", r, re.S)]
            for r in re.findall(r"<tr\b.*?</tr>", seg, re.S)]


def pic_annex(seg: str, label: str) -> tuple[list[dict], int]:
    out: list[dict] = []
    lead = ""
    counted = 0
    for cells in _rows(seg):
        if len(cells) < 2 or cells[0].startswith(("Stoff", "Substance")) or not cells[0]:
            continue
        name, cas_cell, cat = cells[0], cells[1], (cells[2] if len(cells) > 2 else "")
        member = name.startswith(("–", "-"))
        if member:
            name = f"{lead} — {name.lstrip('–- ').strip()}"
        else:
            lead = name
            counted += 1
        detail = "; ".join(p for p in (label, cat, "auch PIC-Verfahren (#)" if "#" in name else "",
                                       "CAS: " + cas_cell if "weitere" in cas_cell or "*" in cas_cell else "") if p)
        cas = cas_tokens(cas_cell)
        out.append(entry("", name.replace("#", "").strip(), detail, cas_all=cas, match_method="law_cas" if cas else "no_cas"))
    return out, counted


def _context_name(before: str) -> str:
    """Words right before a CAS in running text: '... Verwendung von Toluol (CAS-Nr.' -> 'Toluol'."""
    text = re.sub(r"\(?\s*(CAS[- ]?(Nr\.|No\.?|Nummer)?|CAS-Nummern?)\s*:?\s*$", "", before.strip()).strip(" (,;:")
    text = re.split(r"[;:]|\bvon\b|\bmit\b|\ban\b|\boder\b|\bsowie\b|\bund\b(?=[^()]*$)", text)[-1]
    text = re.sub(r"^[\s(),]*(und\s+)?", "", clean(text)[-100:]).strip(" (,")
    return text or "(Name im Text)"


def chemrrv(xml: str) -> tuple[list[dict], int, list[str]]:
    out: list[dict] = []
    annexes = []
    for eid, seg in _segments(xml, r"annex_\d+_\d+"):
        num = eid.replace("annex_", "").replace("_", ".")
        head = re.search(r"<heading[^>]*>(.*?)</heading>", seg, re.S)
        title = _plain(head.group(1)) if head else ""
        label = f"ChemRRV Anhang {num} {title}".strip()
        found = 0
        for t in re.findall(r"<table\b.*?</table>", seg, re.S):
            for cells in _rows(t):
                cas = cas_tokens(" ".join(cells))
                # name = first cell with letters (a leading '4.' is the entry number), cut before 'EG-Nr.' / 'CAS-Nr.'
                first = next((c for c in cells if re.search(r"[A-Za-zÄÖÜäöü]{3}", c)), "")
                name = re.split(r"\s*\(?\b(?:EG|EC|CAS)[- ]?Nr", first)[0].strip(" ,;(")
                if cas and name:
                    rest = [c for c in cells if c and c != name and not re.fullmatch(r"[\d.]+", c)]
                    out.append(entry("", name[:200], "; ".join([label, *rest])[:300], cas_all=cas, match_method="law_cas"))
                    found += len(cas)
        prose = re.sub(r"<table\b.*?</table>", " ", seg, flags=re.S)
        for p in re.findall(r"<p\b[^>]*>(.*?)</p>", prose, re.S):
            text = _plain(p)
            prev = 0  # the name of a CAS is looked for only after the previous CAS in the same paragraph
            for m in re.finditer(r"\b\d{2,7}-\d{2}-\d\b", text):
                name = _context_name(text[prev:m.start()])
                prev = m.end()
                out.append(entry("", name, f"{label}; Text: {text[:200]}",
                                 cas_all=[m.group(0)], match_method="law_cas", name_source="text_context"))
                found += 1
        if found:
            annexes.append(num)
    return out, len(annexes), annexes


def candidate(path: Path) -> tuple[list[dict], int, int | None, str]:
    rows = sheet_rows(path, 0)
    title = cell(rows[0][0])
    m = re.search(r"enthält (\d+) Stoffe", title)
    h = next(i for i, r in enumerate(rows) if cell(r[0]).startswith("Name des Stoffs"))
    out, decisions = [], set()
    for r in rows[h + 1:]:
        name = cell(r[0])
        if not name:
            continue
        decisions.add(cell(r[5]) or name)
        cas = cas_in_cell(r[3])
        detail = "; ".join(p for p in (f"EG {cell(r[2])}" if cell(r[2]) not in ("", "-") else "",
                                       cell(r[4]).replace("#", ", "), cell(r[1])) if p)
        out.append(entry("", name, detail[:300], cas_all=cas, match_method="law_cas" if cas else "no_cas"))
    return out, len(decisions), int(m.group(1)) if m else None, title


def _result(rows, counted, official, basis, version, files, notes=None) -> dict:
    entries, families, bad = split_entries(rows)
    return {"entries": entries, "family_entries": families, "problems": [f"invalid CAS in source: {bad}"] if bad else [],
            "official_count": official, "official_count_basis": basis, "counted": counted,
            "source_version": version, "files": files, "notes": notes or []}


def collect(spec: dict, raw_dir: Path, offline: bool) -> dict:
    d = spec["downloads"]
    get = {k: fetch(v["url"], raw_dir / "ch" / v["file"], offline) for k, v in d.items()}
    info = {k: [file_info(get[k], d[k]["url"])] for k in d}
    out = {}
    pic = _read(get["pic"])
    segs = dict(_segments(pic, r"annex_\d+"))
    for key, eid, label in (("pic_annex1", "annex_1", "PIC-V Anhang 1"), ("pic_annex2", "annex_2", "PIC-V Anhang 2")):
        rows, counted = pic_annex(segs[eid], label)
        out[key] = _result(rows, counted, None, "법령 표에 총 건수 기재 없음 — 표의 물질 행 수(하위 '–' 행 제외)",
                           d["pic"]["version"], info["pic"])
    rows, n_annex, annexes = chemrrv(_read(get["chemrrv"]))
    out["chemrrv"] = _result(rows, n_annex, None, "CAS 가 적힌 ChemRRV 부속서 절 수", d["chemrrv"]["version"], info["chemrrv"],
                             [f"CAS 가 적힌 부속서 절: {', '.join(annexes)}",
                              "본문 서술 속 CAS 는 바로 앞 단어를 물질명으로 적었다(name_source=text_context). 제한 조건은 detail 의 원문 발췌와 법령 원문 확인."])
    rows, decisions, official, title = candidate(get["candidate"])
    out["candidate"] = _result(rows, decisions, official, "엑셀 머리글 'enthält N Stoffe und Stoffgruppen' vs ECHA 결정 링크 수",
                               f"{d['candidate']['version']} — {title[:120]}", info["candidate"])
    return out
