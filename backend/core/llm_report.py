"""LLM-enhanced AI insight report: evidence → prompt for the local Ollama model → sanitised markdown.

Falls back to the rule-based report (backend/core/report_builder.py) on any failure. Split out of
report_builder.py, which still exposes these names.
"""

from __future__ import annotations

import logging
import re

from backend.core.report_builder import EvidenceBundle, build_report_markdown

logger = logging.getLogger("backend.core.report_builder")  # same logger name as before the split


_SYSTEM_PROMPT = """\
You are a chemical safety analyst assistant.
Given MSDS evidence, KOSHA guide data, and patent evidence for a chemical substance,
write a concise safety analysis report in Korean.
Structure: 1) 안전 요약  2) 규제/가이드 인사이트  3) 특허 시그널  4) 후속 조치 제안.
Base every claim on the provided evidence. If evidence is insufficient, say so.
Keep the report under 500 words. Use markdown formatting.
Do not invent dates, publication metadata, authors, standard numbers, measurements, or guide identifiers unless they are explicitly present in the evidence.
Do not add a 작성일, date, version, or source section unless the evidence explicitly contains it.
If regulatory evidence is limited, state that the evidence is limited instead of guessing.
Only mention KOSHA guides that are present in the provided evidence block.
Prefer plain-language safety guidance over technical method details.
Do not quote clause numbers, article numbers, internal IDs, method codes, molecular formulas, or instrument codes unless absolutely necessary and explicitly evidenced."""


def _build_evidence_context(bundle: EvidenceBundle) -> str:
    """Serialise the evidence bundle into a text block for the LLM prompt."""
    parts: list[str] = [f"화학물질: {bundle.chemical_name} (ID: {bundle.chem_id})"]

    if bundle.section2_points:
        parts.append("\n[MSDS 2항 - 유해위험성]")
        for p in bundle.section2_points:
            parts.append(f"  - {p}")

    if bundle.section15_points:
        parts.append("\n[MSDS 15항 - 법적규제현황]")
        for p in bundle.section15_points:
            parts.append(f"  - {p}")

    if bundle.hazard_statements:
        parts.append("\n[GHS 유해성 문구 (영문)]")
        for h in bundle.hazard_statements:
            parts.append(f"  - {h}")

    if bundle.guide_recommendations:
        parts.append("\n[KOSHA 안전보건 가이드]")
        for rec in bundle.guide_recommendations[:4]:
            title = rec.get("title", "")
            guide_terms = [
                str(term).strip()
                for term in (rec.get("match_terms", []) or [])
                if str(term).strip() and not re.fullmatch(r"\d+", str(term).strip()) and not re.fullmatch(r"\d{2,7}-\d{2}-\d", str(term).strip())
            ][:3]
            match_terms = ", ".join(guide_terms)
            extra_bits = [part for part in [f"matched: {match_terms}" if match_terms else ""] if part]
            if extra_bits:
                parts.append(f"  - {title} ({'; '.join(extra_bits)})")
            else:
                parts.append(f"  - {title}")

    if bundle.patent_highlights:
        parts.append("\n[특허 근거]")
        for item in bundle.patent_highlights[:4]:
            title = str(item.get("title", "") or "").strip()
            snippet = str(item.get("snippet", "") or "").strip()
            type_label = str(item.get("type_label", "Patent") or "Patent")
            if title and snippet:
                parts.append(f"  - [{type_label}] {title}: {snippet}")
            elif title:
                parts.append(f"  - [{type_label}] {title}")

    return "\n".join(parts)


_FORBIDDEN_METADATA_RE = re.compile(
    r"^\s*(?:\*{0,2})?(?:작성일|일자|date|report date|generated on|version)\s*[:：\-].*$",
    re.IGNORECASE,
)


def _sanitize_llm_output(text: str, *, chemical_name: str) -> str:
    lines = text.splitlines()
    cleaned: list[str] = []
    skipped_leading_blank = False

    for line in lines:
        stripped = line.strip()
        if _FORBIDDEN_METADATA_RE.match(stripped):
            continue
        if not skipped_leading_blank and not stripped:
            continue
        skipped_leading_blank = True
        cleaned.append(line.rstrip())

    while cleaned and not cleaned[-1].strip():
        cleaned.pop()

    if not cleaned:
        return ""

    if not cleaned[0].lstrip().startswith("## "):
        cleaned.insert(0, f"## {chemical_name} 안전 분석 리포트")
        cleaned.insert(1, "")

    return "\n".join(cleaned).strip()


def build_llm_report(bundle: EvidenceBundle) -> dict:
    """Generate a report using the local LLM, falling back to rule-based.

    Returns ``{"analysis": str, "model": str, "llm_used": bool}``.
    """
    from backend.core.llm_client import generate  # lazy import to avoid circular

    context = _build_evidence_context(bundle)
    prompt = f"""다음 화학물질의 안전 분석 리포트를 작성하세요.

{context}

위 근거를 바탕으로 안전 분석 리포트를 markdown으로 작성하세요."""

    resp = generate(prompt, system=_SYSTEM_PROMPT)

    if resp.available and resp.text:
        sanitized = _sanitize_llm_output(resp.text, chemical_name=bundle.chemical_name)
        logger.info("LLM report generated (model=%s, len=%d)", resp.model, len(sanitized or resp.text))
        return {
            "analysis": sanitized or resp.text,
            "model": resp.model,
            "llm_used": True,
        }

    # Fallback
    logger.info("LLM unavailable (%s), using rule-based report", resp.error)
    return {
        "analysis": build_report_markdown(bundle),
        "model": "",
        "llm_used": False,
    }
