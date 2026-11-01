"""Named-list memberships added after the last full p/ export → g/intl_add.json + g/intl_add_<n>.json (gzip bytes).

p/<chem_id>.json carries `intl_lists` (the intl_lists/ memberships of its CAS) as of its export (333k files). A list
added later (config.INTL_ADD_LISTS) reaches the product page without re-exporting p/: the browser reads the CAS's shard
and merges it into the page's lists (frontend/public/chemip/api_intl.jsx). Same membership shape as p/ intl_lists.

    g/intl_add.json      {v, exported_at, buckets, lists: [meta (INTL_META_FIELDS + absence_note)], cas_count}
    g/intl_add_<n>.json  {v, n, cas: {CAS: [{list_id, entries, family_entries}]}}   n = fnv1a32(CAS) % buckets

Every bucket file is written (empty `cas` too) so a lookup never 404s. When p/ is fully re-exported with these lists,
drop them from INTL_ADD_LISTS; the client already skips a list the page itself has.
Run: python -I -B scripts/static_export/run_all.py --steps intl_add
"""
from __future__ import annotations

import datetime as dt
import os

import config
import db  # noqa: F401  (sys.path for backend)
from facts import strip_membership
from jsonio import write_gzip


def fnv1a32(s: str) -> int:
    h = 0x811C9DC5
    for b in s.encode("utf-8"):
        h = ((h ^ b) * 0x01000193) & 0xFFFFFFFF
    return h


def bucket_of(cas: str, buckets: int) -> int:
    return fnv1a32(cas) % buckets


def list_meta(doc: dict, fields: tuple) -> dict:
    return {**{f: doc.get(f) for f in fields}, "absence_note": doc.get("absence_note")}


def shard_map(docs: list[dict], buckets: int) -> dict[int, dict[str, list[dict]]]:
    """Lists → {bucket: {CAS: [membership]}} (entries with a CAS only; family entries stay on reg/)."""
    out: dict[int, dict[str, list[dict]]] = {n: {} for n in range(buckets)}
    for doc in docs:
        by_cas: dict[str, list[dict]] = {}
        for e in doc.get("entries") or []:
            cas = str(e.get("cas") or "").strip()
            if cas:
                by_cas.setdefault(cas, []).append(e)
        for cas, entries in by_cas.items():
            m = strip_membership({"list_id": doc.get("list_id"), "entries": entries, "family_entries": []})
            out[bucket_of(cas, buckets)].setdefault(cas, []).append(m)
    return out


def export_intl_add(log=print, root: str = config.GLOBAL_DIR) -> dict:
    from backend.core.trade_controls import lists as tl

    wanted = set(config.INTL_ADD_LISTS)
    docs = [d for d in tl.load_intl_lists() if d.get("list_id") in wanted]
    missing = sorted(wanted - {d.get("list_id") for d in docs})
    buckets = config.INTL_ADD_BUCKETS
    shards = shard_map(docs, buckets)
    raw = packed = 0
    for n, cas_map in shards.items():
        r, g = write_gzip(os.path.join(root, f"{config.INTL_ADD_NAME}_{n}.json"),
                          {"v": config.INTL_ADD_FORMAT, "n": n, "cas": cas_map})
        raw, packed = raw + r, packed + g
    cas_count = sum(len(m) for m in shards.values())
    head = {"v": config.INTL_ADD_FORMAT, "exported_at": dt.date.today().isoformat(), "buckets": buckets,
            "lists": [list_meta(d, tl.INTL_META_FIELDS) for d in docs], "cas_count": cas_count}
    r, g = write_gzip(os.path.join(root, f"{config.INTL_ADD_NAME}.json"), head)
    log(f"intl_add: {len(docs)} lists, {cas_count} CAS, {buckets} shards, missing {missing}")
    return {"lists": [d["list_id"] for d in docs], "missing": missing, "cas": cas_count, "buckets": buckets,
            "raw_bytes": raw + r, "gzip_bytes": packed + g}
