"""Search targets: a function query -> list of result items (dicts with cas_no), top config.SEARCH_LIMIT.

http targets (config.TARGETS): GET <base>/chemicals?q=&limit=20, one request at a time, gap per target.
inproc: backend TerminologyDB.search_chemicals in this process on a read-only DB (no server; for iterating).
static: the static index reference client (scripts/static_export/static_search.py) over config.STATIC_SEARCH_DIR.
"""
from __future__ import annotations

import json
import sys
import time
import urllib.parse
import urllib.request

import config


def http_target(name: str):
    base, gap, last = config.TARGETS[name], config.API_GAP_SECONDS[name], [0.0]

    def search(q: str) -> list[dict]:
        wait = gap - (time.time() - last[0])
        if wait > 0:
            time.sleep(wait)
        url = f"{base}/chemicals?q={urllib.parse.quote(q, safe='')}&limit={config.SEARCH_LIMIT}"
        req = urllib.request.Request(url, headers={"User-Agent": config.USER_AGENT})
        for attempt in range(4):
            try:
                with urllib.request.urlopen(req, timeout=config.API_TIMEOUT) as r:
                    return json.load(r).get("items", [])
            except Exception:  # noqa: BLE001 - retry transient network / 5xx, then give up
                if attempt == 3:
                    raise
                time.sleep(3 * (attempt + 1))
            finally:
                last[0] = time.time()
        return []

    return search


def _import_static_export(module: str):
    """static_export has its own top-level `config`; import its module under that name, then restore ours."""
    import importlib

    ours = sys.modules.pop("config")
    sys.path.insert(0, config.STATIC_EXPORT_DIR)
    try:
        return importlib.import_module(module)  # static_export config/db put backend on sys.path (read-only DB)
    finally:
        sys.path.remove(config.STATIC_EXPORT_DIR)
        sys.modules["config"] = ours


def inproc_target():
    _import_static_export("db")
    from backend.core.terminology_db import TerminologyDB

    tdb = TerminologyDB()

    def search(q: str) -> list[dict]:
        return tdb.search_chemicals(q, config.SEARCH_LIMIT)["items"]

    return search


def static_target():
    StaticIndex = _import_static_export("static_search").StaticIndex
    idx = StaticIndex(config.STATIC_SEARCH_DIR)

    def search(q: str) -> list[dict]:
        return idx.search(q, config.SEARCH_LIMIT)["items"]

    return search


def get_target(name: str):
    local = {"static": static_target, "inproc": inproc_target}
    return local[name]() if name in local else http_target(name)
