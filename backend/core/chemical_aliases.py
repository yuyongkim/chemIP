from __future__ import annotations

import re
from typing import Iterable


CAS_PATTERN = re.compile(r"\b\d{2,7}-\d{2}-\d\b")
PAREN_PATTERN = re.compile(r"\(([^)]{2,})\)")
EN_WORD_PATTERN = re.compile(r"[A-Za-z][A-Za-z0-9][A-Za-z0-9 .,'/\-]{1,}")
KO_WORD_PATTERN = re.compile(r"[가-힣]{2,}")
DELIMITER_PATTERN = re.compile(r"[;/|]+")
LABEL_PREFIX_PATTERN = re.compile(
    r"^(?:관용명|별칭|영문명|이명|동의어|synonyms?|alias(?:es)?|trade name)\s*:\s*",
    re.IGNORECASE,
)
EDGE_PUNCT_PATTERN = re.compile(r"^[\s,.:]+|[\s,.:]+$")
WHITESPACE_PATTERN = re.compile(r"\s+")


def clean_alias_value(value: str | None) -> str:
    text = (value or "").strip()
    if not text:
        return ""
    text = text.replace("\u3000", " ")
    text = text.replace("[", "(").replace("]", ")")
    text = LABEL_PREFIX_PATTERN.sub("", text)
    text = WHITESPACE_PATTERN.sub(" ", text)
    text = EDGE_PUNCT_PATTERN.sub("", text)
    return text.strip()


def normalize_alias(value: str | None) -> str:
    text = clean_alias_value(value)
    if not text:
        return ""
    lowered = text.casefold()
    lowered = lowered.replace("·", "").replace("ㆍ", "")
    lowered = lowered.replace("_", " ").replace("-", " ")
    lowered = re.sub(r"[\"'`]+", " ", lowered)
    lowered = re.sub(r"\s+", " ", lowered).strip()
    return lowered


def split_alias_blob(value: str | None) -> list[str]:
    raw = clean_alias_value(value)
    if not raw:
        return []

    out: list[str] = []
    seen: set[str] = set()

    def add(term: str, *, min_length: int = 2) -> None:
        cleaned = clean_alias_value(term)
        if len(cleaned) < min_length:
            return
        key = normalize_alias(cleaned)
        if not key or key in seen:
            return
        seen.add(key)
        out.append(cleaned)

    add(raw)

    for cas in CAS_PATTERN.findall(raw):
        add(cas)

    stripped = PAREN_PATTERN.sub(" ", raw)
    stripped = clean_alias_value(stripped)
    if stripped and stripped != raw:
        add(stripped)

    for match in PAREN_PATTERN.findall(raw):
        add(match)
        for part in DELIMITER_PATTERN.split(match):
            add(part)
        if ":" in match:
            _, right = match.split(":", 1)
            add(right)

    for part in DELIMITER_PATTERN.split(raw):
        add(part)

    return out


def extract_alias_candidates(*values: str | None) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()

    def add(term: str) -> None:
        key = normalize_alias(term)
        if not key or key in seen:
            return
        seen.add(key)
        out.append(clean_alias_value(term))

    for value in values:
        for part in split_alias_blob(value):
            add(part)

    return out


def build_search_candidates(query: str | None) -> list[str]:
    raw = clean_alias_value(query)
    if not raw:
        return []

    candidates = extract_alias_candidates(raw)
    out: list[str] = []
    seen: set[str] = set()

    def add(term: str) -> None:
        key = normalize_alias(term)
        if not key or key in seen:
            return
        seen.add(key)
        out.append(clean_alias_value(term))

    add(raw)
    for cas in CAS_PATTERN.findall(raw):
        add(cas)

    for candidate in candidates:
        add(candidate)

    normalized = normalize_alias(raw)
    if normalized != raw.casefold():
        add(normalized)

    return out


def pick_canonical_chem_id(*, row_id: int, description: str | None, cas_no: str | None, source: str | None) -> str:
    desc = (description or "").strip()
    cas = (cas_no or "").strip()
    src = (source or "").strip() or "UNKNOWN"

    if desc.startswith("KOSHA_ID:"):
        return desc.split(":", 1)[1]
    if cas:
        return cas
    if desc:
        return desc
    return f"{src}:{row_id}"


def alias_metadata_from_name(name: str | None, name_en: str | None, cas_no: str | None) -> list[tuple[str, str, float]]:
    results: list[tuple[str, str, float]] = []
    seen: set[tuple[str, str]] = set()

    def add(alias: str, alias_type: str, confidence: float) -> None:
        cleaned = clean_alias_value(alias)
        key = normalize_alias(cleaned)
        composite = (key, alias_type)
        if not key or composite in seen:
            return
        seen.add(composite)
        results.append((cleaned, alias_type, confidence))

    if name:
        add(name, "name", 1.0)
        for part in split_alias_blob(name):
            add(part, "derived", 0.85)

    if name_en:
        add(name_en, "name_en", 1.0)
        for part in split_alias_blob(name_en):
            add(part, "derived_en", 0.8)

    if cas_no:
        add(cas_no, "cas", 1.0)

    return results


def extract_terms_for_regulatory_search(
    *,
    name: str | None,
    name_en: str | None,
    cas_no: str | None,
    aliases: Iterable[str] | None = None,
    limit: int = 8,
) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()

    def add(term: str | None) -> None:
        cleaned = clean_alias_value(term)
        key = normalize_alias(cleaned)
        if not key or key in seen:
            return
        seen.add(key)
        out.append(cleaned)

    add(cas_no)
    add(name_en)
    add(name)
    for alias in aliases or []:
        add(alias)
        if len(out) >= limit:
            break

    return out[:limit]
