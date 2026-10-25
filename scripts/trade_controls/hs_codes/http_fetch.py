"""Minimal HTTP helpers (stdlib only): GET/POST with cookies, retries and a size cap.

Downloaded bytes are written to a fresh per-source directory under RAW_ROOT and
are never executed or imported.
"""
from __future__ import annotations

import http.cookiejar
import time
import urllib.parse
import urllib.request
from pathlib import Path

from . import config


class Session:
    """A cookie-keeping opener. One per source so cookies never leak across sources."""

    def __init__(self) -> None:
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))

    def request(self, url: str, data: dict | None = None, headers: dict | None = None) -> bytes:
        body = urllib.parse.urlencode(data).encode() if data is not None else None
        hdrs = {"User-Agent": config.USER_AGENT}
        hdrs.update(headers or {})
        last_err: Exception | None = None
        for attempt in range(1, config.HTTP_RETRIES + 1):
            try:
                req = urllib.request.Request(url, data=body, headers=hdrs)
                with self.opener.open(req, timeout=config.HTTP_TIMEOUT) as resp:
                    chunks, total = [], 0
                    while True:
                        chunk = resp.read(1 << 20)
                        if not chunk:
                            break
                        total += len(chunk)
                        if total > config.MAX_DOWNLOAD_BYTES:
                            raise ValueError(f"download exceeds cap: {url}")
                        chunks.append(chunk)
                    return b"".join(chunks)
            except ValueError:
                raise
            except Exception as exc:  # network errors: retry with backoff
                last_err = exc
                time.sleep(2 * attempt)
        raise RuntimeError(f"GET/POST failed after retries: {url}: {last_err}")


def save_raw(source: str, filename: str, payload: bytes) -> Path:
    """Write payload to RAW_ROOT/<source>/<retrieved>/<filename> and return the path."""
    target_dir = config.RAW_ROOT / source / config.RETRIEVED
    target_dir.mkdir(parents=True, exist_ok=True)
    path = target_dir / filename
    path.write_bytes(payload)
    return path
