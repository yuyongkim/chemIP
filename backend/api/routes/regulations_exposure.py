"""Exposure / first-aid / classification lookups under /api/regulations: NIOSH, KISCHEM, NCIS. Included by regulations.py."""
from __future__ import annotations

from fastapi import APIRouter, Query

from backend.api.routes import regulation_sources as src
from backend.api.routes.utils import handle_adapter_result

router = APIRouter()


# ------------------------------------------------------------------
# NIOSH Pocket Guide (static dataset — no API key needed)
# ------------------------------------------------------------------

@router.get("/niosh/search")
def niosh_search(
    q: str = Query(..., min_length=1, description="Substance name or CAS number"),
    limit: int = Query(20, ge=1, le=100),
):
    """Search NIOSH Pocket Guide for occupational exposure limits and PPE."""
    result = src.niosh.search(q.strip(), limit=limit)
    return handle_adapter_result(result)


@router.get("/niosh/cas/{cas}")
def niosh_by_cas(cas: str):
    """Get NIOSH exposure data by CAS number (e.g. 71-43-2)."""
    result = src.niosh.search_by_cas(cas)
    return handle_adapter_result(result)


@router.get("/niosh/exposure/{cas}")
def niosh_exposure_summary(cas: str):
    """Get compact exposure-limit summary (REL/PEL/IDLH) for a CAS number."""
    result = src.niosh.get_exposure_summary(cas)
    return handle_adapter_result(result)


@router.get("/niosh/carcinogens")
def niosh_carcinogens():
    """List all NIOSH-designated potential occupational carcinogens."""
    result = src.niosh.list_carcinogens()
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
    result = src.kischem.search(keyword=q.strip(), cas_no=cas.strip(), num_of_rows=limit)
    return handle_adapter_result(result)


@router.get("/kischem/cas/{cas}")
def kischem_by_cas(cas: str):
    """Get KISCHEM safety data by CAS number."""
    result = src.kischem.get_by_cas(cas)
    return handle_adapter_result(result)


# ------------------------------------------------------------------
# NCIS (한국환경공단 — substance classification & molecular data)
# ------------------------------------------------------------------

@router.get("/ncis/cas/{cas}")
def ncis_by_cas(cas: str):
    """Get NCIS substance classification by CAS number."""
    result = src.ncis.search_by_cas(cas)
    return handle_adapter_result(result)


@router.get("/ncis/search")
def ncis_search(
    q: str = Query(..., min_length=1, description="Substance name"),
):
    """Search NCIS by substance name."""
    result = src.ncis.search_by_name(q.strip())
    return handle_adapter_result(result)
