"""LLM assistant routes under /api/ai: /recommend, /summarize, /drug-analysis, /ask. Included by ai.py.

Prompts and fixed texts: backend/core/ai_prompts.py. Prompt-context assembly and output parsing:
backend/core/ai_context.py (MSDS/drug/guide context for summarize/ask: backend/core/evidence_collector.py).
"""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from backend.core import ai_prompts as P
from backend.core.ai_context import build_drug_context, parse_recommendations, recommend_prompt, summary_fallback
from backend.core.evidence_collector import build_full_context, parse_msds_section_points, section_content
from backend.core.llm_client import generate as llm_generate
from backend.core.terminology_db import TerminologyDB

router = APIRouter()

SUMMARY_HAZARD_POINTS = 3


class RecommendRequest(BaseModel):
    query: str


class SummarizeRequest(BaseModel):
    chemId: str


class DrugAnalysisRequest(BaseModel):
    chemId: str


class AskRequest(BaseModel):
    question: str
    chemId: str = ""


# ---------------------------------------------------------------------------
# 1) AI 검색추천 — 관련 화학물질/검색어 추천
# ---------------------------------------------------------------------------

@router.post("/recommend")
def ai_recommend(request: RecommendRequest):
    """Given a query, suggest related chemical search terms via LLM."""
    query = request.query.strip()
    if not query:
        return {"query": query, "recommendations": [], "llm_used": False}

    # Gather DB context: top matching chemicals
    with TerminologyDB() as db:
        search_result = db.search_chemicals(query, limit=5, offset=0)
        chem_names = [it["name"] for it in search_result.get("items", [])]

    resp = llm_generate(recommend_prompt(query, chem_names), system=P.RECOMMEND_SYSTEM)
    recommendations = parse_recommendations(resp.text) if resp.available and resp.text else []

    return {
        "query": query,
        "recommendations": recommendations,
        "db_matches": chem_names,
        "llm_used": resp.available,
        "model": resp.model,
    }


# ---------------------------------------------------------------------------
# 2) MSDS 요약 — 위험도 분석
# ---------------------------------------------------------------------------

@router.post("/summarize")
def ai_summarize(request: SummarizeRequest):
    """Generate a comprehensive safety summary using ALL data sources."""
    chem_id = request.chemId.strip()
    if not chem_id:
        return {"error": "chemId is required"}

    # Check cache
    with TerminologyDB() as db:
        cache_reader = getattr(db, "get_ai_cache", None)
        cached = cache_reader(f"summary:{chem_id}") if callable(cache_reader) else None
        if cached:
            return {**cached, "cached": True}

    context, info = build_full_context(chem_id)
    name = info.get("name", chem_id)
    source_counts = info.get("sources", {})

    resp = llm_generate(P.SUMMARY_PROMPT.format(context=context), system=P.SUMMARY_SYSTEM)
    if resp.available and resp.text:
        result = {
            "chem_id": chem_id,
            "chemical_name": name,
            "summary": resp.text.strip(),
            "sources_used": source_counts,
            "llm_used": True,
            "model": resp.model,
        }
        with TerminologyDB() as db:
            if hasattr(db, "set_ai_cache"):
                db.set_ai_cache(f"summary:{chem_id}", result, resp.model)
        return result

    # Fallback
    with TerminologyDB() as db:
        details = db.get_msds_details_by_chem_id(chem_id) or []
    hazards = parse_msds_section_points(section_content(details, 2), max_points=SUMMARY_HAZARD_POINTS)

    return {
        "chem_id": chem_id,
        "chemical_name": name,
        "summary": summary_fallback(name, hazards),
        "sources_used": source_counts,
        "llm_used": False,
        "model": "",
    }


# ---------------------------------------------------------------------------
# 3) 의약품-화학물질 관계 분석
# ---------------------------------------------------------------------------

@router.post("/drug-analysis")
def ai_drug_analysis(request: DrugAnalysisRequest):
    """Analyze drug-chemical relationships using LLM."""
    chem_id = request.chemId.strip()
    if not chem_id:
        return {"error": "chemId is required"}

    with TerminologyDB() as db:
        meta = db.get_chemical_meta_by_chem_id(chem_id) or {}
        drug_data = db.get_drug_mappings(chem_id)
        english = db.get_msds_english_by_chem_id(chem_id) or {}

    name = meta.get("name", chem_id)
    context, mfds_items, fda_items, pubmed_items = build_drug_context(name, meta.get("cas_no", ""), english, drug_data)

    if not mfds_items and not fda_items and not pubmed_items:
        return {
            "chem_id": chem_id,
            "chemical_name": name,
            "analysis": P.DRUG_NO_DATA.format(name=name),
            "llm_used": False,
            "model": "",
        }

    resp = llm_generate(P.DRUG_PROMPT.format(context=context), system=P.DRUG_SYSTEM)
    no_llm = P.DRUG_NO_LLM.format(mfds=len(mfds_items), fda=len(fda_items), pubmed=len(pubmed_items))
    return {
        "chem_id": chem_id,
        "chemical_name": name,
        "analysis": resp.text.strip() if resp.available and resp.text else no_llm,
        "llm_used": resp.available and bool(resp.text),
        "model": resp.model if resp.available else "",
        "drug_counts": {
            "mfds": len(mfds_items),
            "openfda": len(fda_items),
            "pubmed": len(pubmed_items),
        },
    }


# ---------------------------------------------------------------------------
# 4) 자연어 Q&A
# ---------------------------------------------------------------------------

@router.post("/ask")
def ai_ask(request: AskRequest):
    """Answer a question using ALL available data: MSDS + drugs + patents + guides."""
    question = request.question.strip()
    if not question:
        return {"error": "question is required"}

    context = ""
    source_counts: dict = {}

    if request.chemId:
        context, info = build_full_context(request.chemId)
        source_counts = info.get("sources", {})

    if context:
        prompt = P.ASK_PROMPT_WITH_CONTEXT.format(context=context, question=question)
    else:
        prompt = P.ASK_PROMPT_NO_CONTEXT.format(question=question)

    resp = llm_generate(prompt, system=P.ASK_SYSTEM)
    llm_ok = bool(resp.available and resp.text)
    return {
        "question": question,
        "answer": resp.text.strip() if llm_ok else P.ASK_LLM_UNAVAILABLE,
        "chem_id": request.chemId or None,
        "sources_used": source_counts,
        "llm_used": llm_ok,
        "model": resp.model if llm_ok else "",
    }
