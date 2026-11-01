"""On-demand EU REACH lookup (backend/core/reach_registration.py, GET /api/reach/{cas}) with a fake ECHA CHEM."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.core import reach_registration as R
from backend.main import app

ETHANOL_SEARCH = {"items": [
    {"substanceIndex": {"rmlId": "100.000.526", "rmlName": "Ethanol", "rmlEc": "200-578-6", "rmlCas": "64-17-5",
                        "casNumber": ["64-17-5"], "listParticipation": ["REACH REGISTERED"]}},
    {"substanceIndex": {"rmlId": "100.212.831", "rmlName": "Mixture of 25086-89-9 and 64-17-5", "rmlCas": "-", "casNumber": ["-"]}},
]}
ETHANOL_SUB = {"rmlId": "100.000.526", "rmlName": "Ethanol", "rmlEc": "200-578-6", "tonnageBand": "1,000,000 - 10,000,000 tonnes",
               "listParticipation": ["REACH REGISTERED"]}
ETHANOL_DOSSIERS = [
    {"registrationDate": "2010-07-26", "lastUpdatedDate": "2024-08-30", "reachDossierInfo": {"dossierSubtype": "Article 10 - full", "nonsAssetFlag": "F"}},
    {"registrationDate": "2012-01-02", "lastUpdatedDate": "2025-03-04", "reachDossierInfo": {"dossierSubtype": "Article 18 - intermediate", "nonsAssetFlag": "F"}},
]


def fake_echa(table: dict, calls: list):
    def get_json(url, params=None):
        calls.append(url)
        if url == R.SEARCH:
            hit = table.get(params["searchText"])
            if hit == "error":
                raise RuntimeError("503 Server Error")
            return hit or {"items": []}
        if url.startswith(R.SUBSTANCE.format(rml="")):
            return ETHANOL_SUB
        return {"items": ETHANOL_DOSSIERS, "state": {"totalItems": len(ETHANOL_DOSSIERS)}}
    return get_json


@pytest.fixture(autouse=True)
def _fresh():
    R._cache.clear()
    R._misses.clear()
    yield
    R._cache.clear()
    R._misses.clear()


def test_cas_check_digit():
    assert R.cas_is_valid("64-17-5") and R.cas_is_valid("7647-01-0") and not R.cas_is_valid("64-17-6")


def test_registered_entry_has_the_bundled_shape():
    ans = R.lookup_echa("64-17-5", fake_echa({"64-17-5": ETHANOL_SEARCH}, []))
    assert ans["status"] == "registered" and ans["registered"] is True
    assert ans["attribution"] == "Source: European Chemicals Agency, https://echa.europa.eu/"
    e = ans["entry"]
    assert list(e) == ["cas", "name", "detail", "ec", "echa_id", "match_method", "tonnage_band", "active_registrations",
                       "registration_types", "nons", "first_registered", "last_updated", "url"]
    assert e["registration_types"] == {"full registration (Art. 10)": 1, "transported isolated intermediate (Art. 18)": 1}
    assert e["detail"].startswith("EC 200-578-6; REACH registered — active registrations 2 (")
    assert e["first_registered"] == "2010-07-26" and e["last_updated"] == "2025-03-04"


def test_not_registered_unknown_and_ambiguous():
    calls: list = []
    get = fake_echa({"1234-56-6": None, "7647-01-0": "error", "50-00-0": {"items": [
        {"substanceIndex": {"rmlId": "a", "rmlCas": "50-00-0"}}, {"substanceIndex": {"rmlId": "b", "rmlCas": "50-00-0"}}]}}, calls)
    none = R.lookup_echa("1234-56-6", get)
    assert none["status"] == "not_registered" and none["registered"] is False and R.ttl_of(none) == R.TTL_NONE_S
    down = R.lookup_echa("7647-01-0", get)
    assert down["status"] == "unknown" and down["registered"] is None and R.ttl_of(down) == 0
    amb = R.lookup_echa("50-00-0", get)
    assert amb["status"] == "unknown" and amb["reason"].startswith("ambiguous")


def test_cache_and_rate_limit(monkeypatch):
    monkeypatch.setattr(R, "bundled", lambda cas: None)
    calls: list = []
    get = fake_echa({"64-17-5": ETHANOL_SEARCH, "7647-01-0": "error"}, calls)
    first = R.reach_status("64-17-5", get, now=lambda: 1000.0)
    n = len(calls)
    second = R.reach_status("64-17-5", get, now=lambda: 2000.0)
    assert first["cached"] is False and second["cached"] is True and len(calls) == n
    for _ in range(R.UPSTREAM_MAX):
        R.reach_status("7647-01-0", get, now=lambda: 1001.0)
    assert R.reach_status("7647-01-0", get, now=lambda: 1002.0)["reason"] == "rate_limited"


def test_bundled_entry_is_answered_without_echa():
    ans = R.reach_status("71-43-2", lambda *a, **k: pytest.fail("ECHA must not be called"))
    assert ans["status"] == "registered" and ans["bundled"] is True and ans["entry"]["ec"] == "200-753-7"


def test_route_validates_cas_and_sets_cache_header(monkeypatch):
    client = TestClient(app)
    assert client.get("/api/reach/64-17-6").status_code == 422
    monkeypatch.setattr(R, "_get_json", fake_echa({}, []))
    monkeypatch.setattr(R, "bundled", lambda cas: None)
    monkeypatch.setattr(R.reach_status, "__defaults__", (R._get_json, R.time.time))
    res = client.get("/api/reach/1234-56-6")
    assert res.status_code == 200 and res.json()["status"] == "not_registered"
    assert res.headers["cache-control"] == "public, max-age=3600"
