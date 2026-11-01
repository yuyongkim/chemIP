"""Precomputed search answers: backend search_chemicals(q, limit=20) for every alias key and normalized alias key.

Runs the real backend function on a read-only DB in a process pool, so the stored answer equals the live API's.
Stored as {query_key: [total, id1..id20]}.
"""
from __future__ import annotations

import collections
import multiprocessing as mp
import time

import config
import db
from search_keys import query_key

_DB = None


def wanted_keys(conn) -> list[str]:
    """query_key of every alias, every alias_norm, and every name / name_en / cas_no of chemical_terms."""
    keys: set[str] = set()
    for alias, norm in conn.execute("SELECT alias, alias_norm FROM chemical_aliases"):
        keys.add(query_key(alias))
        keys.add(query_key(norm))
    for name, name_en, cas in conn.execute("SELECT name, name_en, cas_no FROM chemical_terms"):
        keys.update(query_key(v) for v in (name, name_en, cas) if v)
    keys.discard("")
    return sorted(keys)


def _init_worker() -> None:
    global _DB
    db.prepare_backend()
    from backend.core.terminology_db import TerminologyDB

    _DB = TerminologyDB()
    fetch = _DB._fetch_search_rows
    memo: collections.OrderedDict = collections.OrderedDict()

    def cached(term, limit):
        k = (term, limit)
        if k in memo:
            memo.move_to_end(k)
            return memo[k]
        rows = fetch(term, limit)
        memo[k] = rows
        if len(memo) > config.PRECOMPUTE_MEMO:
            memo.popitem(last=False)
        return rows

    _DB._fetch_search_rows = cached


def _run_chunk(keys: list[str]) -> dict[str, list[int]]:
    out = {}
    for k in keys:
        res = _DB.search_chemicals(k, config.SEARCH_LIMIT)
        out[k] = [res["total"], *[it["id"] for it in res["items"]]]
    return out


def precompute(keys: list[str], workers: int = config.WORKERS, log=print) -> tuple[dict[str, list[int]], dict]:
    chunks = [keys[i: i + config.PRECOMPUTE_CHUNK] for i in range(0, len(keys), config.PRECOMPUTE_CHUNK)]
    out: dict[str, list[int]] = {}
    t0 = time.time()
    with mp.get_context("spawn").Pool(workers, initializer=_init_worker) as pool:
        for i, part in enumerate(pool.imap_unordered(_run_chunk, chunks), 1):
            out.update(part)
            if i % 50 == 0 or i == len(chunks):
                done = len(out)
                rate = done / max(1e-6, time.time() - t0)
                log(f"precompute {done}/{len(keys)} ({rate:.0f}/s, eta {(len(keys) - done) / max(rate, 1e-6) / 60:.1f} min)")
    return out, {"keys": len(keys), "precomputed": len(out), "workers": workers, "secs": round(time.time() - t0, 1)}
