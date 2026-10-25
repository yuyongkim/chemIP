"""요청을 보낸 클라이언트 주소 고르기 — 횟수 제한·로그가 함께 쓰는 한 가지 규칙.

운영 경로: 브라우저 → Cloudflare → cloudflared → Next(127.0.0.1:7000) → FastAPI(127.0.0.1:7011).
FastAPI 가 보는 소켓 상대는 늘 로컬 프록시(127.0.0.1)이므로, 그때만 Cloudflare 가 붙인
``CF-Connecting-IP`` 를 실제 주소로 믿는다. 그 밖의 경우(외부에서 백엔드 포트로 직접 접속)는
헤더를 무시하고 소켓 상대 주소를 쓴다. ``X-Forwarded-For`` 는 누구나 꾸밀 수 있어 쓰지 않는다.
"""
from __future__ import annotations

import ipaddress

from fastapi import Request

CF_HEADER = "cf-connecting-ip"


def _is_loopback(host: str) -> bool:
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return host == "localhost"


def _valid_ip(value: str) -> str:
    """헤더 값이 IP 형식일 때만 돌려준다(꾸민 긴 문자열로 버킷을 늘리지 못하게)."""
    try:
        return str(ipaddress.ip_address(value.strip()))
    except ValueError:
        return ""


def client_ip(request: Request) -> str:
    peer = request.client.host if request.client else ""
    if peer and _is_loopback(peer):
        forwarded = _valid_ip(request.headers.get(CF_HEADER, ""))
        if forwarded:
            return forwarded
    return peer or "unknown"
