"""익명 이용 집계 조회 (/api/usage). 집계 자체는 backend/usage/middleware.py 가 한다."""
from __future__ import annotations

from fastapi import APIRouter, Query

from backend.usage import store

router = APIRouter()


@router.get("/summary")
def usage_summary(days: int = Query(30, ge=1, le=366), top: int = Query(10, ge=0, le=50)):
    return store.summary(days=days, top=top)
