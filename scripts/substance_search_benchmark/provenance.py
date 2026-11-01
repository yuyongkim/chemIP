"""Circularity guard for the IUPAC queries: the benchmark's IUPAC strings come from PubChem, and the search synonyms
may now hold PubChem names too. Tag each IUPAC row with where the search could know that exact name from:

- "pubchem_only": the normalized query is a search synonym of the expected CAS and its stored source is
  PubChem-derived (synonym_sources: derived_from "pubchem"; the builder keeps any other source on a tie, so a stored
  PubChem code means no other source has the name) -> a hit here is circular.
- "independent": anything else (another source has the name, or no synonym matches it exactly).
"""
from __future__ import annotations

import sys

import config

if config.PROJECT not in sys.path:
    sys.path.insert(0, config.PROJECT)
from backend.core.chemical_aliases import normalize_alias  # noqa: E402
from backend.core.terminology.synonyms import read_synonyms  # noqa: E402

PROVENANCES = ["independent", "pubchem_only"]


def pubchem_only_pairs() -> set[tuple[str, str]]:
    """(normalized name, cas) whose stored source is PubChem-derived."""
    header, rows = read_synonyms()
    pubchem = {c for c, s in header["sources"].items() if s.get("derived_from") == "pubchem"}
    return {(normalize_alias(name), cas) for cas, names in rows for name, code in names if code in pubchem}


def tag(rows: list[dict]) -> None:
    pairs = pubchem_only_pairs()
    for r in rows:
        if r["type"] == "iupac":
            r["name_source"] = "pubchem_only" if (normalize_alias(r["q"]), r["cas"]) in pairs else "independent"
