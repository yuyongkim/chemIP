"""Global exception handler: log the error, answer 500 with only the exception type (no secrets, no paths)."""
from __future__ import annotations

import logging
import traceback

from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("backend.main")  # same logger name as before the split


async def global_exception_handler(request: Request, exc: Exception):
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
