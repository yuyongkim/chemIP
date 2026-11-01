"""Substance search scoring (pure functions). Weights and derivative terms live in backend/data/search/ranking.json.

score = path base (alias / synonym / FTS) + the largest name bonus + exact CAS + KOSHA - derivative penalty.
Name bonuses (only the largest counts):
- exact_name: name / name_en with its trailing "(...)" removed equals the query
- synonym_tier_bonus[tier]: the query is a registry name (or a listed synonym) of the item's CAS (synonyms.jsonl)
- base_name: same as exact_name after dropping leading numeric locants ("1,3-부타디엔" for "부타디엔")
The derivative penalty applies only when no exact/synonym bonus applies and the item's name contains a
derivative term (polymer, complex, reaction mass, ...) that the query does not.
base_name and the derivative penalty ("heuristics") apply only when the query has an alias or synonym hit:
a query with neither is ranked by FTS order + KOSHA alone, which the static client can reproduce from
docmeta without fetching every candidate's record (static_search.py _lean).
static_search.py and frontend static_search.jsx reproduce exactly this; keep them in step.
"""
from __future__ import annotations

import json
import re
from functools import lru_cache

from backend.core.chemical_aliases import clean_alias_value, normalize_alias
from backend.core.terminology.synonyms import SEARCH_DATA_DIR

RANKING_FILE = SEARCH_DATA_DIR / "ranking.json"
_LOCANTS = re.compile(r"^[0-9]+(?:,[0-9]+)* ")  # on normalized text ("1,3-x" -> "1,3 x"); ASCII so JS matches


@lru_cache(maxsize=1)
def ranking() -> dict:
    with open(RANKING_FILE, encoding="utf-8") as fh:
        return json.load(fh)


def base_of(value: str | None) -> str:
    """Normalized name without its "(...)" annotation: "에틸렌 ( 관용명 : ACETENE )" -> "에틸렌"."""
    return normalize_alias((value or "").split("(")[0])


def without_locants(norm: str) -> str:
    return _LOCANTS.sub("", norm)


def name_bonus(item: dict, nq: str, syn_tier: str | None, w: dict, heuristics: bool = True) -> float:
    bases = [base_of(item.get("name")), base_of(item.get("name_en"))]
    bonus = 0.0
    if nq in bases:
        bonus = w["exact_name"]
    if syn_tier:
        bonus = max(bonus, w["synonym_tier_bonus"].get(syn_tier, 0))
    if heuristics and not bonus and nq and nq in [without_locants(b) for b in bases]:
        bonus = w["base_name"]
    return bonus


def is_derivative(item: dict, nq: str, w: dict) -> bool:
    text = f"{normalize_alias(item.get('name'))} {normalize_alias(item.get('name_en'))}"
    return any(t in text and t not in nq for t in w["derivative_terms"])


def score(item: dict, *, base: float, query: str, syn_tier: str | None, heuristics: bool, w: dict | None = None) -> float:
    w = w or ranking()
    nq = normalize_alias(query)
    s = base
    if (item.get("cas_no") or "").strip() == clean_alias_value(query):
        s += w["exact_cas"]
    bonus = name_bonus(item, nq, syn_tier, w, heuristics)
    s += bonus
    if item.get("source") == "KOSHA":
        s += w["kosha"]
    if heuristics and bonus < w["exact_name"] and is_derivative(item, nq, w):
        s -= w["derivative_penalty"]
    return s
