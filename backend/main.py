from collections import defaultdict, deque
from datetime import datetime, timezone
from threading import Lock
from time import time
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import os
import sys

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info(f"LOADING BACKEND FROM: {__file__}")
logger.info(f"CWD: {os.getcwd()}")

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.api.routes import ai, chemicals, docs, drugs, guides, patents, trade
from backend.config.settings import settings

app = FastAPI(title="ChemIP Platform API")

_rate_limit_lock = Lock()
_rate_limit_buckets: dict[str, deque[float]] = defaultdict(deque)

# Configure CORS (use settings for production flexibility)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def assign_request_id(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["x-request-id"] = request_id
    return response


@app.middleware("http")
async def apply_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' http://127.0.0.1:* http://localhost:* https:;"
    return response


@app.middleware("http")
async def apply_rate_limit(request: Request, call_next):
    if not settings.RATE_LIMIT_ENABLED:
        return await call_next(request)

    if request.url.path in {"/health", "/ready"}:
        return await call_next(request)

    key = request.client.host if request.client else "unknown"
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


@app.middleware("http")
async def log_request_summary(request: Request, call_next):
    started = time()
    response = await call_next(request)
    elapsed_ms = round((time() - started) * 1000, 2)
    request_id = getattr(request.state, "request_id", "") or request.headers.get("x-request-id", "")
    logger.info(
        "request_id=%s method=%s path=%s status=%s duration_ms=%s",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    request_id = getattr(request.state, "request_id", "")
    logger.error("Unhandled exception [request_id=%s]: %s", request_id, exc)
    traceback.print_exc()
    # Sanitise detail to avoid leaking secrets (API keys, DB paths, etc.)
    detail = type(exc).__name__
    return JSONResponse(
        status_code=500,
        content={
            "code": "INTERNAL_SERVER_ERROR",
            "message": "Unhandled server error",
            "detail": detail,
            "path": str(request.url.path),
            "request_id": request_id,
        },
    )

# Register Routers
app.include_router(chemicals.router, prefix="/api/chemicals", tags=["Chemicals"])
app.include_router(patents.router, prefix="/api/patents", tags=["Patents"])
app.include_router(trade.router, prefix="/api/trade", tags=["Trade"])
app.include_router(drugs.router, prefix="/api/drugs", tags=["Drugs"])
app.include_router(guides.router, prefix="/api/guides", tags=["Guides"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(docs.router, prefix="/api/docs", tags=["Docs"])


@app.get("/")
def read_root():
    return {"message": "Welcome to ChemIP Platform API"}


def _get_git_revision() -> str:
    """Best-effort short git hash for version tracking."""
    try:
        import subprocess
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            stderr=subprocess.DEVNULL,
            timeout=2,
        ).decode().strip()
    except Exception:
        return "unknown"


_GIT_REVISION = _get_git_revision()


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "chemip-backend",
        "version": _GIT_REVISION,
        "time": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/ready")
def readiness_check():
    checks = {
        "kotra_key_configured": bool(settings.KOTRA_SERVICE_KEY),
        "kipris_key_configured": bool(settings.KIPRIS_API_KEY),
        "drug_key_configured": bool(settings.DRUG_SERVICE_KEY),
        "cors_origins_configured": bool(settings.cors_origins_list),
        "rate_limit_enabled": settings.RATE_LIMIT_ENABLED,
    }
    return {
        "status": "ready",
        "checks": checks,
        "time": datetime.now(timezone.utc).isoformat(),
    }

