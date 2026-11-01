"""What ChemIP already knows per CAS, for matching lists that are not keyed by CAS (read-only).

  un_by_cas()      CAS -> {UN number: source label}   (portal_facts.db identifiers: KOSHA MSDS §14, Wikidata P695)
  name_index()     normalized English name -> set of CAS (identifiers name_en: NCIS, Wikidata, ChemIP terms/aliases)

A name is used for matching only when it points to exactly one CAS (see unique_cas).
"""
from __future__ import annotations

import os
import re
import sqlite3

PROJECT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FACTS_DB = os.path.join(PROJECT, "data", "portal_facts.db")
UN_SOURCES = {"kosha_msds_s14": "KOSHA MSDS §14", "wikidata": "Wikidata P695"}
NAME_SOURCES = ("ncis", "wikidata", "chemip_terms", "chemip_aliases")
MIN_NAME = 4


def norm_name(name: str) -> str:
    s = re.sub(r"\s+", " ", (name or "").replace(" ", " ")).strip().casefold()
    return s.strip(" ,;.")


def _ro(path: str) -> sqlite3.Connection:
    return sqlite3.connect(f"file:{path.replace(os.sep, '/')}?mode=ro", uri=True)


def un_by_cas(db: str = FACTS_DB) -> dict[str, dict[str, str]]:
    out: dict[str, dict[str, str]] = {}
    with _ro(db) as c:
        for cas, value, src in c.execute("SELECT cas, value, source_id FROM identifiers WHERE id_type = 'un'"):
            m = re.fullmatch(r"(?:UN)?\s*(\d{4})", (value or "").strip(), re.I)
            if m and src in UN_SOURCES:
                out.setdefault(cas, {}).setdefault(m.group(1), UN_SOURCES[src])
    return out


def name_index(db: str = FACTS_DB) -> dict[str, set[str]]:
    out: dict[str, set[str]] = {}
    marks = ",".join("?" * len(NAME_SOURCES))
    with _ro(db) as c:
        for cas, value in c.execute(
                f"SELECT cas, value FROM identifiers WHERE id_type = 'name_en' AND source_id IN ({marks})", NAME_SOURCES):
            for part in (value or "").split(";"):
                key = norm_name(part)
                if len(key) >= MIN_NAME:
                    out.setdefault(key, set()).add(cas)
    return out


def unique_cas(index: dict[str, set[str]], name: str) -> str:
    hits = index.get(norm_name(name)) or set()
    return next(iter(hits)) if len(hits) == 1 else ""
