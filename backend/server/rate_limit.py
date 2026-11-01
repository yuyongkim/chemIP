"""In-memory sliding-window rate limit per client IP (settings.RATE_LIMIT_*). /health is never limited."""
from __future__ import annotations

from collections import defaultdict, deque
from threading import Lock
from time import time

from fastapi import Request
from fastapi.responses import JSONResponse

from backend.config.settings import settings
from backend.core.client_ip import client_ip

_rate_limit_lock = Lock()
_rate_limit_buckets: dict[str, deque[float]] = defaultdict(deque)


def _get_client_ip(request: Request) -> str:
    """Client address for rate limiting and logs — see backend/core/client_ip.py."""
    return client_ip(request)


async def apply_rate_limit(request: Request, call_next):
    if not settings.RATE_LIMIT_ENABLED:
        return await call_next(request)

    if request.url.path in {"/health"}:
        return await call_next(request)

    key = _get_client_ip(request)
    now = time()
    window = max(1, settings.RATE_LIMIT_WINDOW_SECONDS)
    limit = max(1, settings.RATE_LIMIT_MAX_REQUESTS)

    with _rate_limit_lock:
        bucket = _rate_limit_buckets[key]
        while bucket and now - bucket[0] > window:
            bucket.popleft()
        if len(bucket) >= limit:
            return JSONResponse(
                status_code=429,
                content={
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": "Too many requests",
                    "detail": f"Exceeded {limit} requests in {window}s window",
                    "path": request.url.path,
                },
            )
        bucket.append(now)

    return await call_next(request)
