"""Every regulatory list ChemIP knows, as one shape — read-only.

    collect_lists() -> [ {id, group, jurisdiction, law, title, source_url, source_id, license,
                          amended_on, version, retrieved, rows: [[cas, name, name_en, detail], ...]} ]

Groups (reg_config.GROUPS):
  kr_law      backend/data/trade_controls/kr_lists/*.json   (the rulebook's kr_lists; `_index*` / unverified skipped)
  ncis        terminology.db ncis_substance classifications, one list per base category (the p/ `ncis` block)
  controlled  CWC schedules, Australia Group, drug precursors (the rulebook's controlled_lists)
  intl        backend/data/trade_controls/intl_lists/*.json  (the rulebook's intl_lists)
  intl_reg    terminology.db intl_regulatory, one list per regulation code (the p/ `intl.jurisdictions` listings)

A family entry (a group of substances without one CAS) is a row with cas "". Row order = source order.
Pure helpers (row_from_entry, ncis_list_id, trim) are tested in tests/test_reg_lists.py.
"""
from __future__ import annotations

import glob
import hashlib
import json
import os
import sqlite3
import sys

import reg_config as C

if C.PROJECT not in sys.path:
    sys.path.insert(0, C.PROJECT)

CONTROLLED_FILES = ("cwc_schedules.json", "australia_group.json", "drug_precursors.json")
SUBCATEGORY_SUFFIX = "세분류"  # backend/core/trade_controls/substance.py base_category


def trim(text, limit: int = C.DETAIL_CHARS) -> str:
    s = " ".join(str(text or "").split())
    return s if len(s) <= limit else s[: limit - 1] + "…"


def row_from_entry(e: dict, family: bool = False) -> list[str]:
    """One list entry (any of the three file formats) → [cas, name, name_en, detail]."""
    cas = "" if family else str(e.get("cas") or "").strip()
    name = e.get("name_ko") or e.get("name") or ""
    name_en = e.get("name_en") or ""
    if name_en == name:
        name_en = ""
    detail = e.get("detail") or ""
    if e.get("category") and e.get("category") not in detail:
        detail = f"{e['category']}; {detail}" if detail else e["category"]
    return [cas, trim(name, 160), trim(name_en, 160), trim(detail)]


def base_category(name: str) -> str:
    name = (name or "").strip()
    return name[: -len(SUBCATEGORY_SUFFIX)].strip() if name.endswith(SUBCATEGORY_SUFFIX) else name


def ncis_list_id(category: str) -> str:
    if category in C.NCIS_IDS:
        return C.NCIS_IDS[category]
    return "NCIS_X_" + hashlib.sha1(category.encode("utf-8")).hexdigest()[:8].upper()


def _read(path: str):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def _file_lists(paths, group: str, source_id: str) -> list[dict]:
    out = []
    for path in paths:
        d = _read(path)
        if not isinstance(d, dict) or not d.get("list_id"):
            continue  # _index.json, _index_product.json, KR_PRODUCT_unverified.json
        rows = [row_from_entry(e) for e in d.get("entries") or [] if isinstance(e, dict)]
        rows += [row_from_entry(e, family=True) for e in d.get("family_entries") or [] if isinstance(e, dict)]
        out.append({
            "id": d["list_id"], "group": group, "jurisdiction": d.get("jurisdiction") or ("INTL" if group == "controlled" else ""),
            "law": d.get("law") or "", "title": d.get("title") or d["list_id"], "source_url": d.get("source_url") or "",
            "source_id": source_id, "license": d.get("license") or C.SOURCES[source_id]["license"],
            "amended_on": d.get("amended_on") or "", "version": trim(d.get("source_version") or "", 200),
            "retrieved": d.get("retrieved") or "", "rows": rows,
        })
    return out


def kr_law_lists() -> list[dict]:
    return _file_lists(sorted(glob.glob(os.path.join(C.TRADE_DATA, "kr_lists", "*.json"))), "kr_law", "chemip_kr_lists")


def intl_lists() -> list[dict]:
    return _file_lists(sorted(glob.glob(os.path.join(C.TRADE_DATA, "intl_lists", "*.json"))), "intl", "chemip_intl_lists")


def controlled_lists() -> list[dict]:
    return _file_lists([os.path.join(C.TRADE_DATA, f) for f in CONTROLLED_FILES], "controlled", "chemip_controlled")


def _ro(path: str) -> sqlite3.Connection:
    return sqlite3.connect(f"file:{path.replace(os.sep, '/')}?mode=ro", uri=True)


def ncis_lists(conn: sqlite3.Connection) -> list[dict]:
    by_cat: dict[str, list] = {}
    for cas, name_ko, name_en, raw in conn.execute(
            "SELECT cas_no, name_kor, name_eng, classifications FROM ncis_substance ORDER BY cas_no"):
        try:
            classes = json.loads(raw or "[]")
        except ValueError:
            continue
        seen = set()
        for c in classes if isinstance(classes, list) else []:
            if not isinstance(c, dict):
                continue
            cat = base_category(c.get("sbstnClsfTypeNm", ""))
            if not cat or cat in seen:
                continue
            seen.add(cat)
            detail = "; ".join(x for x in ((c.get("unqNo") or "").strip(), (c.get("contInfo") or "").strip(),
                                           (c.get("ancmntInfo") or "").strip()) if x)
            by_cat.setdefault(cat, []).append([(cas or "").strip(), trim(name_ko, 160),
                                               trim("" if name_en == name_ko else name_en, 160), trim(detail)])
    src = C.SOURCES["chemip_ncis"]
    return [{"id": ncis_list_id(cat), "group": "ncis", "jurisdiction": "KR", "law": "화학물질관리법·화학물질의 등록 및 평가 등에 관한 법률",
             "title": cat, "source_url": src["url"], "source_id": "chemip_ncis", "license": src["license"],
             "amended_on": "", "version": "", "retrieved": "", "rows": rows}
            for cat, rows in sorted(by_cat.items(), key=lambda kv: -len(kv[1]))]


def merged_row(cas: str, item: dict) -> list[str]:
    """One merged listing (backend/core/intl_dedupe.py) → [cas, name, "", detail]: other spellings follow the name
    ("Ethylene; Ethene"), forms with their own value are joined in detail ("Ammonia (anhydrous): …; Ammonia (…): …")."""
    names = "; ".join([item["name"], *item.get("aka", [])]) if item.get("name") else ""
    if item.get("forms"):
        detail = "; ".join(f"{f['name']}: {f['detail']}" if f.get("name") else f["detail"] for f in item["forms"])
    else:
        detail = item.get("detail", "")
    return [cas, trim(names, 160), "", trim(detail)]


def intl_reg_lists(conn: sqlite3.Connection) -> list[dict]:
    """One list per regulation code, one row per CAS: name variants of a CAS on one list are merged like the p/ intl
    listings (backend/core/intl_dedupe.py), so a list counts a substance once."""
    from backend.core.intl_dedupe import merge_rows
    from backend.core.intl_regulatory_store import REGULATION_LABELS  # (jurisdiction, Korean list name) per code

    by_cas: dict[str, list[tuple[str, str, str, str]]] = {}
    no_cas: list[tuple[str, str, str, str]] = []  # rows without a CAS are kept one by one (nothing to merge on)
    sources: dict[str, str] = {}
    for code, cas, detail, source, name in conn.execute(
            "SELECT regulation, cas_no, detail, source, chemical_name FROM intl_regulatory ORDER BY regulation, cas_no, id"):
        row = (code, detail or "", source or "", name or "")
        (by_cas.setdefault((cas or "").strip(), []) if (cas or "").strip() else no_cas).append(row)
        sources.setdefault(code, source or "")
    by_code: dict[str, dict] = {}
    groups = [("", [r]) for r in no_cas] + [(cas, by_cas[cas]) for cas in sorted(by_cas)]
    for cas, rows in groups:
        for item in merge_rows(rows):
            code = item["regulation"]
            j, title = REGULATION_LABELS.get(code, ("OTHER", code))
            lst = by_code.setdefault(code, {"id": C.INTL_REG_PREFIX + code, "group": "intl_reg", "jurisdiction": j,
                                            "law": sources.get(code, ""), "title": title, "source_url": "",
                                            "source_id": "chemip_intl_regulatory",
                                            "license": C.SOURCES["chemip_intl_regulatory"]["license"],
                                            "amended_on": "", "version": "", "retrieved": "", "rows": []})
            lst["rows"].append(merged_row(cas, item))
    return [by_code[k] for k in sorted(by_code)]


def collect_lists(term_db: str = C.TERM_DB) -> list[dict]:
    lists = kr_law_lists() + controlled_lists() + intl_lists()
    conn = _ro(term_db)
    try:
        lists += ncis_lists(conn) + intl_reg_lists(conn)
    finally:
        conn.close()
    ids = [x["id"] for x in lists]
    dup = {i for i in ids if ids.count(i) > 1}
    if dup:
        raise SystemExit(f"duplicate list ids: {sorted(dup)}")
    order = {g: i for i, g in enumerate(C.GROUPS)}
    return sorted(lists, key=lambda x: order.get(x["group"], 99))


def cas_count(rows: list[list[str]]) -> int:
    return len({r[0] for r in rows if r[0]})
