"""이용 집계 미들웨어. 정상 응답(200)인 물질 조회·수출입 규제 조회를 store 에 1씩 더한다.

집계가 실패해도 응답에는 영향을 주지 않는다. backend/main.py 에 한 줄로 등록한다.
"""
from __future__ import annotations

import logging

from fastapi import Request
from starlette.background import BackgroundTask
from starlette.concurrency import run_in_threadpool

from backend.usage import matcher, store

logger = logging.getLogger(__name__)


async def _increment_safely(metric: str, subject: str) -> None:
    try:
        await run_in_threadpool(store.increment, metric, subject)
    except Exception:  # pragma: no cover - 집계 실패는 기록만 하고 넘어간다
        logger.warning("usage counter failed for metric=%s", metric)


async def count_usage(request: Request, call_next):
    response = await call_next(request)
    hit = matcher.match(request.method, request.url.path)
    if hit and response.status_code == 200 and not matcher.is_bot(request.headers.get("user-agent", "")):
        # 응답 본문을 다 보낸 뒤에 센다. 집계 DB 커밋(느린 디스크에서 수백 ms)이 응답 시간을 잡아먹지 않게 한다.
        response.background = _chain(response.background, BackgroundTask(_increment_safely, *hit))
    return response


def _chain(existing: BackgroundTask | None, task: BackgroundTask) -> BackgroundTask:
    """이미 붙은 백그라운드 작업이 있으면 그것을 먼저 돌리고 집계를 돌린다."""
    if existing is None:
        return task

    async def run_both() -> None:
        await existing()
        await task()

    return BackgroundTask(run_both)
