"""Chemical search, autocomplete, detail and linked-drug routes (/api/chemicals).

Logic lives in backend/core/msds_detail.py (detail) and backend/core/drug_links.py (drugs); the route passes the
DB and the module-level clients below, which tests and scripts/static_export replace on this module.
"""
import logging

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from backend.core.terminology_db import TerminologyDB
from backend.api.kosha_msds_adapter import KoshaMsdsAdapter
from backend.api.mfds_client import MFDSClient
from backend.api.fda_client import OpenFDAClient
from backend.api.pubmed_client import PubMedClient
from backend.core.drug_links import build_drug_links
from backend.core.msds_detail import (  # noqa: F401  (SECTION_TITLES / parse_msds_xml kept importable here)
    SECTION_TITLES,
    build_chemical_detail,
    is_kosha_id as _is_kosha_id,
    looks_like_cas as _looks_like_cas,
    parse_msds_xml,
)

router = APIRouter()
logger = logging.getLogger(__name__)

adapter = KoshaMsdsAdapter()
_mfds = MFDSClient()
_fda = OpenFDAClient()
_pubmed = PubMedClient()


@router.get("")
def search_chemicals(
    q: str = Query(..., min_length=1, description="Search query for chemical name or CAS No"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
):
    query = q.strip()
    if not query:
        return {"items": [], "total": 0}

    with TerminologyDB() as db:
        offset = (page - 1) * limit
        return db.search_chemicals(query, limit, offset)


@router.get("/autocomplete")
def autocomplete_chemicals(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(5, ge=1, le=20),
):
    query = q.strip()
    if not query:
        return []

    with TerminologyDB() as db:
        result = db.search_chemicals(query, limit=limit, offset=0)
        return result["items"]


@router.get("/{chem_id}")
def get_chemical_details(chem_id: str):
    with TerminologyDB() as db:
        detail = build_chemical_detail(db, adapter, chem_id)
    if detail is None:
        # 목록에도 없고 MSDS 도 못 받은 식별자: 500(AttributeError) 대신 404 로 알린다.
        return JSONResponse(status_code=404, content={"code": "NOT_FOUND", "message": "물질을 찾을 수 없습니다.", "chem_id": chem_id})
    return detail


@router.get("/{chem_id}/drugs")
def get_chemical_drugs(chem_id: str, refresh: bool = False):
    """Return drug info (MFDS / OpenFDA / PubMed) linked to a chemical."""
    with TerminologyDB() as db:
        return build_drug_links(db, chem_id, refresh, mfds=_mfds, fda=_fda, pubmed=_pubmed)
