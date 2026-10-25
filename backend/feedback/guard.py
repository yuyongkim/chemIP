"""요청 게시판 쓰기 보호: 접속 주소별 글쓰기 횟수 제한(메모리)과 관리자 토큰 확인.

접속 주소는 해시로만 메모리에 들고 있고 저장·기록하지 않는다.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from collections import defaultdict, deque
from threading import Lock
from time import time

from fastapi import Request

from backend.core.client_ip import client_ip  # 접속 주소 규칙은 한 곳(main.py 와 공용)

ADMIN_TOKEN_ENV = "CHEMIP_ADMIN_TOKEN"
ADMIN_HEADER = "x-admin-token"

# 같은 주소에서 WINDOW_SECONDS 동안 MAX_POSTS 건까지 받는다.
WINDOW_SECONDS = 600
MAX_POSTS = 5

_SALT = secrets.token_bytes(16)  # 프로세스마다 새로 만들어, 해시를 밖에서 되짚을 수 없게 한다
_lock = Lock()
_buckets: dict[str, deque[float]] = defaultdict(deque)


def _key(ip: str) -> str:
    return hashlib.sha256(_SALT + ip.encode("utf-8")).hexdigest()


def allow_post(request: Request, now: float | None = None) -> bool:
    """이번 글쓰기를 받아도 되면 True 를 돌려주고 횟수에 더한다."""
    now = time() if now is None else now
    key = _key(client_ip(request))
    with _lock:
        bucket = _buckets[key]
        while bucket and now - bucket[0] > WINDOW_SECONDS:
            bucket.popleft()
        if len(bucket) >= MAX_POSTS:
            return False
        bucket.append(now)
        return True


def reset_rate_limit() -> None:
    """테스트용: 횟수 기록을 비운다."""
    with _lock:
        _buckets.clear()


def admin_token_configured() -> bool:
    return bool(os.getenv(ADMIN_TOKEN_ENV, "").strip())


def is_admin(request: Request) -> bool:
    expected = os.getenv(ADMIN_TOKEN_ENV, "").strip()
    provided = request.headers.get(ADMIN_HEADER, "").strip()
    return bool(expected) and hmac.compare_digest(expected.encode("utf-8"), provided.encode("utf-8"))
