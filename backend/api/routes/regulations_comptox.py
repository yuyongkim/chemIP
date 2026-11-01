"""EPA CompTox pass-through routes under /api/regulations/comptox (CTX API key required). Included by regulations.py."""
from __future__ import annotations

from fastapi import APIRouter, Query

from backend.api.routes import regulation_sources as src
from backend.api.routes.utils import handle_adapter_result

router = APIRouter()


@router.get("/comptox/search")
def comptox_search(
    q: str = Query(..., min_length=1, description="Substance name or CAS number"),
):
    """Exact search for a chemical in EPA CompTox database."""
    result = src.comptox.search_chemical(q.strip())
    return handle_adapter_result(result)


@router.get("/comptox/search/contains")
def comptox_search_contains(
    q: str = Query(..., min_length=1, description="Partial substance name"),
    limit: int = Query(20, ge=1, le=100),
):
    """Partial name search in EPA CompTox."""
    result = src.comptox.search_chemical_contains(q.strip(), top=limit)
    return handle_adapter_result(result)


@router.get("/comptox/detail/{dtxsid}")
def comptox_detail(dtxsid: str):
    """Get chemical details by DTXSID."""
    result = src.comptox.get_chemical_detail(dtxsid)
    return handle_adapter_result(result)


@router.get("/comptox/hazard/{dtxsid}")
def comptox_hazard(dtxsid: str):
    """Get ToxValDB hazard data by DTXSID."""
    result = src.comptox.get_hazard_toxval(dtxsid)
    return handle_adapter_result(result)


@router.get("/comptox/hazard/human/{dtxsid}")
def comptox_hazard_human(dtxsid: str):
    """Get human hazard data by DTXSID."""
    result = src.comptox.get_hazard_human(dtxsid)
    return handle_adapter_result(result)


@router.get("/comptox/hazard/cancer/{dtxsid}")
def comptox_cancer(dtxsid: str):
    """Get cancer classification summary by DTXSID."""
    result = src.comptox.get_cancer_summary(dtxsid)
    return handle_adapter_result(result)


@router.get("/comptox/exposure/functional-use/{dtxsid}")
def comptox_functional_use(dtxsid: str):
    """Get functional use categories by DTXSID."""
    result = src.comptox.get_functional_use(dtxsid)
    return handle_adapter_result(result)
