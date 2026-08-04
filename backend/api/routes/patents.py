from fastapi import APIRouter, HTTPException, Query
from backend.api.patent_fetcher import PatentFetcher
from backend.api.uspto_adapter import UsptoAdapter
from backend.api.global_patent_adapter import GlobalPatentAdapter
from backend.api.kipris_adapter import KiprisAdapter

router = APIRouter()


def _run_patent_search(query_text: str, page: int, effective_limit: int) -> dict:
    """Core KIPRIS keyword search + pagination shared by both route handlers.

    Kept as a plain helper (not a route function) so it can be called directly
    without FastAPI's dependency injection leaking unresolved ``Query`` defaults.
    """
    query_text = (query_text or "").strip()
    if not query_text:
        raise HTTPException(status_code=422, detail="Missing patent query")

    fetcher = PatentFetcher()
    all_results = fetcher.search_patents(query_text)
    upstream_error = getattr(fetcher, "last_error", None)
    if upstream_error:
        raise HTTPException(status_code=502, detail=f"KIPRIS API error: {upstream_error}")

    # Pagination
    total = len(all_results)
    offset = (page - 1) * effective_limit
    paginated = all_results[offset:offset + effective_limit]

    return {
        "query": query_text,
        "results": paginated,
        "total": total,
        "page": page,
        "limit": effective_limit,
        "total_pages": (total + effective_limit - 1) // effective_limit if total > 0 else 0,
    }


@router.get("")
def search_patents(
    q: str = Query("", description="Search keyword"),
    keyword: str = Query("", description="Legacy keyword alias"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    page_size: int | None = Query(None, ge=1, le=100, description="Legacy page_size alias"),
):
    """
    Search patents by keyword (KIPRIS)
    """
    effective_limit = page_size if page_size is not None else limit
    return _run_patent_search((q or keyword), page, effective_limit)


@router.get("/search")
def search_patents_alias(
    q: str = Query(..., min_length=1, description="Search keyword"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Backward-compatible alias for legacy frontend calls (/api/patents/search).
    """
    return _run_patent_search(q, page, limit)


@router.get("/kipris/{application_number}")
def get_kipris_patent_detail(application_number: str):
    """
    Fetch detailed KIPRIS patent info by application number.
    """
    adapter = KiprisAdapter()
    detail = adapter.get_patent_detail(application_number)
    upstream_error = getattr(adapter, "last_error", None)
    if upstream_error:
        raise HTTPException(status_code=502, detail=f"KIPRIS API error: {upstream_error}")
    if not detail:
        raise HTTPException(status_code=404, detail="KIPRIS patent detail not found")
    return detail

@router.get("/uspto/{chem_id}")
def search_uspto(
    chem_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500),
):
    """
    Search local USPTO index by chemical ID
    """
    adapter = UsptoAdapter()
    offset = (page - 1) * limit
    results = adapter.search_patents_by_chem_id(chem_id, limit=limit, offset=offset)
    return {"chem_id": chem_id, "results": results, "page": page, "limit": limit}

@router.get("/global/{chem_id}")
def search_global_patents(
    chem_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500)
):
    """
    Search global patent index (USPTO, EPO, WIPO, etc.) by chemical ID
    """
    adapter = GlobalPatentAdapter()
    offset = (page - 1) * limit
    results = adapter.search_patents_by_chem_id(chem_id, limit=limit, offset=offset)
    return {
        "chem_id": chem_id, 
        "results": results,
        "page": page,
        "limit": limit
    }
