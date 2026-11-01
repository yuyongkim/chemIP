"""Request id header, one-line request summary log, and the structured audit log (logs/audit.log) for /api/*."""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from time import time
from uuid import uuid4

from fastapi import Request

from backend.config.settings import PROJECT_ROOT
from backend.server.rate_limit import _get_client_ip

logger = logging.getLogger("backend.main")  # same logger name as before the split

# Audit logger (separate from request log — structured for compliance)
# Wrapped defensively: a filesystem hiccup while attaching the file handler
# must never crash import/startup (which would trip PM2's restart limit and
# take the backend permanently offline). Fall back to console logging instead.
_audit_logger = logging.getLogger("chemip.audit")
_audit_logger.setLevel(logging.INFO)
try:
    _audit_log_dir = os.path.join(PROJECT_ROOT, "logs")
    os.makedirs(_audit_log_dir, exist_ok=True)
    _audit_handler = logging.FileHandler(os.path.join(_audit_log_dir, "audit.log"))
    _audit_handler.setFormatter(logging.Formatter("%(message)s"))
    _audit_logger.addHandler(_audit_handler)
except Exception:  # pragma: no cover - defensive startup guard
    logger.exception("Failed to initialise audit file logger; continuing without it")


async def assign_request_id(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["x-request-id"] = request_id
    return response


def _audit_line(request: Request, status_code: int, request_id: str, ip: str, elapsed_ms: float) -> str:
    return json.dumps({
        "ts": datetime.now(timezone.utc).isoformat(),
        "rid": request_id,
        "ip": ip,
        "method": request.method,
        "path": request.url.path,
        "query": str(request.url.query),
        "status": status_code,
        "ms": elapsed_ms,
        "ua": request.headers.get("user-agent", "")[:100],
    }, ensure_ascii=False)


async def log_request_summary(request: Request, call_next):
    started = time()
    response = await call_next(request)
    elapsed_ms = round((time() - started) * 1000, 2)
    request_id = getattr(request.state, "request_id", "") or request.headers.get("x-request-id", "")
    ip = _get_client_ip(request)
    logger.info(
        "request_id=%s method=%s path=%s status=%s duration_ms=%s ip=%s",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
        ip,
    )
    # Audit log for API calls (structured JSON line)
    if request.url.path.startswith("/api/"):
        _audit_logger.info(_audit_line(request, response.status_code, request_id, ip, elapsed_ms))
    return response
