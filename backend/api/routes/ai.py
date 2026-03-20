from __future__ import annotations

import logging
import re

from fastapi import APIRouter, Query
from pydantic import BaseModel
import xml.etree.ElementTree as ET

from backend.config.settings import settings
from backend.core.guide_linker import normalize_search_terms, recommend_guides
from backend.core.kosha_guide_store import KoshaGuideStore
from backend.core.llm_client import generate as llm_generate, is_ollama_ready
from backend.core.report_builder import (
    EvidenceBundle,
    build_llm_report,
    build_report_markdown,
    build_sources,
    calculate_confidence,
)
from backend.core.evidence_collector import (
    build_full_context,
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


class RecommendRequest(BaseModel):
    query: str


class SummarizeRequest(BaseModel):
    chemId: str


class DrugAnalysisRequest(BaseModel):
    chemId: str


class AskRequest(BaseModel):
    question: str
    chemId: str = ""


@router.post("/analyze")
async def analyze_chemical(request: AnalysisRequest):
    with TerminologyDB() as db:
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
            if bundle.guide_recommendations:
                db.upsert_guide_mappings(request.chemId, bundle.guide_recommendations)

        patent_query = select_patent_query(request.chemicalName, meta)
        bundle.patent_highlights = build_patent_highlights(request.chemId, patent_query)

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

        return {
            "analysis": analysis,
            "confidence": calculate_confidence(bundle),
            "sources": build_sources(bundle),
            "guide_recommendations": bundle.guide_recommendations,
            "terms": terms,
            "llm_used": llm_used,
            "model": model,
        }


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

    context_lines = "\n".join(f"- {n}" for n in chem_names) if chem_names else "(검색 결과 없음)"

    system = (
        "You are a chemical information assistant. "
        "Given a user search query and existing database matches, suggest up to 8 related search terms "
        "the user might want to explore. Include synonyms, English names, related chemicals, CAS numbers. "
        "Return ONLY a JSON array of strings, no explanation."
    )
    prompt = f"사용자 검색어: {query}\n\nDB 매칭 결과:\n{context_lines}\n\n관련 추천 검색어를 JSON array로 반환하세요."

    resp = llm_generate(prompt, system=system)
    recommendations: list[str] = []
    if resp.available and resp.text:
        # Parse JSON array from LLM output
        import json as _json
        try:
            text = resp.text.strip()
            # Find JSON array in response
            start = text.find("[")
            end = text.rfind("]")
            if start >= 0 and end > start:
                recommendations = _json.loads(text[start:end + 1])
                if not isinstance(recommendations, list):
                    recommendations = []
                recommendations = [str(r).strip() for r in recommendations if str(r).strip()][:8]
        except Exception:
            logger.warning("Failed to parse LLM recommend output: %s", resp.text[:200])

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

    context, info = build_full_context(chem_id)
    name = info.get("name", chem_id)
    source_counts = info.get("sources", {})

    system = (
        "You are a chemical safety expert with access to MSDS, drug databases, and safety guides. "
        "Write a comprehensive safety summary in Korean. "
        "Include: 1) 위험도 등급 (상/중/하) + 근거, 2) 주요 위험요소 (MSDS 기반), "
        "3) 의약품 연관성 (FDA/MFDS 데이터가 있으면 어떤 약에 사용되는지), "
        "4) 필수 보호장비, 5) KOSHA 가이드 참조사항, 6) 긴급 대응 요약. "
        "출처(MSDS, MFDS, OpenFDA, PubMed, KOSHA)를 명시. "
        "Under 400 words. Markdown format. Evidence-based only."
    )
    prompt = f"{context}\n\n위 모든 데이터를 바탕으로 종합 안전 요약을 작성하세요."

    resp = llm_generate(prompt, system=system)
    if resp.available and resp.text:
        return {
            "chem_id": chem_id,
            "chemical_name": name,
            "summary": resp.text.strip(),
            "sources_used": source_counts,
            "llm_used": True,
            "model": resp.model,
        }

    # Fallback
    with TerminologyDB() as db:
        details = db.get_msds_details_by_chem_id(chem_id) or []
    hazards = parse_msds_section_points(section_content(details, 2), max_points=3)
    fallback = f"## {name} 위험도 요약\n\n"
    if hazards:
        fallback += "### 주요 위험요소\n" + "\n".join(f"- {h}" for h in hazards)
    else:
        fallback += "MSDS 데이터가 충분하지 않아 자동 요약을 생성할 수 없습니다."

    return {
        "chem_id": chem_id,
        "chemical_name": name,
        "summary": fallback,
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
    cas_no = meta.get("cas_no", "")

    context_parts = [f"화학물질: {name} (CAS: {cas_no})"]

    if english.get("hazard_statements"):
        context_parts.append("\n[GHS 유해성 문구]")
        for h in english["hazard_statements"][:3]:
            context_parts.append(f"  - {h}")

    # MFDS drug info
    mfds_items = drug_data.get("mfds", [])
    if mfds_items:
        context_parts.append("\n[식약처(MFDS) 의약품]")
        for item in mfds_items[:5]:
            item_name = item.get("ITEM_NAME", "")
            entp = item.get("ENTP_NAME", "")
            efcy = (item.get("efcyQesitm") or "")[:150]
            context_parts.append(f"  - {item_name} ({entp}): {efcy}")

    # OpenFDA info
    fda_items = drug_data.get("openfda", [])
    if fda_items:
        context_parts.append("\n[OpenFDA 의약품]")
        for item in fda_items[:5]:
            openfda = item.get("openfda", {}) if isinstance(item.get("openfda"), dict) else {}
            brand = (openfda.get("brand_name") or [""])[0] if isinstance(openfda.get("brand_name"), list) else ""
            generic = (openfda.get("generic_name") or [""])[0] if isinstance(openfda.get("generic_name"), list) else ""
            indication = (item.get("indications_and_usage") or [""])[0][:150] if isinstance(item.get("indications_and_usage"), list) else ""
            context_parts.append(f"  - {brand or generic}: {indication}")

    # PubMed articles
    pubmed_items = drug_data.get("pubmed", [])
    if pubmed_items:
        context_parts.append("\n[PubMed 논문]")
        for art in pubmed_items[:5]:
            context_parts.append(f"  - {art.get('title', '')} ({art.get('pubdate', '')})")

    context = "\n".join(context_parts)

    if not mfds_items and not fda_items and not pubmed_items:
        return {
            "chem_id": chem_id,
            "chemical_name": name,
            "analysis": f"## {name}\n\n의약품 매핑 데이터가 없습니다. 먼저 의약품 탭에서 데이터를 조회해주세요.",
            "llm_used": False,
            "model": "",
        }

    system = (
        "You are a pharmaceutical-chemical relationship analyst. "
        "Given chemical safety data and drug information from MFDS/FDA/PubMed, "
        "analyze the relationship between this chemical and pharmaceutical products. "
        "Write in Korean. Structure: 1) 화학물질-의약품 관계 요약, 2) 약리학적 용도, "
        "3) 안전성 고려사항 (MSDS 위험성 vs 의약품 용도), 4) 추가 조사 권장사항. "
        "Under 400 words. Markdown format. Evidence-based only."
    )
    prompt = f"{context}\n\n위 정보를 바탕으로 화학물질-의약품 관계 분석을 작성하세요."

    resp = llm_generate(prompt, system=system)
    return {
        "chem_id": chem_id,
        "chemical_name": name,
        "analysis": resp.text.strip() if resp.available and resp.text else f"LLM 미사용. MFDS {len(mfds_items)}건, FDA {len(fda_items)}건, PubMed {len(pubmed_items)}건 매핑됨.",
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

    system = (
        "You are an expert assistant for chemical safety, pharmaceutical data, and regulatory information. "
        "You have access to MSDS safety data, drug databases (MFDS/OpenFDA), PubMed articles, "
        "and KOSHA safety guides. Answer questions in Korean based on ALL provided context. "
        "Cite which data source (MSDS, MFDS, OpenFDA, PubMed, KOSHA) your answer is based on. "
        "If context is insufficient, clearly state that. Be concise (under 400 words). Use markdown."
    )

    if context:
        prompt = f"[전체 컨텍스트]\n{context}\n\n[질문]\n{question}\n\n위 모든 데이터를 참고하여 질문에 답변하세요. 출처를 명시하세요."
    else:
        prompt = f"[질문]\n{question}\n\n화학물질/의약품 관련 질문에 답변하세요."

    resp = llm_generate(prompt, system=system)

    if resp.available and resp.text:
        return {
            "question": question,
            "answer": resp.text.strip(),
            "chem_id": request.chemId or None,
            "sources_used": source_counts,
            "llm_used": True,
            "model": resp.model,
        }

    return {
        "question": question,
        "answer": "LLM이 현재 사용 불가합니다. Ollama 서비스 상태를 확인해주세요.",
        "chem_id": request.chemId or None,
        "sources_used": source_counts,
        "llm_used": False,
        "model": "",
    }
