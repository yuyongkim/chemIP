"""클라이언트 주소 규칙(backend/core/client_ip.py)과 전역 횟수 제한 미들웨어 테스트.

CF-Connecting-IP 는 소켓 상대가 로컬 프록시(127.0.0.1·::1)일 때만 믿고, X-Forwarded-For 는 쓰지 않는다.
"""
import pytest
from fastapi.testclient import TestClient
from starlette.requests import Request

import backend.main as main
from backend.config.settings import settings
from backend.core.client_ip import client_ip


def _req(peer, headers=None):
    scope = {
        "type": "http", "method": "GET", "path": "/", "query_string": b"",
        "headers": [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()],
        "client": (peer, 1234) if peer else None,
    }
    return Request(scope)


@pytest.mark.parametrize("peer", ["127.0.0.1", "::1"])
def test_cf_header_trusted_from_local_proxy(peer):
    assert client_ip(_req(peer, {"cf-connecting-ip": "203.0.113.9"})) == "203.0.113.9"


def test_cf_header_ignored_from_remote_peer():
    assert client_ip(_req("198.51.100.4", {"cf-connecting-ip": "203.0.113.9"})) == "198.51.100.4"


def test_x_forwarded_for_never_trusted():
    assert client_ip(_req("127.0.0.1", {"x-forwarded-for": "10.0.0.1"})) == "127.0.0.1"
    assert client_ip(_req("198.51.100.4", {"x-forwarded-for": "10.0.0.1"})) == "198.51.100.4"


def test_malformed_cf_header_falls_back_to_peer():
    assert client_ip(_req("127.0.0.1", {"cf-connecting-ip": "not-an-ip"})) == "127.0.0.1"


def test_no_client_info():
    assert client_ip(_req(None)) == "unknown"


@pytest.fixture
def tight_limit(monkeypatch):
    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", True)
    monkeypatch.setattr(settings, "RATE_LIMIT_MAX_REQUESTS", 2)
    monkeypatch.setattr(settings, "RATE_LIMIT_WINDOW_SECONDS", 60)
    main._rate_limit_buckets.clear()
    yield
    main._rate_limit_buckets.clear()


def test_rate_limit_spoofed_xff_does_not_reset_bucket(tight_limit):
    remote = TestClient(main.app, client=("198.51.100.20", 40000))
    codes = [remote.get("/api/usage/summary", headers={"x-forwarded-for": f"10.9.0.{i}"}).status_code for i in range(3)]
    assert codes[2] == 429


def test_rate_limit_spoofed_cf_from_remote_does_not_reset_bucket(tight_limit):
    remote = TestClient(main.app, client=("198.51.100.21", 40000))
    codes = [remote.get("/api/usage/summary", headers={"cf-connecting-ip": f"203.0.113.{i}"}).status_code for i in range(3)]
    assert codes[2] == 429


def test_rate_limit_per_visitor_behind_local_proxy(tight_limit):
    proxy = TestClient(main.app, client=("127.0.0.1", 40000))
    a = {"cf-connecting-ip": "203.0.113.50"}
    assert [proxy.get("/api/usage/summary", headers=a).status_code for _ in range(3)][2] == 429
    # 다른 방문자(다른 CF 주소)는 따로 센다
    assert proxy.get("/api/usage/summary", headers={"cf-connecting-ip": "203.0.113.51"}).status_code != 429
