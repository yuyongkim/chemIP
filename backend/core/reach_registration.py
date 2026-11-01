"""EU REACH registration status of ONE substance, looked up on ECHA CHEM when a user opens it (GET /api/reach/<CAS>).

Why per request: the ECHA legal notice (https://echa.europa.eu/legal-notice, 5.1.1) allows reuse with the
acknowledgement "Source: European Chemicals Agency, https://echa.europa.eu/" and the content unchanged, but forbids
systematic automated collection of the whole or a substantial part of its databases. One lookup per user request,
cached, is an individual lookup; nothing is pre-crawled.

Order: the bundled list (intl_lists/EU_REACH_REGISTERED.json, ~250 key substances) → in-memory cache → ECHA CHEM.
Same answer shape as the Cloudflare Worker (cloudflare/worker/src/reach/lookup.js), which serves the route when the PC
is off. The hit choice and dossier summary repeat scripts/trade_controls/intl/parse_echa_reach.py (pick_substance,
subtype_label, summarize_dossiers, detail_text) so an on-demand entry equals a bundled one — change the three together.
"""
from __future__ import annotations

import datetime as dt
import logging
import re
import threading
import time
from collections import Counter
from typing import Any, Callable

from backend.api.http_client import safe_get

logger = logging.getLogger(__name__)

LIST_ID = "EU_REACH_REGISTERED"
BASE = "https://chem.echa.europa.eu"
SEARCH = BASE + "/api-substance/v1/substance"
SUBSTANCE = BASE + "/api-substance/v1/substance/{rml}"
DOSSIERS = BASE + "/api-dossier-list/v1/dossier"
PAGE_URL = BASE + "/{rml}"
DOSSIER_PAGE_SIZE = 1000
DOSSIER_MAX_PAGES = 5
TIMEOUT_S = 12
USER_AGENT = "ChemIP REACH lookup (+https://chemip.yule.pics/chemip; free chemical-safety portal; one CAS per user request, cached)"
ATTRIBUTION = "Source: European Chemicals Agency, https://echa.europa.eu/"
TTL_FOUND_S = 30 * 86400
TTL_NONE_S = 7 * 86400
UPSTREAM_MAX, UPSTREAM_WINDOW_S = 20, 60  # cache misses per minute, all users together
SCHEMA = 1
CAS_RE = re.compile(r"^(\d{2,7})-(\d{2})-(\d)$")
REGISTERED = "REACH REGISTERED"
SUBTYPE_LABELS = (
    ("article 10", "full registration (Art. 10)"),
    ("article 17", "on-site isolated intermediate (Art. 17)"),
    ("article 18", "transported isolated intermediate (Art. 18)"),
)

_cache: dict[str, tuple[float, dict]] = {}
_lock = threading.Lock()
_misses: list[float] = []


def cas_is_valid(cas: str) -> bool:
    m = CAS_RE.match(cas or "")
    if not m:
        return False
    digits = (m.group(1) + m.group(2))[::-1]
    return sum((i + 1) * int(d) for i, d in enumerate(digits)) % 10 == int(m.group(3))


def clean(text: Any) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


# ── pure rules (parse_echa_reach.py) ──

def pick_substance(cas: str, items: list[dict]) -> tuple[dict | None, str, bool]:
    """Search hits → (substanceIndex of this CAS or None, how, ambiguous)."""
    idx = [it.get("substanceIndex") or {} for it in items]
    exact = [s for s in idx if (s.get("rmlCas") or "").strip() == cas]
    if len(exact) == 1:
        return exact[0], "ECHA CHEM rmlCas", False
    registered = [x for x in exact if REGISTERED in (x.get("listParticipation") or [])]
    if len(exact) > 1 and len(registered) == 1:
        return registered[0], f"ECHA CHEM rmlCas (the registered one of {len(exact)})", False
    listed = [s for s in idx if cas in (s.get("casNumber") or [])]
    if len(listed) == 1:
        return listed[0], "ECHA CHEM casNumber", False
    return None, f"{len(exact)} rmlCas / {len(listed)} casNumber hits", len(exact) > 1 or len(listed) > 1


def subtype_label(subtype: str) -> str:
    low = (subtype or "").lower()
    for key, label in SUBTYPE_LABELS:
        if key in low:
            return label
    return clean(subtype) or "unspecified"


def summarize_dossiers(dossiers: list[dict]) -> dict:
    info = [d.get("reachDossierInfo") or {} for d in dossiers]
    types = Counter(subtype_label(i.get("dossierSubtype", "")) for i in info)
    reg = sorted(d.get("registrationDate") or "" for d in dossiers if d.get("registrationDate"))
    upd = sorted(d.get("lastUpdatedDate") or "" for d in dossiers if d.get("lastUpdatedDate"))
    return {"types": dict(types.most_common()), "nons": sum(1 for i in info if (i.get("nonsAssetFlag") or "").upper() == "T"),
            "first_registered": reg[0] if reg else "", "last_updated": upd[-1] if upd else ""}


def detail_text(sub: dict, summary: dict, total: int) -> str:
    parts = [f"EC {sub['rmlEc']}"] if sub.get("rmlEc") else []
    types = ", ".join(f"{k} {v}" for k, v in summary["types"].items())
    parts.append(f"REACH registered — active registrations {total}" + (f" ({types})" if types else ""))
    if summary["nons"]:
        parts.append(f"NONS (notified under Directive 67/548/EEC) {summary['nons']}")
    if sub.get("tonnageBand"):
        parts.append(f"total tonnage band {clean(sub['tonnageBand'])} per annum")
    if summary["first_registered"]:
        parts.append(f"first registration {summary['first_registered']}")
    if summary["last_updated"]:
        parts.append(f"latest dossier update {summary['last_updated']}")
    parts.append(f"ECHA CHEM {PAGE_URL.format(rml=sub.get('rmlId', ''))}")
    return "; ".join(parts)


def reach_entry(cas: str, sub_idx: dict, sub: dict, how: str, dossiers: list[dict], total: int) -> dict:
    summary = summarize_dossiers(dossiers)
    rml = sub.get("rmlId") or sub_idx.get("rmlId") or ""
    item = {"cas": cas, "name": clean(sub.get("rmlName") or sub_idx.get("rmlName") or ""),
            "detail": clean(detail_text({**sub, "rmlId": rml}, summary, total))}
    extra = {"ec": sub.get("rmlEc") or "", "echa_id": rml, "match_method": how, "tonnage_band": clean(sub.get("tonnageBand") or ""),
             "active_registrations": total, "registration_types": summary["types"], "nons": summary["nons"],
             "first_registered": summary["first_registered"], "last_updated": summary["last_updated"], "url": PAGE_URL.format(rml=rml)}
    item.update({k: v for k, v in extra.items() if v not in (None, "", [])})
    return item


def answer(cas: str, status: str, *, entry: dict | None = None, reason: str = "", echa_id: str = "",
           checked: str | None = None) -> dict:
    return {"cas": cas, "list_id": LIST_ID, "status": status,
            "registered": True if status == "registered" else False if status == "not_registered" else None,
            "reason": reason, "entry": entry, "echa_url": PAGE_URL.format(rml=echa_id) if echa_id else "",
            "checked": checked or dt.date.today().isoformat(), "attribution": ATTRIBUTION, "schema": SCHEMA}


def ttl_of(ans: dict) -> int:
    if ans["status"] == "registered":
        return TTL_FOUND_S
    if ans["status"] == "not_registered" or str(ans.get("reason", "")).startswith("ambiguous"):
        return TTL_NONE_S
    return 0


# ── ECHA CHEM ──

def _get_json(url: str, params: dict | None = None) -> dict:
    resp = safe_get(url, params=params, headers={"Accept": "application/json", "User-Agent": USER_AGENT}, timeout=TIMEOUT_S,
                    use_cache=False)
    resp.raise_for_status()
    return resp.json()


def _active_dossiers(rml: str, get_json: Callable) -> tuple[list[dict], int]:
    items: list[dict] = []
    total = 0
    for page in range(1, DOSSIER_MAX_PAGES + 1):
        data = get_json(DOSSIERS, {"rmlId": rml, "legislation": "REACH", "registrationStatuses": "Active",
                                   "pageIndex": page, "pageSize": DOSSIER_PAGE_SIZE})
        got = data.get("items") or []
        items.extend(got)
        total = int((data.get("state") or {}).get("totalItems") or 0)
        if len(items) >= total or not got:
            break
    return items, total


def lookup_echa(cas: str, get_json: Callable = _get_json) -> dict:
    """One CAS → answer, asking ECHA CHEM (no cache)."""
    try:
        found = get_json(SEARCH, {"searchText": cas, "pageIndex": 1, "pageSize": 20})
        items = found.get("items") or []
        if not items:
            return answer(cas, "not_registered", reason="no_substance")
        sub_idx, how, ambiguous = pick_substance(cas, items)
        if not sub_idx:
            return answer(cas, "unknown", reason=f"ambiguous: {how}") if ambiguous else answer(cas, "not_registered", reason="no_substance")
        rml = sub_idx.get("rmlId") or ""
        sub = get_json(SUBSTANCE.format(rml=rml)) or {}
        dossiers, total = _active_dossiers(rml, get_json)
        if REGISTERED not in (sub.get("listParticipation") or []) and not dossiers:
            return answer(cas, "not_registered", reason="no_active_registration", echa_id=rml)
        return answer(cas, "registered", entry=reach_entry(cas, sub_idx, sub, how, dossiers, total), echa_id=rml)
    except Exception as exc:  # ECHA down / timeout / odd JSON → "unknown", never a 500
        logger.warning("REACH lookup failed for %s: %s", cas, exc)
        return answer(cas, "unknown", reason=f"upstream: {str(exc)[:200]}")


def bundled(cas: str) -> dict | None:
    """The bundled list entry (intl_lists/EU_REACH_REGISTERED.json) as an answer, or None."""
    from backend.core.trade_controls.lists import load_intl_lists

    for doc in load_intl_lists():
        if doc.get("list_id") == LIST_ID:
            hits = (doc.get("_by_cas") or {}).get(cas) or []
            if hits:
                e = {k: v for k, v in hits[0].items() if not k.startswith("_")}
                return answer(cas, "registered", entry=e, echa_id=e.get("echa_id") or "", checked=doc.get("retrieved") or None)
    return None


def _allow_upstream(now: float) -> bool:
    with _lock:
        _misses[:] = [t for t in _misses if t > now - UPSTREAM_WINDOW_S]
        if len(_misses) >= UPSTREAM_MAX:
            return False
        _misses.append(now)
        return True


def reach_status(cas: str, get_json: Callable = _get_json, now: Callable[[], float] = time.time) -> dict:
    """GET /api/reach/<CAS> body: bundled entry, else cached answer, else one ECHA lookup (rate-limited)."""
    hit = bundled(cas)
    if hit:
        return {**hit, "cached": True, "bundled": True}
    t = now()
    with _lock:
        cached = _cache.get(cas)
    if cached and cached[0] > t:
        return {**cached[1], "cached": True}
    if not _allow_upstream(t):
        return {**answer(cas, "unknown", reason="rate_limited"), "cached": False}
    ans = lookup_echa(cas, get_json)
    ttl = ttl_of(ans)
    if ttl:
        with _lock:
            _cache[cas] = (t + ttl, ans)
    return {**ans, "cached": False}
