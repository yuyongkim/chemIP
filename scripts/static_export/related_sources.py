"""Read-only inputs of the related-substances step (related.py): features, names, well-known substances.

- law: Korean statutory list memberships, from the same list files trade_controls reads (entries + family entries),
  via the backend loader (db.py opens everything read-only). Not-statutory files (_index*, *_unverified) are skipped.
- ghs: KOSHA MSDS section 2 H-statements (item B0406) -> hazard class keys (related_hazards.json).
- fam: curated families (related_families.json).
- names: seed list name > KOSHA name with Hangul > NCIS name; English from KOSHA name_en, then NCIS.
"""
from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET

import config
import db
from backend.core.trade_controls import lists as tl

_CAS_RE = re.compile(config.CAS_PATTERN)
_HANGUL = re.compile(r"[가-힣]")
_KO_EN_NOTE = re.compile(r"^(.*[가-힣].*?)\(([^()가-힣]+)\)$")
_H_CODE = re.compile(r"\b(H\d{3}[A-Za-z]{0,2})\b")
_SEED_ENTRY = re.compile(r'\{\s*cas:\s*"([^"]+)"\s*,\s*ko:\s*"([^"]*)"\s*\}')
H_ITEM = "B0406"  # KOSHA msdsItemCode: hazard statements


def is_statutory(list_id: str) -> bool:
    return bool(list_id) and not list_id.startswith("_") and "unverified" not in list_id.lower()


def _norm(cas) -> str:
    c = tl.normalize_cas(cas)
    return c if _CAS_RE.match(c) else ""


def law_index() -> tuple[dict[str, set[str]], dict[str, str]]:
    """CAS -> statutory list_ids, and list_id -> Korean title (rulebook metadata)."""
    idx: dict[str, set[str]] = {}
    titles: dict[str, str] = {}
    for data in tl.load_kr_law_lists():
        lid = data.get("list_id") or ""
        if not is_statutory(lid):
            continue
        titles[lid] = data.get("title") or lid
        for e in data.get("entries") or []:
            if isinstance(e, dict) and _norm(e.get("cas")):
                idx.setdefault(_norm(e.get("cas")), set()).add(lid)
        for f in data.get("family_entries") or []:  # same rule as lists._family_matches (selection.py does the same)
            if not isinstance(f, dict):
                continue
            members = f.get("cas_list") or f.get("members") or []
            cas_set = {_norm(f.get("cas"))}
            if isinstance(members, list):
                cas_set |= {_norm(m.get("cas") if isinstance(m, dict) else m) for m in members}
            for c in cas_set - {""}:
                idx.setdefault(c, set()).add(lid)
    return idx, titles


def h_codes(xml: str | None) -> set[str]:
    """H-statement codes of one KOSHA section 2 XML (item B0406 only)."""
    if not xml:
        return set()
    try:
        root = ET.fromstring(xml.encode("utf-8") if isinstance(xml, str) else xml)
    except ET.ParseError:
        return set()
    out: set[str] = set()
    for item in root.iter("item"):
        if (item.findtext("msdsItemCode") or "").strip() == H_ITEM:
            for part in (item.findtext("itemDetail") or "").split("|"):
                m = _H_CODE.match(part.strip())
                if m:
                    out.add(m.group(1))
    return out


def clean_name(name: str) -> str:
    """'포름알데히드 ( 관용명 : 폼알데하이드 ) (…)' -> '포름알데히드'. Pure."""
    s = re.sub(r"\s+", " ", str(name or "")).strip()
    cut = s.find(" (")  # only a spaced note: '디(2-에틸헥실)프탈레이트' keeps its locant bracket
    s = s[:cut].strip() if cut >= 2 else s
    m = _KO_EN_NOTE.match(s)  # '다이아이소노닐 프탈산(DIISONONYL PHTHALATE)' -> '다이아이소노닐 프탈산'
    s = m.group(1).strip() if m else s
    return s.capitalize() if s.isascii() and s.isupper() and len(s) > 3 else s  # 'METHANE' -> 'Methane'


def kosha_rows() -> dict[str, dict]:
    """CAS -> {chem_ids, name, name_en, hazards: set[H-code]} for KOSHA substances with a valid CAS."""
    conn = db.ro_connect()
    try:
        rows: dict[str, dict] = {}
        by_chem: dict[str, str] = {}
        for chem_id, cas, name, name_en in conn.execute(
                "SELECT external_id, cas_no, name, name_en FROM chemical_terms WHERE source = 'KOSHA' ORDER BY external_id"):
            c = _norm(cas)
            if not c:
                continue
            r = rows.setdefault(c, {"chem_ids": [], "name": name or "", "name_en": name_en or "", "hazards": set()})
            r["chem_ids"].append(chem_id)
            r["name_en"] = r["name_en"] or (name_en or "")
            by_chem[chem_id] = c
        for chem_id, xml in conn.execute("SELECT chem_id, xml_data FROM msds_details WHERE section_no = 2"):
            c = by_chem.get(chem_id)
            if c:
                rows[c]["hazards"] |= h_codes(xml)
        return rows
    finally:
        conn.close()


def ncis_names() -> dict[str, tuple[str, str]]:
    conn = db.ro_connect()
    try:
        out = {}
        for cas, ko, en in conn.execute("SELECT cas_no, name_kor, name_eng FROM ncis_substance"):
            c = _norm(cas)
            if c:
                out[c] = ((ko or "").split(";")[0].strip(), (en or "").split(";")[0].strip())
        return out
    finally:
        conn.close()


def seed_names(path: str = config.SEED_TS) -> dict[str, str]:
    with open(path, encoding="utf-8") as fh:
        return {cas: ko for cas, ko in _SEED_ENTRY.findall(fh.read()) if _CAS_RE.match(cas)}


def load_json(path: str) -> dict:
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def display_name(cas: str, kosha: dict | None, ncis: tuple[str, str] | None, seed: str | None) -> tuple[str, str]:
    """(Korean, English) display name. Pure."""
    k_name = clean_name((kosha or {}).get("name", ""))
    n_ko, n_en = ncis or ("", "")
    ko = seed or (k_name if _HANGUL.search(k_name) else "") or n_ko or k_name or cas
    en = clean_name((kosha or {}).get("name_en", "")) or n_en
    return ko, en
