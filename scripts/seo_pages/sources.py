"""Bulk read-only loaders over terminology.db and the SPA's country-name file. No scoring, no HTML.

Every function returns plain dicts keyed by CAS or chem_id so selection can score ~13k substances quickly.
"""
from __future__ import annotations

import json
import re

import config
from backend_ro import base_category, ro_connect

CAS_RE = re.compile(r"^\d{2,7}-\d{2}-\d$")


def kosha_substances() -> dict[str, dict]:
    """CAS -> KOSHA row {chem_id, name, name_en}. One row per CAS; prefers a chem_id that has MSDS section 2."""
    conn = ro_connect()
    try:
        with_s2 = {r[0] for r in conn.execute("SELECT chem_id FROM msds_details WHERE section_no = 2")}
        rows = conn.execute(
            "SELECT external_id, cas_no, name, name_en FROM chemical_terms WHERE source = 'KOSHA' ORDER BY external_id"
        ).fetchall()
    finally:
        conn.close()
    out: dict[str, dict] = {}
    for chem_id, cas, name, name_en in rows:
        cas = (cas or "").strip()
        if not chem_id or not CAS_RE.match(cas):
            continue
        cur = out.get(cas)
        row = {"chem_id": chem_id, "name": (name or "").strip(), "name_en": (name_en or "").strip(),
               "has_s2": chem_id in with_s2}
        if cur is None or (row["has_s2"] and not cur["has_s2"]):
            out[cas] = row
    return out


def msds_section2(chem_ids: set[str]) -> dict[str, str]:
    """chem_id -> raw KOSHA section-2 XML (hazard identification)."""
    conn = ro_connect()
    try:
        rows = conn.execute("SELECT chem_id, xml_data FROM msds_details WHERE section_no = 2").fetchall()
    finally:
        conn.close()
    return {cid: xml for cid, xml in rows if cid in chem_ids and xml}


def ncis_substances() -> dict[str, dict]:
    """CAS -> NCIS {name_kor, name_eng, synonyms_kor, synonyms_eng, categories (base names), fetched_at}."""
    conn = ro_connect()
    try:
        rows = conn.execute(
            "SELECT cas_no, name_kor, name_eng, name2_kor, name2_eng, classifications, fetched_at FROM ncis_substance"
        ).fetchall()
    finally:
        conn.close()
    out: dict[str, dict] = {}
    for cas, nk, ne, n2k, n2e, classes, fetched in rows:
        try:
            raw = json.loads(classes or "[]")
        except ValueError:
            raw = []
        cats = {base_category(c.get("sbstnClsfTypeNm", "")) for c in raw if isinstance(c, dict)} - {""}
        out[(cas or "").strip()] = {
            "name_kor": (nk or "").strip(), "name_eng": (ne or "").strip(),
            "synonyms_kor": _split(n2k), "synonyms_eng": _split(n2e),
            "categories": cats, "fetched_at": (fetched or "")[:10],
        }
    return out


def intl_regulatory_codes() -> dict[str, set[str]]:
    """CAS -> regulation codes in intl_regulatory (inputs to permit/rule triggers, same as substance.regulation_codes)."""
    conn = ro_connect()
    try:
        rows = conn.execute("SELECT cas_no, regulation FROM intl_regulatory WHERE cas_no IS NOT NULL").fetchall()
    finally:
        conn.close()
    out: dict[str, set[str]] = {}
    for cas, reg in rows:
        if reg:
            out.setdefault(cas.strip(), set()).add(reg)
    return out


_JUR_RE = re.compile(r'^\s*([A-Z]{2,4}):\s*\{\s*ko:\s*"([^"]*)",\s*en:\s*"([^"]*)"', re.M)


def jurisdiction_names() -> dict[str, dict]:
    """code -> {ko, en} from frontend intl_regions.jsx (INTL_JURISDICTIONS), the SPA's single source of country names."""
    with open(config.INTL_REGIONS_JSX, encoding="utf-8") as fh:
        text = fh.read()
    return {code: {"ko": ko, "en": en} for code, ko, en in _JUR_RE.findall(text)}


def _split(value: str | None) -> list[str]:
    return [s.strip() for s in (value or "").split(";") if s.strip()]
