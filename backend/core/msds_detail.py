"""Chemical detail payload for GET /api/chemicals/{chem_id}: MSDS sections (cached, else fetched from KOSHA),
English safety data and chemical metadata.

Moved out of backend/api/routes/chemicals.py. The open TerminologyDB and the KOSHA adapter are passed in by the
route (tests and scripts/static_export swap both on the route module).
"""
from __future__ import annotations

import logging
import re
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

logger = logging.getLogger("backend.api.routes.chemicals")  # same logger name as before the split

MSDS_SECTION_COUNT = 16
FETCH_WORKERS = 8

SECTION_TITLES = {
    1: "Chemical Product and Company Identification",
    2: "Hazards Identification",
    3: "Composition/Information on Ingredients",
    4: "First Aid Measures",
    5: "Fire Fighting Measures",
    6: "Accidental Release Measures",
    7: "Handling and Storage",
    8: "Exposure Controls/Personal Protection",
    9: "Physical and Chemical Properties",
    10: "Stability and Reactivity",
    11: "Toxicological Information",
    12: "Ecological Information",
    13: "Disposal Considerations",
    14: "Transport Information",
    15: "Regulatory Information",
    16: "Other Information",
}


def parse_msds_xml(xml_string: str) -> list[dict[str, Any]]:
    try:
        if not xml_string:
            return []
        root = ET.fromstring(xml_string)

        items = []
        for item in root.findall(".//item"):
            item_data = {}
            for child in item:
                item_data[child.tag] = child.text
            items.append(item_data)
        return items
    except Exception:
        logger.exception("Failed to parse MSDS XML payload")
        return []


def is_kosha_id(chem_id: str) -> bool:
    """KOSHA IDs are 6-digit zero-padded numbers (e.g., '001008')."""
    return bool(chem_id) and chem_id.isdigit() and len(chem_id) == 6


def looks_like_cas(value: str) -> bool:
    return bool(re.fullmatch(r"\d{2,7}-\d{2}-\d", value or ""))


def _load_meta(db, chem_id: str, is_kosha: bool) -> dict | None:
    meta_reader = getattr(db, "get_chemical_meta_by_chem_id", None)
    meta = meta_reader(chem_id) if callable(meta_reader) else {}
    if not meta and not is_kosha:
        # Non-KOSHA: try CAS-based lookup
        cas_meta_reader = getattr(db, "get_chemical_meta_by_cas", None)
        meta = cas_meta_reader(chem_id) if callable(cas_meta_reader) else {}
    return meta


def _fetch_sections(db, adapter, chem_id: str, is_kosha: bool) -> list[dict]:
    """Fetch all 16 MSDS sections from KOSHA in parallel, store the usable ones, return what the DB now holds."""
    logger.info("MSDS details for %s not found in DB. Fetching from API (parallel).", chem_id)
    try:
        def _fetch_section(seq: int) -> tuple[int, dict]:
            try:
                return seq, adapter.get_msds_detail(chem_id, section_seq=seq)
            except Exception as exc:
                logger.exception("Error fetching section %s for %s", seq, chem_id)
                return seq, {"status": "error", "message": str(exc)}

        with ThreadPoolExecutor(max_workers=FETCH_WORKERS) as pool:
            futures = {pool.submit(_fetch_section, s): s for s in range(1, MSDS_SECTION_COUNT + 1)}
            for future in as_completed(futures):
                seq, response = future.result()
                if response.get("status") != "success":
                    logger.warning(
                        "Failed to fetch section %s for %s: %s",
                        seq, chem_id, response.get("message", "unknown error"),
                    )
                    continue
                if not is_kosha and not parse_msds_xml(response.get("data", "")):
                    # KOSHA 번호 형식이 아닌 식별자(오타·"null" 등)의 빈 응답은 DB 에 남기지 않는다.
                    continue
                title = SECTION_TITLES.get(seq, f"Section {seq}")
                db.upsert_msds_detail(chem_id, seq, title, response.get("data", ""))

        return db.get_msds_details_by_chem_id(chem_id)
    except Exception:
        logger.exception("Failed to fetch MSDS from KOSHA API for %s", chem_id)
        return []


def _parse_sections(details: list[dict]) -> list[dict]:
    return [
        {
            "section_seq": section["section_seq"],
            "section_name": section["section_name"],
            "content": parse_msds_xml(section["content"]),
        }
        for section in details
    ]


def build_chemical_detail(db, adapter, chem_id: str) -> dict[str, Any] | None:
    """The detail payload, or None when the id is unknown and no MSDS could be found (route answers 404)."""
    is_kosha = is_kosha_id(chem_id)
    english_safety = db.get_msds_english_by_chem_id(chem_id)
    meta = _load_meta(db, chem_id, is_kosha)

    # MSDS 섹션은 KOSHA external_id 로 키잉된다. CAS 등으로 들어와도 meta 의 external_id 로 받는다.
    kosha_id = chem_id if is_kosha else ((meta or {}).get("external_id") or "")
    has_kosha = is_kosha_id(kosha_id)

    details = db.get_msds_details_by_chem_id(kosha_id) if has_kosha else []
    should_fetch_kosha = (has_kosha or (not meta and not looks_like_cas(chem_id))) and not details
    if should_fetch_kosha:
        details = _fetch_sections(db, adapter, kosha_id or chem_id, has_kosha)

    parsed_sections = _parse_sections(details)

    meta = meta or {}
    if not meta and not any(sec["content"] for sec in parsed_sections) and not english_safety:
        return None

    return {
        "chem_id": chem_id,
        "sections": parsed_sections,
        "english_safety": english_safety,
        "is_kosha": is_kosha,
        "name": meta.get("name", ""),
        "name_en": meta.get("name_en", ""),
        "cas_no": meta.get("cas_no", ""),
        "source": meta.get("source", ""),
    }
