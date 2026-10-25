"""형제 프로젝트 연동: 사고 사례(Chem_Eng)·근거 조문(EPC engineering)·미국 집행 사건·한국 통합허가 사례(Environment). 모두 CAS 기준."""

from __future__ import annotations

import re

from fastapi import APIRouter, HTTPException, Query

from backend.integrations.echo_enforcement_store import get_enforcement_by_cas
from backend.integrations.epc_regulation_text import find_provisions
from backend.integrations.incident_store import get_incidents_by_cas
from backend.integrations.kr_permit_context_store import get_permit_context_by_cas

router = APIRouter()
_CAS_RE = re.compile(r"^\d{2,7}-\d{2}-\d$")


def _cas(cas_no: str) -> str:
    cas_no = (cas_no or "").strip()
    if not _CAS_RE.match(cas_no):
        raise HTTPException(status_code=400, detail="invalid_cas")
    return cas_no


@router.get("/incidents/{cas_no}")
def incidents(cas_no: str, limit: int = Query(8, ge=1, le=30)):
    """사고 사례와, 사고 난 설비의 EPC 설계 검증 분야."""
    return get_incidents_by_cas(_cas(cas_no), limit=limit)


@router.get("/provisions/{cas_no}")
def provisions(cas_no: str, country: str = Query(..., min_length=2, max_length=5), name: str = Query("", max_length=120)):
    """선택한 나라 법령 본문 중 이 물질을 다루는 조문(EPC 관할 인덱스 하이브리드 검색)."""
    return find_provisions(country, _cas(cas_no), name)


@router.get("/enforcement/{cas_no}")
def enforcement(cas_no: str, limit: int = Query(6, ge=1, le=20)):
    """미국 EPA 집행 사건(ECHO)."""
    return get_enforcement_by_cas(_cas(cas_no), limit=limit)


@router.get("/kr-permit-context/{cas_no}")
def kr_permit_context(cas_no: str):
    """한국 통합환경허가 실제 사례: 배출기준 분포·업종·처리기간·CleanSYS 배출량(IEPS·CleanSYS, Environment 가공본)."""
    return get_permit_context_by_cas(_cas(cas_no))
