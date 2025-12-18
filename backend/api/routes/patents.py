from fastapi import APIRouter
from backend.api.patent_fetcher import PatentFetcher
from backend.api.uspto_adapter import UsptoAdapter
from backend.api.global_patent_adapter import GlobalPatentAdapter

router = APIRouter()

@router.get("")
def search_patents(q: str):
    """
    Search patents by keyword (KIPRIS)
    """
    fetcher = PatentFetcher()
    results = fetcher.search_patents(q)
    return {"query": q, "results": results}

@router.get("/uspto/{chem_id}")
def search_uspto(chem_id: str):
    """
    Search local USPTO index by chemical ID
    """
    adapter = UsptoAdapter()
    results = adapter.search_patents_by_chem_id(chem_id)
    return {"chem_id": chem_id, "results": results}

@router.get("/global/{chem_id}")
def search_global_patents(chem_id: str):
    """
    Search global patent index (USPTO, EPO, WIPO, etc.) by chemical ID
    """
    adapter = GlobalPatentAdapter()
    results = adapter.search_patents_by_chem_id(chem_id)
    return {"chem_id": chem_id, "results": results}
