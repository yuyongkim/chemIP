"""물환경보전법: 수질오염물질(시행규칙 별표 2) / 특정수질유해물질(시행규칙 별표 3, 적용기준 별표 13의2)."""
from __future__ import annotations

from . import common, entries, lawgo, listfile, textutil

LAW = "물환경보전법"
RULE = "물환경보전법 시행규칙"


def _thresholds(rule) -> dict[str, str]:
    out = {}
    for rec in textutil.table_records(lawgo.annex(rule, 13, 2)["text"]):
        if len(rec) >= 2 and rec[0] and rec[0] != "물질명":
            out[entries.clean_name(rec[0]).replace(" ", "")] = rec[1]
    return out


def build_pollutants(rule) -> dict:
    a = lawgo.annex(rule, 2)
    acc = entries.new_accumulator()
    items = textutil.numbered_items(a["text"])
    deleted = sum(1 for it in items if it["deleted"])
    for it in items:
        if not it["deleted"]:
            entries.add_item(acc, it["no"], it["text"], "수질오염물질 (시행규칙 별표 2)")
    meta = common.law_meta(rule, a, "KR_WATER_POLLUTANTS", LAW, "수질오염물질",
                           "물환경보전법 제2조제7호, 같은 법 시행규칙 제3조 및 별표 2", [
                               "폐수배출시설 해당 시 배출시설 설치허가 또는 설치신고(법 제33조, 시행령 제31조)",
                               "배출허용기준 준수(법 제32조, 시행규칙 별표 13)",
                               "화학물질 배출량조사 대상 화학물질의 범위에 포함(화학물질관리법 시행령 제6조제4호, 수질오염물질 중 화학물질)",
                           ])
    return listfile.build(meta, acc, len(items) - deleted, deleted)


def build_specific(rule) -> dict:
    a = lawgo.annex(rule, 3)
    thr = _thresholds(rule)
    acc = entries.new_accumulator()
    items = textutil.numbered_items(a["text"])
    deleted = sum(1 for it in items if it["deleted"])
    missing = []
    for it in items:
        if it["deleted"]:
            continue
        key = entries.clean_name(it["text"]).replace(" ", "")
        t = thr.get(key)
        if t is None:
            missing.append(it["text"])
        detail = "특정수질유해물질 (시행규칙 별표 3); 설치허가 적용 기준농도(별표 13의2): " + (f"{t} mg/L" if t else "표에 없음")
        entries.add_item(acc, it["no"], it["text"], detail)
    meta = common.law_meta(rule, a, "KR_WATER_SPECIFIC_HAZARDOUS", LAW, "특정수질유해물질",
                           "물환경보전법 제2조제8호, 같은 법 시행규칙 제4조 및 별표 3 (설치허가 적용기준: 시행규칙 제35조의2 및 별표 13의2)", [
                               "별표 13의2 기준농도 이상 배출되는 폐수배출시설 → 배출시설 설치허가 대상(시행령 제31조제1항제1호)",
                               "변경허가 기준 강화: 폐수배출량 100분의 30 이상 증가 시 변경허가(시행령 제31조제3항제1호)",
                               "배출시설 설치제한지역에서는 폐수무방류배출시설로만 설치 가능(법 제33조제9항)",
                               "특정수질유해물질 배출량조사 및 결과 제출(법 제46조의2; 화학물질관리법 배출량조사 자료 제출 시 제외)",
                           ])
    notes = []
    if missing:
        notes.append(f"별표 13의2 표에서 기준농도를 찾지 못한 항목: {missing}")
    return listfile.build(meta, acc, len(items) - deleted, deleted, notes)


def build_all() -> list[dict]:
    rule = lawgo.fetch_law(RULE)
    return [build_pollutants(rule), build_specific(rule)]
