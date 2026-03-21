"""International regulatory data routes.

Aggregates data from overseas regulatory agencies (ECHA, EPA CompTox, etc.)
"""

import logging

from fastapi import APIRouter, Query

from backend.api.echa_adapter import EchaAdapter
from backend.api.comptox_adapter import CompToxAdapter
from backend.api.niosh_adapter import NioshAdapter
from backend.api.routes.utils import handle_adapter_result

router = APIRouter()
logger = logging.getLogger(__name__)

_echa = EchaAdapter()
_comptox = CompToxAdapter()
_niosh = NioshAdapter()


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

    return results
