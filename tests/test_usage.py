"""익명 이용 집계(backend/usage)와 /api/usage/summary 테스트. DB 는 tmp_path 에 만든다."""
import sqlite3

import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

from backend.main import app
from backend.usage import matcher, store
from backend.usage.middleware import count_usage


@pytest.fixture(autouse=True)
def isolated(tmp_path, monkeypatch):
    monkeypatch.setenv("CHEMIP_USAGE_DB", str(tmp_path / "usage.db"))


def _mini_app() -> TestClient:
    mini = FastAPI()
    mini.middleware("http")(count_usage)

    @mini.get("/api/chemicals/{chem_id}")
    def chem(chem_id: str):
        if chem_id == "missing":
            return JSONResponse(status_code=404, content={})
        return {"chem_id": chem_id}

    @mini.get("/api/regulations/trade-controls/{cas}")
    def tc(cas: str):
        return {"cas": cas}

    @mini.get("/api/chemicals/autocomplete")
    def ac():
        return {}

    return TestClient(mini)


def test_matcher_rules():
    assert matcher.match("GET", "/api/chemicals/001008") == ("substance_view", "001008")
    assert matcher.match("GET", "/api/regulations/trade-controls/71-43-2") == ("trade_controls", "71-43-2")
    assert matcher.match("GET", "/api/chemicals/autocomplete") is None
    assert matcher.match("GET", "/api/chemicals/001008/drugs") is None
    assert matcher.match("POST", "/api/chemicals/001008") is None
    assert matcher.match("GET", "/api/chemicals/<script>") == ("substance_view", "")
    assert matcher.is_bot("Googlebot/2.1") and not matcher.is_bot("Mozilla/5.0 Chrome/130")


def test_increment_and_summary():
    store.increment("substance_view", "001008", day="2026-10-23")
    store.increment("substance_view", "001008", day="2026-10-24")
    store.increment("substance_view", "001067", day="2026-10-24")
    store.increment("trade_controls", "71-43-2", day="2026-10-24")
    s = store.summary(days=2, today="2026-10-24")
    assert s["since"] == "2026-10-23" and s["until"] == "2026-10-24"
    assert s["totals"]["substance_view"] == {"count": 3, "distinct_subjects": 2}
    assert s["totals"]["trade_controls"] == {"count": 1, "distinct_subjects": 1}
    assert s["daily"] == [
        {"day": "2026-10-23", "substance_view": 1, "trade_controls": 0},
        {"day": "2026-10-24", "substance_view": 2, "trade_controls": 1},
    ]
    assert s["top_subjects"]["substance_view"][0] == {"subject": "001008", "count": 2}


def test_unknown_metric_rejected():
    with pytest.raises(ValueError):
        store.increment("ip_address", "1.2.3.4")


def test_middleware_counts_only_successful_human_requests():
    c = _mini_app()
    c.get("/api/chemicals/001008")
    c.get("/api/chemicals/001008")
    c.get("/api/chemicals/missing")                      # 404 → 세지 않음
    c.get("/api/chemicals/autocomplete")                 # 물질 조회 아님
    c.get("/api/chemicals/001008", headers={"user-agent": "Googlebot/2.1"})  # 로봇
    c.get("/api/regulations/trade-controls/71-43-2")
    totals = store.summary(days=1)["totals"]
    assert totals["substance_view"]["count"] == 2
    assert totals["trade_controls"]["count"] == 1


def test_usage_db_holds_no_personal_columns():
    _mini_app().get("/api/chemicals/001008", headers={"cf-connecting-ip": "203.0.113.9", "user-agent": "Mozilla/5.0"})
    conn = sqlite3.connect(store.db_path())
    try:
        cols = [r[1] for r in conn.execute("PRAGMA table_info(usage_daily)")]
        dump = "\n".join(conn.iterdump())
    finally:
        conn.close()
    assert cols == ["day", "metric", "subject", "count"]
    assert "203.0.113.9" not in dump and "Mozilla" not in dump


def test_summary_route():
    store.increment("trade_controls", "71-43-2")
    data = TestClient(app).get("/api/usage/summary?days=7").json()
    assert len(data["daily"]) == 7
    assert data["totals"]["trade_controls"]["count"] == 1
    assert set(data["metrics"]) == set(store.METRICS)
