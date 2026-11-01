"""Root, liveness and readiness routes. Detailed readiness checks are shown to localhost only."""
from __future__ import annotations

import subprocess
from datetime import datetime, timezone

from fastapi import APIRouter, Request

from backend.config.settings import settings
from backend.server.security import _is_localhost

router = APIRouter()


def _get_git_revision() -> str:
    """Best-effort short git hash for version tracking."""
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            stderr=subprocess.DEVNULL,
            timeout=2,
        ).decode().strip()
    except Exception:
        return "unknown"


_GIT_REVISION = _get_git_revision()


def _readiness_checks() -> dict:
    return {
        "kotra_key_configured": bool(settings.KOTRA_SERVICE_KEY),
        "kipris_key_configured": bool(settings.KIPRIS_API_KEY),
        "drug_key_configured": bool(settings.DRUG_SERVICE_KEY),
        "echa_available": True,
        "comptox_key_configured": bool(settings.COMPTOX_API_KEY),
        "rate_limit_enabled": settings.RATE_LIMIT_ENABLED,
    }


@router.get("/")
def read_root():
    return {"message": "Welcome to ChemIP Platform API"}


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "chemip-backend",
        "version": _GIT_REVISION,
        "time": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/ready")
def readiness_check(request: Request):
    # Only expose detailed checks to localhost
    if _is_localhost(request):
        return {
            "status": "ready",
            "checks": _readiness_checks(),
            "time": datetime.now(timezone.utc).isoformat(),
        }
    return {"status": "ready", "time": datetime.now(timezone.utc).isoformat()}
