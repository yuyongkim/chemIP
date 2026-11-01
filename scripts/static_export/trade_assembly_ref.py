"""Reference CLIENT assembly of a trade-controls view (any direction x country) from static files only:
one p/<chem_id>.json + g/rulebook.json + g/trade_common.json. The browser port follows this function 1:1.

Equals GET /api/regulations/trade-controls/{cas}?direction=..&country=.. except destination.kotra, which is a
live KOTRA API call: the static view marks it "LIVE_ONLY" (export direction with a country) and the client
either fetches it from the API or hides that box. Verified by verify_assembly.py.

Pure helpers (_jurisdictions, _direction_ok, _destination_listings, group_by_law, permits.evaluate,
rules.evaluate, regulation_codes) are the backend's own; a JS port re-implements them (each < 20 lines).
"""
from __future__ import annotations

import db  # noqa: F401  (sys.path for backend)
from backend.core.trade_controls import assemble, lists as tl, permits, rules

LIVE_ONLY = "LIVE_ONLY"


def _full(meta: dict, m: dict, fields: tuple, list_key: str) -> dict:
    item = {f: meta.get(f) for f in fields}
    item[list_key] = item[list_key] or []
    return {**item, "entries": m["entries"], "family_entries": m["family_entries"], "file": meta["file"]}


def _intl_view(page: dict, rb: dict, direction: str, country: str) -> list[dict]:
    meta = {m["list_id"]: m for m in rb["intl_lists"]}
    wanted = assemble._jurisdictions(country)
    side = assemble.COUNTERPART_DIRECTION[direction]
    scoped = [m for m in rb["intl_lists"]
              if (not wanted or m.get("jurisdiction") in wanted) and assemble._direction_ok(m.get("directions"), side)]
    ids = [m["list_id"] for m in scoped]
    found = [_full(meta[m["list_id"]], m, tl.INTL_META_FIELDS, "directions") for m in page["intl_lists"] if m["list_id"] in ids]
    found.sort(key=lambda m: ids.index(m["list_id"]))
    if not country:
        return found
    got = {m["list_id"] for m in found}
    absent = []
    for md in scoped:
        if md.get("absence_note") and md["list_id"] not in got:
            item = {f: md.get(f) for f in tl.INTL_META_FIELDS}
            item.update({"directions": item.get("directions") or [], "absent": True, "absence_note": md["absence_note"],
                         "entries": [], "family_entries": [], "file": md["file"]})
            absent.append(item)
    return found + absent


def assemble_view(page: dict, rb: dict, common: dict, direction: str, country: str = "") -> dict:
    cas, ncis, intl, controlled = page["cas"], page["ncis"], page["intl"], page["controlled"]
    country = (country or "").strip().upper()
    meta_kr = {m["list_id"]: m for m in rb["kr_lists"]}
    kr_law = [_full(meta_kr[m["list_id"]], m, tl.KR_LAW_META_FIELDS, "obligations") for m in page["kr_law"]]
    categories = {c["category"] for c in ncis.get("classifications", []) if c.get("category")}
    memberships = (assemble.regulation_codes(intl) | {m["list_id"] for m in controlled if m.get("list_id")}
                   | {m["list_id"] for m in kr_law if m.get("list_id")})
    kr_rules = rb["kr_rules"]
    destination = None
    if country and country != assemble.HOME:
        destination = {"country": country, "role": "destination_import" if direction == "export" else "origin",
                       "listings": assemble._destination_listings(intl, country), "kotra": None,
                       "intl_lists": _intl_view(page, rb, direction, country)}
        if direction == "export":
            destination["kotra"] = LIVE_ONLY
    hs = page["hs"]
    return {
        "cas": cas, "direction": direction, "country": country,
        "substance": {"name_ko": ncis.get("name_ko", ""), "name_en": ncis.get("name_en", ""),
                      "ncis_categories": sorted(categories), "list_codes": sorted(memberships)},
        "kr_law_lists": tl.group_by_law(kr_law),
        "kr_permits": permits.evaluate(rb["permits"], lists=memberships, categories=categories),
        "hs": hs, "hs_meta": rb["hs_meta"] if hs else {}, "hsk10_candidates": page["hsk10_candidates"],
        "kr_obligations": rules.evaluate(kr_rules.get("rules") or [], categories=categories, lists=memberships, direction=direction),
        "kr_unverified": rules.evaluate(kr_rules.get("unverified") or [], categories=categories, lists=memberships, direction=direction),
        "controlled_lists": [m for m in controlled if assemble._direction_ok(m.get("directions"), direction)],
        "controlled_lists_any": [{"list_id": m.get("list_id"), "title": m.get("title"), "directions": m.get("directions") or []}
                                 for m in controlled],
        "destination": destination,
        "intl_lists": [] if destination else _intl_view(page, rb, direction, ""),
        "sources_status": common["sources_status"],
    }
