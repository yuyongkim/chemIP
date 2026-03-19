from __future__ import annotations

from collections import Counter
import re
from typing import Any

from backend.core.kosha_guide_store import KoshaGuideStore


CAS_PATTERN = re.compile(r"\b\d{2,7}-\d{2}-\d\b")
EN_WORD_PATTERN = re.compile(r"[A-Za-z][A-Za-z0-9_-]{2,}")
KO_WORD_PATTERN = re.compile(r"[가-힣]{2,}")

EN_STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "into",
    "over",
    "under",
    "safety",
    "guide",
    "work",
    "area",
    "about",
    "chemical",
}


def _is_numeric_identifier(value: str) -> bool:
    return (value or "").strip().isdigit()


def _add_term(out: list[str], seen: set[str], value: str) -> None:
    term = (value or "").strip()
    if len(term) < 2:
        return
    if _is_numeric_identifier(term):
        return
    key = term.casefold()
    if key in seen:
        return
    seen.add(key)
    out.append(term)


def normalize_search_terms(*values: str | None, limit: int = 12) -> list[str]:
    terms: list[str] = []
    seen: set[str] = set()

    for value in values:
        raw = (value or "").strip()
        if not raw:
            continue
        _add_term(terms, seen, raw)

        for cas in CAS_PATTERN.findall(raw):
            _add_term(terms, seen, cas)

        for part in re.split(r"[,/;|]", raw):
            _add_term(terms, seen, part.strip())

        no_paren = re.sub(r"\([^)]*\)", " ", raw).strip()
        if no_paren and no_paren != raw:
            _add_term(terms, seen, no_paren)

    prioritized = sorted(terms, key=lambda t: (0 if CAS_PATTERN.fullmatch(t) else 1, len(t)))
    return prioritized[:limit]


def extract_guide_signals(text: str, max_cas: int = 10, max_keywords: int = 12) -> tuple[list[str], list[str]]:
    raw = text or ""
    cas_numbers = []
    seen_cas = set()
    for cas in CAS_PATTERN.findall(raw):
        if cas in seen_cas:
            continue
        seen_cas.add(cas)
        cas_numbers.append(cas)
        if len(cas_numbers) >= max_cas:
            break

    tokens: list[str] = []
    tokens.extend(word.lower() for word in EN_WORD_PATTERN.findall(raw))
    tokens.extend(KO_WORD_PATTERN.findall(raw))

    counter: Counter[str] = Counter()
    for token in tokens:
        t = token.strip()
        if len(t) < 3:
            continue
        if t in EN_STOPWORDS:
            continue
        counter[t] += 1

    keywords = [word for word, _ in counter.most_common(max_keywords)]
    return cas_numbers, keywords


def _extract_exact_term_sets(*values: str) -> tuple[set[str], set[str], set[str]]:
    cas_values: set[str] = set()
    en_values: set[str] = set()
    ko_values: set[str] = set()

    for value in values:
        raw = value or ""
        cas_values.update(CAS_PATTERN.findall(raw))
        en_values.update(word.casefold() for word in EN_WORD_PATTERN.findall(raw))
        ko_values.update(KO_WORD_PATTERN.findall(raw))

    return cas_values, en_values, ko_values


def _score_exact_matches(
    terms: list[str],
    *,
    title: str,
    snippet: str,
    text: str,
) -> tuple[int, int, int]:
    title_cas, title_en, title_ko = _extract_exact_term_sets(title)
    body_cas, body_en, body_ko = _extract_exact_term_sets(snippet, text)

    exact_cas_matches = 0
    exact_title_matches = 0
    exact_body_matches = 0

    for term in terms:
        if CAS_PATTERN.fullmatch(term):
            if term in title_cas:
                exact_cas_matches += 1
            elif term in body_cas:
                exact_cas_matches += 1
            continue

        if KO_WORD_PATTERN.fullmatch(term):
            if term in title_ko:
                exact_title_matches += 1
            elif term in body_ko:
                exact_body_matches += 1
            continue

        term_key = term.casefold()
        if term_key in title_en:
            exact_title_matches += 1
        elif term_key in body_en:
            exact_body_matches += 1

    return exact_cas_matches, exact_title_matches, exact_body_matches


def recommend_guides(
    store: KoshaGuideStore,
    terms: list[str],
    top_k: int = 8,
    per_term_limit: int = 30,
) -> list[dict[str, Any]]:
    if not terms:
        return []

    merged: dict[str, dict[str, Any]] = {}
    for term in terms:
        items, _ = store.search(query=term, limit=per_term_limit, offset=0)
        for item in items:
            guide_no = str(item.get("guide_no", "")).strip()
            if not guide_no:
                continue

            current = merged.get(guide_no)
            if not current:
                current = {
                    "guide_no": guide_no,
                    "title": item.get("title", ""),
                    "ofanc_ymd": item.get("ofanc_ymd", ""),
                    "file_download_url": item.get("file_download_url", ""),
                    "score": 0,
                    "match_terms": [],
                    "match_fields": [],
                    "snippet": item.get("snippet", ""),
                }
                merged[guide_no] = current

            current["score"] = int(current["score"]) + int(item.get("score", 0) or 0)
            if term not in current["match_terms"]:
                current["match_terms"].append(term)

            for field in item.get("match_fields", []) or []:
                if field not in current["match_fields"]:
                    current["match_fields"].append(field)

            if not current["snippet"] and item.get("snippet"):
                current["snippet"] = item.get("snippet")

    ranked = sorted(
        merged.values(),
        key=lambda x: (int(x.get("score", 0)), str(x.get("ofanc_ymd", ""))),
        reverse=True,
    )

    enriched: list[dict[str, Any]] = []
    for row in ranked[: max(top_k * 2, top_k)]:
        detail = store.get(str(row.get("guide_no", "")), include_text=True) or {}
        text = str(detail.get("text", "") or "")
        cas_numbers, keywords = extract_guide_signals(text)
        title = str(row.get("title", "") or "")
        snippet = str(row.get("snippet", "") or "")
        exact_cas_matches, exact_title_matches, exact_body_matches = _score_exact_matches(
            terms,
            title=title,
            snippet=snippet,
            text=text,
        )

        row["guide_cas_numbers"] = cas_numbers
        row["guide_keywords"] = keywords
        row["text_preview"] = text[:280].replace("\n", " ").strip()
        row["exact_cas_matches"] = exact_cas_matches
        row["exact_title_matches"] = exact_title_matches
        row["exact_body_matches"] = exact_body_matches
        row["exact_match_score"] = (
            (exact_cas_matches * 4)
            + (exact_title_matches * 3)
            + (exact_body_matches * 2)
        )
        enriched.append(row)

    if any(int(item.get("exact_match_score", 0)) > 0 for item in enriched):
        enriched = [item for item in enriched if int(item.get("exact_match_score", 0)) > 0]

    enriched.sort(
        key=lambda x: (
            int(x.get("exact_match_score", 0)),
            int(x.get("exact_cas_matches", 0)),
            int(x.get("exact_title_matches", 0)),
            int(x.get("exact_body_matches", 0)),
            int(x.get("score", 0)),
            len(x.get("match_terms", [])),
            str(x.get("ofanc_ymd", "")),
        ),
        reverse=True,
    )
    return enriched[:top_k]
