"""Raw-file store for the temperature-dependent property sources: registry (tp_sources.json), paths and manifest.

Every source file lives in data/portal_raw/tp/<source_id>/ next to manifest.json (url, retrieved_at, sha256, bytes),
so each record built from it can name the file and the retrieval date. Fetching is tp_fetch.py; parsing is tp_<source>.py.
"""
from __future__ import annotations

import hashlib
import json
import os
import time

REGISTRY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tp_sources.json")
MANIFEST = "manifest.json"


def registry() -> dict:
    with open(REGISTRY, encoding="utf-8") as fh:
        return json.load(fh)


def source(source_id: str) -> dict:
    for s in registry()["sources"]:
        if s["source_id"] == source_id:
            return s
    raise KeyError(source_id)


def source_dir(source_id: str) -> str:
    return os.path.join(registry()["raw_dir"], source_id)


def raw_path(source_id: str, name: str) -> str:
    return os.path.join(source_dir(source_id), name)


def read_manifest(source_id: str) -> dict:
    path = os.path.join(source_dir(source_id), MANIFEST)
    if not os.path.exists(path):
        return {"source_id": source_id, "files": {}}
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def write_manifest(source_id: str, manifest: dict) -> None:
    os.makedirs(source_dir(source_id), exist_ok=True)
    path = os.path.join(source_dir(source_id), MANIFEST)
    with open(path + ".tmp", "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=1, sort_keys=True)
    os.replace(path + ".tmp", path)


def save_file(source_id: str, name: str, data: bytes, url: str) -> dict:
    """Store one raw file and record it in the manifest. Returns the manifest entry."""
    os.makedirs(source_dir(source_id), exist_ok=True)
    with open(raw_path(source_id, name), "wb") as fh:
        fh.write(data)
    m = read_manifest(source_id)
    entry = {"url": url, "retrieved_at": time.strftime("%Y-%m-%d"), "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}
    m["files"][name] = entry
    write_manifest(source_id, m)
    return entry


def retrieved_at(source_id: str) -> str:
    """Latest retrieval date of the source's files ("" when nothing is stored)."""
    dates = [f.get("retrieved_at", "") for f in read_manifest(source_id)["files"].values()]
    return max(dates) if dates else ""
