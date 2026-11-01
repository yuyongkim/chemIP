"""Per-CAS trade facts: the inputs build_trade_controls() reads for one CAS, without the global rulebook.

With these + g/rulebook.json + the page's "intl", a client assembles any direction x country view
(reference: trade_assembly_ref.assemble_view). Pilot "facts" design, unchanged.
"""
from __future__ import annotations

import db  # noqa: F401  (sys.path for backend)
from backend.core.trade_controls import assemble, hs_codes, lists as tl


def strip_membership(m: dict) -> dict:
    """List metadata lives in the rulebook; a page keeps only what is CAS-specific."""
    return {"list_id": m.get("list_id"), "entries": m.get("entries"), "family_entries": m.get("family_entries")}


def facts_for(cas: str) -> dict:
    hs = hs_codes.lookup(cas)
    return {
        "ncis": assemble.ncis_record(cas),
        "controlled": tl.list_memberships(cas, tl.load_controlled_lists()),
        "kr_law": [strip_membership(m) for m in tl.kr_law_memberships(cas, tl.load_kr_law_lists())],
        "intl_lists": [strip_membership(m) for m in tl.intl_memberships(cas, tl.load_intl_lists())],
        "hs": hs,
        "hsk10_candidates": hs_codes.hsk10_candidates(cas) if hs else [],
    }


FACT_KEYS = ("ncis", "controlled", "kr_law", "intl_lists", "hs", "hsk10_candidates")
