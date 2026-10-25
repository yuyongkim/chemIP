"""United Kingdom (Great Britain): HSE spreadsheets.

- UK REACH Candidate List (candidate-list.xlsx, sheet 'Candidate List'): one row per substance; group entries are
  split into rows by HSE. CAS '-' = none.
- UK REACH restrictions (list-of-restrictions.xlsx): 'Entry number' starts an entry, rows without a number continue it
  (named members with their own CAS). Count = entry numbers.
- GB PIC list (gb-pic-list.xlsx): sheets Part 1 (export notification), Part 2 (qualifying for PIC notification),
  Part 3 (PIC procedure), Parts 4–5 (export ban). A row with a chemical name starts an item; a row without a name but
  with CAS numbers continues it. The table ends at the first footnote row ('(*) ...').
- GB MCL list (mcl-list.xlsx, sheet 'GB MCL List'): one row per Index No; CAS cell may hold several numbers ([1], [2]).
Sheet names are matched without surrounding spaces (HSE files carry trailing spaces in some names).
"""
from __future__ import annotations

import datetime as dt
import re
from pathlib import Path

from intl_common import entry, fetch, file_info, split_entries
from intl_xlsx import cas_in_cell, cell, sheet_names, sheet_rows

FOOTNOTE = re.compile(r"^\(\*+\)|^\(\*\s*\*?\)")


def _sheet(path: Path, wanted: str) -> list[tuple]:
    for name in sheet_names(path):
        if name.strip().lower() == wanted.strip().lower():
            return sheet_rows(path, name)
    raise ValueError(f"sheet '{wanted}' not in {path.name}: {sheet_names(path)}")


def _header(rows: list[tuple], first_cell: tuple[str, ...]) -> tuple[int, list[str]]:
    """First row with a cell starting with one of first_cell and a CAS / 'Additional details' column."""
    for i, r in enumerate(rows):
        cells = [cell(c) for c in r]
        if (any(c.lower().startswith(first_cell) for c in cells if c)
                and any("cas" in c.lower() or "additional details" in c.lower() for c in cells if c)):
            return i, cells
    raise ValueError(f"header row starting with {first_cell} not found")


def _col(head: list[str], *needles: str) -> int:
    for needle in needles:
        for i, h in enumerate(head):
            if needle.lower() in h.lower():
                return i
    raise ValueError(f"column {needles} not in header {head}")


def _date(v) -> str:
    return v.date().isoformat() if isinstance(v, dt.datetime) else cell(v)


def _result(rows: list[dict], counted: int, official: int | None, basis: str, version: str, files: list[dict],
            notes: list[str] | None = None) -> dict:
    entries, families, bad = split_entries(rows)
    return {"entries": entries, "family_entries": families,
            "problems": [f"invalid CAS in source: {bad}"] if bad else [],
            "official_count": official, "official_count_basis": basis, "counted": counted,
            "source_version": version, "files": files, "notes": notes or []}


def candidate(path: Path, files: list[dict]) -> dict:
    rows = _sheet(path, "Candidate List")
    h, head = _header(rows, ("substance name",))
    c_name, c_ec, c_cas, c_reason, c_date = (_col(head, "Substance name"), _col(head, "EC No"), _col(head, "CAS No"),
                                            _col(head, "Reason"), _col(head, "Date of inclusion"))
    out, dates = [], []
    for r in rows[h + 1:]:
        name = cell(r[c_name])
        if not name:
            continue
        date = _date(r[c_date])
        dates.append(r[c_date] if isinstance(r[c_date], dt.datetime) else None)
        reason = cell(r[c_reason]).replace("#", ", ")
        detail = "; ".join(p for p in (f"포함일 {date}" if date else "", f"EC {cell(r[c_ec])}" if cell(r[c_ec]) not in ("", "-") else "", reason) if p)
        cas = cas_in_cell(r[c_cas])
        out.append(entry("", name, detail, cas_all=cas, match_method="law_cas" if cas else "no_cas"))
    latest = max((d for d in dates if d), default=None)
    version = f"HSE UK REACH Candidate List {len(out)} rows" + (f", 최근 포함일 {latest.date().isoformat()}" if latest else "")
    return _result(out, len(out), None, "HSE 표에 총 건수 기재 없음 — 물질 행 수(그룹 항목은 HSE 가 행으로 나눔)", version, files)


def restrictions(path: Path, files: list[dict]) -> dict:
    rows = sheet_rows(path, 0)
    h, head = _header(rows, ("entry",))
    c_no, c_name, c_cas, c_ec, c_cond = 0, 1, _col(head, "CAS"), _col(head, "EC No"), _col(head, "Conditions")
    out: list[dict] = []
    entries_seen: list[str] = []
    current = ""
    cond = ""
    for r in rows[h + 1:]:
        no, name = cell(r[c_no]), cell(r[c_name])
        if no:
            current, cond = no, cell(r[c_cond])
            entries_seen.append(no)
        if not name or not current:
            continue
        cas = cas_in_cell(r[c_cas])
        ec = cell(r[c_ec])
        detail = "; ".join(p for p in (f"UK REACH Annex XVII entry {current}", f"EC {ec}" if ec not in ("", "-") else "",
                                       cond[:200]) if p)
        out.append(entry("", name, detail, cas_all=cas, match_method="law_cas" if cas else "no_cas"))
    return _result(out, len(set(entries_seen)), None, "HSE 표에 총 건수 기재 없음 — 번호가 있는 제한 항목 수",
                   f"HSE UK REACH list of restrictions: {len(set(entries_seen))} entries", files,
                   [f"제한 항목 {len(set(entries_seen))}개, 물질 행 {len(out)}개. 제한 조건 원문은 detail 앞 200자만 담는다."])


def pic_part(path: Path, sheet: str, label: str, files: list[dict], version: str) -> dict:
    """Parts 1–3: columns found by header text. A row without a name but with CAS continues the item above."""
    rows = _sheet(path, sheet)
    h, head = _header(rows, ("chemical",))
    c_name, c_cas = _col(head, "Chemical"), _col(head, "CAS")
    extra = [(i, re.sub(r"\(\*+\)", "", hd).strip()) for i, hd in enumerate(head) if hd and i not in (c_name, c_cas)]
    out: list[dict] = []
    current: dict | None = None
    for r in rows[h + 1:]:
        cells = [cell(c) for c in r]
        if FOOTNOTE.match(next((c for c in cells if c), "")):
            break
        name = cells[c_name] if c_name < len(cells) else ""
        cas = cas_in_cell(r[c_cas]) if c_cas < len(r) else []
        if name:
            detail = "; ".join([label] + [f"{hd}: {cells[i]}" for i, hd in extra if i < len(cells) and cells[i]])
            current = entry("", name[:300], detail[:400], cas_all=cas, match_method="law_cas" if cas else "no_cas")
            out.append(current)
        elif current is not None and cas:
            current["cas_all"] = current.get("cas_all", []) + [c for c in cas if c not in current.get("cas_all", [])]
            current["match_method"] = "law_cas"
    return _result(out, len(out), None, "법령 표에 총 건수 기재 없음 — 표의 화학물질 행 수", version, files)


def ban_part(path: Path, sheet: str, label: str, files: list[dict], version: str, numbered: bool) -> dict:
    """Parts 4–5 (export ban): data cells sit one column right of the header, so cells are read in order:
    [No], description, additional details (EC / CAS / CN codes). In Part 5 a row without a number is the text of
    the exemption list under an entry and is not an item."""
    rows = _sheet(path, sheet)
    h, _ = _header(rows, ("description of chemicals", "no"))
    out: list[dict] = []
    for r in rows[h + 1:]:
        cells = [c for c in (cell(v) for v in r) if c]
        if not cells or FOOTNOTE.match(cells[0]):
            if cells:
                break
            continue
        no = cells[0] if re.fullmatch(r"\d+[A-Za-z]?", cells[0]) else ""
        if numbered and not no:
            continue
        rest = cells[1:] if no else cells
        name, details = rest[0], " ".join(rest[1:])
        cas = cas_in_cell(details) or cas_in_cell(name)
        detail = "; ".join(p for p in (label, f"entry {no}" if no else "", details[:300]) if p)
        out.append(entry("", name[:300], detail, cas_all=cas, match_method="law_cas" if cas else "no_cas"))
    return _result(out, len(out), None, "법령 표에 총 건수 기재 없음 — 표의 항목 행 수", version, files)


def mcl(path: Path, files: list[dict]) -> dict:
    rows = _sheet(path, "GB MCL List")
    h, head = _header(rows, ("index no",))
    c_idx, c_name, c_ec, c_cas = _col(head, "Index No"), _col(head, "Chemical name"), _col(head, "EC No"), _col(head, "CAS No")
    c_cls = _col(head, "Classification")
    c_hs = c_cls + 1
    out = []
    for r in rows[h + 2:]:  # second header row carries the sub-column names
        idx = cell(r[c_idx])
        if not idx:
            continue
        cls = ", ".join(x for x in re.split(r"\s*\n\s*|\s{2,}", str(r[c_cls] or "")) if x.strip())
        hs = ", ".join(x for x in re.split(r"\s*\n\s*|\s{2,}", str(r[c_hs] or "")) if x.strip())
        detail = "; ".join(p for p in (f"Index {idx}", f"EC {cell(r[c_ec])}" if cell(r[c_ec]) not in ("", "-", "—") else "",
                                       cls, hs) if p)
        cas = cas_in_cell(r[c_cas])
        out.append(entry("", cell(r[c_name])[:300], detail[:400], cas_all=cas, match_method="law_cas" if cas else "no_cas"))
    vlog = [v for v in _sheet(path, "Version log") if any(v)]
    edition = cell(vlog[-1][1])[:40] if vlog else ""
    return _result(out, len(out), len({cell(r[c_idx]) for r in rows[h + 2:] if cell(r[c_idx])}),
                   "GB MCL List 의 Index No 개수", f"HSE GB MCL List ({edition}) {len(out)} entries", files,
                   ["CAS 칸의 띄어쓰기('11138- 47-9')와 보이지 않는 소프트하이픈(U+00AD)은 지우고 읽었다(숫자는 바꾸지 않음, 체크디지트로 확인)."])


def page_updated(path: Path) -> str:
    """'Updated 2026-08-25' / 'Last updated: 22 September 2025' on an HSE page."""
    text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", path.read_text(encoding="utf-8", errors="replace")))
    m = re.search(r"Updated:? (\d{4}-\d{2}-\d{2}|\d{1,2} [A-Z][a-z]+ \d{4})", text)
    return m.group(1) if m else ""


def collect(spec: dict, raw_dir: Path, offline: bool) -> dict:
    paths, updated = {}, {}
    for key, d in spec["downloads"].items():
        p = fetch(d["url"], raw_dir / "gb" / d["url"].rsplit("/", 1)[-1], offline)
        page = fetch(d["page"], raw_dir / "gb" / ("page_" + d["page"].rsplit("/", 1)[-1]), offline)
        paths[key] = (p, [file_info(p, d["url"]), file_info(page, d["page"])])
        updated[key] = page_updated(page)
    pic_path, pic_files = paths["pic"]
    pic_version = f"HSE GB PIC list, page updated {updated['pic']}"
    out = {
        "candidate": candidate(*paths["candidate"]),
        "restrictions": restrictions(*paths["restrictions"]),
        "mcl": mcl(*paths["mcl"]),
        "pic_part1": pic_part(pic_path, "Part 1", "GB PIC Part 1", pic_files, pic_version),
        "pic_part2": pic_part(pic_path, "Part 2", "GB PIC Part 2", pic_files, pic_version),
        "pic_part3": pic_part(pic_path, "Part 3", "GB PIC Part 3", pic_files, pic_version),
    }
    ban4 = ban_part(pic_path, "Part 4", "GB PIC Part 4 (Stockholm POPs export ban)", pic_files, pic_version, False)
    ban5 = ban_part(pic_path, "Part 5", "GB PIC Part 5 (other export ban)", pic_files, pic_version, True)
    out["pic_export_ban"] = {**ban4, "entries": ban4["entries"] + ban5["entries"],
                             "family_entries": ban4["family_entries"] + ban5["family_entries"],
                             "problems": ban4["problems"] + ban5["problems"], "counted": ban4["counted"] + ban5["counted"],
                             "notes": [f"Part 4 {ban4['counted']}행 + Part 5 {ban5['counted']}행"]}
    for key in ("candidate", "restrictions", "mcl"):
        if updated.get(key):
            out[key]["source_version"] += f", page updated {updated[key]}"
    return out
