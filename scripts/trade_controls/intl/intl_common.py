"""Shared helpers for the destination-country list collectors.

CAS check digit, JSON writing and text cleanup come from controlled_lists/common.py (one definition).
Here: a download that accepts extra headers, file provenance, and entry helpers.
Downloaded documents are untrusted data: they are only read and parsed, never executed.
"""
from __future__ import annotations

import datetime as dt
import re
import time
import urllib.request
from pathlib import Path

from controlled_lists.common import USER_AGENT, cas_is_valid, html_to_text, sha256, write_json  # noqa: F401

CAS_TOKEN = re.compile(r"\b\d{2,7}-\d{2}-\d\b")
STALE: set[str] = set()


def fetch(url: str, dest: Path, offline: bool = False, headers: dict | None = None,
          retries: int = 3, timeout: int = 120, data: bytes | None = None) -> Path:
    """Download url to dest. offline=True reuses dest. A failed download falls back to an existing copy."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    if offline:
        if not dest.exists():
            raise FileNotFoundError(f"offline mode but raw file missing: {dest}")
        return dest
    last: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": USER_AGENT, **(headers or {})})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = resp.read()
            if not body:
                raise IOError("empty response")
            dest.write_bytes(body)
            return dest
        except Exception as exc:  # network errors are retried
            last = exc
            time.sleep(2 * attempt)
    if dest.exists():
        print(f"WARNING: download failed, reusing existing raw file {dest}: {last}")
        STALE.add(str(dest))
        return dest
    raise RuntimeError(f"download failed: {url}: {last}")


def file_info(path: Path, url: str) -> dict:
    st = path.stat()
    info = {"path": str(path), "url": url, "sha256": sha256(path), "bytes": st.st_size,
            "file_mtime": dt.datetime.fromtimestamp(st.st_mtime).isoformat(timespec="seconds")}
    if str(path) in STALE:
        info["stale"] = "fresh download failed on this run; previous copy reused"
    return info


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def cas_tokens(text: str) -> list[str]:
    """Every CAS-shaped token in text, in order, without duplicates."""
    out: list[str] = []
    for tok in CAS_TOKEN.findall(text or ""):
        if tok not in out:
            out.append(tok)
    return out


def entry(cas: str, name: str, detail: str = "", **extra) -> dict:
    item = {"cas": cas, "name": clean(name), "detail": clean(detail)}
    item.update({k: v for k, v in extra.items() if v not in (None, "", [])})
    return item


def split_entries(rows: list[dict]) -> tuple[list[dict], list[dict], list[str]]:
    """Rows with a valid CAS -> entries; rows without CAS -> family_entries; bad check digits -> problems.

    A row may carry several CAS numbers in 'cas_all'; each valid one becomes its own entry.
    """
    entries: list[dict] = []
    families: list[dict] = []
    bad: list[str] = []
    for row in rows:
        all_cas = row.pop("cas_all", None) or ([row["cas"]] if row.get("cas") else [])
        good = [c for c in all_cas if cas_is_valid(c)]
        bad.extend(f"{c} ({row.get('name', '')[:60]})" for c in all_cas if not cas_is_valid(c))
        if not good:
            families.append({**row, "cas": ""})
            continue
        for c in good:
            entries.append({**row, "cas": c})
    return entries, families, bad
