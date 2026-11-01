"""Raw-response store for the law corpus: data/portal_raw/law/<path>.json.gz + manifest.json.

manifest.json: {"files": {<relative path>: {url (OC masked), sha256, bytes, fetched_at}}}. Bodies arrive already
masked by law_api (the search answers echo the OC in their links); sha256 is of the stored, masked body.
Layout:
  body/<kind>/<serial>.json.gz          one version's full text (never refetched once present)
  search/<kind>/<name key>.json.gz      latest lawSearch answer for the 현행 pick (overwritten each run)
  history/<kind>/<law_id>_p<n>.json.gz  latest history pages (overwritten each run)
"""
from __future__ import annotations

import datetime as dt
import gzip
import hashlib
import json
import os

import law_config as C


class RawStore:
    def __init__(self, root: str = C.RAW_DIR):
        self.root = root
        self.manifest_path = os.path.join(root, "manifest.json")
        self.manifest = self._read()

    def _read(self) -> dict:
        try:
            with open(self.manifest_path, encoding="utf-8") as fh:
                return json.load(fh)
        except (OSError, ValueError):
            return {"about": "법제처 OPEN API raw answers; url has OC masked; sha256 of the stored (masked) body",
                    "files": {}}

    @staticmethod
    def body_path(kind: str, serial: str) -> str:
        return f"body/{kind}/{serial}.json.gz"

    @staticmethod
    def search_path(kind: str, key: str) -> str:
        return f"search/{kind}/{key}.json.gz"

    @staticmethod
    def history_path(kind: str, law_id: str, page: int) -> str:
        return f"history/{kind}/{law_id}_p{page}.json.gz"

    def has(self, rel: str) -> bool:
        return rel in self.manifest["files"] and os.path.exists(os.path.join(self.root, *rel.split("/")))

    def save(self, rel: str, body: bytes, url: str) -> dict:
        path = os.path.join(self.root, *rel.split("/"))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path + ".tmp", "wb") as fh:
            fh.write(gzip.compress(body, 9, mtime=0))
        os.replace(path + ".tmp", path)
        entry = {"url": url, "sha256": hashlib.sha256(body).hexdigest(), "bytes": len(body),
                 "fetched_at": dt.datetime.now().astimezone().isoformat(timespec="seconds")}
        self.manifest["files"][rel] = entry
        return entry

    def read(self, rel: str) -> bytes:
        with open(os.path.join(self.root, *rel.split("/")), "rb") as fh:
            return gzip.decompress(fh.read())

    def read_json(self, rel: str) -> dict:
        return json.loads(self.read(rel).decode("utf-8"))

    def write_manifest(self) -> None:
        os.makedirs(self.root, exist_ok=True)
        with open(self.manifest_path + ".tmp", "w", encoding="utf-8") as fh:
            json.dump(self.manifest, fh, ensure_ascii=False, indent=1, sort_keys=True)
        os.replace(self.manifest_path + ".tmp", self.manifest_path)
