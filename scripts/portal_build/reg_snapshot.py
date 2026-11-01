"""List snapshots and the diff between two of them.

A snapshot is what the change tracker remembers of one export:
    {v: 1, taken_at: "YYYY-MM-DD", lists: {id: {title, jurisdiction, amended_on, version, rows: {key: [hash, name]}}}}
key = the row's CAS, or "~" + name for a family row (no CAS). hash = short hash of name + detail, so a changed
detail (e.g. a new threshold) is a "modified" row. Files: reg_config.SNAPSHOT_DIR/<date>.json.gz + latest.json.gz.

diff(old, new, day) is pure: it returns reg_changes rows
    (changed_on, jurisdiction, list_id, cas, change, detail, source_url, source_id)
detail = the substance name (row changes) or a short description (list-level changes). Tested in tests/test_reg_diff.py.
"""
from __future__ import annotations

import gzip
import hashlib
import json
import os

import reg_config as C

SNAPSHOT_FORMAT = 1
DIFF_SOURCE = "chemip_export_diff"


def row_key(row: list[str]) -> str:
    return row[0] if row[0] else "~" + row[1]


def row_hash(row: list[str]) -> str:
    return hashlib.sha1("\x1f".join(row[1:]).encode("utf-8")).hexdigest()[:10]


def build(lists: list[dict], day: str) -> dict:
    out = {}
    for x in lists:
        rows = {}
        for r in x["rows"]:
            rows.setdefault(row_key(r), [row_hash(r), r[1] or r[2]])  # first row wins for a repeated CAS
        out[x["id"]] = {"title": x["title"], "jurisdiction": x["jurisdiction"], "amended_on": x["amended_on"],
                        "version": x["version"], "rows": rows}
    return {"v": SNAPSHOT_FORMAT, "taken_at": day, "lists": out}


def _cas_or_none(key: str):
    return None if key.startswith("~") else key


def diff(old: dict, new: dict, day: str) -> list[tuple]:
    rows: list[tuple] = []
    o_lists, n_lists = old.get("lists", {}), new.get("lists", {})
    url = C.LIST_PAGE_URL
    for lid, n in n_lists.items():
        o = o_lists.get(lid)
        j = n.get("jurisdiction") or None
        if o is None:
            rows.append((day, j, lid, None, "added", f"목록 추가: {n['title']} ({len(n['rows'])})", url.format(id=lid), DIFF_SOURCE))
            continue
        for field, label in (("amended_on", "개정일"), ("version", "원문 판")):
            if (o.get(field) or "") != (n.get(field) or ""):
                rows.append((day, j, lid, None, "modified", f"{label}: {o.get(field) or '-'} → {n.get(field) or '-'}",
                             url.format(id=lid), DIFF_SOURCE))
        o_rows, n_rows = o["rows"], n["rows"]
        for key, (h, name) in n_rows.items():
            if key not in o_rows:
                rows.append((day, j, lid, _cas_or_none(key), "added", name or key.lstrip("~"), url.format(id=lid), DIFF_SOURCE))
            elif o_rows[key][0] != h:
                rows.append((day, j, lid, _cas_or_none(key), "modified", name or key.lstrip("~"), url.format(id=lid), DIFF_SOURCE))
        for key, (_, name) in o_rows.items():
            if key not in n_rows:
                rows.append((day, j, lid, _cas_or_none(key), "removed", name or key.lstrip("~"), url.format(id=lid), DIFF_SOURCE))
    for lid, o in o_lists.items():
        if lid not in n_lists:
            rows.append((day, o.get("jurisdiction") or None, lid, None, "removed", f"목록 삭제: {o['title']}",
                         url.format(id=lid), DIFF_SOURCE))
    return rows


def save(snap: dict, folder: str = C.SNAPSHOT_DIR) -> str:
    os.makedirs(folder, exist_ok=True)
    data = gzip.compress(json.dumps(snap, ensure_ascii=False, separators=(",", ":")).encode("utf-8"), 9, mtime=0)
    dated = os.path.join(folder, f"{snap['taken_at']}.json.gz")
    for path in (dated, os.path.join(folder, C.SNAPSHOT_LATEST)):
        tmp = path + ".tmp"
        with open(tmp, "wb") as fh:
            fh.write(data)
        os.replace(tmp, path)
    return dated


def load_latest(folder: str = C.SNAPSHOT_DIR) -> dict | None:
    path = os.path.join(folder, C.SNAPSHOT_LATEST)
    if not os.path.exists(path):
        return None
    with gzip.open(path, "rb") as fh:
        return json.loads(fh.read())
