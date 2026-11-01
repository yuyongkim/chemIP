"""Raw-file store for the OEL sources: paths, manifest (url, retrieved_at, sha256) and the source registry.

Every downloaded file lives in data/portal_raw/oel/<source_id>/ next to manifest.json, so a parser can always say
which file and which retrieval date its rows came from. Source definitions: oel_sources.json (one place).
"""
from __future__ import annotations

import gzip
import hashlib
import json
import os
import time

REGISTRY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "oel_sources.json")
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


def save_file(source_id: str, name: str, data: bytes, url: str, manifest: dict | None = None) -> dict:
    """Store one raw file (gzip on disk when the name ends in .gz) and record it in the manifest."""
    os.makedirs(source_dir(source_id), exist_ok=True)
    path = os.path.join(source_dir(source_id), name)
    with open(path, "wb") as fh:
        fh.write(gzip.compress(data, 9, mtime=0) if name.endswith(".gz") else data)
    m = manifest if manifest is not None else read_manifest(source_id)
    m["files"][name] = {"url": url, "retrieved_at": time.strftime("%Y-%m-%d"), "sha256": hashlib.sha256(data).hexdigest(),
                        "bytes": len(data)}
    if manifest is None:
        write_manifest(source_id, m)
    return m


def read_file(source_id: str, name: str) -> bytes:
    with open(os.path.join(source_dir(source_id), name), "rb") as fh:
        data = fh.read()
    return gzip.decompress(data) if name.endswith(".gz") else data


def raw_path(source_id: str, name: str) -> str:
    return os.path.join(source_dir(source_id), name)


def retrieved_at(source_id: str) -> str:
    """Latest retrieval date of the source's files ('' when nothing was fetched)."""
    dates = [f.get("retrieved_at", "") for f in read_manifest(source_id)["files"].values()]
    return max(dates) if dates else ""
