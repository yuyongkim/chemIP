"""Per-substance page facts, taken from the backend's own build_trade_controls (import + export) plus KOSHA MSDS.

The page shows exactly what GET /api/regulations/trade-controls/{cas} returns, reshaped for HTML. No HTML here.
Foreign-jurisdiction counts come ONLY from the trade-controls intl_lists collection (51 lists, union of both
directions), not from /api/regulations/international (intl_regulatory codes), which uses a different list set.
"""
from __future__ import annotations

import config
import msds
import names
from backend_ro import build_trade_controls, tc_lists

DIRECTIONS = ("import", "export")


def _controlled_meta() -> dict[str, dict]:
    return {d.get("list_id"): d for d in tc_lists.load_controlled_lists()}


def _is_generic(rule: dict) -> bool:
    """Rules every substance (or every existing chemical) gets are summarised, not listed as substance-specific."""
    mb = rule.get("matched_by") or {}
    if "any_substance" in mb:
        return True
    cats = set(mb.get("ncis_category") or [])
    return set(mb) == {"ncis_category"} and bool(cats) and cats <= config.INVENTORY_NCIS_CATEGORIES


def _kr_groups(resp: dict) -> list[dict]:
    groups = []
    for g in resp.get("kr_law_lists") or []:
        lists = [{"list_id": m.get("list_id"), "title": m.get("title") or m.get("list_id"),
                  "amended_on": m.get("amended_on") or "", "retrieved": m.get("retrieved") or "",
                  "source_url": m.get("source_url") or "", "legal_basis": m.get("legal_basis") or ""}
                 for m in g.get("lists") or [] if config.is_real_kr_list(m.get("list_id") or "")]
        if lists:
            groups.append({"law": g.get("law") or "", "lists": lists})
    return groups


def _permits(resp: dict) -> list[dict]:
    out, seen = [], set()
    for p in resp.get("kr_permits") or []:
        key = p.get("permit_id") or p.get("name")
        if key in seen:
            continue
        seen.add(key)
        out.append({"permit_id": key, "name": p.get("name") or key, "kind": p.get("kind") or "",
                    "law": p.get("law") or "", "authority": p.get("authority") or "",
                    "legal_basis": p.get("legal_basis") or "", "source_url": p.get("source_url") or ""})
    return out


def _obligations(by_dir: dict[str, dict]) -> tuple[list[dict], list[dict]]:
    specific, generic, seen = [], [], set()
    for direction in DIRECTIONS:
        for r in by_dir[direction].get("kr_obligations") or []:
            rid = r.get("rule_id")
            if rid in seen:
                continue
            seen.add(rid)
            item = {"rule_id": rid, "direction": r.get("direction") or direction, "obligation": r.get("obligation") or "",
                    "legal_basis": r.get("legal_basis") or "", "agency": r.get("agency") or "",
                    "customs": bool(r.get("customs_confirmation")), "source_url": r.get("source_url") or ""}
            (generic if _is_generic(r) else specific).append(item)
    return specific, generic


def _intl(by_dir: dict[str, dict], jur_names: dict) -> list[dict]:
    """Union of both directions' intl_lists, grouped by jurisdiction (in first-seen order)."""
    lists: dict[str, dict] = {}
    for direction in DIRECTIONS:
        for m in by_dir[direction].get("intl_lists") or []:
            lid = m.get("list_id")
            if not lid or m.get("absent") or lid in lists:
                continue
            lists[lid] = {"list_id": lid, "jurisdiction": m.get("jurisdiction") or "", "title": m.get("title") or lid,
                          "law": m.get("law") or "", "directions": m.get("directions") or [],
                          "retrieved": m.get("retrieved") or "", "source_url": m.get("source_url") or "",
                          "inventory": lid in config.INVENTORY_LIST_IDS}
    groups: dict[str, dict] = {}
    for item in lists.values():
        code = item["jurisdiction"]
        g = groups.setdefault(code, {"code": code, "ko": jur_names.get(code, {}).get("ko", code),
                                     "en": jur_names.get(code, {}).get("en", code), "lists": []})
        g["lists"].append(item)
    return sorted(groups.values(), key=lambda g: (-sum(not x["inventory"] for x in g["lists"]), g["code"]))


def _controlled(resp: dict, meta: dict) -> list[dict]:
    out = []
    for m in resp.get("controlled_lists_any") or []:
        d = meta.get(m.get("list_id"), {})
        out.append({"list_id": m.get("list_id"), "title": m.get("title") or m.get("list_id"),
                    "directions": m.get("directions") or [], "retrieved": d.get("retrieved") or "",
                    "source_url": d.get("source_url") or "", "kr_obligation": d.get("kr_obligation") or ""})
    return out


def _hs(resp: dict) -> list[dict]:
    out, seen = [], set()
    for h in resp.get("hs") or []:
        code = h.get("hs6")
        if code and code not in seen:
            seen.add(code)
            out.append({"hs6": code, "title_ko": h.get("title_ko") or "", "title_en": h.get("title_en") or "",
                        "description": h.get("description") or ""})
    return out


def build(cas: str, kosha: dict, ncis: dict, section2_xml: str | None, jur_names: dict, ctl_meta: dict,
          display: tuple[str, str, tuple[str, ...]]) -> dict:
    by_dir = {d: build_trade_controls(cas, d) for d in DIRECTIONS}
    imp = by_dir["import"]
    sub = imp.get("substance") or {}
    ko, en, extra_alt = display  # names.display_names + names.with_seed_names (computed over the whole page set)
    kr_groups = _kr_groups(imp)
    intl_groups = _intl(by_dir, jur_names)
    specific, generic = _obligations(by_dir)
    controlled = _controlled(imp, ctl_meta)
    foreign = [x for g in intl_groups for x in g["lists"] if not x["inventory"]]
    dates = [x["retrieved"] for g in kr_groups for x in g["lists"]] + [x["retrieved"] for x in foreign] \
        + [x["retrieved"] for x in controlled] + [(imp.get("hs_meta") or {}).get("retrieved", ""), ncis.get("fetched_at", "")]
    dates = sorted({d[:10] for d in dates if d})
    ncis_cats = sorted(set(sub.get("ncis_categories") or []))
    return {
        "cas": cas, "chem_id": kosha["chem_id"], "has_msds": bool(kosha["has_s2"]), "name_ko": ko, "name_en": en,
        "alt_names": names.alternate_names(ko, en, ncis, extra_alt),
        "initial": names.initial_of(ko),
        "ncis_categories": [c for c in ncis_cats if c not in config.INVENTORY_NCIS_CATEGORIES],
        "ncis_inventory": [c for c in ncis_cats if c in config.INVENTORY_NCIS_CATEGORIES],
        "kr_groups": kr_groups,
        "permits": _permits(imp),
        "obligations": specific, "obligations_generic": generic,
        "controlled": controlled,
        "intl_groups": intl_groups,
        "hs": _hs(imp),
        "hazards": msds.parse_section2(section2_xml),
        "lastmod": dates[-1] if dates else "",
        "counts": {
            "kr_lists": sum(len(g["lists"]) for g in kr_groups),
            "kr_laws": len(kr_groups),
            "permits": len(_permits(imp)),
            "foreign_lists": len(foreign),
            "foreign_juris": len({x["jurisdiction"] for x in foreign}),
            "controlled": len(controlled),
            "obligations": len(specific),
        },
    }
