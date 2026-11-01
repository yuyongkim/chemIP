"""모든 테스트 공통: 이용 집계·요청 게시판 DB 를 임시 폴더로 돌려 실제 data/*.db 를 건드리지 않게 하고,
운영 .env 의 스위치(KIPRIS 링크 전용 등)가 테스트 결과를 바꾸지 않게 기본값으로 되돌린다."""
import pytest

from backend.config.settings import settings
from backend.core import terminology_db as _tdb

# scripts/static_export/db.py 는 import 될 때 TerminologyDB.__init__ 를 읽기 전용으로 바꾼다(내보내기용).
# 내보내기 모듈을 부르는 테스트가 먼저 돌면 그 패치가 남아 tmp DB 를 만드는 테스트가 깨지므로 테스트마다 되돌린다.
_TERMINOLOGY_INIT = _tdb.TerminologyDB.__init__


@pytest.fixture(autouse=True)
def _restore_terminology_init():
    _tdb.TerminologyDB.__init__ = _TERMINOLOGY_INIT
    yield


@pytest.fixture(autouse=True)
def _isolate_runtime_dbs(tmp_path, monkeypatch):
    monkeypatch.setenv("CHEMIP_USAGE_DB", str(tmp_path / "usage.db"))
    monkeypatch.setenv("CHEMIP_FEEDBACK_DB", str(tmp_path / "feedback.db"))


@pytest.fixture(autouse=True)
def _default_source_switches(monkeypatch):
    # 운영에서는 KIPRIS 서면 허락 전까지 false 로 둔다. 테스트는 코드 기본값(true)을 기준으로 한다.
    monkeypatch.setattr(settings, "KIPRIS_PUBLIC_DISPLAY", True)
    monkeypatch.setattr(settings, "KIPRIS_IN_AI", True)
