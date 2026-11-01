"""Search verification.

(a) 30 test queries: static client (cold cache, search/ files only) vs LIVE API top-20 (items and total), sequential.
(b) offline: random precomputed keys, static answer vs backend search_chemicals on the read-only DB.
"""
from __future__ import annotations

import json
import random

import config
import db
import live_api
from search_keys import query_key
from static_search import StaticIndex


def _strip(res: dict) -> dict:
    return {"items": res["items"], "total": res["total"]}


def live_queries(log=print) -> dict:
    with open(config.TEST_QUERIES, encoding="utf-8") as fh:
        queries = [tuple(x) for x in json.load(fh)]
    results = []
    for kind, q in queries:
        idx = StaticIndex()
        static = idx.search(q, config.SEARCH_LIMIT)
        api, status = live_api.get(f"/chemicals?q={live_api.q(q)}&limit={config.SEARCH_LIMIT}")
        api = api if status == 200 else {"items": [], "total": -1}
        same = _strip(static) == _strip(api)
        results.append({"kind": kind, "q": q, "mode": static["mode"], "top20_identical": same,
                        "items_identical": static["items"] == api["items"], "total_static": static["total"],
                        "total_api": api["total"], "files": len(idx.fetched),
                        "kb_gz": round(sum(idx.fetched.values()) / 1024, 1)})
        log(f"search {q!r}: {static['mode']} identical={same}")
    modes: dict[str, int] = {}
    for r in results:
        modes[r["mode"]] = modes.get(r["mode"], 0) + 1
    return {"queries": len(results), "top20_identical": sum(r["top20_identical"] for r in results),
            "items_identical": sum(r["items_identical"] for r in results), "modes": modes, "results": results}


def offline_precomputed(n: int = 300) -> dict:
    db.prepare_backend()
    from backend.core.terminology_db import TerminologyDB
    from search_precompute import wanted_keys

    keys = random.Random(config.VERIFY_SEED).sample(wanted_keys(db.ro_connect()), n)
    tdb, idx, bad = TerminologyDB(), StaticIndex(), []
    for k in keys:
        mine = idx.search(k, config.SEARCH_LIMIT)
        if mine["mode"] != "precomputed" and query_key(k) == k.lower():
            bad.append({"key": k, "why": f"not precomputed ({mine['mode']})"})
            continue
        if _strip(mine) != tdb.search_chemicals(k, config.SEARCH_LIMIT):
            bad.append({"key": k, "why": "differs from backend"})
    return {"checked": n, "identical": n - len(bad), "failures": bad[:20]}
