"""Writes rel/<CAS>.json (gzip bytes): the top config.REL_TOP related substances of a CAS, with the reason.

Targets (what can be recommended) = KOSHA substances (they have an MSDS page) with at least one feature.
Sources (who gets a file) = targets + every CAS on a Korean statutory list + family members. A missing file means
"no related substances" (the UI hides the section; see CONTRACT.md "rel/<CAS>.json"). Stale files are removed first.
Inputs: related_sources.py, scoring: related_rank.py. Report: reports/related_sample.csv.
"""
from __future__ import annotations

import csv
import os
import time
from collections import Counter

import config
import related_rank
import related_sources as rs
from jsonio import SizeStats, write_gzip

SAMPLE_CAS = ("71-43-2", "108-88-3", "50-00-0", "67-64-1", "7664-93-9", "117-81-7", "7439-97-6", "74-98-6")


REL_SPARE = 4  # extra candidates ranked so that items dropped by dedupe_names still leave REL_TOP


def dedupe_names(items: list[dict], own_name: str) -> list[dict]:
    """Drop items whose Korean name repeats an earlier item or the source itself (two CAS of one substance). Pure."""
    seen, out = {own_name} - {""}, []
    for it in items:
        if it["ko"] in seen:
            continue
        seen.add(it["ko"])
        out.append(it)
    return out


def rel_path(cas: str, root: str = config.REL_DIR) -> str:
    return os.path.join(root, f"{cas}.json")


def build_features(laws: dict[str, set[str]], kosha: dict[str, dict], families: dict[str, list[str]],
                   hazard_map: dict[str, str]) -> dict[str, set]:
    """CAS -> {(kind, key)}. Pure."""
    feats: dict[str, set] = {}
    for cas, ids in laws.items():
        feats.setdefault(cas, set()).update(("law", i) for i in ids)
    for cas, row in kosha.items():
        classes = {hazard_map[h] for h in row["hazards"] if h in hazard_map}
        if classes:
            feats.setdefault(cas, set()).update(("ghs", c) for c in classes)
    for key, members in families.items():
        for cas in members:
            feats.setdefault(cas, set()).add(("fam", key))
    return feats


def _clear(root: str) -> int:
    os.makedirs(root, exist_ok=True)
    stale = [f for f in os.listdir(root) if f.endswith(".json")]
    for f in stale:
        os.remove(os.path.join(root, f))
    return len(stale)


def export_related(log=print) -> dict:
    t0 = time.time()
    laws, titles = rs.law_index()
    kosha = rs.kosha_rows()
    ncis = rs.ncis_names()
    seeds = rs.seed_names()
    families = rs.load_json(config.REL_FAMILIES)["families"]
    hazard_map = rs.load_json(config.REL_HAZARDS)["codes"]
    feats = build_features(laws, kosha, families, hazard_map)
    targets = {c for c in kosha if feats.get(c)}
    sources = set(targets) | set(laws) | {c for m in families.values() for c in m}
    log(f"related: {len(targets)} targets, {len(sources)} sources, {len(titles)} statutory lists")
    ranked = related_rank.rank_all(
        feats, sources, targets, weights=config.REL_WEIGHTS, prior={c: config.REL_PRIOR for c in seeds},
        k=config.REL_TOP + REL_SPARE, min_score=config.REL_MIN_SCORE, max_df=config.REL_MAX_DF, titles=titles,
        shown=config.REL_REASONS_SHOWN)
    log(f"related: ranked in {round(time.time() - t0, 1)}s, {len(ranked)} CAS with results")

    names = {c: rs.display_name(c, kosha.get(c), ncis.get(c), seeds.get(c)) for c in targets | set(ranked)}
    removed = _clear(config.REL_DIR)
    stats, sizes, kinds = SizeStats(), Counter(), Counter()
    for cas, items in ranked.items():
        for it in items:
            it["ko"], it["en"] = names[it["cas"]]
        items = dedupe_names(items, names.get(cas, ("", ""))[0])[:config.REL_TOP]
        for it in items:
            kinds.update(w["t"] for w in it["why"])
        ranked[cas] = items
        raw, packed = write_gzip(rel_path(cas), {"v": config.REL_FORMAT, "cas": cas, "items": items}, config.GZIP_LEVEL)
        stats.add("rel", raw, packed)
        sizes[len(items)] += 1
    os.makedirs(config.REPORTS, exist_ok=True)
    with open(os.path.join(config.REPORTS, "related_sample.csv"), "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh)
        w.writerow(["cas", "rank", "target", "name_ko", "score", "why"])
        for cas in SAMPLE_CAS:
            for i, it in enumerate(ranked.get(cas, []), 1):
                w.writerow([cas, i, it["cas"], it["ko"], it["s"], "; ".join(f"{x['t']}:{x['k']}" for x in it["why"])])
    log(f"related: {stats.total()['files']} files, removed {removed} stale")
    return {**stats.to_dict(), "dir": config.REL_DIR, "targets": len(targets), "sources": len(sources),
            "with_results": len(ranked), "items_per_file": dict(sorted(sizes.items())), "reason_kinds": dict(kinds),
            "removed_stale": removed, "secs": round(time.time() - t0, 1)}
