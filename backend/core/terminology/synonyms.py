"""Search synonyms (backend/data/search/synonyms.jsonl): registry names and cited synonyms per CAS, loaded once.

The file is data built by scripts/search_synonyms/build_synonyms.py (rules: synonym_sources.json; DB columns,
law.go.kr lists, curated element / KCIA / PubChem lists, blocklist). This module only reads it: normalized name -> {cas: (name, source_code)}, and the tier of
each source code ("registry" | "synonym").
"""
from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path

from backend.core.chemical_aliases import normalize_alias

SEARCH_DATA_DIR = Path(os.getenv("CHEMIP_SEARCH_DATA_DIR") or Path(__file__).resolve().parents[2] / "data" / "search")
SYNONYMS_FILE = SEARCH_DATA_DIR / "synonyms.jsonl"
TIER_ORDER = ("registry", "synonym")  # stronger first


class SynonymIndex:
    def __init__(self, by_norm: dict[str, dict[str, tuple[str, str]]], tiers: dict[str, str]):
        self.by_norm = by_norm
        self.tiers = tiers

    def tier(self, norm: str, cas: str | None) -> str | None:
        hit = self.by_norm.get(norm, {}).get((cas or "").strip())
        return self.tiers.get(hit[1]) if hit else None

    def hits(self, norms: list[str]) -> list[tuple[str, str, str]]:
        """(cas, matched name, tier) for every candidate norm, first occurrence of a CAS wins; order is stable."""
        out, seen = [], set()
        for norm in norms:
            for cas in sorted(self.by_norm.get(norm, {})):
                if cas not in seen:
                    seen.add(cas)
                    name, code = self.by_norm[norm][cas]
                    out.append((cas, name, self.tiers.get(code, "synonym")))
        return out


def read_synonyms(path: Path = SYNONYMS_FILE) -> tuple[dict, list[tuple[str, list[list[str]]]]]:
    """(header, [(cas, [[name, source_code], ...]), ...]) as stored."""
    with open(path, encoding="utf-8") as fh:
        header = json.loads(fh.readline())
        rows = [tuple(json.loads(line)) for line in fh if line.strip()]
    return header, rows


@lru_cache(maxsize=1)
def synonym_index() -> SynonymIndex:
    if not SYNONYMS_FILE.exists():
        return SynonymIndex({}, {})
    header, rows = read_synonyms()
    by_norm: dict[str, dict[str, tuple[str, str]]] = {}
    for cas, names in rows:
        for name, code in names:
            by_norm.setdefault(normalize_alias(name), {})[cas] = (name, code)
    return SynonymIndex(by_norm, {code: s["tier"] for code, s in header["sources"].items()})
