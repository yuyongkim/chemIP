"""AI insight routes (/api/ai): POST /analyze (evidence report, rule-based or LLM) and GET /llm-status.

The LLM assistant routes (/recommend, /summarize, /drug-analysis, /ask) are in ai_assist.py, included at the end
of this file so the route order is unchanged. Names used by /analyze (TerminologyDB, guide_store,
recommend_guides, build_llm_report, build_report_markdown) stay module attributes here; tests replace them.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter
from pydantic import BaseModel

from backend.api import kipris_policy
from backend.api.routes import ai_assist
from backend.api.routes.ai_assist import AskRequest, DrugAnalysisRequest, RecommendRequest, SummarizeRequest  # noqa: F401
from backend.config.settings import settings
from backend.core.guide_linker import normalize_search_terms, recommend_guides
from backend.core.kosha_guide_store import KoshaGuideStore
from backend.core.llm_client import is_ollama_ready
from backend.core.report_builder import (
    EvidenceBundle,
    build_llm_report,
    build_report_markdown,
    build_sources,
    calculate_confidence,
)
from backend.core.evidence_collector import (
    build_patent_highlights,
    parse_msds_section_points,
    section_content,
    select_patent_query,
)
from backend.core.terminology_db import TerminologyDB

logger = logging.getLogger(__name__)

router = APIRouter()
guide_store = KoshaGuideStore(settings.KOSHA_GUIDE_DATA_DIR)


class AnalysisRequest(BaseModel):
    chemId: str
    chemicalName: str
    use_llm: bool = True


@router.post("/analyze")
def analyze_chemical(request: AnalysisRequest):
    with TerminologyDB() as db:
        cache_reader = getattr(db, "get_ai_cache", None)
        cached = cache_reader(request.chemId) if callable(cache_reader) else None
        if cached and not kipris_policy.ai_evidence_enabled() and kipris_policy.contains_kipris_evidence(cached):
            cached = None  # KIPRIS_IN_AI=false: rebuild without KIPRIS evidence
        if cached and not request.use_llm == False:
            logger.info("AI cache hit for %s", request.chemId)
            return {**cached, "cached": True}

        details = db.get_msds_details_by_chem_id(request.chemId) or []
        english = db.get_msds_english_by_chem_id(request.chemId) or {}
        meta = db.get_chemical_meta_by_chem_id(request.chemId) or {}

        # --- collect evidence ---
        hazard_statements = [
            s for s in (str(h).strip() for h in (english.get("hazard_statements") or []))
            if s
        ][:4]

        bundle = EvidenceBundle(
            chem_id=request.chemId,
            chemical_name=request.chemicalName,
            section2_points=parse_msds_section_points(section_content(details, 2), max_points=6),
            section15_points=parse_msds_section_points(section_content(details, 15), max_points=4),
            hazard_statements=hazard_statements,
        )

        # --- guide matching ---
        terms = normalize_search_terms(
            request.chemicalName,
            str(meta.get("name", "")),
            str(meta.get("name_en", "")),
            str(meta.get("cas_no", "")),
            str(english.get("cas_no", "")),
            request.chemId,
        )

        if guide_store.exists() and terms:
            bundle.guide_recommendations = recommend_guides(
                store=guide_store, terms=terms, top_k=6,
            )
            if bundle.guide_recommendations and hasattr(db, "upsert_guide_mappings"):
                db.upsert_guide_mappings(request.chemId, bundle.guide_recommendations)

        patent_query = select_patent_query(request.chemicalName, meta)
        cas_no = str(meta.get("cas_no", "") or english.get("cas_no", "") or "")
        bundle.patent_highlights = build_patent_highlights(request.chemId, patent_query, cas_no=cas_no)

        # --- generate report ---
        if request.use_llm and settings.LLM_ENABLED:
            llm_result = build_llm_report(bundle)
            analysis = llm_result["analysis"]
            model = llm_result["model"]
            llm_used = llm_result["llm_used"]
        else:
            analysis = build_report_markdown(bundle)
            model = ""
            llm_used = False

        result = {
            "analysis": analysis,
            "confidence": calculate_confidence(bundle),
            "sources": build_sources(bundle),
            "guide_recommendations": bundle.guide_recommendations,
            "terms": terms,
            "llm_used": llm_used,
            "model": model,
        }

        # Cache the result for 24h
        if llm_used and hasattr(db, "set_ai_cache"):
            db.set_ai_cache(request.chemId, result, model)

        return result


@router.get("/llm-status")
def get_llm_status():
    """Check local LLM availability."""
    ready = is_ollama_ready()
    return {
        "enabled": settings.LLM_ENABLED,
        "ready": ready,
        "model": settings.LLM_MODEL,
        "base_url": settings.LLM_BASE_URL,
    }



# Assistant routes come after /llm-status, as before (include order = route order).
router.include_router(ai_assist.router)
