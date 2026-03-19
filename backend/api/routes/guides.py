from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from backend.config.settings import settings
from backend.core.guide_linker import normalize_search_terms, recommend_guides
from backend.core.kosha_guide_store import KoshaGuideStore
from backend.core.terminology_db import TerminologyDB


router = APIRouter()
store = KoshaGuideStore(settings.KOSHA_GUIDE_DATA_DIR)


def _ensure_available() -> None:
    if not store.exists():
        raise HTTPException(
            status_code=503,
            detail=(
                "KOSHA guide dataset is not configured or files are missing. "
                f"Expected guides at: {store.guides_path} and {store.docs_path}"
            ),
        )


@router.get("/status")
def get_guide_status():
    return store.stats()


@router.get("/search")
def search_guides(
    q: str = Query(..., min_length=1, description="Guide search keyword"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    _ensure_available()

    offset = (page - 1) * limit
    try:
        items, total = store.search(query=q, limit=limit, offset=offset)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load guide dataset: {exc}") from exc

    return {
        "query": q,
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.get("/{guide_no}")
def get_guide_detail(
    guide_no: str,
    include_text: bool = Query(True, description="Include full document text"),
):
    _ensure_available()

    try:
        item = store.get(guide_no=guide_no, include_text=include_text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load guide dataset: {exc}") from exc

    if not item:
        raise HTTPException(status_code=404, detail="Guide not found")

    return item


@router.get("/recommend/{chem_id}")
def recommend_guides_for_chemical(
    chem_id: str,
    chemical_name: str = Query("", description="Optional chemical name override"),
    limit: int = Query(8, ge=1, le=30),
    refresh: bool = Query(False, description="Force recomputation and overwrite mapping cache"),
):
    _ensure_available()

    with TerminologyDB() as db:
        try:
            meta = db.get_chemical_meta_by_chem_id(chem_id) or {}

            if not refresh:
                cached = db.get_guide_mappings(chem_id, limit=limit)
                if cached:
                    return {
                        "chem_id": chem_id,
                        "terms": normalize_search_terms(
                            chemical_name,
                            meta.get("name", ""),
                            meta.get("name_en", ""),
                            meta.get("cas_no", ""),
                        ),
                        "recommendations": cached,
                        "total": len(cached),
                        "from_cache": True,
                    }

            terms = normalize_search_terms(
                chemical_name,
                meta.get("name", ""),
                meta.get("name_en", ""),
                meta.get("cas_no", ""),
                chem_id,
            )
            recommendations = recommend_guides(
                store=store,
                terms=terms,
                top_k=limit,
            )
            if recommendations:
                db.upsert_guide_mappings(chem_id, recommendations)

            return {
                "chem_id": chem_id,
                "terms": terms,
                "recommendations": recommendations,
                "total": len(recommendations),
                "from_cache": False,
            }
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to recommend guides: {exc}") from exc
