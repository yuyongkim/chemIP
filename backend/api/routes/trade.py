from fastapi import APIRouter, HTTPException, Query
from backend.api.kotra_adapter import KotraAdapter

router = APIRouter()
adapter = KotraAdapter()

@router.get("/news")
def get_market_news(
    q: str = Query(..., description="Search keyword"),
    country: str = Query(None, description="Country filter"),
    page: int = 1
):
    """
    Search overseas market news from KOTRA.
    """
    result = adapter.search_market_news(keyword=q, country=country or "", page_no=page)
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
        
    return result["data"]
