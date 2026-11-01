"""Drug information linked to one chemical (MFDS / OpenFDA / PubMed) for GET /api/chemicals/{chem_id}/drugs.

Moved out of backend/api/routes/chemicals.py. Cached rows come from the drug_mappings table; otherwise the three
sources are queried in parallel and the result is cached. Clients and the open TerminologyDB are passed in.
"""
from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger("backend.api.routes.chemicals")  # same logger name as before the split

MFDS_ROWS = 20
FDA_FIELDS = ("substance_name", "generic_name", "brand_name")
FDA_FIELD_LIMIT = 100
FDA_CAS_LIMIT = 50
PUBMED_SUFFIXES = ("", " toxicology", " safety", " pharmacology", " exposure")
PUBMED_RETMAX = 20
PUBMED_MAX_ARTICLES = 50


def _search_terms(meta: dict) -> tuple[str, str, str, str]:
    """(search_term, search_term_kr, name_en, cas_no) from the chemical metadata."""
    name = meta["name"]
    cas_no = meta.get("cas_no", "")
    name_en = meta.get("name_en", "")
    # Use the best available search term
    search_term = name_en or name.split("(")[0].strip() if name else ""
    search_term_kr = name.split("(")[0].strip() if name else ""
    return search_term, search_term_kr, name_en, cas_no


def fetch_mfds(mfds, chem_id: str, terms: list[str]) -> list[dict]:
    try:
        all_items: list[dict] = []
        seen_seq: set[str] = set()
        for term in terms:
            if not term:
                continue
            r = mfds.search_easy_info(item_name=term, num_of_rows=MFDS_ROWS)
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


def _add_fda_results(result: dict, all_items: list[dict], seen_ids: set[str]) -> None:
    if result.get("status") == "success" and result.get("results"):
        for it in result["results"]:
            fda_id = it.get("id", "")
            if fda_id and fda_id in seen_ids:
                continue
            seen_ids.add(fda_id)
            it["_key"] = fda_id or str(len(all_items))
            all_items.append(it)


def fetch_fda(fda, chem_id: str, q: str, cas_no: str) -> list[dict]:
    try:
        if not q:
            return []
        all_items: list[dict] = []
        seen_ids: set[str] = set()
        # Search across all fields and merge
        for field in FDA_FIELDS:
            _add_fda_results(fda.search_labels(search_query=f'openfda.{field}:"{q}"', limit=FDA_FIELD_LIMIT), all_items, seen_ids)
        # Also search by CAS number if available
        if cas_no:
            _add_fda_results(fda.search_labels(search_query=f'openfda.unii:"{cas_no}"', limit=FDA_CAS_LIMIT), all_items, seen_ids)
        return all_items
    except Exception:
        logger.exception("OpenFDA fetch failed for %s", chem_id)
        return []


def fetch_pubmed(pubmed, chem_id: str, q: str, cas_no: str) -> list[dict]:
    try:
        if not q:
            return []
        all_articles: list[dict] = []
        seen_pmids: set[str] = set()
        # Multiple search strategies to get broader coverage
        search_terms = [f"{q}{suffix}" for suffix in PUBMED_SUFFIXES]
        if cas_no:
            search_terms.append(cas_no)
        for term in search_terms:
            r = pubmed.search(term=term, retmax=PUBMED_RETMAX)
            for art in r.get("articles", []) if r.get("status") == "success" else []:
                pmid = art.get("pmid", "")
                if pmid and pmid in seen_pmids:
                    continue
                seen_pmids.add(pmid)
                art["_key"] = pmid
                art["_search_term"] = term
                all_articles.append(art)
            if len(all_articles) >= PUBMED_MAX_ARTICLES:
                break
        return all_articles[:PUBMED_MAX_ARTICLES]
    except Exception:
        logger.exception("PubMed fetch failed for %s", chem_id)
        return []


def build_drug_links(db, chem_id: str, refresh: bool, *, mfds, fda, pubmed) -> dict:
    # Check cache first
    if not refresh:
        cached = db.get_drug_mappings(chem_id)
        if cached:
            return {"chem_id": chem_id, "cached": True, **cached}

    # Look up chemical name and CAS
    meta = db.get_chemical_meta_by_chem_id(chem_id)
    if not meta:
        return {"chem_id": chem_id, "mfds": [], "openfda": [], "pubmed": []}

    search_term, search_term_kr, name_en, cas_no = _search_terms(meta)
    q = name_en or search_term

    with ThreadPoolExecutor(max_workers=3) as pool:
        f_mfds = pool.submit(fetch_mfds, mfds, chem_id, [search_term_kr, search_term, cas_no])
        f_fda = pool.submit(fetch_fda, fda, chem_id, q, cas_no)
        f_pubmed = pool.submit(fetch_pubmed, pubmed, chem_id, q, cas_no)

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
