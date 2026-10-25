"""사고 기록의 설비 이름 → EPC 설계 검증 분야·적용 기준, Chem_Eng 경험 그래프 설비 키.

사고가 난 설비를 "그 설비를 설계할 때 무엇으로 검증하는가"에 잇는 표다. 설비 이름은 incidents.db 의
equipment 칸(쉼표 구분 영문 토큰)을 따른다. 새 설비는 EQUIPMENT_MAP 에 한 줄만 추가한다.
"""
from __future__ import annotations

# EPC 분야 → (화면 이름, 대표 설계·검사 기준). 분야 키는 epc.yule.pics/<분야> 경로와 같다.
DISCIPLINES: dict[str, tuple[str, str]] = {
    "piping": ("배관", "ASME B31.3 · API 570"),
    "vessel": ("압력용기·저장설비", "ASME VIII Div.1 · API 510 · API 579-1"),
    "rotating": ("회전기계", "API 610 · 617 · 670"),
    "instrumentation": ("계장·안전계장", "IEC 61511 · ISA-TR84.00.02"),
    "electrical": ("전기", "IEEE C57.104 · 1584"),
}

# 설비 토큰 → (EPC 분야, Chem_Eng 경험 그래프 설비 키 또는 None)
EQUIPMENT_MAP: dict[str, tuple[str, str | None]] = {
    "piping": ("piping", "배관"),
    "valve": ("piping", "배관"),
    "flange/gasket/seal": ("piping", "배관"),
    "joint/flange": ("piping", "배관"),
    "flange": ("piping", "배관"),
    "gasket failure": ("piping", "배관"),
    "hose/transfer connection": ("piping", "배관"),
    "transfer hose": ("piping", "배관"),
    "expansion joint/bellows": ("piping", "배관"),
    "strainer": ("piping", "배관"),
    "sight glass": ("piping", "배관"),
    "process vessel": ("vessel", None),
    "storage vessel": ("vessel", None),
    "storage tank": ("vessel", None),
    "pressure vessel": ("vessel", None),
    "reactor": ("vessel", None),
    "cylinder": ("vessel", None),
    "nurse tank": ("vessel", None),
    "silo/hopper": ("vessel", None),
    "absorber/scrubber": ("vessel", "컬럼"),
    "scrubber": ("vessel", "컬럼"),
    "distillation column": ("vessel", "컬럼"),
    "heat exchanger": ("vessel", "열교환기"),
    "exchanger": ("vessel", "열교환기"),
    "condenser": ("vessel", "열교환기"),
    "evaporator": ("vessel", "열교환기"),
    "relief device": ("vessel", None),
    "pressure relief valve": ("vessel", None),
    "relief valve": ("vessel", None),
    "safety relief valve": ("vessel", None),
    "rupture disk": ("vessel", None),
    "pump": ("rotating", "펌프"),
    "compressor": ("rotating", "컴프레서"),
    "mixer/blender": ("rotating", None),
    "centrifuge/filter": ("rotating", None),
    "instrumentation/control": ("instrumentation", None),
    "pressure gauge": ("instrumentation", None),
    "regulator": ("instrumentation", None),
    "electrical equipment": ("electrical", None),
}


def split_equipment(raw: str | None) -> list[str]:
    return [t.strip() for t in (raw or "").split(",") if t.strip() and t.strip() != "unknown"]


def discipline_of(token: str) -> str | None:
    hit = EQUIPMENT_MAP.get(token)
    return hit[0] if hit else None


def experience_key_of(token: str) -> str | None:
    hit = EQUIPMENT_MAP.get(token)
    return hit[1] if hit else None
