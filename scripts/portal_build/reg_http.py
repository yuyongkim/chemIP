"""GET for the official change sources: fixed User-Agent, timeout, retries with backoff, size cap.

Responses are untrusted data: callers only parse them as JSON (json.loads) or XML (xml.etree, no external entities).
"""
from __future__ import annotations

import time
import urllib.parse
import urllib.request

import reg_config as C


def get(url: str, params: dict | list | None = None, max_bytes: int | None = None) -> bytes:
    """max_bytes overrides the default size cap (reg_config.MAX_DOWNLOAD_BYTES)."""
    cap = max_bytes or C.MAX_DOWNLOAD_BYTES
    if params:
        url = f"{url}?{urllib.parse.urlencode(params, doseq=True)}"
    last: Exception | None = None
    for attempt in range(1, C.HTTP_RETRIES + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": C.USER_AGENT, "Accept": "application/json, */*"})
            with urllib.request.urlopen(req, timeout=C.HTTP_TIMEOUT) as resp:
                data = resp.read(cap + 1)
            if len(data) > cap:
                raise ValueError(f"download exceeds cap: {url[:120]}")
            return data
        except ValueError:
            raise
        except Exception as exc:  # network / HTTP error: retry
            last = exc
            time.sleep(2 * attempt)
    raise RuntimeError(f"GET failed: {url[:160]}: {str(last)[:200]}")
