"""Related substances: pages that share Korean statutory lists, weighted so rare shared lists count more. Pure."""
from __future__ import annotations

import math

import config


def build(page_lists: dict[str, set[str]], targets: set[str], k: int = config.RELATED_COUNT) -> dict[str, list[str]]:
    """page_lists: CAS -> kr list_ids for every generated page. targets: CAS that may be linked to (indexable pages).

    Score(a, b) = sum over shared lists of idf(list), idf = log(1 + N / df) with df counted over targets.
    Ties break on CAS so output is deterministic.
    """
    inverted: dict[str, set[str]] = {}
    for cas in targets:
        for lid in page_lists.get(cas, ()):
            inverted.setdefault(lid, set()).add(cas)
    n = max(len(targets), 1)
    idf = {lid: math.log(1 + n / len(members)) for lid, members in inverted.items()}
    out: dict[str, list[str]] = {}
    for cas, lists in page_lists.items():
        scores: dict[str, float] = {}
        for lid in lists:
            for other in inverted.get(lid, ()):
                if other != cas:
                    scores[other] = scores.get(other, 0.0) + idf[lid]
        out[cas] = [c for c, _ in sorted(scores.items(), key=lambda x: (-x[1], x[0]))[:k]]
    return out
