"""International regulatory data routes.

Aggregates data from overseas regulatory agencies (ECHA, EPA CompTox, etc.)
"""

import json
import logging

from fastapi import APIRouter, Query

from backend.api.echa_adapter import EchaAdapter
from backend.api.comptox_adapter import CompToxAdapter
from backend.api.niosh_adapter import NioshAdapter
from backend.api.kischem_adapter import KischemAdapter
from backend.api.ncis_adapter import NcisAdapter
from backend.api.handlers_adapter import HandlingSiteAdapter
from backend.api.kotra_adapter import KotraAdapter
from backend.api.routes.utils import handle_adapter_result
from backend.core.chemical_aliases import extract_terms_for_regulatory_search
from backend.core.intl_regulatory_store import get_by_cas as get_international_by_cas
from backend.core.terminology_db import TerminologyDB
from backend.core.trade_controls import build_trade_controls
from backend.core.trade_controls.catalog import catalog as trade_catalog

router = APIRouter()
logger = logging.getLogger(__name__)

_echa = EchaAdapter()
_comptox = CompToxAdapter()
_niosh = NioshAdapter()
_kischem = KischemAdapter()
_ncis = NcisAdapter()
_handlers = HandlingSiteAdapter()
_kotra = KotraAdapter()


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


def _search_first_success(search_terms: list[str], search_fn) -> tuple[dict, str]:
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


def _load_chemical_context(chem_id: str) -> tuple[dict, list[dict]]:
    with TerminologyDB() as db:
        meta = db.get_chemical_meta_by_chem_id(chem_id) or db.get_chemical_meta_by_cas(chem_id)
        aliases = db.get_aliases_for_chemical(chem_id, limit=24) if meta else []
    return meta or {}, aliases


# ------------------------------------------------------------------
# ECHA endpoints
# ------------------------------------------------------------------

@router.get("/echa/search")
def echa_search(
    q: str = Query(..., min_length=1, description="Substance name, CAS, or EC number"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Search ECHA substance database (EU REACH/CLP)."""
    result = _echa.search_substance(q.strip(), page=page, page_size=limit)
    return handle_adapter_result(result)


@router.get("/echa/dossiers/{rml_id:path}")
def echa_dossier_list(rml_id: str):
    """Get REACH registration dossiers by substance rmlId (e.g. 100.000.685)."""
    result = _echa.get_dossier_list(rml_id)
    return handle_adapter_result(result)


@router.get("/echa/registrants/{rml_id:path}")
def echa_registrants(rml_id: str):
    """Get REACH registrant companies for a substance."""
    result = _echa.get_registrants(rml_id)
    return handle_adapter_result(result)


@router.get("/echa/clp/{rml_id:path}")
def echa_clp_classification(rml_id: str):
    """Get harmonised CLP classification for a substance by rmlId."""
    result = _echa.get_clp_classification(rml_id)
    return handle_adapter_result(result)


@router.get("/echa/labelling/{classification_id}")
def echa_clp_labelling(classification_id: str):
    """Get hazard statements and signal word for a CLP classification entry."""
    result = _echa.get_clp_labelling(classification_id)
    return handle_adapter_result(result)


@router.get("/echa/pictograms/{classification_id}")
def echa_clp_pictograms(classification_id: str):
    """Get GHS pictogram codes for a CLP classification entry."""
    result = _echa.get_clp_pictograms(classification_id)
    return handle_adapter_result(result)


@router.get("/international/{cas_no}")
def international_listings(cas_no: str):
    """국가별 물질 규제 목록 등재 내역(미국·EU·베트남·국제협약)을 CAS 로 조회한다."""
    return get_international_by_cas(cas_no)


def _kotra_import_restrictions(country_code: str, keyword: str) -> dict:
    """수출 상대국의 KOTRA 수입규제 품목(/api/trade/import-regulations 와 같은 조회)."""
    return _kotra.search_import_restriction_items(keyword=keyword, country_code=country_code, page_no=1, num_of_rows=10)


@router.get("/trade-controls-catalog")
def trade_controls_catalog():
    """자료 규모 요약: 국내 법령 목록 수·법령 수, 상대국 목록 수, 인허가 건수."""
    return trade_catalog()


@router.get("/trade-controls/{cas_no}")
def trade_controls(
    cas_no: str,
    direction: str = Query("import", pattern="^(import|export)$", description="import(한국으로 수입) | export(한국에서 수출)"),
    country: str = Query("", max_length=8, description="상대국 코드(US, VN, EU, INTL 등). 비우면 한국 의무만"),
):
    """물질별 수출입 규제: 한국 수입·수출 의무, 통제 목록, HS 코드, 상대국 목록·KOTRA 수입규제."""
    return build_trade_controls(cas_no, direction, country, kotra_fetch=_kotra_import_restrictions)


@router.get("/kotra/reach")
def kotra_reach_qna(
    q: str = Query("", description="추가 검색어(물질명 등). 비우면 REACH 전반"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    """KOTRA 해외시장뉴스에서 REACH 관련 자료·상담 내용 검색.

    사장님이 언급한 'KOTRA 사이트의 REACH Q&A' 를 ChemIP 안에서 검색한다.
    결과는 KOTRA 원문(dream.kotra.or.kr) 링크를 포함한다.
    """
    term = f"REACH {q}".strip() if q.strip() else "REACH"
    result = _kotra.search_market_news(keyword=term, page_no=page, num_of_rows=limit)
    return handle_adapter_result(result)


# ------------------------------------------------------------------
# EPA CompTox (CTX API — requires free key from ccte_api@epa.gov)
# ------------------------------------------------------------------

@router.get("/comptox/search")
def comptox_search(
    q: str = Query(..., min_length=1, description="Substance name or CAS number"),
):
    """Exact search for a chemical in EPA CompTox database."""
    result = _comptox.search_chemical(q.strip())
    return handle_adapter_result(result)


@router.get("/comptox/search/contains")
def comptox_search_contains(
    q: str = Query(..., min_length=1, description="Partial substance name"),
    limit: int = Query(20, ge=1, le=100),
):
    """Partial name search in EPA CompTox."""
    result = _comptox.search_chemical_contains(q.strip(), top=limit)
    return handle_adapter_result(result)


@router.get("/comptox/detail/{dtxsid}")
def comptox_detail(dtxsid: str):
    """Get chemical details by DTXSID."""
    result = _comptox.get_chemical_detail(dtxsid)
    return handle_adapter_result(result)


@router.get("/comptox/hazard/{dtxsid}")
def comptox_hazard(dtxsid: str):
    """Get ToxValDB hazard data by DTXSID."""
    result = _comptox.get_hazard_toxval(dtxsid)
    return handle_adapter_result(result)


@router.get("/comptox/hazard/human/{dtxsid}")
def comptox_hazard_human(dtxsid: str):
    """Get human hazard data by DTXSID."""
    result = _comptox.get_hazard_human(dtxsid)
    return handle_adapter_result(result)


@router.get("/comptox/hazard/cancer/{dtxsid}")
def comptox_cancer(dtxsid: str):
    """Get cancer classification summary by DTXSID."""
    result = _comptox.get_cancer_summary(dtxsid)
    return handle_adapter_result(result)


@router.get("/comptox/exposure/functional-use/{dtxsid}")
def comptox_functional_use(dtxsid: str):
    """Get functional use categories by DTXSID."""
    result = _comptox.get_functional_use(dtxsid)
    return handle_adapter_result(result)


# ------------------------------------------------------------------
# NIOSH Pocket Guide (static dataset — no API key needed)
# ------------------------------------------------------------------

@router.get("/niosh/search")
def niosh_search(
    q: str = Query(..., min_length=1, description="Substance name or CAS number"),
    limit: int = Query(20, ge=1, le=100),
):
    """Search NIOSH Pocket Guide for occupational exposure limits and PPE."""
    result = _niosh.search(q.strip(), limit=limit)
    return handle_adapter_result(result)


@router.get("/niosh/cas/{cas}")
def niosh_by_cas(cas: str):
    """Get NIOSH exposure data by CAS number (e.g. 71-43-2)."""
    result = _niosh.search_by_cas(cas)
    return handle_adapter_result(result)


@router.get("/niosh/exposure/{cas}")
def niosh_exposure_summary(cas: str):
    """Get compact exposure-limit summary (REL/PEL/IDLH) for a CAS number."""
    result = _niosh.get_exposure_summary(cas)
    return handle_adapter_result(result)


@router.get("/niosh/carcinogens")
def niosh_carcinogens():
    """List all NIOSH-designated potential occupational carcinogens."""
    result = _niosh.list_carcinogens()
    return handle_adapter_result(result)


# ------------------------------------------------------------------
# KISCHEM (화학물질안전원 — exposure symptoms & first-aid)
# ------------------------------------------------------------------

@router.get("/kischem/search")
def kischem_search(
    q: str = Query("", description="Chemical name (Korean/English)"),
    cas: str = Query("", description="CAS number"),
    limit: int = Query(20, ge=1, le=100),
):
    """Search KISCHEM for exposure symptoms and first-aid info."""
    result = _kischem.search(keyword=q.strip(), cas_no=cas.strip(), num_of_rows=limit)
    return handle_adapter_result(result)


@router.get("/kischem/cas/{cas}")
def kischem_by_cas(cas: str):
    """Get KISCHEM safety data by CAS number."""
    result = _kischem.get_by_cas(cas)
    return handle_adapter_result(result)


# ------------------------------------------------------------------
# NCIS (한국환경공단 — substance classification & molecular data)
# ------------------------------------------------------------------

@router.get("/ncis/cas/{cas}")
def ncis_by_cas(cas: str):
    """Get NCIS substance classification by CAS number."""
    result = _ncis.search_by_cas(cas)
    return handle_adapter_result(result)


@router.get("/ncis/search")
def ncis_search(
    q: str = Query(..., min_length=1, description="Substance name"),
):
    """Search NCIS by substance name."""
    result = _ncis.search_by_name(q.strip())
    return handle_adapter_result(result)


# ------------------------------------------------------------------
# Aggregated search across all regulatory sources
# ------------------------------------------------------------------

@router.get("/search")
def search_all_regulations(
    q: str = Query(..., min_length=1, description="Substance name, CAS, or EC number"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    """Search across all configured international regulatory sources."""
    results: dict = {"query": q, "sources": {}}

    # ECHA (always available — no key needed)
    echa_result = _echa.search_substance(q.strip(), page=page, page_size=limit)
    if echa_result.get("status") == "success":
        results["sources"]["echa"] = {
            "data": echa_result.get("data", []),
            "total": echa_result.get("total", 0),
        }
    else:
        results["sources"]["echa"] = {
            "error": echa_result.get("message", "Unknown error"),
            "data": [],
            "total": 0,
        }

    # CompTox — only if key is configured
    comptox_result = _comptox.search_chemical(q.strip())
    if comptox_result.get("status") == "success":
        results["sources"]["comptox"] = {
            "data": comptox_result.get("data", []),
            "total": comptox_result.get("total", 0),
        }
    elif comptox_result.get("status") == "disabled":
        results["sources"]["comptox"] = {
            "available": False,
            "message": "API key not configured",
            "data": [],
            "total": 0,
        }
    else:
        results["sources"]["comptox"] = {
            "error": comptox_result.get("message", "Unknown error"),
            "data": [],
            "total": 0,
        }

    # NIOSH Pocket Guide (always available — static data)
    niosh_result = _niosh.search(q.strip(), limit=limit)
    if niosh_result.get("status") == "success":
        results["sources"]["niosh"] = {
            "data": niosh_result.get("data", []),
            "total": niosh_result.get("total", 0),
        }
    else:
        results["sources"]["niosh"] = {
            "error": niosh_result.get("message", "Unknown error"),
            "data": [],
            "total": 0,
        }

    # KISCHEM (Korean chemical safety — exposure/first-aid)
    kischem_result = _kischem.search(keyword=q.strip(), num_of_rows=limit)
    if kischem_result.get("status") == "success":
        results["sources"]["kischem"] = {
            "data": kischem_result.get("data", []),
            "total": kischem_result.get("total", 0),
        }
    else:
        results["sources"]["kischem"] = {
            "error": kischem_result.get("message", "Unknown error"),
            "data": [],
            "total": 0,
        }

    # NCIS (Korean environmental — substance classification)
    ncis_result = _ncis.search_by_name(q.strip())
    if ncis_result.get("status") == "success":
        results["sources"]["ncis"] = {
            "data": ncis_result.get("data", []),
            "total": ncis_result.get("total", 0),
        }
    else:
        results["sources"]["ncis"] = {
            "error": ncis_result.get("message", "Unknown error"),
            "data": [],
            "total": 0,
        }

    return results


@router.get("/intelligence/{chem_id}")
def regulatory_intelligence(chem_id: str, limit: int = Query(8, ge=1, le=20)):
    with TerminologyDB() as db:
        meta = db.get_chemical_meta_by_chem_id(chem_id) or db.get_chemical_meta_by_cas(chem_id)
        if not meta:
            return {
                "chem_id": chem_id,
                "chemical": None,
                "aliases": [],
                "search_terms": [],
                "sources": {},
            }

        aliases = db.get_aliases_for_chemical(chem_id, limit=24)
        alias_terms = [item["alias"] for item in aliases]
        search_terms = extract_terms_for_regulatory_search(
            name=meta.get("name"),
            name_en=meta.get("name_en"),
            cas_no=meta.get("cas_no"),
            aliases=alias_terms,
            limit=8,
        )

        cas_no = (meta.get("cas_no") or "").strip()

        ncis_terms = [cas_no] if cas_no else []
        if not ncis_terms:
            ncis_terms = search_terms
        ncis_result, ncis_query = _search_first_success(
            ncis_terms,
            lambda term: _ncis.search_by_cas(term) if term == cas_no and cas_no else _ncis.search_by_name(term),
        )
        ncis_payload = _source_payload_from_result(ncis_result, key_fields=("cas_no", "ke_no", "name_ko"), query_used=ncis_query)
        if ncis_payload["data"]:
            discovered_aliases: list[str] = []
            for item in ncis_payload["data"]:
                discovered_aliases.extend(
                    value
                    for value in [
                        item.get("name_ko"),
                        item.get("name_en"),
                        item.get("synonyms_ko"),
                        item.get("synonyms_en"),
                    ]
                    if value
                )
            if discovered_aliases:
                db.add_external_aliases(
                    chem_id=chem_id,
                    aliases=discovered_aliases,
                    alias_type="ncis_synonym",
                    source="NCIS",
                    confidence=0.82,
                )
                aliases = db.get_aliases_for_chemical(chem_id, limit=24)

        kischem_terms = [cas_no] if cas_no else search_terms
        kischem_result, kischem_query = _search_first_success(
            kischem_terms,
            lambda term: _kischem.get_by_cas(term) if term == cas_no and cas_no else _kischem.search(keyword=term, num_of_rows=limit),
        )
        kischem_payload = _source_payload_from_result(kischem_result, key_fields=("cas_no", "data_no", "name_ko"), query_used=kischem_query)

        niosh_terms = [cas_no] if cas_no else []
        niosh_terms.extend(term for term in search_terms if term != cas_no)
        niosh_result, niosh_query = _search_first_success(niosh_terms, lambda term: _niosh.search(term, limit=limit))
        niosh_payload = _source_payload_from_result(niosh_result, key_fields=("cas", "name"), query_used=niosh_query)

        echa_result, echa_query = _search_first_success(search_terms, lambda term: _echa.search_substance(term, page=1, page_size=limit))
        echa_payload = _source_payload_from_result(echa_result, key_fields=("rml_id", "cas_number", "name"), query_used=echa_query)

        comptox_terms = [cas_no] if cas_no else []
        comptox_terms.extend(term for term in search_terms if term != cas_no)
        comptox_result, comptox_query = _search_first_success(comptox_terms, lambda term: _comptox.search_chemical(term))
        comptox_payload = _source_payload_from_result(
            comptox_result,
            key_fields=("dtxsid", "casrn", "preferredName"),
            query_used=comptox_query,
            available=comptox_result.get("status") != "disabled",
        )

        return {
            "chem_id": chem_id,
            "chemical": {
                "id": meta.get("id"),
                "name": meta.get("name", ""),
                "name_en": meta.get("name_en", ""),
                "cas_no": cas_no,
                "source": meta.get("source", ""),
            },
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


@router.get("/handlers/{chem_id}")
def handling_site_profile(
    chem_id: str,
    year: int = Query(2024, ge=2000, le=2100),
    accident_years: int = Query(5, ge=1, le=10),
    facility_limit: int = Query(10, ge=1, le=50),
):
    """Return Korean handling-site, PRTR summary, and accident signals."""
    meta, aliases = _load_chemical_context(chem_id)
    if not meta:
        return {
            "chem_id": chem_id,
            "chemical": None,
            "query": {"cas_no": chem_id, "terms": [chem_id], "year": year},
            "sources": _handlers.build_profile(cas_no=chem_id, aliases=[chem_id], year=year, accident_years=accident_years, facility_limit=facility_limit)["sources"],
        }

    alias_terms = [item["alias"] for item in aliases if item.get("alias")]
    profile = _handlers.build_profile(
        cas_no=meta.get("cas_no", ""),
        name=meta.get("name", ""),
        name_en=meta.get("name_en", ""),
        aliases=alias_terms,
        year=year,
        accident_years=accident_years,
        facility_limit=facility_limit,
    )
    return {
        "chem_id": chem_id,
        "chemical": {
            "id": meta.get("id"),
            "name": meta.get("name", ""),
            "name_en": meta.get("name_en", ""),
            "cas_no": meta.get("cas_no", ""),
            "source": meta.get("source", ""),
        },
        **profile,
    }
