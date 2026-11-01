"""물질 → 특허 매핑 파일(scripts/patent_export) — PC 사이트의 /data/v1/pat/* 경로와 AI 근거(제목만)."""
import gzip
import json

from fastapi.testclient import TestClient

from backend.config.settings import settings
from backend.core import evidence_collector, patent_mapping
from backend.main import app

client = TestClient(app)

INDEX = {
    "cas": "71-43-2",
    "total": 2,
    "by_jurisdiction": {"KR": 2},
    "recent": [
        {"patent_id": "KR1A", "title": "Title one", "jurisdiction": "KR", "year": 2024,
         "snippet": "abstract words", "link": "https://worldwide.espacenet.com/patent/search?q=pn%3DKR1A"},
        {"patent_id": "KR2A", "title": "Title two", "jurisdiction": "KR", "year": 2023, "snippet": "more", "link": ""},
    ],
}


def _mapping_dir(tmp_path, monkeypatch):
    folder = tmp_path / "71-43-2"
    folder.mkdir()
    (folder / "index.json").write_text(json.dumps(INDEX), encoding="utf-8")
    (folder / "KR.json.gz").write_bytes(gzip.compress(json.dumps(INDEX["recent"]).encode("utf-8")))
    monkeypatch.setattr(settings, "PATENT_MAPPING_DIR", str(tmp_path))
    return tmp_path


def test_index_is_served_as_plain_json(tmp_path, monkeypatch):
    _mapping_dir(tmp_path, monkeypatch)
    r = client.get("/data/v1/pat/71-43-2/index.json")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/json")
    assert "max-age=604800" in r.headers["cache-control"]
    assert r.json()["total"] == 2


def test_jurisdiction_file_is_gzip_passthrough(tmp_path, monkeypatch):
    _mapping_dir(tmp_path, monkeypatch)
    r = client.get("/data/v1/pat/71-43-2/KR.json")
    assert r.status_code == 200
    assert r.headers.get("content-encoding") == "gzip"
    assert r.json()[0]["patent_id"] == "KR1A"  # the test client decodes gzip


def test_missing_or_invalid_names_are_404(tmp_path, monkeypatch):
    _mapping_dir(tmp_path, monkeypatch)
    for path in ("/data/v1/pat/10000-00-7/index.json", "/data/v1/pat/71-43-2/kr.json",
                 "/data/v1/pat/71-43-2/KR.json.gz", "/data/v1/pat/not-a-cas/index.json"):
        r = client.get(path)
        assert r.status_code == 404, path
        assert r.headers["cache-control"] == "public, max-age=60"
    # a slash inside the file name never reaches the handler (no route match → plain 404)
    assert client.get("/data/v1/pat/71-43-2/..%2F..%2Findex.json").status_code == 404


def test_ai_evidence_uses_titles_only(tmp_path, monkeypatch):
    _mapping_dir(tmp_path, monkeypatch)
    monkeypatch.setattr(settings, "KIPRIS_IN_AI", False)
    rows = evidence_collector.build_patent_highlights("001008", "benzene", cas_no="71-43-2")
    assert [r["id"] for r in rows] == ["KR1A", "KR2A"]
    assert all(r["type"] == "patent_mapping" for r in rows)
    assert all("abstract" not in r["snippet"] and "more" not in r["snippet"] for r in rows)
    assert rows[0]["snippet"] == "KR | 2024"


def test_read_index_missing_folder_returns_none(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "PATENT_MAPPING_DIR", str(tmp_path / "absent"))
    assert patent_mapping.read_index("71-43-2") is None
    assert evidence_collector.build_patent_highlights("71-43-2", "", cas_no="") == []
