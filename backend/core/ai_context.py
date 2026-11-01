"""Pure helpers for the /api/ai assistant routes: LLM output parsing and prompt-context assembly (no I/O)."""
from __future__ import annotations

import json
import logging

from backend.core import ai_prompts as P

logger = logging.getLogger("backend.api.routes.ai")  # same logger name as before the split

DRUG_CONTEXT_ITEMS = 5
DRUG_TEXT_CHARS = 150
HAZARD_LINES = 3


def parse_recommendations(text: str) -> list[str]:
    """First JSON array found in the LLM text → up to RECOMMEND_MAX non-empty strings; [] when unparsable."""
    recommendations: list[str] = []
    try:
        text = text.strip()
        # Find JSON array in response
        start = text.find("[")
        end = text.rfind("]")
        if start >= 0 and end > start:
            recommendations = json.loads(text[start:end + 1])
            if not isinstance(recommendations, list):
                recommendations = []
            recommendations = [str(r).strip() for r in recommendations if str(r).strip()][:P.RECOMMEND_MAX]
    except Exception:
        logger.warning("Failed to parse LLM recommend output: %s", text[:200])
    return recommendations


def recommend_prompt(query: str, chem_names: list[str]) -> str:
    context_lines = "\n".join(f"- {n}" for n in chem_names) if chem_names else P.RECOMMEND_NO_MATCHES
    return P.RECOMMEND_PROMPT.format(query=query, context_lines=context_lines)


def summary_fallback(name: str, hazards: list[str]) -> str:
    fallback = P.SUMMARY_FALLBACK_TITLE.format(name=name)
    if hazards:
        fallback += P.SUMMARY_FALLBACK_HAZARDS + "\n".join(f"- {h}" for h in hazards)
    else:
        fallback += P.SUMMARY_FALLBACK_EMPTY
    return fallback


def _first(value) -> str:
    return (value or [""])[0] if isinstance(value, list) else ""


def _mfds_lines(items: list[dict]) -> list[str]:
    lines = ["\n[식약처(MFDS) 의약품]"]
    for item in items[:DRUG_CONTEXT_ITEMS]:
        efcy = (item.get("efcyQesitm") or "")[:DRUG_TEXT_CHARS]
        lines.append(f"  - {item.get('ITEM_NAME', '')} ({item.get('ENTP_NAME', '')}): {efcy}")
    return lines


def _fda_lines(items: list[dict]) -> list[str]:
    lines = ["\n[OpenFDA 의약품]"]
    for item in items[:DRUG_CONTEXT_ITEMS]:
        openfda = item.get("openfda", {}) if isinstance(item.get("openfda"), dict) else {}
        brand = _first(openfda.get("brand_name"))
        generic = _first(openfda.get("generic_name"))
        indication = (item.get("indications_and_usage") or [""])[0][:DRUG_TEXT_CHARS] if isinstance(item.get("indications_and_usage"), list) else ""
        lines.append(f"  - {brand or generic}: {indication}")
    return lines


def _pubmed_lines(items: list[dict]) -> list[str]:
    lines = ["\n[PubMed 논문]"]
    for art in items[:DRUG_CONTEXT_ITEMS]:
        lines.append(f"  - {art.get('title', '')} ({art.get('pubdate', '')})")
    return lines


def build_drug_context(name: str, cas_no: str, english: dict, drug_data: dict) -> tuple[str, list, list, list]:
    """(context text, mfds items, openfda items, pubmed items) for the drug-analysis prompt."""
    context_parts = [f"화학물질: {name} (CAS: {cas_no})"]

    if english.get("hazard_statements"):
        context_parts.append("\n[GHS 유해성 문구]")
        for h in english["hazard_statements"][:HAZARD_LINES]:
            context_parts.append(f"  - {h}")

    mfds_items = drug_data.get("mfds", [])
    if mfds_items:
        context_parts.extend(_mfds_lines(mfds_items))
    fda_items = drug_data.get("openfda", [])
    if fda_items:
        context_parts.extend(_fda_lines(fda_items))
    pubmed_items = drug_data.get("pubmed", [])
    if pubmed_items:
        context_parts.extend(_pubmed_lines(pubmed_items))

    return "\n".join(context_parts), mfds_items, fda_items, pubmed_items
