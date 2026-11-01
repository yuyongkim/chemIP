"""One per-substance object (p/<chem_id>.json) built from the backend functions the API routes call.

Top-level keys (CONTRACT.md "p/"):
  v, chem_id, kind, cas, detail_status, detail          GET /api/chemicals/{chem_id}
  trade = {"import", "export"}                          GET /api/regulations/trade-controls/{cas}?direction=..&country=
  intl                                                  GET /api/regulations/international/{cas}
  permit_context                                        GET /api/integrations/kr-permit-context/{cas}
  ncis, controlled, kr_law, intl_lists, hs, hsk10_candidates   per-CAS facts (pilot "facts" keys)
Without a valid CAS every key after detail is null.
"""
from __future__ import annotations

import json

import config
import db
from facts import FACT_KEYS, facts_for

_MODS: dict = {}


def _backend() -> dict:
    """Backend functions, imported after the read-only patch (once per process)."""
    if not _MODS:
        db.prepare_backend()
        from backend.api.routes import chemicals as chem_routes
        from backend.core.intl_regulatory_store import get_by_cas
        from backend.core.trade_controls.assemble import build_trade_controls
        from backend.integrations.kr_permit_context_store import get_permit_context_by_cas

        _MODS.update(detail=chem_routes.get_chemical_details, intl=get_by_cas, trade=build_trade_controls,
                     permit=get_permit_context_by_cas)
    return _MODS


def detail_body(chem_id: str) -> tuple[dict, int]:
    """Exact body + status of GET /api/chemicals/{chem_id} (a JSONResponse means a non-200 status)."""
    res = _backend()["detail"](chem_id)
    if hasattr(res, "body"):
        return json.loads(res.body), res.status_code
    return json.loads(json.dumps(res)), 200  # same JSON round trip FastAPI does


def cas_parts(cas: str) -> dict:
    m = _backend()
    return {
        # the frontend sends country="" for the default view; the route passes kotra_fetch, unused without a country
        "trade": {d: m["trade"](cas, d, "") for d in config.DIRECTIONS},
        "intl": m["intl"](cas),
        "permit_context": m["permit"](cas),
        **facts_for(cas),
    }


def build_page(item: dict) -> dict:
    detail, status = detail_body(item["chem_id"])
    page = {"v": config.PAGE_FORMAT, "chem_id": item["chem_id"], "kind": item["kind"], "cas": item["cas"],
            "detail_status": status, "detail": detail}
    empty = {"trade": None, "intl": None, "permit_context": None, **{k: None for k in FACT_KEYS}}
    page.update(json.loads(json.dumps(cas_parts(item["cas"]))) if item["cas"] else empty)
    return page
