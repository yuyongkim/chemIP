import logging
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, Query

from backend.api.fda_client import OpenFDAClient
from backend.api.mfds_client import MFDSClient
from backend.api.pubmed_client import PubMedClient
from backend.api.routes.utils import handle_adapter_result as _handle_result

router = APIRouter()
logger = logging.getLogger(__name__)
adapter = MFDSClient()
openfda_client = OpenFDAClient()
pubmed_client = PubMedClient()


def _openfda_total(meta: dict, fallback: int) -> int:
    results_meta = meta.get("results", {}) if isinstance(meta, dict) else {}
    total = results_meta.get("total", fallback)
    try:
        return int(total)
    except (TypeError, ValueError):
        return fallback


@router.get("/search")
def search_drugs(
    q: str = Query(..., description="Drug query"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    approval = _handle_result(adapter.search_drug_approval(item_name=q, page=page, num_of_rows=limit))
    easy = _handle_result(adapter.search_drug_easy_info(item_name=q, page=page, num_of_rows=limit))

    return {
        "query": q,
        "approval": {
            "total": approval.get("total", 0),
            "items": approval.get("items", []),
        },
        "easyInfo": {
            "total": easy.get("total", 0),
            "items": easy.get("items", []),
        },
    }


@router.get("/approval")
def search_drug_approval(
    q: str = Query(..., description="Drug query"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    result = adapter.search_drug_approval(item_name=q, page=page, num_of_rows=limit)
    return _handle_result(result)


@router.get("/easy")
def search_drug_easy(
    q: str = Query(..., description="Drug query"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    result = adapter.search_drug_easy_info(item_name=q, page=page, num_of_rows=limit)
    return _handle_result(result)


@router.get("/openfda")
def search_openfda(
    q: str = Query(..., min_length=1, description="Drug keyword"),
    limit: int = Query(10, ge=1, le=50),
    skip: int = Query(0, ge=0),
):
    query_candidates = [
        f'openfda.brand_name:"{q}"',
        f'openfda.generic_name:"{q}"',
        f'openfda.substance_name:"{q}"',
    ]

    final_result = None
    used_query = query_candidates[0]
    for candidate in query_candidates:
        used_query = candidate
        result = openfda_client.search_labels(search_query=candidate, limit=limit, skip=skip)
        if result.get("status") != "success":
            final_result = result
            continue

        final_result = result
        meta = result.get("meta", {}) if isinstance(result.get("meta"), dict) else {}
        total = _openfda_total(meta, len(result.get("results", [])))
        if total > 0:
            break

    payload = _handle_result(final_result or {"status": "error", "message": "OpenFDA response is empty"})
    meta = payload.get("meta", {}) if isinstance(payload.get("meta"), dict) else {}
    results = payload.get("results", [])
    total = _openfda_total(meta, len(results))

    return {
        "query": q,
        "query_used": used_query,
        "total": total,
        "items": results,
        "meta": meta,
    }


@router.get("/pubmed")
def search_pubmed(
    q: str = Query(..., min_length=1, description="PubMed term"),
    limit: int = Query(10, ge=1, le=50),
):
    result = _handle_result(pubmed_client.search(term=q, retmax=limit))
    return {
        "query": q,
        "count": result.get("count", 0),
        "ids": result.get("ids", []),
        "articles": result.get("articles", []),
    }


@router.get("/unified")
def search_drugs_unified(
    q: str = Query(..., min_length=1, description="Search term"),
    limit: int = Query(20, ge=1, le=100),
):
    """Search MFDS + OpenFDA + PubMed in parallel and return combined results."""

    def _mfds():
        try:
            r = adapter.search_drug_easy_info(item_name=q, num_of_rows=min(limit, 50))
            if r.get("status") == "success":
                return {"total": r.get("total", 0), "items": r.get("items", [])}
        except Exception:
            logger.exception("unified: MFDS failed")
        return {"total": 0, "items": []}

    def _fda():
        try:
            all_items: list = []
            seen: set = set()
            total = 0
            for field in ["substance_name", "generic_name", "brand_name"]:
                r = openfda_client.search_labels(search_query=f'openfda.{field}:"{q}"', limit=min(limit, 100))
                if r.get("status") == "success":
                    meta = r.get("meta", {}) if isinstance(r.get("meta"), dict) else {}
                    field_total = _openfda_total(meta, len(r.get("results", [])))
                    total = max(total, field_total)
                    for it in r.get("results", []):
                        fda_id = it.get("id", "")
                        if fda_id and fda_id in seen:
                            continue
                        seen.add(fda_id)
                        all_items.append(it)
            return {"total": total, "items": all_items}
        except Exception:
            logger.exception("unified: OpenFDA failed")
        return {"total": 0, "items": []}

    def _pm():
        try:
            r = pubmed_client.search(term=q, retmax=min(limit, 50))
            if r.get("status") == "success":
                return {"count": r.get("count", 0), "articles": r.get("articles", [])}
        except Exception:
            logger.exception("unified: PubMed failed")
        return {"count": 0, "articles": []}

    with ThreadPoolExecutor(max_workers=3) as pool:
        f1 = pool.submit(_mfds)
        f2 = pool.submit(_fda)
        f3 = pool.submit(_pm)

    mfds = f1.result()
    fda = f2.result()
    pm = f3.result()

    return {
        "query": q,
        "mfds": mfds,
        "openfda": fda,
        "pubmed": pm,
    }
