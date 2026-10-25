"""토양환경보전법: 토양오염물질(시행규칙 별표 1), 우려기준(별표 3), 대책기준(별표 7)."""
from __future__ import annotations

import re

from . import common, entries, lawgo, listfile, textutil

LAW = "토양환경보전법"
RULE = "토양환경보전법 시행규칙"


def _standards(text: str) -> dict[str, dict]:
    """'┃ 1. 카드뮴 │4 │10 │60 ┃' rows -> {name: {1지역, 2지역, 3지역}}."""
    out = {}
    for rec in textutil.table_records(text):
        if len(rec) >= 4:
            m = re.match(r"^\s*(\d+)\.\s*(.+)$", rec[0])
            if m:
                out[m.group(1)] = {"name": m.group(2).strip(), "1지역": rec[1], "2지역": rec[2], "3지역": rec[3]}
    return out


def build() -> dict:
    rule = lawgo.fetch_law(RULE)
    a = lawgo.annex(rule, 1)
    worry = _standards(lawgo.annex(rule, 3)["text"])
    action = _standards(lawgo.annex(rule, 7)["text"])
    acc = entries.new_accumulator()
    items = textutil.numbered_items(a["text"])
    deleted = sum(1 for it in items if it["deleted"])
    for it in items:
        if it["deleted"]:
            continue
        w, x = worry.get(it["no"]), action.get(it["no"])
        detail = "토양오염물질 (시행규칙 별표 1)"
        if w:
            detail += f"; 우려기준(별표 3, mg/kg·다이옥신 pg-TEQ/g) {w['name']}: 1지역 {w['1지역']}, 2지역 {w['2지역']}, 3지역 {w['3지역']}"
        if x:
            detail += f"; 대책기준(별표 7) 1지역 {x['1지역']}, 2지역 {x['2지역']}, 3지역 {x['3지역']}"
        entries.add_item(acc, it["no"], it["text"], detail)
    meta = common.law_meta(rule, a, "KR_SOIL_POLLUTANTS", LAW, "토양오염물질",
                           "토양환경보전법 제2조제2호, 같은 법 시행규칙 제1조의2 및 별표 1 (우려기준 별표 3, 대책기준 별표 7)", [
                               "토양오염우려기준(법 제4조의2, 별표 3) 초과 시 토양정밀조사·정화 조치명령 대상",
                               "토양오염대책기준(법 제16조, 별표 7) 초과 지역은 토양보전대책지역 지정 대상",
                               "별표 1 물질을 저장하는 유해화학물질 저장시설 등은 특정토양오염관리대상시설(시행규칙 별표 2 제2호) → 설치신고(법 제12조) 및 토양오염검사",
                           ])
    notes = [
        "별표 2 제2호: 유기용제류의 특정토양오염관리대상시설은 트리클로로에틸렌(TCE)·테트라클로로에틸렌(PCE)·1,2-디클로로에탄 저장시설에 한정 (원문).",
        "별표 3·7 비고: 벤조(a)피렌 항목은 제한물질·유해화학물질의 제조 및 저장시설과 폐받침목을 사용한 지역에만 적용 (원문).",
        "우려/대책기준 표의 물질명은 '카드뮴'·'시안'처럼 원소/이온 기준으로 표기됨(별표 1의 '카드뮴 및 그 화합물' 등과 같은 번호로 연결).",
    ]
    return listfile.build(meta, acc, len(items) - deleted, deleted, notes)


def build_all() -> list[dict]:
    return [build()]
