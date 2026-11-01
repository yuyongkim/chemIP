"""Shared files under g/: the global rulebook and the parts every per-CAS API response repeats.

g/rulebook.json        list metadata, KR rules, permits, HS meta, parent blocs (pilot "rulebook")
g/trade_common.json    sources_status + hs_meta as they appear in every trade-controls response
g/permit_common.json   durations + attribution as they appear in every kr-permit-context response
g/trade_catalog.json   GET /api/regulations/trade-controls-catalog (exact body)
"""
from __future__ import annotations

import db  # noqa: F401  (sys.path for backend)
from backend.core.trade_controls import assemble, hs_codes, lists as tl, permits, rules
from backend.core.trade_controls.assemble import build_trade_controls
from backend.core.trade_controls.catalog import catalog
from backend.integrations.kr_permit_context_store import get_permit_context_by_cas

PROBE_CAS = "71-43-2"  # any valid CAS: these fields do not depend on the substance


def _meta(docs: list[dict], fields: tuple, extra: tuple = ()) -> list[dict]:
    return [{**{f: d.get(f) for f in fields}, **{f: d.get(f) for f in extra}, "file": d.get("_file", "")} for d in docs]


def rulebook() -> dict:
    permit_items, _ = permits.load_permits()
    return {
        "kr_rules": rules.load_kr_rules() or {},
        "permits": permit_items,
        "intl_lists": _meta(tl.load_intl_lists(), tl.INTL_META_FIELDS, ("absence_note",)),
        "kr_lists": _meta(tl.load_kr_law_lists(), tl.KR_LAW_META_FIELDS),
        "controlled_lists": _meta(tl.load_controlled_lists(), tl.CONTROLLED_META_FIELDS),
        "hs_meta": hs_codes.meta(),
        "parent_blocs": assemble.PARENT_BLOCS,
    }


def write_globals(root: str) -> dict:
    """Write g/<name>.json (gzip bytes). Returns {name: [raw, gz]}."""
    import os

    from jsonio import write_gzip

    return {name: list(write_gzip(os.path.join(root, f"{name}.json"), obj)) for name, obj in global_files().items()}


def global_files() -> dict[str, dict]:
    probe = get_permit_context_by_cas(PROBE_CAS)
    return {
        "rulebook": rulebook(),
        "trade_common": {"sources_status": build_trade_controls(PROBE_CAS, "import", "")["sources_status"],
                         "hs_meta": hs_codes.meta()},
        "permit_common": {"durations": probe.get("durations"), "attribution": probe.get("attribution")},
        "trade_catalog": catalog(),
    }
