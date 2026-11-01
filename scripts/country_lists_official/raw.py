"""Raw-file store for the official-source country lists: registry (sources.json), download, manifest.

Each source keeps its files in <raw_dir>/<source>/ next to manifest.json {file: {url, retrieved_at, sha256, bytes}},
so every loaded row can name the file and date it came from. Offline mode reads what is already there.
eCFR URLs carry the title's current "up to date as of" date ({ecfr49}, {ecfr40}), read from the eCFR titles API.
"""
from __future__ import annotations

import gzip
import hashlib
import json
import os
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REGISTRY = os.path.join(HERE, "sources.json")
MANIFEST = "manifest.json"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ChemIP-regulatory-lists/1.0 (+https://chemip.yule.pics)"
ECFR_TITLES = "https://www.ecfr.gov/api/versioner/v1/titles.json"


def registry() -> dict:
    with open(REGISTRY, encoding="utf-8") as fh:
        return json.load(fh)


def source(name: str) -> dict:
    return registry()["sources"][name]


def source_dir(name: str) -> str:
    return os.path.join(registry()["raw_dir"], name)


def path(name: str, file: str) -> str:
    return os.path.join(source_dir(name), file)


def read_manifest(name: str) -> dict:
    p = path(name, MANIFEST)
    if not os.path.exists(p):
        return {"source": name, "files": {}}
    with open(p, encoding="utf-8") as fh:
        return json.load(fh)


def write_manifest(name: str, manifest: dict) -> None:
    os.makedirs(source_dir(name), exist_ok=True)
    p = path(name, MANIFEST)
    with open(p + ".tmp", "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=1, sort_keys=True)
    os.replace(p + ".tmp", p)


def http_get(url: str, timeout: int = 300) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept-Encoding": "gzip"})
    last: Exception | None = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = r.read()
                return gzip.decompress(data) if r.headers.get("Content-Encoding") == "gzip" else data
        except Exception as exc:  # retried, then raised
            last = exc
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"download failed: {url}: {last}")


def ecfr_dates() -> dict[str, str]:
    titles = json.loads(http_get(ECFR_TITLES, 60))["titles"]
    return {f"ecfr{t['number']}": t["up_to_date_as_of"] for t in titles if t.get("up_to_date_as_of")}


def fetch_source(name: str, offline: bool = False) -> dict:
    """Download every file of a source (or, offline, check they exist). Returns the manifest."""
    files = source(name).get("files") or {}
    manifest = read_manifest(name)
    if offline:
        missing = [f for f in files if not os.path.exists(path(name, f))]
        if missing:
            raise FileNotFoundError(f"{name}: offline but raw files missing: {missing}")
        return manifest
    fill = ecfr_dates() if any("{ecfr" in u for u in files.values()) else {}
    os.makedirs(source_dir(name), exist_ok=True)
    for file, template in files.items():
        url = template.format(**fill)
        data = http_get(url)
        if data[:15].lstrip().lower().startswith((b"<!doctype html", b"<html")) and not file.endswith(".html"):
            raise RuntimeError(f"{name}/{file}: got an HTML page instead of the file ({url})")
        with open(path(name, file), "wb") as fh:
            fh.write(data)
        manifest["files"][file] = {"url": url, "retrieved_at": time.strftime("%Y-%m-%d"),
                                   "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}
    write_manifest(name, manifest)
    return manifest


def read_bytes(name: str, file: str) -> bytes:
    with open(path(name, file), "rb") as fh:
        return fh.read()


def retrieved(name: str, file: str) -> str:
    return (read_manifest(name)["files"].get(file) or {}).get("retrieved_at", "")
