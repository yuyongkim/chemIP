"""폐기물관리법: 지정폐기물의 종류(시행령 별표 1), 지정폐기물 함유 유해물질(시행규칙 별표 1),
폐유기용제 중 할로겐족 물질(시행규칙 별표 2)."""
from __future__ import annotations

import re

from . import common, entries, lawgo, listfile, textutil

LAW = "폐기물관리법"
DECREE = "폐기물관리법 시행령"
RULE = "폐기물관리법 시행규칙"

_OBLIG = [
    "사업장폐기물배출자: 지정폐기물 해당 여부를 폐기물분석전문기관에 의뢰하여 미리 확인(법 제17조제1항제1호)",
    "지정폐기물 처리 전 폐기물처리계획서·폐기물분석결과서 등 제출·확인(법 제17조제5항)",
    "지정폐기물 처리기준·방법 준수(법 제13조, 시행규칙 별표 5) 및 전자인계(올바로)",
]


def build_types(decree) -> dict:
    a = lawgo.annex(decree, 1)
    acc = entries.new_accumulator()
    items = textutil.numbered_items(a["text"])
    deleted = sum(1 for it in items if it["deleted"])
    for it in items:
        if it["deleted"]:
            continue
        title = re.split(r"\s(?=가\.)", it["text"], 1)[0]
        entries.add_family(acc, it["no"], title, it["text"][:600])
    meta = common.law_meta(decree, a, "KR_WASTE_DESIGNATED_TYPES", LAW, "지정폐기물의 종류",
                           "폐기물관리법 제2조제4호, 같은 법 시행령 제3조 및 별표 1", _OBLIG)
    notes = ["지정폐기물은 폐기물의 종류(성상·발생원)로 정해지며 개별 CAS 목록이 아님. 물질 연결은 시행규칙 별표 1(함유 유해물질)·별표 2(할로겐족 폐유기용제) 목록을 사용.",
             "제9호 폐유독물질은 화학물질관리법 제2조의 인체급성·만성유해성물질, 생태유해성물질, 허가·제한·금지물질, 사고대비물질을 폐기하는 경우로 한정 (원문 요지) — 해당 CAS는 NCIS 분류(별도 담당)로 연결."]
    return listfile.build(meta, acc, len(items) - deleted, deleted, notes)


def build_constituents(rule) -> dict:
    a = lawgo.annex(rule, 1)
    acc = entries.new_accumulator()
    text = a["text"]
    count = 0
    for sec_no, section in re.findall(r"(?ms)^\s*(\d)\.\s(.*?)(?=^\s*\d\.\s|\Z)", text):
        subs = re.findall(r"(?ms)^\s*([가-하])\.\s(.*?)(?=^\s*[가-하]\.\s|\Z)", section)
        for letter, body in subs:
            body = " ".join(ln.strip() for ln in body.splitlines() if ln.strip())
            name = re.split(r"\[|\(", body, 1)[0].strip()
            item_no = f"{sec_no}.{letter}"
            count += 1
            detail = f"지정폐기물 함유 유해물질 (시행규칙 별표 1 제{sec_no}호 {letter}목): {body[:300]}"
            if name.startswith("제1호") or name.startswith("그 밖에") or name in ("기름성분",) or "천연방사성" in name:
                entries.add_family(acc, item_no, name, detail)
            else:
                entries.add_item(acc, item_no, name.replace("또는 그 화합물", "및 그 화합물"), detail)
    meta = common.law_meta(rule, a, "KR_WASTE_HAZARDOUS_CONSTITUENTS", LAW, "지정폐기물에 함유된 유해물질",
                           "폐기물관리법 시행령 별표 1 제1호나목·제3호, 같은 법 시행규칙 제2조제1항 및 별표 1", _OBLIG)
    notes = ["용출시험 기준(폐기물공정시험기준) 이상 함유 시에만 지정폐기물(오니류·폐흡착제·폐흡수제, 광재·분진·소각재 등)에 해당 — 기준값은 detail에 원문 수록.",
             "'납 또는 그 화합물' 표기는 '그 화합물' 그룹으로 처리하고 원소 자체를 함께 연결함."]
    return listfile.build(meta, acc, 16, 0, notes)


def build_halogenated(rule) -> dict:
    a = lawgo.annex(rule, 2)
    acc = entries.new_accumulator()
    items = textutil.numbered_items(a["text"])
    generic = {"디클로로에탄", "트리클로로에탄", "디클로로벤젠", "모노클로로페놀", "디클로로페놀"}
    for it in items:
        m = re.match(r"^(.+?)\((.+)\)$", it["text"].strip())
        ko, en = (m.group(1).strip(), m.group(2).strip()) if m else (it["text"].strip(), None)
        detail = "폐유기용제 중 할로겐족 (시행규칙 별표 2)"
        if it["no"] == "18":
            entries.add_family(acc, it["no"], "제1호~제17호 물질 5% 이상 함유 물질", it["text"])
        elif ko in generic:
            entries.add_family(acc, it["no"], ko, detail + " — 이성질체 위치가 법령에 명시되지 않음(모든 이성질체로 해석 가능, CAS 미지정)",
                               name_en=en)
        else:
            entries.add_item(acc, it["no"], ko, detail, extra_names=[en] if en else None)
    meta = common.law_meta(rule, a, "KR_WASTE_HALOGENATED_SOLVENTS", LAW, "폐유기용제 중 할로겐족에 해당되는 물질",
                           "폐기물관리법 시행령 별표 1 제4호가목, 같은 법 시행규칙 제2조제2항 및 별표 2", _OBLIG + [
                               "할로겐족 폐유기용제는 지정폐기물(시행령 별표 1 제4호가목)로 분리 보관·처리"])
    return listfile.build(meta, acc, len(items), 0)


def build_all() -> list[dict]:
    decree = lawgo.fetch_law(DECREE)
    rule = lawgo.fetch_law(RULE)
    return [build_types(decree), build_constituents(rule), build_halogenated(rule)]
