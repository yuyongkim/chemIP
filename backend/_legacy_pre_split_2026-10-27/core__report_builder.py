"""Build the AI insight report from MSDS evidence and guide recommendations.

Two report modes are supported:

* **rule-based** (default): deterministic markdown from evidence bullet-points.
* **LLM-enhanced**: local Ollama model generates a natural-language report
  grounded in the same evidence.  Falls back to rule-based on any failure.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class EvidenceBundle:
    """Intermediate container holding all evidence for one chemical."""

    chem_id: str
    chemical_name: str
    section2_points: list[str] = field(default_factory=list)
    section15_points: list[str] = field(default_factory=list)
    hazard_statements: list[str] = field(default_factory=list)
    guide_recommendations: list[dict] = field(default_factory=list)
    patent_highlights: list[dict] = field(default_factory=list)


def build_sources(bundle: EvidenceBundle) -> list[dict]:
    """Create the ``sources`` list from collected evidence."""
    sources: list[dict] = []

    if bundle.section2_points:
        sources.append({
            "type": "msds_section",
            "id": f"{bundle.chem_id}:2",
            "title": "MSDS Section 2 (Hazards Identification)",
            "snippet": bundle.section2_points[0],
        })
    if bundle.section15_points:
        sources.append({
            "type": "msds_section",
            "id": f"{bundle.chem_id}:15",
            "title": "MSDS Section 15 (Regulatory Information)",
            "snippet": bundle.section15_points[0],
        })
    if bundle.hazard_statements:
        sources.append({
            "type": "msds_english",
            "id": f"{bundle.chem_id}:english",
            "title": "MSDS English Hazard Statements",
            "snippet": bundle.hazard_statements[0],
        })

    for rec in bundle.guide_recommendations[:4]:
        sources.append({
            "type": "kosha_guide",
            "id": rec.get("guide_no", ""),
            "title": rec.get("title", ""),
            "url": rec.get("file_download_url", ""),
            "snippet": rec.get("snippet", "") or rec.get("text_preview", ""),
            "match_terms": rec.get("match_terms", []),
            "guide_cas_numbers": rec.get("guide_cas_numbers", []),
        })

    for item in bundle.patent_highlights[:4]:
        sources.append({
            "type": item.get("type", "patent"),
            "id": item.get("id", ""),
            "title": item.get("title", ""),
            "snippet": item.get("snippet", ""),
            "url": item.get("url", ""),
        })

    return sources


def build_report_markdown(bundle: EvidenceBundle) -> str:
    """Generate the markdown report string."""
    safety_lines = bundle.section2_points[:4] + bundle.hazard_statements[:3]
    if not safety_lines:
        safety_lines = [
            "Detailed hazard section is not yet cached for this chemical.",
            "Please review MSDS section details directly for official handling guidance.",
        ]

    guide_titles = [
        str(x.get("title", "")).strip()
        for x in bundle.guide_recommendations
        if x.get("title")
    ][:3]
    patent_lines = [
        f"- [{item.get('type_label', 'Patent')}] {item.get('title', '')}: {item.get('snippet', '')}"
        for item in bundle.patent_highlights[:4]
        if item.get("title") and item.get("snippet")
    ]

    lines = [
        f"## AI Insight Report: {bundle.chemical_name}",
        "",
        "### 1. Safety Summary",
        f"Chemical ID: `{bundle.chem_id}`",
        "",
    ]
    for sl in safety_lines[:6]:
        lines.append(f"- {sl}")

    lines.extend(["", "### 2. Regulatory and Guide Insights"])
    if bundle.section15_points:
        for sl in bundle.section15_points[:4]:
            lines.append(f"- {sl}")
    else:
        lines.append("- Regulatory section evidence is limited in current cache.")

    if guide_titles:
        lines.append("- Related KOSHA Guides: " + ", ".join(guide_titles))
    else:
        lines.append("- No strongly matched KOSHA guide found for current query terms.")

    lines.extend(["", "### 3. Patent Signals"])
    if patent_lines:
        lines.extend(patent_lines)
    else:
        lines.append("- Patent evidence is limited for the current query.")

    lines.extend([
        "",
        "### 4. Follow-up Actions",
        "- Validate exposure controls and PPE requirements before handling or scale-up decisions.",
        "- Cross-check patent scope and application themes before commercialization decisions.",
        "- Use guide documents as operational context, and MSDS as authoritative chemical-level safety reference.",
        "",
        "---",
        "Note: This report is retrieval-assisted (MSDS + KOSHA Guide + Patent evidence) and should be reviewed by a domain expert.",
    ])
    return "\n".join(lines)


def calculate_confidence(bundle: EvidenceBundle) -> float:
    evidence_count = (
        len(bundle.section2_points)
        + len(bundle.section15_points)
        + len(bundle.hazard_statements)
        + len(bundle.guide_recommendations)
        + len(bundle.patent_highlights)
    )
    return round(min(0.95, 0.4 + (evidence_count * 0.04)), 2)


# ---------------------------------------------------------------------------
# LLM-enhanced report
# ---------------------------------------------------------------------------

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
