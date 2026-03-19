from fastapi.testclient import TestClient

from backend.api.routes import ai, chemicals, drugs, guides, patents, trade
from backend.main import app


client = TestClient(app)


def test_root_returns_welcome_message() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to ChemIP Platform API"}
    assert response.headers.get("x-request-id")
    assert response.headers.get("x-content-type-options") == "nosniff"


def test_health_and_ready_endpoints() -> None:
    health = client.get("/health")
    assert health.status_code == 200
    health_payload = health.json()
    assert health_payload["status"] == "ok"
    assert "time" in health_payload

    ready = client.get("/ready")
    assert ready.status_code == 200
    ready_payload = ready.json()
    assert ready_payload["status"] == "ready"
    assert "checks" in ready_payload


def test_chemicals_search_uses_trimmed_query_and_closes_db(monkeypatch) -> None:
    close_calls: list[bool] = []

    class FakeDB:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            self.close()
            return False

        def search_chemicals(self, query, limit, offset):
            assert query == "benzene"
            assert limit == 10
            assert offset == 0
            return {"items": [{"id": 1, "name": "benzene", "cas_no": "71-43-2", "chem_id": "0001"}], "total": 1}

        def close(self):
            close_calls.append(True)

    monkeypatch.setattr(chemicals, "TerminologyDB", FakeDB)

    response = client.get("/api/chemicals", params={"q": " benzene "})
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["chem_id"] == "0001"
    assert close_calls == [True]


def test_chemicals_detail_fetches_all_sections_when_db_is_empty(monkeypatch) -> None:
    class FakeDB:
        def __init__(self):
            self.sections = {}

        def __enter__(self):
            return self

        def __exit__(self, *_):
            self.close()
            return False

        def get_msds_details_by_chem_id(self, _chem_id):
            return [
                {
                    "section_seq": seq,
                    "section_name": value["section_name"],
                    "content": value["content"],
                }
                for seq, value in sorted(self.sections.items())
            ]

        def get_msds_english_by_chem_id(self, _chem_id):
            return {"name_en": "Benzene"}

        def upsert_msds_detail(self, chem_id, section_seq, section_name, content):
            self.sections[section_seq] = {
                "chem_id": chem_id,
                "section_name": section_name,
                "content": content,
            }

        def close(self):
            return None

    def fake_get_msds_detail(_chem_id: str, section_seq: int):
        return {
            "status": "success",
            "data": (
                "<response><body><items><item>"
                f"<msdsItemNameKor>항목{section_seq}</msdsItemNameKor>"
                f"<itemDetail>내용{section_seq}</itemDetail>"
                "</item></items></body></response>"
            ),
        }

    monkeypatch.setattr(chemicals, "TerminologyDB", FakeDB)
    monkeypatch.setattr(chemicals, "_is_kosha_reachable", lambda timeout=2.0: True)
    monkeypatch.setattr(chemicals.adapter, "get_msds_detail", fake_get_msds_detail)

    response = client.get("/api/chemicals/CHEM-123")
    assert response.status_code == 200
    payload = response.json()
    assert payload["chem_id"] == "CHEM-123"
    assert len(payload["sections"]) == 16
    assert payload["sections"][0]["content"][0]["msdsItemNameKor"] == "항목1"
    assert payload["english_safety"]["name_en"] == "Benzene"


def test_patent_search_alias_applies_pagination(monkeypatch) -> None:
    class FakePatentFetcher:
        def search_patents(self, _keyword):
            return [{"patent_id": f"P-{i}", "title": f"Patent {i}"} for i in range(45)]

    monkeypatch.setattr(patents, "PatentFetcher", FakePatentFetcher)

    response = client.get("/api/patents/search", params={"q": "aspirin", "page": 2, "limit": 20})
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 45
    assert payload["page"] == 2
    assert payload["total_pages"] == 3
    assert len(payload["results"]) == 20
    assert payload["results"][0]["patent_id"] == "P-20"


def test_patent_search_maps_kipris_error_to_502(monkeypatch) -> None:
    class FakePatentFetcher:
        def __init__(self):
            self.last_error = "code=10 | SERVICE KEY IS NOT REGISTERED"

        def search_patents(self, _keyword):
            return []

    monkeypatch.setattr(patents, "PatentFetcher", FakePatentFetcher)

    response = client.get("/api/patents/search", params={"q": "benzene"})
    assert response.status_code == 502
    assert "KIPRIS API error" in response.json()["detail"]


def test_kipris_detail_endpoint_returns_payload(monkeypatch) -> None:
    class FakeKiprisAdapter:
        def get_patent_detail(self, application_number):
            assert application_number == "1020150140961"
            return {
                "applicationNumber": "10-2015-0140961",
                "inventionTitle": "Sample Patent",
                "abstract": "Sample abstract",
                "claims": ["Claim 1", "Claim 2"],
            }

    monkeypatch.setattr(patents, "KiprisAdapter", FakeKiprisAdapter)

    response = client.get("/api/patents/kipris/1020150140961")
    assert response.status_code == 200
    payload = response.json()
    assert payload["applicationNumber"] == "10-2015-0140961"
    assert payload["inventionTitle"] == "Sample Patent"
    assert len(payload["claims"]) == 2


def test_kipris_detail_endpoint_maps_adapter_error(monkeypatch) -> None:
    class FakeKiprisAdapter:
        def __init__(self):
            self.last_error = "code=10 | SERVICE KEY IS NOT REGISTERED"

        def get_patent_detail(self, _application_number):
            return None

    monkeypatch.setattr(patents, "KiprisAdapter", FakeKiprisAdapter)

    response = client.get("/api/patents/kipris/1020150140961")
    assert response.status_code == 502
    assert "KIPRIS API error" in response.json()["detail"]


def test_trade_error_is_mapped_to_502(monkeypatch) -> None:
    monkeypatch.setattr(
        trade.adapter,
        "search_market_news",
        lambda **_: {"status": "error", "message": "upstream unavailable", "data": [], "total": 0},
    )

    response = client.get("/api/trade/news", params={"q": "benzene"})
    assert response.status_code == 502
    assert response.json()["detail"] == "upstream unavailable"


def test_drug_search_aggregates_approval_and_easy_info(monkeypatch) -> None:
    monkeypatch.setattr(
        drugs.adapter,
        "search_drug_approval",
        lambda **_: {"status": "success", "total": 1, "items": [{"itemName": "Aspirin"}]},
    )
    monkeypatch.setattr(
        drugs.adapter,
        "search_drug_easy_info",
        lambda **_: {"status": "success", "total": 2, "items": [{"itemName": "Aspirin"}, {"itemName": "Tylenol"}]},
    )

    response = client.get("/api/drugs/search", params={"q": "aspirin"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["query"] == "aspirin"
    assert payload["approval"]["total"] == 1
    assert payload["easyInfo"]["total"] == 2


def test_drug_openfda_endpoint_uses_fallback_query(monkeypatch) -> None:
    calls: list[str] = []

    def fake_search_labels(search_query, limit, skip):
        calls.append(search_query)
        if "brand_name" in search_query:
            return {"status": "success", "meta": {"results": {"total": 0}}, "results": []}
        return {
            "status": "success",
            "meta": {"results": {"total": 1}},
            "results": [{"openfda": {"brand_name": ["Aspirin"]}}],
        }

    monkeypatch.setattr(drugs.openfda_client, "search_labels", fake_search_labels)

    response = client.get("/api/drugs/openfda", params={"q": "aspirin", "limit": 5})
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert "generic_name" in payload["query_used"]
    assert len(calls) == 2


def test_drug_pubmed_endpoint_returns_articles(monkeypatch) -> None:
    monkeypatch.setattr(
        drugs.pubmed_client,
        "search",
        lambda **_: {
            "status": "success",
            "count": 1,
            "ids": ["123456"],
            "articles": [{"pmid": "123456", "title": "Sample paper"}],
        },
    )

    response = client.get("/api/drugs/pubmed", params={"q": "aspirin"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["query"] == "aspirin"
    assert payload["count"] == 1
    assert payload["articles"][0]["pmid"] == "123456"


def test_guides_status_endpoint_returns_store_stats(monkeypatch) -> None:
    class FakeStore:
        def stats(self):
            return {
                "data_dir": "C:/tmp/kosha_guide",
                "ready_files": True,
                "loaded": True,
                "meta_count": 10,
                "doc_count": 9,
                "load_error": "",
            }

    monkeypatch.setattr(guides, "store", FakeStore())
    response = client.get("/api/guides/status")
    assert response.status_code == 200
    payload = response.json()
    assert payload["ready_files"] is True
    assert payload["meta_count"] == 10


def test_guides_search_endpoint_returns_results(monkeypatch) -> None:
    class FakeStore:
        guides_path = "guides.json"
        docs_path = "guide_documents_text.json"

        def exists(self):
            return True

        def search(self, query, limit, offset):
            assert query == "구리"
            assert limit == 5
            assert offset == 0
            return (
                [
                    {
                        "guide_no": "A-1-2018",
                        "title": "구리에 대한 작업환경측정",
                        "score": 100,
                        "match_fields": ["title"],
                        "snippet": "구리 ...",
                    }
                ],
                1,
            )

    monkeypatch.setattr(guides, "store", FakeStore())

    response = client.get("/api/guides/search", params={"q": "구리", "page": 1, "limit": 5})
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["guide_no"] == "A-1-2018"


def test_guides_detail_endpoint_not_found(monkeypatch) -> None:
    class FakeStore:
        guides_path = "guides.json"
        docs_path = "guide_documents_text.json"

        def exists(self):
            return True

        def get(self, guide_no, include_text):
            assert guide_no == "A-404"
            assert include_text is True
            return None

    monkeypatch.setattr(guides, "store", FakeStore())

    response = client.get("/api/guides/A-404")
    assert response.status_code == 404


def test_guides_recommend_endpoint_builds_and_saves_mapping(monkeypatch) -> None:
    saved = {"called": False}

    class FakeStore:
        guides_path = "guides.json"
        docs_path = "guide_documents_text.json"

        def exists(self):
            return True

    class FakeDB:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            self.close()
            return False

        def get_chemical_meta_by_chem_id(self, chem_id):
            assert chem_id == "CHEM-123"
            return {"name": "benzene", "name_en": "benzene", "cas_no": "71-43-2"}

        def get_guide_mappings(self, chem_id, limit=10):
            assert chem_id == "CHEM-123"
            assert limit == 3
            return []

        def upsert_guide_mappings(self, chem_id, recommendations):
            assert chem_id == "CHEM-123"
            assert len(recommendations) == 1
            saved["called"] = True

        def close(self):
            return None

    monkeypatch.setattr(guides, "store", FakeStore())
    monkeypatch.setattr(guides, "TerminologyDB", FakeDB)
    monkeypatch.setattr(
        guides,
        "recommend_guides",
        lambda store, terms, top_k: [
            {
                "guide_no": "A-1-2018",
                "title": "Guide A",
                "score": 100,
                "match_terms": terms[:1],
                "match_fields": ["title"],
                "guide_cas_numbers": ["71-43-2"],
                "guide_keywords": ["benzene"],
                "snippet": "sample",
                "file_download_url": "https://example.com/a.pdf",
            }
        ],
    )

    response = client.get("/api/guides/recommend/CHEM-123", params={"limit": 3})
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["from_cache"] is False
    assert payload["recommendations"][0]["guide_no"] == "A-1-2018"
    assert saved["called"] is True


def test_ai_analyze_returns_sources_and_guides(monkeypatch) -> None:
    class FakeDB:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            self.close()
            return False

        def get_msds_details_by_chem_id(self, _chem_id):
            return [
                {
                    "section_seq": 2,
                    "section_name": "Hazards Identification",
                    "content": "<response><body><items><item><msdsItemNameKor>Hazard</msdsItemNameKor><itemDetail>Flammable liquid</itemDetail></item></items></body></response>",
                }
            ]

        def get_msds_english_by_chem_id(self, _chem_id):
            return {"hazard_statements": ["H225 Highly flammable liquid and vapor"], "cas_no": "71-43-2"}

        def get_chemical_meta_by_chem_id(self, _chem_id):
            return {"name": "benzene", "name_en": "benzene", "cas_no": "71-43-2"}

        def upsert_guide_mappings(self, _chem_id, _recommendations):
            return None

        def close(self):
            return None

    class FakeGuideStore:
        def exists(self):
            return True

    class FakePatentFetcher:
        def __init__(self):
            self.last_error = None

        def search_patents(self, _keyword):
            return [
                {
                    "applicationNumber": "10-2024-000001",
                    "inventionTitle": "Patent A",
                    "applicantName": "Chem Corp",
                    "registerStatus": "출원",
                    "abstract": "Patent abstract",
                }
            ]

    class FakeGlobalPatentAdapter:
        def search_patents_by_chem_id(self, chem_id, limit=6, offset=0):
            assert chem_id == "CHEM-123"
            return [
                {
                    "patent_id": "US-1",
                    "title": "Local Patent A",
                    "jurisdiction": "US",
                    "category": "usage",
                    "snippet": "Used as a solvent in a process",
                }
            ]

    monkeypatch.setattr(ai, "TerminologyDB", FakeDB)
    monkeypatch.setattr(ai, "guide_store", FakeGuideStore())
    monkeypatch.setattr(ai, "PatentFetcher", FakePatentFetcher)
    monkeypatch.setattr(ai, "GlobalPatentAdapter", lambda: FakeGlobalPatentAdapter())
    monkeypatch.setattr(
        ai,
        "recommend_guides",
        lambda store, terms, top_k: [
            {
                "guide_no": "A-1-2018",
                "title": "Guide A",
                "score": 90,
                "match_terms": terms[:1],
                "guide_cas_numbers": ["71-43-2"],
                "snippet": "guide snippet",
                "file_download_url": "https://example.com/a.pdf",
            }
        ],
    )

    response = client.post("/api/ai/analyze", json={"chemId": "CHEM-123", "chemicalName": "benzene", "use_llm": False})
    assert response.status_code == 200
    payload = response.json()
    assert "analysis" in payload
    assert "sources" in payload and len(payload["sources"]) >= 3
    assert payload["guide_recommendations"][0]["guide_no"] == "A-1-2018"
    assert any(source["title"] == "Patent A" for source in payload["sources"])
    assert any(source["title"] == "Local Patent A" for source in payload["sources"])
    assert payload["llm_used"] is False


def test_ai_llm_status_endpoint() -> None:
    response = client.get("/api/ai/llm-status")
    assert response.status_code == 200
    payload = response.json()
    assert "enabled" in payload
    assert "ready" in payload
    assert "model" in payload


def test_ai_analyze_llm_fallback_when_unavailable(monkeypatch) -> None:
    """When LLM is unreachable, analyze should still return rule-based report."""
    from backend.core import report_builder

    class FakeDB:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            return False

        def get_msds_details_by_chem_id(self, _):
            return []

        def get_msds_english_by_chem_id(self, _):
            return {}

        def get_chemical_meta_by_chem_id(self, _):
            return {"name": "test", "name_en": "test", "cas_no": ""}

        def upsert_guide_mappings(self, *_):
            return None

        def close(self):
            return None

    class FakeGuideStore:
        def exists(self):
            return False

    class FakePatentFetcher:
        def __init__(self):
            self.last_error = None

        def search_patents(self, _keyword):
            return []

    class FakeGlobalPatentAdapter:
        def search_patents_by_chem_id(self, _chem_id, limit=6, offset=0):
            return []

    monkeypatch.setattr(ai, "TerminologyDB", FakeDB)
    monkeypatch.setattr(ai, "guide_store", FakeGuideStore())
    monkeypatch.setattr(ai, "PatentFetcher", FakePatentFetcher)
    monkeypatch.setattr(ai, "GlobalPatentAdapter", lambda: FakeGlobalPatentAdapter())
    # Force LLM to appear unavailable via the ai module's imported reference
    monkeypatch.setattr(
        ai,
        "build_llm_report",
        lambda bundle: {"analysis": ai.build_report_markdown(bundle), "model": "", "llm_used": False},
    )

    response = client.post("/api/ai/analyze", json={"chemId": "X", "chemicalName": "test", "use_llm": True})
    assert response.status_code == 200
    payload = response.json()
    assert payload["llm_used"] is False
    assert "analysis" in payload
