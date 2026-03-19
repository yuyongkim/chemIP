"""Shared helpers for route handlers."""

from __future__ import annotations

from fastapi import HTTPException


def handle_adapter_result(result: dict) -> dict:
    """Raise appropriate HTTPException for non-success adapter responses.

    All adapters return ``{"status": "success"|"error"|"disabled", ...}``.
    This function converts non-success statuses to HTTP errors so that
    every route handler doesn't have to repeat the same boilerplate.
    """
    status = result.get("status")
    if status == "disabled":
        raise HTTPException(
            status_code=503,
            detail=result.get("message", "API disabled"),
        )
    if status and status != "success":
        raise HTTPException(
            status_code=502,
            detail=result.get("message", "API Error"),
        )
    return result
