"""Key functions shared by the index builder and every client: bucket hash and precomputed-query key.

A browser port must reproduce these exactly (see CONTRACT.md "Search keys").
"""
from __future__ import annotations

import db  # noqa: F401  (sys.path for backend)
import config
from backend.core.chemical_aliases import clean_alias_value, normalize_alias


def fnv1a32(s: str) -> int:
    h = 0x811C9DC5
    for b in s.encode("utf-8"):
        h = ((h ^ b) * 0x01000193) & 0xFFFFFFFF
    return h


def alias_bucket(text: str) -> int:
    """a/<n>.json holding both the alias rows and the precomputed answer for `text`."""
    return fnv1a32(normalize_alias(text)) % config.ALIAS_BUCKETS


def query_key(query: str) -> str:
    """Key of a precomputed answer: clean_alias_value(q).casefold()."""
    return clean_alias_value(query).casefold()
