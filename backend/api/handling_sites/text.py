"""Pure text/number helpers and term matching shared by the handling-site sources."""
from __future__ import annotations

import math
import re
from typing import Any


def _compact(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _digits(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def _normalize_cas(value: str) -> str:
    digits = _digits(value)
    if len(digits) < 3:
        return ""
    return digits.lstrip("0")


def _normalize_term(value: str) -> str:
    return re.sub(r"[\s\-_(),./+]+", "", (value or "").casefold())


def _to_number(value: Any) -> float:
    text = _compact(value).replace(",", "")
    if not text:
        return 0.0
    try:
        number = float(text)
    except (TypeError, ValueError):
        return 0.0
    if not math.isfinite(number):
        return 0.0
    return number


def _reported_total_kg(row: dict[str, Any]) -> float:
    return _to_number(row.get("total_release_kg")) + _to_number(row.get("total_transfer_kg")) + _to_number(row.get("self_landfill_kg"))


def _pick(raw: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = raw.get(key)
        if value not in (None, ""):
            return _compact(value)
    return ""


def _tokenize_materials(value: str) -> list[str]:
    parts = re.split(r"[,;/|+\n\r]+", value or "")
    return [_compact(part) for part in parts if _compact(part)]


class TermMatchingMixin:
    """Search-term building and fuzzy containment match (no I/O)."""

    @staticmethod
    def _build_terms(*, name: str, name_en: str, aliases: list[str]) -> list[str]:
        candidates: list[str] = []
        for raw in [name, name_en, *aliases]:
            text = _compact(raw)
            if not text:
                continue
            candidates.append(text)
            for part in re.split(r"[()/,;]", text):
                part = _compact(part)
                if len(part) >= 2:
                    candidates.append(part)

        seen: set[str] = set()
        terms: list[str] = []
        for term in candidates:
            key = _normalize_term(term)
            if not key or key in seen:
                continue
            seen.add(key)
            terms.append(term)
        return terms[:24]

    @staticmethod
    def _matches_text(value: str, terms: list[str]) -> bool:
        normalized = _normalize_term(value)
        if not normalized:
            return False
        for term in terms:
            needle = _normalize_term(term)
            if len(needle) >= 2 and needle in normalized:
                return True
        return False
