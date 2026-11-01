"""One per-substance "extras" object (p/<chem_id>.x.json): the lower panels and the guides tab of the substance page.

Built from the backend route functions the API calls, with every live (network) source switched off:
  guides        GET /api/guides/recommend/{chem_id}                         (exact body, limit = UI default)
  handlers      GET /api/handlers?chem_id=..&facility_limit=..               (local PRTR cache only; the live parts
                                                                             answer as the backend does when offline)
  incidents     GET /api/integrations/incidents/{cas}?limit=..             (exact body; only in kind "cas" files,
  enforcement   GET /api/integrations/enforcement/{cas}?limit=..            which the UI reads by CAS; else null)
Request parameters are the ones the UI sends (config.EXTRAS_PARAMS). Format: CONTRACT.md "p/<chem_id>.x.json".
"""
from __future__ import annotations

import json
import logging
from types import SimpleNamespace

import config
import db

_MODS: dict = {}


class _NoNetwork(RuntimeError):
    pass


def _refuse(*_a, **_k):
    raise _NoNetwork("static export: live source not included")


class _NoSession:
    """Stand-in for requests.Session in the PRTR live module: any request fails like a network error."""

    def __init__(self, *_a, **_k):
        self.headers = {}

    get = post = staticmethod(_refuse)


def _switch_off_live_sources() -> None:
    """The exporter never calls external APIs: live lookups fail, and the backend answers with its offline shape."""
    from backend.api.handling_sites import accidents, gyeonggi, prtr_live
    from backend.core import terminology_db as tdb

    accidents.safe_get = gyeonggi.safe_get = _refuse
    prtr_live.requests = SimpleNamespace(Session=_NoSession)  # only this module's view of `requests`
    tdb.TerminologyDB.upsert_guide_mappings = lambda self, *a, **k: None  # the guides route caches; the DB is read-only
    logging.getLogger("backend.api.handlers_adapter").setLevel(logging.CRITICAL)  # expected failures, no tracebacks


class _LowerCached(str):
    """A str whose .lower() is computed once. Same characters, so the backend's guide search gives the same answer;
    it lower-cases all ~1,000 guide texts (30 MB) on every query term, which made the export 5x slower."""

    def lower(self):  # noqa: D401
        cached = self.__dict__.get("_lower")
        if cached is None:
            cached = self.__dict__["_lower"] = str.lower(self)
        return cached


def _cache_guide_lowercase(store) -> None:
    store.ensure_loaded()
    for item in [*store._metas.values(), *store._docs.values()]:
        for field in ("title", "text"):
            if isinstance(getattr(item, field, None), str):
                setattr(item, field, _LowerCached(getattr(item, field)))


def _skip_unindexed_kosha_misses() -> None:
    """get_chemical_meta_by_chem_id() looks up `description = 'KOSHA_ID:<id>'`, which has no index: a full scan (0.2 s)
    that finds nothing for the ~150k CAS / MSDS chem_ids. Answer those misses at once; hits still run the backend query,
    so every answer is the backend's own."""
    from backend.core import terminology_db as tdb

    with db.ro_connect() as conn:
        known = {d for (d,) in conn.execute("SELECT description FROM chemical_terms WHERE description LIKE 'KOSHA_ID:%'")}
    original = tdb.TerminologyDB.get_chemical_meta_by_chem_id

    def get_chemical_meta_by_chem_id(self, chem_id):
        return original(self, chem_id) if f"KOSHA_ID:{chem_id}" in known else None

    tdb.TerminologyDB.get_chemical_meta_by_chem_id = get_chemical_meta_by_chem_id


def _backend() -> dict:
    if not _MODS:
        db.prepare_backend()
        _switch_off_live_sources()
        _skip_unindexed_kosha_misses()
        from backend.api.routes import guides, handlers
        from backend.integrations.echo_enforcement_store import get_enforcement_by_cas
        from backend.integrations.incident_store import get_incidents_by_cas

        _cache_guide_lowercase(guides.store)
        _MODS.update(guides=guides.recommend_guides_for_chemical, guide_status=guides.get_guide_status,
                     guide_store=guides.store, handlers=handlers.get_handlers,
                     incidents=get_incidents_by_cas, enforcement=get_enforcement_by_cas)
    return _MODS


def _json(obj):
    return json.loads(json.dumps(obj))  # same JSON round trip FastAPI does


def guides_body(chem_id: str) -> dict:
    p = config.EXTRAS_PARAMS["guides"]
    return _backend()["guides"](chem_id, chemical_name="", limit=p["limit"], refresh=False)


def handlers_body(chem_id: str) -> dict:
    p = config.EXTRAS_PARAMS["handlers"]
    return _backend()["handlers"](chem_id=chem_id, cas="", name="", name_en="", year=p["year"],
                                  accident_years=p["accident_years"], facility_limit=p["facility_limit"])


def build_extras(item: dict) -> dict:
    m, cas, P = _backend(), item["cas"], config.EXTRAS_PARAMS
    by_cas = item["kind"] == "cas" and cas  # CAS-keyed panels: one copy per CAS, in the file named by that CAS
    return _json({
        "v": config.EXTRAS_FORMAT, "chem_id": item["chem_id"], "kind": item["kind"], "cas": cas,
        "guides": guides_body(item["chem_id"]),
        "handlers": handlers_body(item["chem_id"]),
        "incidents": m["incidents"](cas, limit=P["incidents"]["limit"]) if by_cas else None,
        "enforcement": m["enforcement"](cas, limit=P["enforcement"]["limit"]) if by_cas else None,
    })


def guide_status() -> dict:
    """GET /api/guides/status after the store is loaded (what the live server reports once it has served a guide)."""
    m = _backend()
    m["guide_store"].ensure_loaded()
    return _json(m["guide_status"]())
