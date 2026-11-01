"""Access control middleware: CSRF origin check, API-key auth for non-localhost callers, security headers."""
from __future__ import annotations

import logging

from fastapi import Request
from fastapi.responses import JSONResponse

from backend.config.settings import settings

logger = logging.getLogger("backend.main")  # same logger name as before the split

_LOCALHOST_PREFIXES = ("127.0.0.1", "::1", "localhost")

# Public paths that never require API key auth
_PUBLIC_PATHS = {"/", "/health"}

_ALLOWED_ORIGINS = {"https://chemip.yule.pics", "http://localhost:7000", "http://127.0.0.1:7000"}

# Added to every response, in this order.
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Content-Security-Policy": (
        "default-src 'self'; "
        "img-src 'self' data: https:; "
        "style-src 'self' 'unsafe-inline'; "
        "script-src 'self'; "
        "connect-src 'self' https://chemip.yule.pics; "
        "frame-ancestors 'none';"
    ),
}


def _is_localhost(request: Request) -> bool:
    """Check if the TCP connection originates from localhost.

    Next.js rewrite proxy connects from 127.0.0.1 but forwards
    Cloudflare headers (cf-connecting-ip, x-forwarded-for).
    We trust the TCP-level client IP, not the headers, for auth bypass.
    """
    host = request.client.host if request.client else ""
    return any(host.startswith(p) for p in _LOCALHOST_PREFIXES) or host == "testclient"


async def apply_csrf_check(request: Request, call_next):
    """Block cross-origin state-changing requests without valid Origin."""
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return await call_next(request)
    if _is_localhost(request):
        return await call_next(request)
    origin = request.headers.get("origin", "")
    if origin and origin not in _ALLOWED_ORIGINS:
        return JSONResponse(
            status_code=403,
            content={"code": "CSRF_REJECTED", "message": "Cross-origin request blocked"},
        )
    return await call_next(request)


async def apply_api_key_auth(request: Request, call_next):
    """Require API key for non-localhost requests to /api/* endpoints."""
    if request.method == "OPTIONS":
        return await call_next(request)

    if request.url.path in _PUBLIC_PATHS:
        return await call_next(request)

    if _is_localhost(request):
        return await call_next(request)

    api_key = settings.CHEMIP_API_KEY
    if not api_key:
        # No key configured = auth disabled (dev mode)
        return await call_next(request)

    provided = request.headers.get("x-api-key") or request.query_params.get("api_key")
    if provided != api_key:
        client_host = request.client.host if request.client else "none"
        logger.warning("AUTH_REJECTED path=%s client_host=%s is_local=%s cf_ip=%s",
                       request.url.path, client_host, _is_localhost(request),
                       request.headers.get("cf-connecting-ip", ""))
        return JSONResponse(
            status_code=401,
            content={"code": "UNAUTHORIZED", "message": "Invalid or missing API key"},
        )

    return await call_next(request)


async def apply_security_headers(request: Request, call_next):
    response = await call_next(request)
    for name, value in SECURITY_HEADERS.items():
        response.headers[name] = value
    return response
