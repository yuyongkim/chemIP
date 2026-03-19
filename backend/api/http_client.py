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
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from backend.config.settings import settings

logger = logging.getLogger(__name__)

_session: requests.Session | None = None


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


def safe_get(
    url: str,
    *,
    params: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    timeout: int | None = None,
    verify: bool = True,
) -> requests.Response:
    """Convenience wrapper around ``session.get()`` with default timeout."""
    session = get_http_session()
    return session.get(
        url,
        params=params,
        headers=headers,
        timeout=timeout or settings.HTTP_TIMEOUT_SECONDS,
        verify=verify,
    )
