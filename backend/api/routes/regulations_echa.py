"""ECHA pass-through routes under /api/regulations/echa (EU REACH/CLP). Included by regulations.py."""
from __future__ import annotations

from fastapi import APIRouter, Query

from backend.api.routes import regulation_sources as src
from backend.api.routes.utils import handle_adapter_result

router = APIRouter()


@router.get("/echa/search")
def echa_search(
    q: str = Query(..., min_length=1, description="Substance name, CAS, or EC number"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Search ECHA substance database (EU REACH/CLP)."""
    result = src.echa.search_substance(q.strip(), page=page, page_size=limit)
    return handle_adapter_result(result)


@router.get("/echa/dossiers/{rml_id:path}")
def echa_dossier_list(rml_id: str):
    """Get REACH registration dossiers by substance rmlId (e.g. 100.000.685)."""
    result = src.echa.get_dossier_list(rml_id)
    return handle_adapter_result(result)


@router.get("/echa/registrants/{rml_id:path}")
def echa_registrants(rml_id: str):
    """Get REACH registrant companies for a substance."""
    result = src.echa.get_registrants(rml_id)
    return handle_adapter_result(result)


@router.get("/echa/clp/{rml_id:path}")
def echa_clp_classification(rml_id: str):
    """Get harmonised CLP classification for a substance by rmlId."""
    result = src.echa.get_clp_classification(rml_id)
    return handle_adapter_result(result)


@router.get("/echa/labelling/{classification_id}")
def echa_clp_labelling(classification_id: str):
    """Get hazard statements and signal word for a CLP classification entry."""
    result = src.echa.get_clp_labelling(classification_id)
    return handle_adapter_result(result)


@router.get("/echa/pictograms/{classification_id}")
def echa_clp_pictograms(classification_id: str):
    """Get GHS pictogram codes for a CLP classification entry."""
    result = src.echa.get_clp_pictograms(classification_id)
    return handle_adapter_result(result)
