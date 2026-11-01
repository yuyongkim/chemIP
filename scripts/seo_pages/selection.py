"""Which substances get a page: score every KOSHA substance from local data, apply the quality bar, cut tiers.

Scores are computed from CAS indexes over the same list files trade_controls reads (lists.load_*), with the same
entry / family matching rules, so they agree with GET /api/regulations/trade-controls (checked in validate.py).
"""
from __future__ import annotations

from collections import Counter
from typing import Iterable

import config
import msds
from backend_ro import permits, tc_lists

norm = tc_lists.normalize_cas


def _index(lists: Iterable[dict]) -> dict[str, set[str]]:
    """CAS -> list_ids, using entries[].cas and family_entries[].cas / cas_list / members (as lists._family_matches)."""
    idx: dict[str, set[str]] = {}
    for data in lists:
        lid = data.get("list_id")
        if not lid:
            continue
        for e in data.get("entries") or []:
            if isinstance(e, dict) and norm(e.get("cas")):
                idx.setdefault(norm(e.get("cas")), set()).add(lid)
        for f in data.get("family_entries") or []:
            if not isinstance(f, dict):
                continue
            cas_set = {norm(f.get("cas"))} if norm(f.get("cas")) else set()
            members = f.get("cas_list") or f.get("members") or []
            if isinstance(members, list):
                cas_set |= {norm(m.get("cas") if isinstance(m, dict) else m) for m in members}
            for c in cas_set - {""}:
                idx.setdefault(c, set()).add(lid)
    return idx


def load_indexes() -> dict:
    kr = tc_lists.load_kr_law_lists()
    intl = tc_lists.load_intl_lists()
    ctl = tc_lists.load_controlled_lists()
    items, _ = permits.load_permits()
    return {
        "kr": _index(kr), "intl": _index(intl), "controlled": _index(ctl), "permit_items": items,
        "intl_jur": {d.get("list_id"): d.get("jurisdiction") for d in intl},
    }


def components(cas: str, idx: dict, ncis: dict, intl_codes: set[str], hazards: dict) -> dict:
    kr_all = idx["kr"].get(cas, set())
    kr_ids = {i for i in kr_all if config.is_real_kr_list(i)}
    ctl_ids = idx["controlled"].get(cas, set())
    intl_ids = idx["intl"].get(cas, set())
    foreign = intl_ids - config.INVENTORY_LIST_IDS
    cats = set((ncis or {}).get("categories") or set())
    memberships = set(intl_codes) | ctl_ids | kr_all
    hits = permits.evaluate(idx["permit_items"], lists=memberships, categories=cats)
    permit_ids = {p.get("permit_id") or p.get("name") for p in hits}
    return {
        "kr_lists": len(kr_ids),
        "ncis_reg": len(cats - config.INVENTORY_NCIS_CATEGORIES),
        "permits": len(permit_ids),
        "foreign_lists": len(foreign),
        "foreign_juris": len({idx["intl_jur"].get(i) for i in foreign} - {None}),
        "controlled": len(ctl_ids),
        "h_statements": len(hazards.get("h_statements") or []),
        "inventories": len(intl_ids & config.INVENTORY_LIST_IDS),
        "kr_ids": sorted(kr_ids),
    }


def score(comp: dict) -> float:
    return round(sum(w * comp.get(k, 0) for k, w in config.SCORE_WEIGHTS.items()), 3)


def passes(comp: dict, bar: dict) -> bool:
    return (comp["kr_lists"] >= bar["kr_lists_min"] or comp["permits"] >= bar["permits_min"]
            or comp["foreign_lists"] >= bar["foreign_lists_min"])


def threshold_report(rows: list[dict]) -> dict:
    """Counts per single criterion and per combined bar, among substances with an MSDS."""
    with_msds = [r for r in rows if r["has_msds"]]
    single = {key: {str(v): sum(1 for r in with_msds if r[key.replace("_min", "")] >= v) for v in values}
              for key, values in config.THRESHOLD_GRID.items()}
    combos = {}
    for k in config.THRESHOLD_GRID["kr_lists_min"]:
        for p in config.THRESHOLD_GRID["permits_min"]:
            for f in config.THRESHOLD_GRID["foreign_lists_min"]:
                bar = {"kr_lists_min": k, "permits_min": p, "foreign_lists_min": f}
                combos[f"kr>={k} | permits>={p} | foreign>={f}"] = sum(1 for r in with_msds if passes(r, bar))
    strict = sum(1 for r in with_msds if r["kr_lists"] >= config.QUALITY_BAR["kr_lists_min"]
                 and r["foreign_lists"] >= config.QUALITY_BAR["foreign_lists_min"])
    return {"kosha_substances": len(rows), "with_msds": len(with_msds), "single_criterion": single,
            "combined_or": combos, "strict_and_kr_and_foreign": strict}


def cut_tiers(rows: list[dict], eligible: list[dict], seed_cas: set[str]) -> dict[str, str]:
    """Seeds fill config.SEED_TIER first (live URLs stay indexable, quality bar not applied); every tier is then
    filled to its total size from the eligible substances in score order."""
    present = {r["cas"] for r in rows}
    tiers: dict[str, str] = {c: config.SEED_TIER for c in sorted(seed_cas & present)}
    rest = iter(r for r in eligible if r["cas"] not in tiers)
    for tier, size in config.TIER_SIZES.items():
        room = size - sum(1 for t in tiers.values() if t == tier)
        while room > 0:
            r = next(rest, None)
            if r is None:
                break
            if r["score"] >= config.TIER_MIN_SCORE.get(tier, 0.0):
                tiers[r["cas"]] = tier
                room -= 1
    return tiers


def select(substances: dict, ncis: dict, intl_codes: dict, section2: dict, seed_cas: set[str]) -> dict:
    """substances: KOSHA rows plus seed rows without a KOSHA record (seeds.extra_rows).
    Returns {'rows': [...all scored...], 'tiers': {cas: tier}, 'report': {...}}."""
    idx = load_indexes()
    rows = []
    for cas, k in substances.items():
        hazards = msds.parse_section2(section2.get(k["chem_id"]))
        comp = components(cas, idx, ncis.get(cas, {}), intl_codes.get(cas, set()), hazards)
        rows.append({"cas": cas, "chem_id": k["chem_id"], "has_msds": k["has_s2"], "seed": cas in seed_cas,
                     **comp, "score": score(comp)})
    eligible = sorted((r for r in rows if r["has_msds"] and passes(r, config.QUALITY_BAR)),
                      key=lambda r: (-r["score"], r["cas"]))
    tiers = cut_tiers(rows, eligible, seed_cas)
    for r in rows:
        r["tier"] = tiers.get(r["cas"], "none")
    report = threshold_report([r for r in rows if r["chem_id"]])
    report["quality_bar"] = config.QUALITY_BAR
    report["eligible"] = len(eligible)
    report["eligible_by_score_floor"] = {str(f): sum(1 for r in eligible if r["score"] >= f) for f in config.SCORE_FLOORS_REPORTED}
    report["eligible_permit_only"] = sum(1 for r in eligible if r["kr_lists"] < config.QUALITY_BAR["kr_lists_min"]
                                         and r["foreign_lists"] < config.QUALITY_BAR["foreign_lists_min"])
    eligible_cas = {r["cas"] for r in eligible}
    seeds = [r for r in rows if r["seed"]]
    report["seeds"] = {
        "total": len(seed_cas), "with_page": sum(1 for r in seeds if r["cas"] in tiers),
        "missing": sorted(seed_cas - {r["cas"] for r in seeds}),
        "without_kosha": sorted(r["cas"] for r in seeds if not r["chem_id"]),
        "below_quality_bar": sorted(r["cas"] for r in seeds if r["chem_id"] and r["cas"] not in eligible_cas),
        "non_seed_in_seed_tier": sum(1 for c, t in tiers.items() if t == config.SEED_TIER and c not in seed_cas),
    }
    report["tier_sizes"] = dict(Counter(tiers.values()))
    report["score_cutoffs"] = {t: min((r["score"] for r in rows if r["tier"] == t and not r["seed"]), default=None)
                               for t in config.TIER_SIZES}
    return {"rows": rows, "tiers": tiers, "report": report, "indexes": idx}
