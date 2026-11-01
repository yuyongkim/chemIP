"""클라우드 서버처럼 특허 색인 DB(global_patent_index.db 135 GB, uspto_index.db 5.9 GB)가 없을 때
특허 경로가 500 없이 빈 결과로 물러나는지, 그리고 없는 경로에 빈 DB 파일을 만들지 않는지 확인한다.
두 경로는 2026-10-28 부터 기본 410 Gone(LEGACY_PATENT_INDEX_ROUTES=true 일 때만 예전 응답)이다."""
from fastapi.testclient import TestClient

from backend.api.global_patent_adapter import GlobalPatentAdapter
from backend.api.uspto_adapter import UsptoAdapter
from backend.config.settings import settings
from backend.main import app

client = TestClient(app)


def _point_indexes_to_missing(tmp_path, monkeypatch):
    missing_global = tmp_path / "absent_global_patent_index.db"
    missing_uspto = tmp_path / "absent_uspto_index.db"
    monkeypatch.setattr(settings, "GLOBAL_PATENT_INDEX_DB_PATH", str(missing_global))
    monkeypatch.setattr(settings, "USPTO_INDEX_DB_PATH", str(missing_uspto))
    monkeypatch.setattr(settings, "LEGACY_PATENT_INDEX_ROUTES", True)
    return missing_global, missing_uspto


def test_global_patent_route_returns_empty_when_index_missing(tmp_path, monkeypatch) -> None:
    missing_global, _ = _point_indexes_to_missing(tmp_path, monkeypatch)

    response = client.get("/api/patents/global/001008")

    assert response.status_code == 200
    assert response.json()["results"] == []
    assert not missing_global.exists()


def test_uspto_route_returns_empty_when_index_missing(tmp_path, monkeypatch) -> None:
    _, missing_uspto = _point_indexes_to_missing(tmp_path, monkeypatch)

    response = client.get("/api/patents/uspto/001008")

    assert response.status_code == 200
    assert response.json()["results"] == []
    assert not missing_uspto.exists()


def test_adapters_used_by_ai_evidence_return_empty_when_index_missing(tmp_path, monkeypatch) -> None:
    missing_global, missing_uspto = _point_indexes_to_missing(tmp_path, monkeypatch)

    assert GlobalPatentAdapter().search_patents_by_chem_id("001008", limit=6) == []
    assert UsptoAdapter().search_patents_by_chem_id("001008", limit=6) == []
    assert not missing_global.exists()
    assert not missing_uspto.exists()


def test_legacy_patent_routes_are_gone_by_default(monkeypatch) -> None:
    monkeypatch.setattr(settings, "LEGACY_PATENT_INDEX_ROUTES", False)
    for path in ("/api/patents/global/001008", "/api/patents/uspto/001008"):
        response = client.get(path)
        assert response.status_code == 410
        body = response.json()
        assert body["code"] == "GONE"
        assert body["replacement"].startswith("/data/v1/pat/")


def test_legacy_adapters_never_return_local_paths(tmp_path, monkeypatch) -> None:
    import sqlite3

    db = tmp_path / "idx.db"
    con = sqlite3.connect(db)
    con.execute(
        "CREATE TABLE patent_index (chem_id, patent_id, title, file_path, matched_term, jurisdiction, section, snippet, created_at)"
    )
    con.execute(
        "INSERT INTO patent_index VALUES "
        "('001008', 'US1', 'T', 'S:/secret/path.jsonl.gz', 'benzene', 'US', 'Title', 'benzene', '')"
    )
    con.commit()
    con.close()
    for adapter in (GlobalPatentAdapter(str(db)), UsptoAdapter(str(db))):
        rows = adapter.search_patents_by_chem_id("001008", limit=5)
        assert rows and all("file_path" not in r for r in rows)
        assert all("secret" not in str(v) for r in rows for v in r.values())
