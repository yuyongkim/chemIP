from __future__ import annotations

import requests
from fastapi.testclient import TestClient

from backend.api import http_client
from backend.api.routes import regulations
from backend.config.settings import settings
from backend.core.terminology_db import TerminologyDB
from backend.main import app


client = TestClient(app)


def test_alias_search_prioritizes_canonical_match(tmp_path) -> None:
    db_path = tmp_path / "alias-search.db"

    with TerminologyDB(str(db_path)) as db:
        db.add_chemical_term("에탄올 (Ethanol)", "64-17-5", chem_id="000001")
        db.add_external_aliases(
            chem_id="000001",
            aliases=["ethyl alcohol"],
            alias_type="manual",
            source="TEST",
            confidence=0.95,
        )

        result = db.search_chemicals("ethyl alcohol", limit=5, offset=0)
        aliases = db.get_aliases_for_chemical("000001", limit=20)

    assert result["total"] >= 1
    assert result["items"][0]["chem_id"] == "000001"
    assert result["items"][0]["cas_no"] == "64-17-5"
    assert any(item["alias"] == "ethyl alcohol" for item in aliases)


def test_regulatory_intelligence_returns_aliases_and_sources(tmp_path, monkeypatch) -> None:
    db_path = tmp_path / "reg-intel.db"
    monkeypatch.setattr(settings, "TERMINOLOGY_DB_PATH", str(db_path))

    with TerminologyDB(str(db_path)) as db:
        db.add_chemical_term("에탄올 (Ethanol)", "64-17-5", chem_id="000001")

    class FakeNcis:
        def search_by_cas(self, cas_no):
            assert cas_no == "64-17-5"
            return {
                "status": "success",
                "data": [
                    {
                        "cas_no": "64-17-5",
                        "ke_no": "KE-13225",
                        "name_ko": "에탄올",
                        "name_en": "Ethanol",
                        "synonyms_ko": "에틸알코올",
                        "synonyms_en": "ethyl alcohol",
                        "molecular_formula": "C2H6O",
                        "molecular_weight": "46.07",
                        "classifications": ["flammable"],
                    }
                ],
                "total": 1,
            }

        def search_by_name(self, _name):
            return {"status": "success", "data": [], "total": 0}

    class FakeKischem:
        def get_by_cas(self, cas_no):
            assert cas_no == "64-17-5"
            return {
                "status": "success",
                "data": [{"cas_no": "64-17-5", "symptom": "Dizziness"}],
                "total": 1,
            }

        def search(self, keyword="", num_of_rows=20):
            return {"status": "success", "data": [], "total": 0}

    class FakeNiosh:
        def search(self, query, limit=20):
            assert query == "64-17-5"
            return {
                "status": "success",
                "data": [{"name": "Ethanol", "cas": "64-17-5", "rel": "1000 ppm"}],
                "total": 1,
            }

    class FakeEcha:
        def search_substance(self, query, page=1, page_size=20):
            assert query in {"64-17-5", "Ethanol", "에탄올 (Ethanol)"}
            return {
                "status": "success",
                "data": [{"rml_id": "100.028.878", "name": "Ethanol", "cas_number": "64-17-5"}],
                "total": 1,
            }

    class FakeCompTox:
        def search_chemical(self, query):
            assert query == "64-17-5"
            return {
                "status": "success",
                "data": [{"dtxsid": "DTXSID7020182", "casrn": "64-17-5", "preferredName": "Ethanol"}],
                "total": 1,
            }

    monkeypatch.setattr(regulations, "_ncis", FakeNcis())
    monkeypatch.setattr(regulations, "_kischem", FakeKischem())
    monkeypatch.setattr(regulations, "_niosh", FakeNiosh())
    monkeypatch.setattr(regulations, "_echa", FakeEcha())
    monkeypatch.setattr(regulations, "_comptox", FakeCompTox())

    response = client.get("/api/regulations/intelligence/000001")
    assert response.status_code == 200
    payload = response.json()

    assert payload["chemical"]["cas_no"] == "64-17-5"
    assert payload["sources"]["ncis"]["total"] == 1
    assert payload["sources"]["kischem"]["total"] == 1
    assert payload["sources"]["niosh"]["total"] == 1
    assert payload["sources"]["echa"]["total"] == 1
    assert payload["sources"]["comptox"]["total"] == 1
    assert any(item["alias"] == "ethyl alcohol" for item in payload["aliases"])


def test_safe_get_reuses_cached_response(monkeypatch) -> None:
    http_client._response_cache.clear()
    http_client._session = None

    class FakeSession:
        def __init__(self):
            self.calls = 0

        def get(self, url, params=None, headers=None, timeout=None, verify=True):
            self.calls += 1
            response = requests.Response()
            response.status_code = 200
            response._content = b'{"ok": true}'
            response.url = url
            response.reason = "OK"
            response.headers["Content-Type"] = "application/json"
            return response

    session = FakeSession()
    monkeypatch.setattr(http_client, "get_http_session", lambda: session)
    monkeypatch.setattr(settings, "HTTP_CACHE_ENABLED", True)
    monkeypatch.setattr(settings, "HTTP_CACHE_TTL_SECONDS", 300)

    first = http_client.safe_get("http://localhost/cache-test", params={"q": "benzene"})
    second = http_client.safe_get("http://localhost/cache-test", params={"q": "benzene"})

    assert session.calls == 1
    assert first.json() == {"ok": True}
    assert second.json() == {"ok": True}
