"""형제 프로젝트(Chem_Eng · EPC engineering · Environment)의 자료 위치와 공개 주소. 경로·URL 은 여기서만 정의한다.

모두 같은 PC 의 로컬 자원이며 읽기 전용으로만 쓴다. 환경변수로 바꿀 수 있다.
"""
from __future__ import annotations

import os
from pathlib import Path

DESKTOP = Path.home() / "Desktop"

# Chem_Eng: 사고 사례 DB(CSB·eMARS·KOSHA·NICS·EPA RMP, 행마다 라이선스 기록)
CHEMENG_INCIDENTS_DB = Path(os.getenv("CHEMENG_INCIDENTS_DB", DESKTOP / "Chem_Eng" / "Chem_Eng" / "data" / "incidents.db"))
CHEMENG_EXPERIENCE_URL = os.getenv("CHEMENG_EXPERIENCE_URL", "http://127.0.0.1:8004")
CHEMENG_PUBLIC_URL = "https://chemeng.yule.pics"

# EPC engineering: 224개국 규제 본문 검색 서비스와 설계 검증 화면
EPC_QUERY_URL = os.getenv("EPC_QUERY_URL", "http://127.0.0.1:15412")
EPC_PUBLIC_URL = "https://epc.yule.pics"

# Environment: EPA ECHO 집행 자료에서 뽑은 CAS 색인(scripts/build_echo_cas_index.py 가 만든다)
ECHO_EXTRACTED_DIR = Path(os.getenv("ECHO_EXTRACTED_DIR", DESKTOP / "Environment" / "Environment_1" / "data" / "extracted"))
ECHO_CAS_INDEX_DB = Path(os.getenv("ECHO_CAS_INDEX_DB", Path(__file__).resolve().parents[2] / "data" / "echo_cas_index.db"))
ENVIRONMENT_PUBLIC_URL = "https://env.yule.pics"

# Environment: 한국 대기 인허가 가공본(통합환경허가 검토결과서 배출기준·처리기간, CleanSYS 연간 배출량).
# scripts/build_kr_permit_context.py 가 이 폴더 CSV 를 읽어 data/kr_permit_context.db 를 만든다.
ENV_KR_PROCESSED_DIR = Path(os.getenv("ENV_KR_PROCESSED_DIR", DESKTOP / "Environment" / "Environment_1" / "data" / "processed" / "intl" / "kr"))
KR_PERMIT_CONTEXT_DB = Path(os.getenv("KR_PERMIT_CONTEXT_DB", Path(__file__).resolve().parents[2] / "data" / "kr_permit_context.db"))
IEPS_POST_URL = "https://ieps.nier.go.kr/web/board/7/{post_id}/?pMENUMST_ID=176"
