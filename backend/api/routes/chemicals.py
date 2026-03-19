import logging
import socket
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from fastapi import APIRouter, Query
import xml.etree.ElementTree as ET

from backend.core.terminology_db import TerminologyDB
from backend.api.kosha_msds_adapter import KoshaMsdsAdapter
from backend.api.mfds_client import MFDSClient
from backend.api.fda_client import OpenFDAClient
from backend.api.pubmed_client import PubMedClient

router = APIRouter()
logger = logging.getLogger(__name__)

adapter = KoshaMsdsAdapter()
_mfds = MFDSClient()
_fda = OpenFDAClient()
_pubmed = PubMedClient()


def _is_kosha_reachable(timeout: float = 2.0) -> bool:
    """Quick TCP check before attempting KOSHA API calls."""
    try:
        sock = socket.create_connection(("msds.kosha.or.kr", 443), timeout=timeout)
        sock.close()
        return True
    except (OSError, socket.timeout):
        return False

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


@router.get("")
def search_chemicals(
    q: str = Query(..., min_length=1, description="Search query for chemical name or CAS No"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
):
    query = q.strip()
    if not query:
        return {"items": [], "total": 0}

    with TerminologyDB() as db:
        offset = (page - 1) * limit
        return db.search_chemicals(query, limit, offset)


@router.get("/autocomplete")
def autocomplete_chemicals(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(5, ge=1, le=20),
):
    query = q.strip()
    if not query:
        return []

    with TerminologyDB() as db:
        result = db.search_chemicals(query, limit=limit, offset=0)
        return result["items"]


@router.get("/{chem_id}")
def get_chemical_details(chem_id: str):
    with TerminologyDB() as db:
        details = db.get_msds_details_by_chem_id(chem_id)
        english_safety = db.get_msds_english_by_chem_id(chem_id)

        if not details and _is_kosha_reachable():
            logger.info("MSDS details for %s not found in DB. Fetching from API (parallel).", chem_id)
            try:
                def _fetch_section(seq: int) -> tuple[int, dict]:
                    try:
                        return seq, adapter.get_msds_detail(chem_id, section_seq=seq)
                    except Exception as exc:
                        logger.exception("Error fetching section %s for %s", seq, chem_id)
                        return seq, {"status": "error", "message": str(exc)}

                with ThreadPoolExecutor(max_workers=8) as pool:
                    futures = {pool.submit(_fetch_section, s): s for s in range(1, 17)}
                    for future in as_completed(futures):
                        seq, response = future.result()
                        if response.get("status") != "success":
                            logger.warning(
                                "Failed to fetch section %s for %s: %s",
                                seq, chem_id, response.get("message", "unknown error"),
                            )
                            continue
                        title = SECTION_TITLES.get(seq, f"Section {seq}")
                        db.upsert_msds_detail(chem_id, seq, title, response.get("data", ""))

                details = db.get_msds_details_by_chem_id(chem_id)
            except Exception:
                logger.exception("Failed to fetch MSDS from KOSHA API for %s", chem_id)
                details = []

        parsed_sections = []
        for section in details:
            parsed_content = parse_msds_xml(section["content"])
            parsed_sections.append(
                {
                    "section_seq": section["section_seq"],
                    "section_name": section["section_name"],
                    "content": parsed_content,
                }
            )

        return {"chem_id": chem_id, "sections": parsed_sections, "english_safety": english_safety}


@router.get("/{chem_id}/drugs")
def get_chemical_drugs(chem_id: str, refresh: bool = False):
    """Return drug info (MFDS / OpenFDA / PubMed) linked to a chemical."""
    with TerminologyDB() as db:
        # Check cache first
        if not refresh:
            cached = db.get_drug_mappings(chem_id)
            if cached:
                return {"chem_id": chem_id, "cached": True, **cached}

        # Look up chemical name and CAS
        meta = db.get_chemical_meta_by_chem_id(chem_id)
        if not meta:
            return {"chem_id": chem_id, "mfds": [], "openfda": [], "pubmed": []}

        name = meta["name"]
        cas_no = meta.get("cas_no", "")
        name_en = meta.get("name_en", "")
        # Use the best available search term
        search_term = name_en or name.split("(")[0].strip() if name else ""
        search_term_kr = name.split("(")[0].strip() if name else ""

        def _fetch_mfds():
            try:
                all_items: list[dict] = []
                seen_seq: set[str] = set()
                for term in [search_term_kr, search_term, cas_no]:
                    if not term:
                        continue
                    r = _mfds.search_easy_info(item_name=term, num_of_rows=20)
                    for it in r.get("items", []) if r.get("status") == "success" else []:
                        seq = it.get("ITEM_SEQ", "")
                        if seq and seq in seen_seq:
                            continue
                        seen_seq.add(seq)
                        it["_key"] = seq or str(len(all_items))
                        all_items.append(it)
                return all_items
            except Exception:
                logger.exception("MFDS fetch failed for %s", chem_id)
                return []

        def _fetch_fda():
            try:
                q = name_en or search_term
                if not q:
                    return []
                all_items: list[dict] = []
                seen_ids: set[str] = set()
                # Search across all fields and merge
                for field in ["substance_name", "generic_name", "brand_name"]:
                    r = _fda.search_labels(search_query=f'openfda.{field}:"{q}"', limit=100)
                    if r.get("status") == "success" and r.get("results"):
                        for it in r["results"]:
                            fda_id = it.get("id", "")
                            if fda_id and fda_id in seen_ids:
                                continue
                            seen_ids.add(fda_id)
                            it["_key"] = fda_id or str(len(all_items))
                            all_items.append(it)
                # Also search by CAS number if available
                if cas_no:
                    r = _fda.search_labels(search_query=f'openfda.unii:"{cas_no}"', limit=50)
                    if r.get("status") == "success" and r.get("results"):
                        for it in r["results"]:
                            fda_id = it.get("id", "")
                            if fda_id and fda_id in seen_ids:
                                continue
                            seen_ids.add(fda_id)
                            it["_key"] = fda_id or str(len(all_items))
                            all_items.append(it)
                return all_items
            except Exception:
                logger.exception("OpenFDA fetch failed for %s", chem_id)
                return []

        def _fetch_pubmed():
            try:
                q = name_en or search_term
                if not q:
                    return []
                all_articles: list[dict] = []
                seen_pmids: set[str] = set()
                # Multiple search strategies to get broader coverage
                search_terms = [
                    q,
                    f"{q} toxicology",
                    f"{q} safety",
                    f"{q} pharmacology",
                    f"{q} exposure",
                ]
                if cas_no:
                    search_terms.append(cas_no)
                for term in search_terms:
                    r = _pubmed.search(term=term, retmax=20)
                    for art in r.get("articles", []) if r.get("status") == "success" else []:
                        pmid = art.get("pmid", "")
                        if pmid and pmid in seen_pmids:
                            continue
                        seen_pmids.add(pmid)
                        art["_key"] = pmid
                        art["_search_term"] = term
                        all_articles.append(art)
                    if len(all_articles) >= 50:
                        break
                return all_articles[:50]
            except Exception:
                logger.exception("PubMed fetch failed for %s", chem_id)
                return []

        with ThreadPoolExecutor(max_workers=3) as pool:
            f_mfds = pool.submit(_fetch_mfds)
            f_fda = pool.submit(_fetch_fda)
            f_pubmed = pool.submit(_fetch_pubmed)

        mfds_items = f_mfds.result()
        fda_items = f_fda.result()
        pubmed_items = f_pubmed.result()

        # Cache results
        db.upsert_drug_mappings(chem_id, "mfds", mfds_items)
        db.upsert_drug_mappings(chem_id, "openfda", fda_items)
        db.upsert_drug_mappings(chem_id, "pubmed", pubmed_items)

        return {
            "chem_id": chem_id,
            "cached": False,
            "mfds": mfds_items,
            "openfda": fda_items,
            "pubmed": pubmed_items,
        }
