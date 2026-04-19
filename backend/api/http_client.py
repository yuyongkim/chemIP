"""Shared HTTP client with retry, session pooling, and structured logging.

All external-facing adapters should use ``get_http_session()`` instead of
calling ``requests.get()`` directly.  This ensures:

* Connection pooling via ``requests.Session``
* Automatic retries with exponential back-off (honours settings)
* Consistent timeout handling
* A single place to toggle SSL verification or add default headers
"""

from __future__ import annotations

import logging
from threading import Lock
from time import time
from typing import Any
from urllib.parse import urlencode

import requests
from requests.adapters import HTTPAdapter
from requests.structures import CaseInsensitiveDict
from urllib3.util.retry import Retry

from backend.config.settings import settings

logger = logging.getLogger(__name__)

_session: requests.Session | None = None
_cache_lock = Lock()
_response_cache: dict[str, tuple[float, int, bytes, dict[str, str], str, str | None]] = {}


def get_http_session(
    *,
    max_retries: int | None = None,
    backoff_factor: float | None = None,
    status_forcelist: tuple[int, ...] = (502, 503, 504),
) -> requests.Session:
    """Return a module-level ``requests.Session`` with retry middleware.

    The session is created lazily and reused across calls so that
    underlying TCP connections are pooled.
    """
    global _session
    if _session is not None:
        return _session

    retries = max_retries if max_retries is not None else settings.HTTP_MAX_RETRIES
    backoff = backoff_factor if backoff_factor is not None else settings.HTTP_BACKOFF_FACTOR

    retry_strategy = Retry(
        total=retries,
        backoff_factor=backoff,
        status_forcelist=status_forcelist,
        allowed_methods=["GET", "HEAD", "OPTIONS"],
        raise_on_status=False,
    )

    adapter = HTTPAdapter(
        max_retries=retry_strategy,
        pool_connections=10,
        pool_maxsize=20,
    )

    session = requests.Session()
    session.mount("https://", adapter)
    session.mount("http://", adapter)

    _session = session
    logger.info(
        "HTTP session initialised (retries=%s, backoff=%.1f, pool=10/20)",
        retries,
        backoff,
    )
    return _session


# SSRF protection: only allow requests to known external API hosts
_ALLOWED_HOSTS = frozenset({
    "msds.kosha.or.kr",
    "apis.data.go.kr",
    "plus.kipris.or.kr",
    "open.fda.gov",
    "api.fda.gov",
    "eutils.ncbi.nlm.nih.gov",
    "openapi.naver.com",
    "echa.europa.eu",
    "comptox.epa.gov",
    "www.cdc.gov",
    "localhost",
    "127.0.0.1",
})


def _validate_url(url: str) -> None:
    """Raise ValueError if URL host is not in the allow-list."""
    from urllib.parse import urlparse
    parsed = urlparse(url)
    host = parsed.hostname or ""
    if host not in _ALLOWED_HOSTS:
        raise ValueError(f"SSRF blocked: requests to '{host}' are not allowed")


def _build_cache_key(url: str, params: dict[str, Any] | None) -> str:
    if not params:
        return url
    flattened: list[tuple[str, str]] = []
    for key in sorted(params):
        value = params[key]
        if isinstance(value, (list, tuple)):
            for item in value:
                flattened.append((str(key), str(item)))
        else:
            flattened.append((str(key), str(value)))
    return f"{url}?{urlencode(flattened, doseq=True)}"


def _clone_response(
    *,
    url: str,
    status_code: int,
    body: bytes,
    headers: dict[str, str],
    reason: str | None = None,
) -> requests.Response:
    response = requests.Response()
    response.status_code = status_code
    response._content = body
    response.url = url
    response.reason = reason
    response.headers = CaseInsensitiveDict(headers)
    response.encoding = response.apparent_encoding or "utf-8"
    return response


def safe_get(
    url: str,
    *,
    params: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    timeout: int | None = None,
    verify: bool = True,
    use_cache: bool | None = None,
    cache_ttl: int | None = None,
) -> requests.Response:
    """Convenience wrapper around ``session.get()`` with default timeout."""
    _validate_url(url)
    cache_enabled = settings.HTTP_CACHE_ENABLED if use_cache is None else use_cache
    ttl_seconds = max(1, cache_ttl or settings.HTTP_CACHE_TTL_SECONDS)
    cache_key = _build_cache_key(url, params)

    if cache_enabled:
        with _cache_lock:
            cached = _response_cache.get(cache_key)
            if cached and cached[0] > time():
                logger.info("HTTP cache hit url=%s", cache_key)
                return _clone_response(
                    url=cached[4],
                    status_code=cached[1],
                    body=cached[2],
                    headers=cached[3],
                    reason=cached[5],
                )

    session = get_http_session()
    response = session.get(
        url,
        params=params,
        headers=headers,
        timeout=timeout or settings.HTTP_TIMEOUT_SECONDS,
        verify=verify,
    )
    if cache_enabled and response.ok:
        with _cache_lock:
            _response_cache[cache_key] = (
                time() + ttl_seconds,
                response.status_code,
                bytes(response.content),
                dict(response.headers),
                response.url,
                response.reason,
            )
    return response
