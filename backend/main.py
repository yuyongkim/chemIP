"""ChemIP FastAPI entry point: builds ``app`` from backend/server/* and the router table. No request logic here.

Middleware is registered in the original order (Starlette runs the last registered one first), so request
handling is unchanged. Run: uvicorn backend.main:app
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

from backend.config.settings import settings  # noqa: E402
from backend.server import health  # noqa: E402
from backend.server.errors import global_exception_handler  # noqa: E402
from backend.server.rate_limit import _get_client_ip, _rate_limit_buckets, _rate_limit_lock, apply_rate_limit  # noqa: E402,F401
from backend.server.request_log import _audit_logger, assign_request_id, log_request_summary  # noqa: E402,F401
from backend.server.routers import API_ROUTERS  # noqa: E402
from backend.server.security import (  # noqa: E402,F401  (old names kept importable from backend.main)
    _ALLOWED_ORIGINS,
    _LOCALHOST_PREFIXES,
    _PUBLIC_PATHS,
    _is_localhost,
    apply_api_key_auth,
    apply_csrf_check,
    apply_security_headers,
)
from backend.usage.middleware import count_usage  # noqa: E402

app = FastAPI(title="ChemIP Platform API")

# Configure CORS — restrict methods and headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["x-api-key", "x-request-id", "content-type"],
)

for _middleware in (assign_request_id, apply_csrf_check, apply_api_key_auth, apply_security_headers,
                    apply_rate_limit, log_request_summary):
    app.middleware("http")(_middleware)

app.exception_handler(Exception)(global_exception_handler)

# Register Routers
for _module, _prefix, _tag in API_ROUTERS:
    app.include_router(_module.router, prefix=_prefix, tags=[_tag])

# 익명 이용 집계(물질 조회·수출입 규제 조회 횟수만, 개인 정보 없음) — backend/usage/
app.middleware("http")(count_usage)

# /, /health, /ready (registered after the API routers, as before)
app.include_router(health.router)
_GIT_REVISION = health._GIT_REVISION
