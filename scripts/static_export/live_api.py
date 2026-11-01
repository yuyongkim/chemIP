"""Gentle client for the PRODUCTION backend: one request at a time, >= API_GAP_SECONDS apart, bot UA (not counted)."""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request

import config

_last = [0.0]


def get(path: str, retries: int = 3) -> tuple[object, int]:
    """Retries connection errors and 5xx (e.g. a backend restart) with a growing pause."""
    for attempt in range(retries + 1):
        try:
            body, status = _get_once(path)
        except (urllib.error.URLError, ConnectionError, TimeoutError):
            if attempt == retries:
                raise
            time.sleep(5 * (attempt + 1))
            continue
        if status < 500 or attempt == retries:
            return body, status
        time.sleep(5 * (attempt + 1))
    raise AssertionError("unreachable")


def _get_once(path: str) -> tuple[object, int]:
    wait = config.API_GAP_SECONDS - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    req = urllib.request.Request(config.API + path, headers={"User-Agent": config.API_USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=config.API_TIMEOUT) as r:
            body, status = r.read(), r.status
    except urllib.error.HTTPError as e:
        body, status = e.read(), e.code
    finally:
        _last[0] = time.time()
    try:
        return json.loads(body or b"null"), status
    except ValueError:
        return {"_raw": body[:200].decode("utf-8", "replace")}, status


def q(value: str) -> str:
    return urllib.parse.quote(value, safe="")
