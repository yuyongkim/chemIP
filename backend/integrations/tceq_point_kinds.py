"""TCEQ 배출사고 보고의 배출점 이름(point_name) → 배출점 종류 → EPC 설계 검증 분야 (데이터 표).

배출점은 "오염물질이 대기로 나간 자리"일 뿐 사고 원인이 아니다. 이 표는 분포를 보여 주는 데만 쓴다.
종류 판정은 위에서부터 처음 맞는 줄을 쓴다(예: "Relief Valve" 는 배관·누출보다 먼저 안전밸브로 잡힌다).
새 낱말은 POINT_KIND_RULES 에 한 줄, 새 종류는 POINT_KINDS 와 KIND_EQUIPMENT 에 한 줄씩 추가한다.
"""
from __future__ import annotations

import re

from backend.integrations.equipment_disciplines import discipline_of

# 종류 키 → 화면 이름
POINT_KINDS: dict[str, str] = {
    "flare": "플레어",
    "tank": "탱크·섬프",
    "relief": "안전밸브·파열판",
    "leak": "누출·배관·비산",
    "other": "기타(굴뚝·가열로 등)",
}

# (정규식, 종류) — 위에서부터 처음 맞는 것. 대소문자 무시.
POINT_KIND_RULES: list[tuple[str, str]] = [
    (r"\b(psv|prv)s?\b|relief valve|relief device|pressure relief|rupture (disc|disk)|safety (relief )?valve", "relief"),
    (r"flare|\bfl-?\d", "flare"),
    (r"\btank|\btk-?\d|\bsump|tank ?farm|\bfloating roof", "tank"),
    (r"fugitive|fug\b|fug\d|\bleak|\bpipe|piping|\bhole\b|\bvalve|\bflange|\bpump seal|\bline\b", "leak"),
]
_COMPILED = [(re.compile(p, re.IGNORECASE), k) for p, k in POINT_KIND_RULES]

# 종류 → equipment_disciplines.EQUIPMENT_MAP 의 설비 키(분야는 그 표에서 읽는다). None = 대응 분야 없음.
# 플레어는 설계 분야(배관·압력용기·회전기계·계장·전기) 어느 하나에 잇지 않는다 — 배출이 나간 처리 설비일 뿐이다.
KIND_EQUIPMENT: dict[str, str | None] = {
    "flare": None,
    "tank": "storage tank",
    "relief": "relief valve",
    "leak": "piping",
    "other": None,
}


def point_kind(point_name: str | None) -> str:
    name = (point_name or "").strip()
    for rx, kind in _COMPILED:
        if rx.search(name):
            return kind
    return "other"


def kind_discipline(kind: str) -> str | None:
    equipment = KIND_EQUIPMENT.get(kind)
    return discipline_of(equipment) if equipment else None
