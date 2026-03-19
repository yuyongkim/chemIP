from fastapi import APIRouter, HTTPException, Query
from backend.api.patent_fetcher import PatentFetcher
from backend.api.uspto_adapter import UsptoAdapter
from backend.api.global_patent_adapter import GlobalPatentAdapter
from backend.api.kipris_adapter import KiprisAdapter

router = APIRouter()

@router.get("")
def search_patents(
    q: str = Query(..., min_length=1, description="Search keyword"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Search patents by keyword (KIPRIS)
    """
    fetcher = PatentFetcher()
    all_results = fetcher.search_patents(q)
    upstream_error = getattr(fetcher, "last_error", None)
    if upstream_error:
        raise HTTPException(status_code=502, detail=f"KIPRIS API error: {upstream_error}")
    
    # Pagination
    total = len(all_results)
    offset = (page - 1) * limit
    paginated = all_results[offset:offset + limit]
    
    return {
        "query": q,
        "results": paginated,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.get("/search")
def search_patents_alias(
    q: str = Query(..., min_length=1, description="Search keyword"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Backward-compatible alias for legacy frontend calls (/api/patents/search).
    """
    return search_patents(q=q, page=page, limit=limit)


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
def search_uspto(chem_id: str):
    """
    Search local USPTO index by chemical ID
    """
    adapter = UsptoAdapter()
    results = adapter.search_patents_by_chem_id(chem_id)
    return {"chem_id": chem_id, "results": results}

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
