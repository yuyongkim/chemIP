"""Token postings copied from the live FTS5 index (fts5vocab 'instance'), delta-encoded and prefix-sharded.

Tokenisation is therefore identical to the backend's unicode61 tokenizer.
"""
from __future__ import annotations

import collections
import json

import config


def load_postings(conn) -> tuple[dict[str, dict[int, list[int]]], dict[int, int]]:
    """term -> {doc: [offset*4 + column]}, plus tokens per doc."""
    conn.execute("CREATE VIRTUAL TABLE IF NOT EXISTS temp.vi USING fts5vocab(main, chemical_terms_fts, 'instance')")
    post: dict[str, dict[int, list[int]]] = collections.defaultdict(dict)
    ntok: dict[int, int] = collections.Counter()
    for term, doc, col, off in conn.execute("SELECT term, doc, col, offset FROM temp.vi"):
        post[term].setdefault(doc, []).append(off * 4 + config.FTS_COLS[col])
        ntok[doc] += 1
    return post, ntok


def encode_postings(docs: dict[int, list[int]]) -> list[int]:
    """[docDelta, n, pos.., docDelta, n, pos..]"""
    flat, prev = [], 0
    for d in sorted(docs):
        ps = sorted(docs[d])
        flat += [d - prev, len(ps), *ps]
        prev = d
    return flat


def shard_tokens(encoded: dict[str, list[int]]) -> list[tuple[str, list[str]]]:
    """Split tokens by first char, then by longer prefixes until a shard is <= SHARD_LIMIT raw bytes."""
    sizes = {t: len(t) + len(json.dumps(v, separators=(",", ":"))) + 4 for t, v in encoded.items()}
    shards: list[tuple[str, list[str]]] = []

    def split(prefix: str, toks: list[str]) -> None:
        total = sum(sizes[t] for t in toks)
        longer = [t for t in toks if len(t) > len(prefix)]
        if total <= config.SHARD_LIMIT or not longer:
            shards.append((prefix, toks))
            return
        exact = [t for t in toks if len(t) == len(prefix)]
        if exact:
            shards.append((prefix, exact))
        groups: dict[str, list[str]] = collections.defaultdict(list)
        for t in longer:
            groups[t[: len(prefix) + 1]].append(t)
        for p in sorted(groups):
            split(p, groups[p])

    first: dict[str, list[str]] = collections.defaultdict(list)
    for t in encoded:
        first[t[0]].append(t)
    for p in sorted(first):
        split(p, first[p])
    return shards


def one_char_df(post: dict[str, dict[int, list[int]]]) -> dict[str, int]:
    """Number of docs having any token that starts with each first character."""
    by_char: dict[str, set] = collections.defaultdict(set)
    for term, dd in post.items():
        by_char[term[0]].update(dd.keys())
    return {c: len(s) for c, s in by_char.items()}


def docmeta(ntok: dict[int, int], kosha_ids: set[int], max_id: int) -> list[int]:
    """Per chemical_terms.id: ntok*2 + is_kosha (0 = no row). bm25 doc length + KOSHA-first order."""
    meta = [0] * (max_id + 1)
    for d, n in ntok.items():
        if d <= max_id:
            meta[d] = n * 2
    for d in kosha_ids:
        if d <= max_id:
            meta[d] += 1
    return meta
