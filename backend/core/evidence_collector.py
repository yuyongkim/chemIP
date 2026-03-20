"""Evidence collection helpers extracted from routes/ai.py.

Gathers MSDS sections, patent highlights, drug mappings, and guide data
into structured context for AI analysis endpoints.
"""

from __future__ import annotations

import logging
import re
import xml.etree.ElementTree as ET

from backend.api.global_patent_adapter import GlobalPatentAdapter
from backend.api.patent_fetcher import PatentFetcher
from backend.core.terminology_db import TerminologyDB

logger = logging.getLogger(__name__)


def parse_msds_section_points(raw_xml: str, max_points: int = 5) -> list[str]:
    if not raw_xml:
        return []
    try:
        root = ET.fromstring(raw_xml)
    except Exception:
        return []

    points: list[str] = []
    for item in root.findall(".//item"):
        name = (item.findtext("msdsItemNameKor") or item.findtext("itemName") or "").strip()
        detail = (item.findtext("itemDetail") or "").strip()
        if not detail:
            for child in item:
                value = (child.text or "").strip()
                if value and child.tag not in {"msdsItemNameKor", "itemName"}:
                    detail = value
                    break
        if not detail:
            continue
        points.append(f"{name}: {detail}" if name else detail)
        if len(points) >= max_points:
            break
    return points


def section_content(details: list[dict], section_seq: int) -> str:
    for row in details:
        if int(row.get("section_seq", 0) or 0) == section_seq:
            return str(row.get("content", "") or "")
    return ""


def select_patent_query(request_name: str, meta: dict) -> str:
    for candidate in [
        str(meta.get("name_en", "") or "").strip(),
        str(request_name or "").strip(),
        str(meta.get("name", "") or "").strip(),
    ]:
        if not candidate:
            continue
        cleaned = re.sub(r"\([^)]*\)", " ", candidate)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        if cleaned:
            return cleaned
    return ""


def build_patent_highlights(chem_id: str, patent_query: str) -> list[dict]:
    highlights: list[dict] = []

    if patent_query:
        try:
            fetcher = PatentFetcher()
            kipris_results = fetcher.search_patents(patent_query) or []
            if fetcher.last_error:
                logger.warning("PatentFetcher warning for '%s': %s", patent_query, fetcher.last_error)
            else:
                for item in kipris_results[:3]:
                    title = str(item.get("inventionTitle", "") or "").strip()
                    if not title:
                        continue
                    applicant = str(item.get("applicantName", "") or "").strip()
                    status = str(item.get("registerStatus", "") or "").strip()
                    abstract = str(item.get("abstract", "") or "").replace("\n", " ").strip()
                    snippet_parts = [part for part in [applicant, status, abstract[:160]] if part]
                    highlights.append({
                        "type": "kipris_patent",
                        "type_label": "KIPRIS",
                        "id": str(item.get("applicationNumber", "") or "").strip(),
                        "title": title,
                        "snippet": " | ".join(snippet_parts)[:240],
                    })
        except Exception:
            logger.exception("Failed to collect KIPRIS patent evidence for '%s'", patent_query)

    try:
        local_count = 0
        global_results = GlobalPatentAdapter().search_patents_by_chem_id(chem_id, limit=6, offset=0)
        for item in global_results:
            if str(item.get("category", "") or "") == "exclusion":
                continue
            title = str(item.get("title", "") or "").strip()
            if not title:
                continue
            jurisdiction = str(item.get("jurisdiction", "") or "").strip()
            category = str(item.get("category", "") or "").strip()
            snippet = str(item.get("snippet", "") or "").replace("\n", " ").strip()
            snippet_parts = [part for part in [jurisdiction, category, snippet[:160]] if part]
            highlights.append({
                "type": "local_patent",
                "type_label": "Local Patent",
                "id": str(item.get("patent_id", "") or "").strip(),
                "title": title,
                "snippet": " | ".join(snippet_parts)[:240],
            })
            local_count += 1
            if local_count >= 3:
                break
    except Exception:
        logger.exception("Failed to collect local patent evidence for '%s'", chem_id)

    return highlights[:6]


def build_full_context(chem_id: str) -> tuple[str, dict]:
    """Build comprehensive context from ALL data sources for a chemical."""
    parts: list[str] = []
    source_counts: dict[str, int] = {}

    with TerminologyDB() as db:
        meta = db.get_chemical_meta_by_chem_id(chem_id) or {}
        details = db.get_msds_details_by_chem_id(chem_id) or []
        english = db.get_msds_english_by_chem_id(chem_id) or {}
        drug_data = db.get_drug_mappings(chem_id)
        guide_data = db.get_guide_mappings(chem_id, limit=6)

    name = meta.get("name", chem_id)
    parts.append(f"화학물질: {name} (CAS: {meta.get('cas_no', 'N/A')})")
    if english.get("name_en"):
        parts.append(f"영문명: {english['name_en']}")
    if english.get("signal_word"):
        parts.append(f"신호어: {english['signal_word']}")

    # --- MSDS ---
    if english.get("hazard_statements"):
        parts.append("\n[GHS 유해성 문구]")
        for h in english["hazard_statements"][:5]:
            parts.append(f"  - {h}")
        source_counts["ghs"] = len(english["hazard_statements"])

    msds_count = 0
    for seq, label in [(2, "유해위험성"), (4, "응급조치"), (7, "취급저장"), (8, "보호구"), (9, "물리화학적특성"), (11, "독성정보"), (15, "법적규제")]:
        points = parse_msds_section_points(section_content(details, seq), max_points=3)
        if points:
            parts.append(f"\n[MSDS {seq}항 - {label}]")
            for p in points:
                parts.append(f"  - {p}")
            msds_count += len(points)
    source_counts["msds_points"] = msds_count

    # --- 의약품 ---
    mfds_items = drug_data.get("mfds", [])
    if mfds_items:
        parts.append("\n[식약처(MFDS) 의약품]")
        for item in mfds_items[:8]:
            item_name = item.get("ITEM_NAME", "")
            entp = item.get("ENTP_NAME", "")
            efcy = (item.get("efcyQesitm") or "")[:120]
            parts.append(f"  - {item_name} ({entp}): {efcy}")
        source_counts["mfds"] = len(mfds_items)

    fda_items = drug_data.get("openfda", [])
    if fda_items:
        parts.append("\n[OpenFDA 의약품]")
        for item in fda_items[:8]:
            openfda = item.get("openfda", {}) if isinstance(item.get("openfda"), dict) else {}
            brand = (openfda.get("brand_name") or [""])[0] if isinstance(openfda.get("brand_name"), list) else ""
            generic = (openfda.get("generic_name") or [""])[0] if isinstance(openfda.get("generic_name"), list) else ""
            substance = (openfda.get("substance_name") or [""])[0] if isinstance(openfda.get("substance_name"), list) else ""
            indication = ""
            if isinstance(item.get("indications_and_usage"), list) and item["indications_and_usage"]:
                indication = item["indications_and_usage"][0][:120]
            parts.append(f"  - {brand or generic or substance}: {indication}")
        source_counts["openfda"] = len(fda_items)

    pubmed_items = drug_data.get("pubmed", [])
    if pubmed_items:
        parts.append("\n[PubMed 논문]")
        for art in pubmed_items[:8]:
            parts.append(f"  - {art.get('title', '')} ({art.get('source', '')}, {art.get('pubdate', '')})")
        source_counts["pubmed"] = len(pubmed_items)

    # --- KOSHA 가이드 ---
    if guide_data:
        parts.append("\n[KOSHA 안전보건 가이드]")
        for g in guide_data[:5]:
            title = g.get("title", "")
            match_terms = g.get("match_terms", [])
            parts.append(f"  - {title} (매칭: {', '.join(match_terms[:3])})")
        source_counts["kosha_guides"] = len(guide_data)

    return "\n".join(parts), {"name": name, "sources": source_counts, "meta": meta}
