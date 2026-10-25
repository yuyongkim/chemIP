"""Shared helpers: download, CAS check-digit validation, text cleanup, JSON output.

Downloaded documents are untrusted data. They are only read as bytes/text and
parsed with regular expressions or pdfplumber; nothing from them is executed.
"""
from __future__ import annotations

import hashlib
import html
import json
import re
import time
import urllib.request
from pathlib import Path

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/130.0 Safari/537.36"
)
STALE: set[str] = set()  # raw files reused because a fresh download failed
CAS_RE = re.compile(r"^(\d{2,7})-(\d{2})-(\d)$")


# ---------------------------------------------------------------- download
def fetch(url: str, dest: Path, offline: bool = False, retries: int = 3, timeout: int = 90) -> Path:
    """Download url to dest (overwrite). With offline=True reuse the existing file."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    if offline:
        if not dest.exists():
            raise FileNotFoundError(f"offline mode but raw file missing: {dest}")
        return dest
    last_err: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": USER_AGENT,
                "Accept": "text/html,application/xhtml+xml,application/xml,application/pdf;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9,ko;q=0.8",
            })
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = resp.read()
            if not data:
                raise IOError("empty response")
            dest.write_bytes(data)
            return dest
        except Exception as exc:  # network errors are retried
            last_err = exc
            time.sleep(2 * attempt)
    if dest.exists():
        # Keep the previously downloaded copy; callers record its sha256 and mtime.
        print(f"WARNING: download failed, reusing existing raw file {dest}: {last_err}")
        STALE.add(str(dest))
        return dest
    raise RuntimeError(f"download failed: {url}: {last_err}")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


# ---------------------------------------------------------------- CAS
def cas_is_valid(cas: str) -> bool:
    """CAS RN check digit: sum(digit_i * i) over the reversed body, mod 10."""
    m = CAS_RE.match(cas or "")
    if not m:
        return False
    body = (m.group(1) + m.group(2))[::-1]
    total = sum(int(d) * (i + 1) for i, d in enumerate(body))
    return total % 10 == int(m.group(3))


def normalize_cas(raw: str) -> str:
    return (raw or "").strip().strip("()").strip().rstrip(";").strip()


# ---------------------------------------------------------------- text
def html_to_text(fragment: str) -> str:
    text = re.sub(r"<[^>]+>", "", fragment)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def strip_cdata(xml_text: str) -> str:
    return re.sub(r"<!\[CDATA\[|\]\]>", "", xml_text)


def name_key(name: str) -> str:
    """Loose key for name matching: lowercase alphanumerics, sulph->sulf."""
    s = name.lower().replace("sulph", "sulf").replace("alplha", "alpha")
    return re.sub(r"[^a-z0-9]", "", s)


# ---------------------------------------------------------------- output
def write_json(path: Path, obj: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def cas_report(entries: list[dict]) -> dict:
    bad = [e["cas"] for e in entries if e.get("cas") and not cas_is_valid(e["cas"])]
    return {"entries_with_cas": sum(1 for e in entries if e.get("cas")), "cas_checksum_failures": bad}
