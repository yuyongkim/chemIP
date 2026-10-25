"""수출입 규제 자료 파일 위치. 경로는 여기서만 정의한다.

자료는 다른 수집 작업이 backend/data/trade_controls/ 에 채운다. 환경변수 TRADE_CONTROLS_DIR 로 바꿀 수 있다.
파일이 아직 없으면 각 모듈이 빈 결과를 돌려주고, 화면은 "자료 준비 중"을 보인다.
"""
from __future__ import annotations

import os
from pathlib import Path

DATA_DIR = Path(os.getenv("TRADE_CONTROLS_DIR") or Path(__file__).resolve().parents[2] / "data" / "trade_controls")

KR_RULES_FILE = "kr_rules.json"
# 통제 목록 파일. 새 목록을 받으면 여기에 파일명 한 줄만 추가한다(형식은 lists.py 참고).
LIST_FILES: tuple[str, ...] = ("cwc_schedules.json", "australia_group.json", "drug_precursors.json")
HS_DB_FILE = "hs_codes.sqlite"
# 국내 법령별 물질 목록 폴더. 안의 *.json 을 전부 읽는다(파일별 코드 없음, 형식은 lists.py 참고).
KR_LISTS_DIR = "kr_lists"
# 상대국(EU·US·CN·JP 등) 법령별 물질 목록 폴더. 안의 *.json 을 전부 읽는다(파일별 코드 없음, 형식은 lists.py 참고).
INTL_LISTS_DIR = "intl_lists"
# 인허가·신고 파일. 새 파일을 받으면 여기에 한 줄만 추가한다(형식은 permits.py 참고).
PERMIT_FILES: tuple[str, ...] = ("kr_permits_env.json", "kr_permits_safety.json", "kr_permits_product.json")

ALL_FILES: tuple[str, ...] = (KR_RULES_FILE, *LIST_FILES, *PERMIT_FILES, HS_DB_FILE)


def data_dir() -> Path:
    # 테스트는 DATA_DIR 를 monkeypatch 한다. 그래서 모듈 상수를 직접 쓰지 않고 매번 여기서 읽는다.
    return Path(DATA_DIR)


def file_path(name: str) -> Path:
    return data_dir() / name


def _folder_files(name: str) -> list[Path]:
    folder = file_path(name)
    return sorted(folder.glob("*.json")) if folder.is_dir() else []


def kr_list_files() -> list[Path]:
    """kr_lists/ 안의 *.json (이름순). 폴더가 없으면 빈 목록."""
    return _folder_files(KR_LISTS_DIR)


def intl_list_files() -> list[Path]:
    """intl_lists/ 안의 *.json (이름순). 폴더가 없으면 빈 목록."""
    return _folder_files(INTL_LISTS_DIR)


def sources_status() -> dict[str, str]:
    """자료 파일별 존재 여부: present / missing. 폴더(kr_lists/, intl_lists/)는 json 이 하나라도 있으면 present."""
    status = {name: ("present" if file_path(name).is_file() else "missing") for name in ALL_FILES}
    status[f"{KR_LISTS_DIR}/"] = "present" if kr_list_files() else "missing"
    status[f"{INTL_LISTS_DIR}/"] = "present" if intl_list_files() else "missing"
    return status
