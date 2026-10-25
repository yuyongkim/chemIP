"""먹는물관리법: 먹는물 수질기준(먹는물 수질기준 및 검사 등에 관한 규칙 별표 1, 화학 항목)."""
from __future__ import annotations

import re

from . import common, entries, lawgo, listfile, textutil

DW = "먹는물관리법"
DW_RULE = "먹는물 수질기준 및 검사 등에 관한 규칙"

_DW_NONSUBSTANCE = {"경도", "과망간산칼륨 소비량", "냄새와 맛", "색도", "수소이온 농도", "증발잔류물", "탁도",
                    "잔류염소", "총트리할로메탄", "할로아세틱에시드", "암모니아성 질소", "질산성 질소",
                    "세제", "염소이온", "황산이온", "불소", "시안", "브롬산염"}
_DW_ELEMENT = {"납", "비소", "셀레늄", "수은", "크롬", "카드뮴", "붕소", "스트론튬", "우라늄", "동", "아연", "철",
               "망간", "알루미늄"}


def build_drinking_water() -> dict:
    rule = lawgo.fetch_law(DW_RULE)
    a = lawgo.annex(rule, 1)
    acc = entries.new_accumulator()
    sections = re.split(r"(?m)^\s*(\d)\.\s+([^\n]*기준[^\n]*)$", a["text"])
    counted = {}
    for i in range(1, len(sections), 3):
        sec, title, body = sections[i], sections[i + 1].strip(), sections[i + 2]
        if sec not in ("2", "3", "4", "5"):
            continue
        n = 0
        for letter, item in re.findall(r"(?ms)^\s*([가-하]|거|너|더)\.\s(.*?)(?=^\s*(?:[가-하]|거|너|더)\.\s|\Z)", body):
            item = " ".join(x.strip() for x in item.splitlines() if x.strip())
            m = re.match(r"^(.+?)(?:\([^)]*\))?(?:은|는)\s", item)
            if not m:
                continue
            name = m.group(1).strip()
            n += 1
            detail = f"먹는물 수질기준 별표 1 제{sec}호 {letter}목: {item[:200]}"
            no = f"{sec}.{letter}"
            if name in _DW_ELEMENT:
                entries.add_element_group(acc, no, name, detail)
            elif name in _DW_NONSUBSTANCE or name.startswith("세제"):
                entries.add_family(acc, no, name, detail)
            else:
                entries.add_item(acc, no, name, detail)
        counted[f"{sec}. {title}"] = n
    meta = common.law_meta(rule, a, "KR_DRINKING_WATER_STANDARDS", DW, "먹는물의 수질기준 (화학 항목)",
                           "먹는물관리법 제5조, 먹는물 수질기준 및 검사 등에 관한 규칙 제2조 및 별표 1 제2호~제5호", [
                               "수돗물·먹는샘물·먹는염지하수 등 먹는물의 수질기준 (공급자/제조자 검사 의무) — 화학물질 취급 사업장 인허가와는 직접 관계 없음",
                           ])
    meta["groups"] = counted
    notes = ["제1호(미생물)와 제6호(방사능: 세슘-137, 스트론튬-90, 삼중수소)는 화학물질 목록 범위에서 제외.",
             "금속 항목은 원소 총량 기준이므로 family_entries(원소 기호) + 원소 자체 엔트리로 수록."]
    return listfile.build(meta, acc, sum(counted.values()), 0, notes)


def build_all() -> list[dict]:
    return [build_drinking_water()]
