"""Builds search/ (destined for Cloudflare Pages): manifest, docmeta, token shards, doc buckets, alias buckets
with precomputed answers. Layout and encodings are the pilot's; see CONTRACT.md "search/".
"""
from __future__ import annotations

import collections
import os
import shutil
import time

import config
import db
from jsonio import SizeStats, dumps, gz, write_plain
from search_aliases import alias_buckets
from search_keys import alias_bucket
from search_precompute import precompute, wanted_keys
from search_tokens import docmeta, encode_postings, load_postings, one_char_df, shard_tokens


def _emitter(root: str, stats: SizeStats):
    def emit(kind: str, rel: str, obj) -> None:
        raw, packed = write_plain(os.path.join(root, rel), obj)
        stats.add(kind, raw, packed)
    return emit


def _doc_buckets(docs: dict[int, tuple]) -> dict[int, dict[int, list]]:
    """d/<id // DOC_BUCKET>.json: {id: [name, cas_no, description, name_en, source]}"""
    buckets: dict[int, dict[int, list]] = collections.defaultdict(dict)
    for d, (_, name, cas, desc, name_en, src) in docs.items():
        buckets[d // config.DOC_BUCKET][d] = [name or "", cas or "", desc or "", name_en or "", src or ""]
    return buckets


def build_search(root: str = config.SEARCH_DIR, workers: int = config.WORKERS, log=print) -> dict:
    t0 = time.time()
    if os.path.isdir(root):
        shutil.rmtree(root)
    conn = db.ro_connect()
    stats = SizeStats()
    emit = _emitter(root, stats)

    rows = conn.execute("SELECT id, name, cas_no, description, name_en, source FROM chemical_terms").fetchall()
    docs = {r[0]: r for r in rows}
    buckets = _doc_buckets(docs)
    for b, recs in buckets.items():
        emit("docs", f"d/{b}.json", recs)
    log(f"search: docs {len(rows)} in {len(buckets)} buckets ({time.time() - t0:.0f}s)")

    post, ntok = load_postings(conn)
    n_row = conn.execute("SELECT count(*) FROM chemical_terms_fts_docsize").fetchone()[0]
    kosha = {d for d, r in docs.items() if r[5] == "KOSHA"}
    emit("docmeta", "docmeta.json", docmeta(ntok, kosha, max(docs)))
    encoded = {t: encode_postings(dd) for t, dd in post.items()}
    shards = shard_tokens(encoded)
    shard_keys: dict[str, list[int]] = {}
    for i, (prefix, toks) in enumerate(shards):
        emit("tokens", f"t/{i}.json", {t: encoded[t] for t in toks})
        shard_keys.setdefault(prefix, []).append(i)
    log(f"search: {len(post)} tokens in {len(shards)} shards ({time.time() - t0:.0f}s)")

    abuckets, inline = alias_buckets(conn, docs)
    keys = wanted_keys(conn)
    log(f"search: precomputing {len(keys)} query keys with {workers} workers")
    pre, pre_stats = precompute(keys, workers, log)
    qbuckets: dict[int, dict] = collections.defaultdict(dict)
    for k in sorted(pre):
        qbuckets[alias_bucket(k)][k] = pre[k]
    for h in range(config.ALIAS_BUCKETS):
        emit("aliases", f"a/{h}.json", {"a": abuckets.get(h, {}), "q": qbuckets.get(h, {})})

    manifest = {
        "format": config.VERSION, "n_row": n_row, "n_token": sum(ntok.values()), "bucket": config.DOC_BUCKET,
        "alias_buckets": config.ALIAS_BUCKETS, "alias_types": config.ALIAS_TYPES, "search_limit": config.SEARCH_LIMIT,
        "shards": shard_keys, "one_char_df": one_char_df(post),
    }
    emit("manifest", "manifest.json", manifest)
    all_docs = dumps({k: v for recs in buckets.values() for k, v in recs.items()})
    return {
        **stats.to_dict(),
        "single_file_docs_variant": {"raw": len(all_docs), "gz": len(gz(all_docs))},
        "n_terms": len(post), "n_docs": len(rows), "alias_inline_refs": inline,
        "precompute": pre_stats, "build_seconds": round(time.time() - t0, 1),
    }
