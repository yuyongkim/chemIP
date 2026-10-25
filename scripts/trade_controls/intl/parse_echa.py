"""ECHA obligation lists from ECHA CHEM (chem.echa.europa.eu), the JSON API behind its list pages.

  /api-obligation-list/v1/{listType}?pageIndex=N&pageSize=200[&showMembers=true]
listType: candidateList (REACH SVHC Candidate List), authorisationList (REACH Annex XIV),
restrictionList (REACH Annex XVII; showMembers=true expands group entries into member substances),
popsList (POPs Regulation (EU) 2019/1021 annexes). state.totalItems is ECHA's own count (official count).
The echa.europa.eu list pages sit behind a browser challenge; the ECHA CHEM API serves the same lists.
"""
from __future__ import annotations

import json
from pathlib import Path

from intl_common import clean, entry, fetch, file_info, split_entries

API = "https://chem.echa.europa.eu/api-obligation-list/v1/{list_type}?pageIndex={page}&pageSize={size}{extra}"
PAGE_SIZE = 200


def _pages(list_type: str, raw_dir: Path, offline: bool, members: bool = False) -> tuple[list[dict], int, list[dict]]:
    """All items of one list. Returns (items, totalItems, file infos)."""
    extra = "&showMembers=true" if members else ""
    tag = f"{list_type}{'_members' if members else ''}"
    items: list[dict] = []
    files: list[dict] = []
    page, total = 1, None
    while True:
        url = API.format(list_type=list_type, page=page, size=PAGE_SIZE, extra=extra)
        path = fetch(url, raw_dir / "echa" / f"{tag}_p{page:03d}.json", offline, headers={"Accept": "application/json"})
        data = json.loads(path.read_text(encoding="utf-8"))
        files.append(file_info(path, url))
        items.extend(data.get("items") or [])
        total = int((data.get("state") or {}).get("totalItems") or 0)
        if len(items) >= total or not data.get("items"):
            return items, total, files
        page += 1


def _cas_list(item: dict) -> list[str]:
    return [c.strip() for c in item.get("casNumber") or [] if c and c.strip() not in ("-", "")]


def _name(item: dict) -> str:
    return clean(" / ".join(n for n in item.get("substanceName") or [] if n))


def _ec(item: dict) -> str:
    ecs = [e for e in item.get("ecNumber") or [] if e and e != "-"]
    return f"EC {', '.join(ecs)}" if ecs else ""


def _join(*parts: str) -> str:
    return "; ".join(p for p in parts if p)


def _result(rows: list[dict], total: int, counted: int, files: list[dict], version: str, notes=None) -> dict:
    entries, families, bad = split_entries(rows)
    problems = [f"invalid CAS in source: {bad}"] if bad else []
    return {"entries": entries, "family_entries": families, "problems": problems, "official_count": total,
            "official_count_basis": "ECHA CHEM API state.totalItems", "counted": counted,
            "source_version": version, "notes": notes or [], "files": files}


def _latest(items: list[dict], field: str) -> str:
    from datetime import datetime

    dates = []
    for it in items:
        try:
            dates.append(datetime.strptime(it.get(field) or "", "%d-%b-%Y"))
        except ValueError:
            continue
    return max(dates).date().isoformat() if dates else ""


def _member_rows(members: list[dict], label_of: dict[str, str]) -> list[dict]:
    """Group members (showMembers=true) that are not the entry itself -> rows under their parent entry."""
    rows = []
    for m in members:
        if m.get("rmlId") == m.get("parentRmlId"):
            continue  # the entry itself (already a row)
        parent = clean(" / ".join(m.get("parentSubstanceName") or []))[:160]
        rows.append(entry("", _name(m), _join(label_of.get(m.get("parentRmlId"), ""), f"group: {parent}", _ec(m),
                                              m.get("association", "")), cas_all=_cas_list(m)))
    return rows


def _list(list_type: str, raw_dir: Path, offline: bool, detail_of, version_of) -> dict:
    """Entries of one ECHA list plus the member substances of its group entries."""
    items, total, files = _pages(list_type, raw_dir, offline)
    members, m_total, m_files = _pages(list_type, raw_dir, offline, members=True)
    rows = [entry("", _name(it), detail_of(it), cas_all=_cas_list(it)) for it in items]
    label_of = {it["rmlId"]: detail_of(it).split(";")[0] for it in items}
    rows += _member_rows(members, label_of)
    notes = [f"ECHA CHEM: {total}개 항목, 그룹 항목 구성 물질 포함 {m_total}건(showMembers); 구성 물질도 entries 에 포함"]
    res = _result(rows, total, len(items), files + m_files, version_of(items, total, m_total), notes)
    if len(members) != m_total:
        res["problems"].append(f"members parsed {len(members)} vs totalItems {m_total}")
    return res


def candidate(raw_dir: Path, offline: bool) -> dict:
    return _list(
        "candidateList", raw_dir, offline,
        lambda it: _join(f"포함일 {it.get('dateOfInclusion', '')}", _ec(it), "; ".join(it.get("reasonForInclusion") or [])),
        lambda items, n, m: f"ECHA Candidate List {n} entries, 최근 포함일 {_latest(items, 'dateOfInclusion')}")


def authorisation(raw_dir: Path, offline: bool) -> dict:
    return _list(
        "authorisationList", raw_dir, offline,
        lambda it: _join(f"Annex XIV entry {it.get('entryNumber', '')}", _ec(it), f"sunset date {it.get('sunsetDate', '')}",
                         f"latest application date {it.get('latestApplicationDate', '')}",
                         "; ".join(it.get("reasonForInclusion") or [])),
        lambda items, n, m: f"REACH Annex XIV {n} entries")


def restriction(raw_dir: Path, offline: bool) -> dict:
    return _list(
        "restrictionList", raw_dir, offline,
        lambda it: _join(f"Annex XVII entry {it.get('entryNumber', '')}", _ec(it)),
        lambda items, n, m: f"REACH Annex XVII {n} entries / {m} substances")


def pops(raw_dir: Path, offline: bool) -> dict:
    return _list(
        "popsList", raw_dir, offline,
        lambda it: _join(", ".join(it.get("regulationAnnex") or []), f"포함일 {it.get('dateOfInclusion', '')}", _ec(it)),
        lambda items, n, m: f"Regulation (EU) 2019/1021 (ECHA) {n} entries, 최근 포함일 {_latest(items, 'dateOfInclusion')}")


def collect(spec: dict, raw_dir: Path, offline: bool) -> dict:
    return {
        "candidate": candidate(raw_dir, offline),
        "authorisation": authorisation(raw_dir, offline),
        "restriction": restriction(raw_dir, offline),
        "pops": pops(raw_dir, offline),
    }
