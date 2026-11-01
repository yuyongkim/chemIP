"""Paths and data-file loading for the synonym builder (values defined once here; the rules live in the data files)."""
from __future__ import annotations

import json
import os
import sys

PROJECT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT not in sys.path:
    sys.path.insert(0, PROJECT)

from backend.core.terminology.synonyms import SEARCH_DATA_DIR, SYNONYMS_FILE, TIER_ORDER  # noqa: E402

TERM_DB = os.path.join(PROJECT, "data", "terminology.db")
SPEC_FILE = "synonym_sources.json"


def load(name: str) -> dict:
    with open(os.path.join(SEARCH_DATA_DIR, name), encoding="utf-8") as fh:
        return json.load(fh)


def exists(name: str) -> bool:
    return os.path.exists(os.path.join(SEARCH_DATA_DIR, name))


def project_path(rel: str) -> str:
    return os.path.join(PROJECT, *rel.split("/"))


__all__ = ["PROJECT", "SEARCH_DATA_DIR", "SYNONYMS_FILE", "TIER_ORDER", "TERM_DB", "SPEC_FILE", "load", "exists",
           "project_path"]
