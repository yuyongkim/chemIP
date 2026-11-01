"""Related substances: score pairs that share features, keep the top k with the reason. Pure (no I/O).

A feature is (kind, key): ("law", list_id), ("ghs", hazard class key), ("fam", family key).
score(a, b) = weight["sim"] * cosine(a, b)        law + ghs features, each weighted weight[kind] * idf(feature)
            + weight["fam"] * shared families      flat
            + prior                                b is a well-known substance
idf = ln(1 + N / df), df counted over targets. Features held by more than max_df * N targets are ignored.
Cosine (not a plain sum) keeps heavily regulated "hub" substances from being related to everything.
Sources with the same feature set get the same answer, so each distinct set is ranked once.
"""
from __future__ import annotations

import math
from collections import defaultdict

Feature = tuple[str, str]


def idf_table(features: dict[str, set[Feature]], targets: set[str], max_df: float) -> dict[Feature, float]:
    """Feature -> weight factor (idf for law/ghs, 1.0 for fam). Too-common law/ghs features are left out."""
    df: dict[Feature, int] = defaultdict(int)
    for cas in targets:
        for f in features.get(cas, ()):
            df[f] += 1
    n = max(len(targets), 1)
    cap = max_df * n
    out: dict[Feature, float] = {}
    for f, d in df.items():
        if f[0] == "fam":
            out[f] = 1.0
        elif d <= cap:
            out[f] = math.log(1 + n / d)
    return out


def inverted(features: dict[str, set[Feature]], targets: set[str], usable: dict[Feature, float]) -> dict[Feature, list[str]]:
    inv: dict[Feature, list[str]] = defaultdict(list)
    for cas in sorted(targets):
        for f in features.get(cas, ()):
            if f in usable:
                inv[f].append(cas)
    return inv


def feature_weight(f: Feature, usable: dict[Feature, float], weights: dict[str, float]) -> float:
    return weights[f[0]] * usable[f]


def norm(feats, usable: dict[Feature, float], weights: dict[str, float]) -> float:
    """Euclidean length of the weighted law + ghs vector (families are scored apart)."""
    return math.sqrt(sum(feature_weight(f, usable, weights) ** 2 for f in feats if f in usable and f[0] != "fam"))


def rank_one(own: frozenset, inv: dict[Feature, list[str]], usable: dict[Feature, float], weights: dict[str, float],
             prior: dict[str, float], norms: dict[str, float], k: int, min_score: float) -> list[tuple[str, float, list[Feature]]]:
    """Top k (target, score, shared features) for one feature set. Ties break on CAS (deterministic)."""
    dots: dict[str, float] = defaultdict(float)
    fams: dict[str, int] = defaultdict(int)
    shared: dict[str, list[Feature]] = defaultdict(list)
    own_norm = norm(own, usable, weights)
    for f in own:
        if f not in usable:
            continue
        add = feature_weight(f, usable, weights) ** 2
        for t in inv.get(f, ()):
            if f[0] == "fam":
                fams[t] += 1
            else:
                dots[t] += add
            shared[t].append(f)
    ranked = []
    for t in shared:
        denom = own_norm * norms.get(t, 0.0)
        s = weights["sim"] * (dots[t] / denom if denom else 0.0) + weights["fam"] * fams[t] + prior.get(t, 0.0)
        if s >= min_score:
            ranked.append((t, s))
    ranked.sort(key=lambda x: (-x[1], x[0]))
    return [(t, s, shared[t]) for t, s in ranked[:k]]


def reasons(shared: list[Feature], usable: dict[Feature, float], titles: dict[str, str], shown: int) -> dict:
    """Shared features -> {"why": [...], "nl": shared list count, "ng": shared hazard class count}.

    why: every shared family first, then the `shown` rarest shared lists (with the Korean title from the rulebook),
    then the `shown` rarest shared hazard classes.
    """
    by_kind: dict[str, list[Feature]] = defaultdict(list)
    for f in sorted(set(shared)):
        by_kind[f[0]].append(f)
    for kind in by_kind:
        by_kind[kind].sort(key=lambda f: (-usable.get(f, 0.0), f[1]))
    why = [{"t": "fam", "k": f[1]} for f in by_kind["fam"]]
    why += [{"t": "law", "k": f[1], "ko": titles.get(f[1], f[1])} for f in by_kind["law"][:shown]]
    why += [{"t": "ghs", "k": f[1]} for f in by_kind["ghs"][:shown]]
    return {"why": why, "nl": len(by_kind["law"]), "ng": len(by_kind["ghs"])}


def rank_all(features: dict[str, set[Feature]], sources: set[str], targets: set[str], *, weights: dict[str, float],
             prior: dict[str, float], k: int, min_score: float, max_df: float, titles: dict[str, str],
             shown: int) -> dict[str, list[dict]]:
    """CAS -> [{cas, s, why, nl, ng}] for every source with at least one related target (names added by the caller)."""
    usable = idf_table(features, targets, max_df)
    inv = inverted(features, targets, usable)
    norms = {t: norm(features.get(t, ()), usable, weights) for t in targets}
    memo: dict[frozenset, list[tuple[str, float, list[Feature]]]] = {}
    out: dict[str, list[dict]] = {}
    for cas in sorted(sources):
        own = frozenset(f for f in features.get(cas, ()) if f in usable)
        if not own:
            continue
        if own not in memo:
            # k + 1: the source itself may be in the list and is dropped below
            memo[own] = rank_one(own, inv, usable, weights, prior, norms, k + 1, min_score)
        items = [(t, s, sh) for t, s, sh in memo[own] if t != cas][:k]
        if items:
            out[cas] = [{"cas": t, "s": round(s, 2), **reasons(sh, usable, titles, shown)} for t, s, sh in items]
    return out
