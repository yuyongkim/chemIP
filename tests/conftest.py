"""모든 테스트 공통: 이용 집계·요청 게시판 DB 를 임시 폴더로 돌려 실제 data/*.db 를 건드리지 않게 한다."""
import pytest


@pytest.fixture(autouse=True)
def _isolate_runtime_dbs(tmp_path, monkeypatch):
    monkeypatch.setenv("CHEMIP_USAGE_DB", str(tmp_path / "usage.db"))
    monkeypatch.setenv("CHEMIP_FEEDBACK_DB", str(tmp_path / "feedback.db"))
