"""Regulatory lookups across sources for one chemical (NCIS, KISCHEM, NIOSH, ECHA, CompTox).

Moved out of backend/api/routes/regulations.py. The source adapters and the open TerminologyDB are passed
in by the route, so this module imports no API/route code and tests can swap any source.

- build_intelligence(): per-chemical lookup with search-term fallbacks; NCIS synonyms are fed back as aliases.
- build_aggregate_search(): one free-text query against every source.
"""
from __future__ import annotations

import json
from typing import Any, Callable

from backend.core.chemical_aliases import extract_terms_for_regulatory_search

# Fields that identify one record per source (used to drop duplicates).
SOURCE_KEY_FIELDS = {
    "ncis": ("cas_no", "ke_no", "name_ko"),
    "kischem": ("cas_no", "data_no", "name_ko"),
    "niosh": ("cas", "name"),
    "echa": ("rml_id", "cas_number", "name"),
    "comptox": ("dtxsid", "casrn", "preferredName"),
}
NCIS_ALIAS_FIELDS = ("name_ko", "name_en", "synonyms_ko", "synonyms_en")
NCIS_ALIAS_CONFIDENCE = 0.82
ALIAS_LIMIT = 24
SEARCH_TERM_LIMIT = 8


def _merge_unique_items(items: list[dict], key_fields: tuple[str, ...]) -> list[dict]:
    merged: list[dict] = []
    seen: set[str] = set()
    for item in items:
        if not isinstance(item, dict):
            continue
        key_parts = [str(item.get(field, "")).strip() for field in key_fields]
        key = "|".join(part for part in key_parts if part)
        if not key:
            key = json.dumps(item, sort_keys=True, ensure_ascii=False)
        if key in seen:
            continue
        seen.add(key)
        merged.append(item)
    return merged


def _source_payload_from_result(result: dict, *, key_fields: tuple[str, ...], query_used: str = "", available: bool = True) -> dict:
    status = result.get("status")
    data = result.get("data", []) if status == "success" else []
    if isinstance(data, dict):
        data = [data]
    payload = {
        "query_used": query_used,
        "available": available,
        "data": _merge_unique_items(data if isinstance(data, list) else [], key_fields),
        "total": int(result.get("total", 0) or 0),
    }
    if status == "disabled":
        payload["available"] = False
        payload["message"] = result.get("message", "API key not configured")
    elif status and status != "success":
        payload["error"] = result.get("message", "Unknown error")
    return payload


def _search_first_success(search_terms: list[str], search_fn: Callable[[str], dict]) -> tuple[dict, str]:
    first_error: dict | None = None
    for term in search_terms:
        if not term:
            continue
        result = search_fn(term)
        if result.get("status") == "success" and result.get("total", 0) > 0:
            return result, term
        if first_error is None and result.get("status") != "success":
            first_error = result
    return first_error or {"status": "success", "data": [], "total": 0}, (search_terms[0] if search_terms else "")


def _cas_first(cas_no: str, search_terms: list[str]) -> list[str]:
    terms = [cas_no] if cas_no else []
    terms.extend(term for term in search_terms if term != cas_no)
    return terms


def _ncis_aliases(items: list[dict]) -> list[str]:
    aliases: list[str] = []
    for item in items:
        aliases.extend(value for value in [item.get(field) for field in NCIS_ALIAS_FIELDS] if value)
    return aliases


def _chemical_summary(meta: dict, cas_no: str) -> dict:
    return {
        "id": meta.get("id"),
        "name": meta.get("name", ""),
        "name_en": meta.get("name_en", ""),
        "cas_no": cas_no,
        "source": meta.get("source", ""),
    }


def build_intelligence(db, chem_id: str, limit: int, *, ncis, kischem, niosh, echa, comptox) -> dict[str, Any]:
    meta = db.get_chemical_meta_by_chem_id(chem_id) or db.get_chemical_meta_by_cas(chem_id)
    if not meta:
        return {"chem_id": chem_id, "chemical": None, "aliases": [], "search_terms": [], "sources": {}}

    aliases = db.get_aliases_for_chemical(chem_id, limit=ALIAS_LIMIT)
    search_terms = extract_terms_for_regulatory_search(
        name=meta.get("name"),
        name_en=meta.get("name_en"),
        cas_no=meta.get("cas_no"),
        aliases=[item["alias"] for item in aliases],
        limit=SEARCH_TERM_LIMIT,
    )
    cas_no = (meta.get("cas_no") or "").strip()

    ncis_result, ncis_query = _search_first_success(
        [cas_no] if cas_no else search_terms,
        lambda term: ncis.search_by_cas(term) if term == cas_no and cas_no else ncis.search_by_name(term),
    )
    ncis_payload = _source_payload_from_result(ncis_result, key_fields=SOURCE_KEY_FIELDS["ncis"], query_used=ncis_query)
    if ncis_payload["data"]:
        discovered_aliases = _ncis_aliases(ncis_payload["data"])
        if discovered_aliases:
            db.add_external_aliases(
                chem_id=chem_id,
                aliases=discovered_aliases,
                alias_type="ncis_synonym",
                source="NCIS",
                confidence=NCIS_ALIAS_CONFIDENCE,
            )
            aliases = db.get_aliases_for_chemical(chem_id, limit=ALIAS_LIMIT)

    kischem_result, kischem_query = _search_first_success(
        [cas_no] if cas_no else search_terms,
        lambda term: kischem.get_by_cas(term) if term == cas_no and cas_no else kischem.search(keyword=term, num_of_rows=limit),
    )
    kischem_payload = _source_payload_from_result(kischem_result, key_fields=SOURCE_KEY_FIELDS["kischem"], query_used=kischem_query)

    niosh_result, niosh_query = _search_first_success(_cas_first(cas_no, search_terms), lambda term: niosh.search(term, limit=limit))
    niosh_payload = _source_payload_from_result(niosh_result, key_fields=SOURCE_KEY_FIELDS["niosh"], query_used=niosh_query)

    echa_result, echa_query = _search_first_success(search_terms, lambda term: echa.search_substance(term, page=1, page_size=limit))
    echa_payload = _source_payload_from_result(echa_result, key_fields=SOURCE_KEY_FIELDS["echa"], query_used=echa_query)

    comptox_result, comptox_query = _search_first_success(_cas_first(cas_no, search_terms), lambda term: comptox.search_chemical(term))
    comptox_payload = _source_payload_from_result(
        comptox_result,
        key_fields=SOURCE_KEY_FIELDS["comptox"],
        query_used=comptox_query,
        available=comptox_result.get("status") != "disabled",
    )

    return {
        "chem_id": chem_id,
        "chemical": _chemical_summary(meta, cas_no),
        "aliases": aliases,
        "search_terms": search_terms,
        "sources": {
            "ncis": ncis_payload,
            "kischem": kischem_payload,
            "niosh": niosh_payload,
            "echa": echa_payload,
            "comptox": comptox_payload,
        },
    }


def _aggregate_block(result: dict, *, disabled_aware: bool = False) -> dict:
    if result.get("status") == "success":
        return {"data": result.get("data", []), "total": result.get("total", 0)}
    if disabled_aware and result.get("status") == "disabled":
        return {"available": False, "message": "API key not configured", "data": [], "total": 0}
    return {"error": result.get("message", "Unknown error"), "data": [], "total": 0}


def build_aggregate_search(q: str, page: int, limit: int, *, echa, comptox, niosh, kischem, ncis) -> dict[str, Any]:
    """Query every source in a fixed order: ECHA, CompTox (key optional), NIOSH, KISCHEM, NCIS."""
    query = q.strip()
    results: dict = {"query": q, "sources": {}}
    results["sources"]["echa"] = _aggregate_block(echa.search_substance(query, page=page, page_size=limit))
    results["sources"]["comptox"] = _aggregate_block(comptox.search_chemical(query), disabled_aware=True)
    results["sources"]["niosh"] = _aggregate_block(niosh.search(query, limit=limit))
    results["sources"]["kischem"] = _aggregate_block(kischem.search(keyword=query, num_of_rows=limit))
    results["sources"]["ncis"] = _aggregate_block(ncis.search_by_name(query))
    return results


def handling_profile(meta: dict, aliases: list[dict], chem_id: str, handlers, *, year: int, accident_years: int,
                     facility_limit: int) -> dict[str, Any]:
    """PRTR / facility / accident profile for /api/regulations/handlers/{chem_id}."""
    if not meta:
        return {
            "chem_id": chem_id,
            "chemical": None,
            "query": {"cas_no": chem_id, "terms": [chem_id], "year": year},
            "sources": handlers.build_profile(cas_no=chem_id, aliases=[chem_id], year=year, accident_years=accident_years, facility_limit=facility_limit)["sources"],
        }

    profile = handlers.build_profile(
        cas_no=meta.get("cas_no", ""),
        name=meta.get("name", ""),
        name_en=meta.get("name_en", ""),
        aliases=[item["alias"] for item in aliases if item.get("alias")],
        year=year,
        accident_years=accident_years,
        facility_limit=facility_limit,
    )
    return {
        "chem_id": chem_id,
        "chemical": _chemical_summary(meta, meta.get("cas_no", "")),
        **profile,
    }
