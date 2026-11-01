"""JSON serialisation, file writing and size accounting for every exported file."""
from __future__ import annotations

import gzip
import json
import os


def dumps(obj) -> bytes:
    """Compact UTF-8 JSON, the exact bytes a static file holds."""
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def gz(data: bytes, level: int = 9) -> bytes:
    return gzip.compress(data, level, mtime=0)  # mtime=0: identical input -> identical bytes


def write_plain(path: str, obj) -> tuple[int, int]:
    """Write plain JSON. Returns (raw bytes, gzip bytes)."""
    data = dumps(obj)
    _write(path, data)
    return len(data), len(gz(data))


def write_gzip(path: str, obj, level: int = 9) -> tuple[int, int]:
    """Write gzip-compressed JSON (file keeps its .json name). Returns (raw bytes, gzip bytes)."""
    data = dumps(obj)
    packed = gz(data, level)
    _write(path, packed)
    return len(data), len(packed)


def read_any(path: str):
    """Read a file written by write_plain or write_gzip."""
    with open(path, "rb") as fh:
        data = fh.read()
    if data[:2] == b"\x1f\x8b":
        data = gzip.decompress(data)
    return json.loads(data)


def _write(path: str, data: bytes) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as fh:
        fh.write(data)


class SizeStats:
    """Per-kind file count and byte totals."""

    def __init__(self):
        self.by_kind: dict[str, dict[str, int]] = {}

    def add(self, kind: str, raw: int, packed: int) -> None:
        s = self.by_kind.setdefault(kind, {"files": 0, "raw": 0, "gz": 0, "max_raw": 0, "max_gz": 0})
        s["files"] += 1
        s["raw"] += raw
        s["gz"] += packed
        s["max_raw"] = max(s["max_raw"], raw)
        s["max_gz"] = max(s["max_gz"], packed)

    def merge(self, other: dict[str, dict[str, int]]) -> None:
        for kind, o in other.items():
            s = self.by_kind.setdefault(kind, {"files": 0, "raw": 0, "gz": 0, "max_raw": 0, "max_gz": 0})
            for k in ("files", "raw", "gz"):
                s[k] += o[k]
            for k in ("max_raw", "max_gz"):
                s[k] = max(s[k], o[k])

    def total(self) -> dict[str, int]:
        return {k: sum(s[k] for s in self.by_kind.values()) for k in ("files", "raw", "gz")}

    def to_dict(self) -> dict:
        return {"by_kind": self.by_kind, "total": self.total()}
