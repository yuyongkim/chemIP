"""Pure scoring of benchmark results: rank of the expected CAS, rank-1 / top-k rates per query type and category."""
from __future__ import annotations

import config


def rank_of(items: list[dict], cas: str) -> int | None:
    """1-based position of the first item whose cas_no is the expected CAS, None if absent from the page."""
    for i, it in enumerate(items, 1):
        if (it.get("cas_no") or "").strip() == cas:
            return i
    return None


def _rates(sel: list[dict]) -> dict:
    n = len(sel)
    r1 = sum(1 for r in sel if r["rank"] == 1)
    tk = sum(1 for r in sel if r["rank"] is not None and r["rank"] <= config.TOP_K)
    return {"n": n, "rank1": r1, "topk": tk,
            "rank1_rate": round(r1 / n, 4) if n else None, "topk_rate": round(tk / n, 4) if n else None}


def by_type(rows: list[dict]) -> dict[str, dict]:
    out = {t: _rates([r for r in rows if r["type"] == t]) for t in config.QUERY_TYPES}
    out["all"] = _rates(rows)
    return out


def by_category(rows: list[dict]) -> dict[str, dict[str, dict]]:
    """category -> {query type | "all": rates}; a substance in several categories counts in each."""
    out = {}
    for cat in config.CATEGORY_ORDER:
        sel = [r for r in rows if cat in r["categories"]]
        out[cat] = {**{t: _rates([r for r in sel if r["type"] == t]) for t in config.QUERY_TYPES}, "all": _rates(sel)}
    return out


def iupac_by_provenance(rows: list[dict], provenances: list[str]) -> dict[str, dict]:
    """IUPAC rates split by provenance.tag() (circularity guard)."""
    sel = [r for r in rows if r["type"] == "iupac"]
    return {p: _rates([r for r in sel if r.get("name_source") == p]) for p in provenances}
