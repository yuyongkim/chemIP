"""자료 출처 이용조건 대응(2026-10-25 라이선스 검토) 회귀 테스트.

KOSHA 경로 우선순위, NAVER 결과 분리·라벨·AI 제외, KIPRIS 스위치, MFDS 08/07 경로.
외부 API 는 호출하지 않는다(safe_get 을 바꿔 끼운다).
"""

import pathlib

import pytest
from fastapi.testclient import TestClient

from backend.api import kipris_policy, kosha_msds_adapter, mfds_client, naver_adapter
from backend.api.kosha_msds_routes import KOSHA_ROUTES, resolve_routes
from backend.api.routes import patents
from backend.config.settings import settings
from backend.core import evidence_collector
from backend.main import app

client = TestClient(app)
ROOT = pathlib.Path(__file__).resolve().parents[1]


class FakeResponse:
    def __init__(self, text="", status=200, payload=None):
        self.text = text
        self.status_code = status
        self._payload = payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self):
        return self._payload


OK_XML = "<response><header><resultCode>00</resultCode></header><body><items><item><itemDetail>x</itemDetail></item></items></body></response>"
ERR_XML = "<OpenAPI_ServiceResponse><cmmMsgHeader><errMsg>NO_OPENAPI_SERVICE_ERROR</errMsg></cmmMsgHeader></OpenAPI_ServiceResponse>"


# ── 1. KOSHA MSDS: data.go.kr 15157612 경로가 기본 ──

def test_default_kosha_route_is_datagokr_15157612():
    first = resolve_routes(settings.KOSHA_MSDS_ROUTES)[0]
    assert first.name == "datagokr"
    assert first.base_url == "https://apis.data.go.kr/B552468/msdschem1"
    assert first.list_url().endswith("/getChemList001")
    assert first.detail_url(2).endswith("/getChemDetail021")
    assert first.detail_url(16).endswith("/getChemDetail161")


def test_unknown_route_names_fall_back_to_default():
    assert [r.name for r in resolve_routes(["nope", ""])] == ["datagokr"]


def test_kosha_adapter_uses_primary_then_falls_back(monkeypatch):
    calls = []

    def fake_get(url, params=None, **_):
        calls.append(url)
        if url.startswith(KOSHA_ROUTES["datagokr"].base_url):
            return FakeResponse(ERR_XML, status=400)
        return FakeResponse(OK_XML)

    monkeypatch.setattr(kosha_msds_adapter, "safe_get", fake_get)
    adapter = kosha_msds_adapter.KoshaMsdsAdapter(["datagokr", "datagokr_legacy"])
    result = adapter.get_msds_detail("001008", 2)
    assert result["status"] == "success" and result["route"] == "datagokr_legacy"
    assert calls[0].endswith("/msdschem1/getChemDetail021")
    assert calls[1].endswith("/msdschem/getChemDetail02")


def test_kosha_adapter_treats_non_00_result_code_as_failure(monkeypatch):
    monkeypatch.setattr(kosha_msds_adapter, "safe_get",
                        lambda url, **_: FakeResponse("<response><header><resultCode>30</resultCode></header></response>"))
    result = kosha_msds_adapter.KoshaMsdsAdapter(["datagokr"]).get_msds_detail("001008", 1)
    assert result["status"] == "error"


def test_kosha_primary_success_does_not_touch_legacy(monkeypatch):
    calls = []
    monkeypatch.setattr(kosha_msds_adapter, "safe_get", lambda url, **_: calls.append(url) or FakeResponse(OK_XML))
    adapter = kosha_msds_adapter.KoshaMsdsAdapter(["datagokr", "datagokr_legacy", "kosha_direct"])
    assert adapter.search_msds("벤젠")["route"] == "datagokr"
    assert len(calls) == 1 and calls[0].endswith("/msdschem1/getChemList001")


# ── 2. NAVER: 원문 그대로, 출처 표시, KOTRA 와 분리, AI 미사용, 영구 저장 없음 ──

def test_naver_items_keep_original_fields_and_source_label():
    raw = {"title": "<b>벤젠</b> 시장", "originallink": "https://news.example/a", "link": "https://n.news.naver.com/a",
           "description": "설명", "pubDate": "Sat, 25 Oct 2026 09:00:00 +0900"}
    item = naver_adapter.to_naver_item(raw)
    for key, value in raw.items():
        assert item[key] == value  # unmodified
    assert item["source"] == "naver"
    assert item["source_label"] == "네이버 검색결과"
    assert "newsTitl" not in item and "cntryNm" not in item  # no KOTRA-shaped remapping


def test_naver_search_uses_short_memory_cache_only(monkeypatch):
    seen = {}

    def fake_get(url, params=None, headers=None, **kwargs):
        seen.update(kwargs)
        return FakeResponse(status=200, payload={"total": 1, "items": [{"title": "t", "link": "l"}]})

    monkeypatch.setattr(naver_adapter, "safe_get", fake_get)
    adapter = naver_adapter.NaverAdapter()
    adapter.client_id, adapter.client_secret = "id", "secret"
    result = adapter.search_news("벤젠")
    assert result["source_label"] == "네이버 검색결과"
    assert result["data"][0]["source"] == "naver"
    assert seen["cache_ttl"] <= 21 * 24 * 3600


def test_naver_news_endpoint_marks_source(monkeypatch):
    from backend.api.routes import trade
    monkeypatch.setattr(trade.naver_adapter, "search_news", lambda **_: {
        "status": "success", "total": 1, "source": "naver", "source_label": "네이버 검색결과",
        "data": [naver_adapter.to_naver_item({"title": "t", "link": "https://n.news.naver.com/x"})]})
    payload = client.get("/api/trade/naver-news", params={"q": "벤젠"}).json()
    assert payload["source_label"] == "네이버 검색결과"
    assert all(item["source"] == "naver" for item in payload["data"])


AI_MODULES = [
    "backend/core/evidence_collector.py",
    "backend/core/report_builder.py",
    "backend/api/routes/ai.py",
    "backend/core/llm_client.py",
]


@pytest.mark.parametrize("path", AI_MODULES)
def test_ai_and_evidence_paths_never_use_naver(path):
    source = (ROOT / path).read_text(encoding="utf-8").lower()
    assert "naver" not in source


def test_naver_adapter_never_writes_to_db():
    source = (ROOT / "backend/api/naver_adapter.py").read_text(encoding="utf-8")
    for forbidden in ("TerminologyDB", "sqlite3", "open("):
        assert forbidden not in source


# ── 3. KIPRIS: 공개 노출·AI 근거 스위치 ──

def test_kipris_policy_defaults_keep_current_behaviour():
    payload = client.get("/api/patents/policy").json()
    assert payload["kipris_public_display"] is True
    assert payload["kipris_in_ai"] is True
    assert payload["display_mode"] == "full"


def test_kipris_link_only_mode_returns_no_rows_and_skips_kipris(monkeypatch):
    monkeypatch.setattr(settings, "KIPRIS_PUBLIC_DISPLAY", False)

    class Boom:
        def __init__(self, *_, **__):
            raise AssertionError("KIPRIS must not be called in link-only mode")

    monkeypatch.setattr(patents, "PatentFetcher", Boom)
    monkeypatch.setattr(patents, "KiprisAdapter", Boom)

    search = client.get("/api/patents", params={"q": "benzene"}).json()
    assert search["display_mode"] == "link_only"
    assert search["results"] == [] and search["total"] == 0
    assert search["kipris_link"].startswith("https://www.kipris.or.kr/")
    assert "benzene" in search["kipris_link"]
    assert search["link_label"] == "KIPRIS에서 보기"

    detail = client.get("/api/patents/kipris/1020150140961").json()
    assert detail["display_mode"] == "link_only"
    assert "1020150140961" in detail["kipris_link"]

    assert client.get("/api/patents/policy").json()["display_mode"] == "link_only"


def test_kipris_excluded_from_ai_evidence_when_flag_off(monkeypatch):
    monkeypatch.setattr(settings, "KIPRIS_IN_AI", False)

    class Boom:
        def __init__(self, *_, **__):
            raise AssertionError("KIPRIS must not be queried for AI evidence")

    class NoLocal:
        def search_patents_by_chem_id(self, *_, **__):
            return []

    monkeypatch.setattr(evidence_collector, "PatentFetcher", Boom)
    monkeypatch.setattr(evidence_collector, "GlobalPatentAdapter", NoLocal)
    highlights = evidence_collector.build_patent_highlights("001008", "benzene")
    assert all(h["type"] != "kipris_patent" for h in highlights)


def test_cached_ai_result_with_kipris_is_detected():
    assert kipris_policy.contains_kipris_evidence({"sources": [{"type": "kipris_patent"}]})
    assert not kipris_policy.contains_kipris_evidence({"sources": [{"type": "kosha_guide"}]})


def test_env_example_documents_new_flags():
    text = (ROOT / ".env.example").read_text(encoding="utf-8")
    for name in ("KIPRIS_PUBLIC_DISPLAY", "KIPRIS_IN_AI", "KOSHA_MSDS_ROUTES", "MFDS_APPROVAL_URLS"):
        assert name in text


# ── 5. MFDS 의약품 허가정보: 08 우선, 07 대체 ──

def test_mfds_prefers_spec_08_and_falls_back_on_empty(monkeypatch):
    calls = []

    def fake_get(url, params=None, **_):
        calls.append(url)
        if url.endswith("getDrugPrdtPrmsnInq08"):
            return FakeResponse(payload={"header": {"resultCode": "00"}, "body": {"totalCount": 0}})
        return FakeResponse(payload={"header": {"resultCode": "00"}, "body": {
            "totalCount": 1, "items": [{"ITEM_NAME": "타이레놀", "EE_DOC_DATA": "<big/>"}]}})

    monkeypatch.setattr(mfds_client, "safe_get", fake_get)
    result = mfds_client.MFDSClient(service_key="k").search_approval("타이레놀")
    assert "DrugPrdtPrmsnInfoService08" in calls[0]
    assert result["total"] == 1 and result["items"][0]["ITEM_NAME"] == "타이레놀"
    assert "EE_DOC_DATA" not in result["items"][0]


def test_mfds_reports_error_only_when_every_route_fails(monkeypatch):
    def fake_get(url, **_):
        raise RuntimeError("down")

    monkeypatch.setattr(mfds_client, "safe_get", fake_get)
    result = mfds_client.MFDSClient(service_key="k").search_approval("x")
    assert result["status"] == "error" and result["items"] == []
