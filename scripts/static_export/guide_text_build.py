"""Pure builder of the KOSHA guide full-text index gs/ (added 2026-10-31). No file or network access here.

Index = character bigrams of the normalized page text (Korean text extracted from the PDFs has no reliable word
spacing, so word tokens would miss most matches). The browser port is frontend/public/chemip/guide_text_core.jsx
(gtNorm, gtBigrams, gtShard); both sides must stay identical — see CONTRACT.md "gs/ — KOSHA guide full text".

    normalize(s)  = NFKC → lower() → keep only letters and digits (str.isalnum)
    bigrams(n)    = every 2-character window of the normalized text, per page (no window crosses a page)
    shard(bigram) = fnv1a32(bigram) % shards
"""
from __future__ import annotations

import collections
import unicodedata


def fnv1a32(s: str) -> int:
    # Same function as search_keys.fnv1a32 (kept here so this module has no backend import).
    h = 0x811C9DC5
    for b in s.encode("utf-8"):
        h = ((h ^ b) * 0x01000193) & 0xFFFFFFFF
    return h


def normalize(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKC", s or "").lower() if c.isalnum())


def bigrams(norm: str) -> list[str]:
    return [norm[i:i + 2] for i in range(len(norm) - 1)]


def shard_of(bigram: str, shards: int) -> int:
    return fnv1a32(bigram) % shards


def doc_counts(pages: list[str]) -> collections.Counter:
    """Bigram → term frequency over all pages of one guide."""
    c: collections.Counter = collections.Counter()
    for text in pages:
        c.update(bigrams(normalize(text)))
    return c


def clean_page(text: str) -> str:
    """Page text as shipped to the browser: whitespace runs collapsed to one space (snippets, phrase check)."""
    return " ".join((text or "").split())


def build(docs: list[dict], shards: int) -> tuple[list[list], dict[int, dict[str, list[int]]]]:
    """docs: [{no, title, date, url, pages: [text, ...]}] in output order.

    Returns (rows, shard_map): rows[i] = [no, title, date, url, n_pages, n_chars] for doc index i,
    shard_map[n] = {bigram: [docDelta, tf, docDelta, tf, ...]} with doc indices ascending (first delta from 0).
    """
    rows: list[list] = []
    post: dict[str, list[tuple[int, int]]] = collections.defaultdict(list)
    for i, d in enumerate(docs):
        pages = [clean_page(p) for p in d.get("pages") or []]
        rows.append([d["no"], d.get("title", ""), d.get("date", ""), d.get("url", ""), len(pages), sum(len(p) for p in pages)])
        for bg, tf in doc_counts(pages).items():
            post[bg].append((i, tf))
    shard_map: dict[int, dict[str, list[int]]] = collections.defaultdict(dict)
    for bg in sorted(post):
        arr, prev = [], 0
        for i, tf in post[bg]:  # appended in doc order, so already ascending
            arr += [i - prev, tf]
            prev = i
        shard_map[shard_of(bg, shards)][bg] = arr
    return rows, dict(shard_map)


def decode_postings(arr: list[int]) -> dict[int, int]:
    """[docDelta, tf, ...] → {doc index: tf} (inverse of the encoding in build; used by tests and checks)."""
    out, doc = {}, 0
    for j in range(0, len(arr), 2):
        doc += arr[j]
        out[doc] = arr[j + 1]
    return out
