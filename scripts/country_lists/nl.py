"""네덜란드: 환경활동법령(Bal, BWBR0041330) 부록 III·IIa·V·VIa 물질 표."""
from __future__ import annotations

import re
from typing import Iterable

from .base import Row, cas_valid, jurisdiction_db, ro

SOURCE = "Besluit activiteiten leefomgeving (BWBR0041330)"
OWNED = ("NL_BAL_STOFKLASSE", "NL_BAL_ZZS_IMMISSION", "NL_BAL_SOIL_INTERVENTION", "NL_BAL_PRTR")

# 부록 III 물질등급. MVP 1 이 네덜란드 고위험물질(ZZS) 이다.
_CLASS = re.compile(r"^(ERS|MVP ?[12]|g[AO]\.\d|s[AO]\.\d|S|---)$")
_CLASS_NOTE = {
    "ERS": "극고위험물질",
    "MVP 1": "ZZS(매우 우려 물질), 배출 최소화 의무",
    "MVP 2": "배출 최소화 의무",
    "S": "총 분진",
    "---": "등급 없음, 배출 한계 미설정",
}
_VALUE = re.compile(r"^(–|-|[\d.]+(,\d+)?)$")
_FOOTNOTE = re.compile(r"(?<=[A-Za-z)])\d$")


def _lines(section: str) -> list[str]:
    """한 부록의 청크를 원래 순서로 이어 붙여 줄 목록으로 돌려준다(청크는 줄 경계에서 나뉘어 있다)."""
    with ro(jurisdiction_db("nld")) as c:
        rows = c.execute(
            "SELECT content FROM documents WHERE instrument = 'nld_bal' AND section = ? ORDER BY rowid",
            (section,),
        ).fetchall()
    text = "\n".join(content for (content,) in rows)
    return [ln.strip() for ln in text.splitlines() if ln.strip()]


def _cas_list(token: str) -> list[str]:
    parts = [p.strip() for p in token.split(";")]
    return parts if parts and all(cas_valid(p) for p in parts) else []


def _class_detail(cls: str) -> str:
    cls = re.sub(r"^MVP(\d)$", r"MVP \1", cls)
    kind = cls[:2]
    note = _CLASS_NOTE.get(cls) or {
        "gA": "기체 무기물", "gO": "기체 유기물", "sA": "분진 무기물", "sO": "분진 유기물",
    }.get(kind, "")
    return f"Stofklasse {cls}" + (f" ({note})" if note else "")


def parse_stofklasse() -> Iterable[Row]:
    """부록 III: 'CAS / 이름(여러 줄 가능) / 물질등급' 반복."""
    lines = _lines("Bijlage III")
    for i, tok in enumerate(lines):
        if not cas_valid(tok):
            continue
        name_parts: list[str] = []
        for nxt in lines[i + 1:i + 6]:
            if _CLASS.match(nxt):
                yield Row(tok, "NL_BAL_STOFKLASSE", _class_detail(nxt), f"{SOURCE} Bijlage III", " ".join(name_parts))
                break
            if cas_valid(nxt):
                break
            name_parts.append(nxt)


def parse_zzs_immission() -> Iterable[Row]:
    """부록 VIa: 'CAS / 이름 / 대기 중 농도 한계(μg/m3)' 반복."""
    lines = _lines("Bijlage VIa")
    for i, tok in enumerate(lines[:-2]):
        if cas_valid(tok) and _VALUE.match(lines[i + 2]):
            yield Row(tok, "NL_BAL_ZZS_IMMISSION", f"ZZS immission limit: {lines[i + 2]} μg/m3",
                      f"{SOURCE} Bijlage VIa", _FOOTNOTE.sub("", lines[i + 1]))


def parse_soil_intervention() -> Iterable[Row]:
    """부록 IIa: '이름 / CAS(세미콜론으로 여러 개 가능) / 토양 개입값(mg/kg ds)' 반복."""
    lines = _lines("Bijlage IIa")
    for i in range(1, len(lines) - 1):
        cas_nos = _cas_list(lines[i])
        if not cas_nos or not _VALUE.match(lines[i + 1]):
            continue
        for cas in cas_nos:
            yield Row(cas, "NL_BAL_SOIL_INTERVENTION", f"Soil intervention value: {lines[i + 1]} mg/kg dw",
                      f"{SOURCE} Bijlage IIa", _FOOTNOTE.sub("", lines[i - 1]))


def parse_prtr() -> Iterable[Row]:
    """부록 V: '물질번호 / CAS / 이름 / 보고 기준(kg/년)' 반복."""
    lines = _lines("Bijlage V")
    for i, tok in enumerate(lines[:-2]):
        if cas_valid(tok) and _VALUE.match(lines[i + 2]):
            yield Row(tok, "NL_BAL_PRTR", f"PRTR reporting threshold: {lines[i + 2]} kg/yr",
                      f"{SOURCE} Bijlage V", lines[i + 1])


PARSERS = {
    "nl_bal_stofklasse": parse_stofklasse,
    "nl_bal_zzs_immission": parse_zzs_immission,
    "nl_bal_soil": parse_soil_intervention,
    "nl_bal_prtr": parse_prtr,
}
