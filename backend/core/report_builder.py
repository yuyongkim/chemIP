"""Build the AI insight report from MSDS evidence and guide recommendations.

Two report modes are supported:

* **rule-based** (default): deterministic markdown from evidence bullet-points.
* **LLM-enhanced**: local Ollama model generates a natural-language report
  grounded in the same evidence.  Falls back to rule-based on any failure.
  Lives in backend/core/llm_report.py; ``build_llm_report`` etc. stay importable from here.
"""

from __future__ import annotations

import logging
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


# LLM-enhanced report names, re-exported lazily (llm_report imports this module, so no top-level import here).
_LLM_REPORT_NAMES = {"build_llm_report", "_build_evidence_context", "_sanitize_llm_output", "_SYSTEM_PROMPT", "_FORBIDDEN_METADATA_RE"}


def __getattr__(name: str):
    if name in _LLM_REPORT_NAMES:
        from backend.core import llm_report

        return getattr(llm_report, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
