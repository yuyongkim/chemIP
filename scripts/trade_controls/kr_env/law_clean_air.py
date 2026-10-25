"""대기환경보전법: 대기오염물질 / 유해성대기감시물질 / 특정대기유해물질 / 휘발성유기화합물(고시).

Sources (law.go.kr, current versions fetched at run time):
  시행규칙 별표 1, 별표 1의2, 별표 2, 별표 8의2;  환경부고시 제2015-181호 (HWP attachment).
"""
from __future__ import annotations

import re

from . import cas as casmod
from . import common, config, entries, hwp_text, lawgo, listfile, textutil

LAW = "대기환경보전법"
RULE = "대기환경보전법 시행규칙"
VOC_NOTICE = "휘발성유기화합물 지정 고시"
VOC_HWP_URL = "https://www.law.go.kr/flDownload.do?flSeq=21576118"


def _numbered(acc, text, detail):
    items = textutil.numbered_items(text)
    deleted = 0
    for it in items:
        if it["deleted"]:
            deleted += 1
            continue
        entries.add_item(acc, it["no"], it["text"], detail)
    return len(items) - deleted, deleted


def _permit_thresholds(rule: lawgo.LawDoc) -> dict[str, str]:
    """별표 8의2: 설치허가 대상 특정대기유해물질 배출시설의 적용기준 (물질명 -> 기준농도)."""
    out = {}
    for rec in textutil.table_records(lawgo.annex(rule, 8, 2)["text"]):
        if len(rec) >= 2 and rec[0] and rec[0] != "물질명":
            out[entries.clean_name(rec[0])] = rec[1]
    return out


def build_pollutants(rule) -> dict:
    a = lawgo.annex(rule, 1)
    acc = entries.new_accumulator()
    n, d = _numbered(acc, a["text"], "대기오염물질 (시행규칙 별표 1)")
    meta = common.law_meta(rule, a, "KR_CLEAN_AIR_POLLUTANTS", LAW, "대기오염물질",
                           "대기환경보전법 제2조제1호, 같은 법 시행규칙 제2조 및 별표 1", [
                               "대기오염물질배출시설(시행규칙 별표 3) 해당 여부 판단 → 배출시설 설치허가 또는 설치신고(법 제23조)",
                               "배출허용기준 준수(법 제16조, 시행규칙 별표 8)",
                               "자가측정(법 제39조, 시행규칙 별표 11)",
                               "화학물질 배출량조사 대상 화학물질의 범위에 포함(화학물질관리법 시행령 제6조제2호)",
                           ])
    return listfile.build(meta, acc, n, d)


def build_monitoring(rule) -> dict:
    a = lawgo.annex(rule, 1, 2)
    acc = entries.new_accumulator()
    n, d = _numbered(acc, a["text"], "유해성대기감시물질 (시행규칙 별표 1의2)")
    meta = common.law_meta(rule, a, "KR_CLEAN_AIR_HAZARDOUS_MONITORING", LAW, "유해성대기감시물질",
                           "대기환경보전법 제2조제1호의2, 같은 법 시행규칙 제2조의2 및 별표 1의2", [
                               "국가의 지속적 측정·감시 대상(법 제2조제1호의2) — 사업자 직접 의무는 대기오염물질·특정대기유해물질 규정에 따름",
                           ])
    return listfile.build(meta, acc, n, d)


def build_specific_hap(rule) -> dict:
    a = lawgo.annex(rule, 2)
    thresholds = _permit_thresholds(rule)
    acc = entries.new_accumulator()
    items = textutil.numbered_items(a["text"])
    deleted = 0
    for it in items:
        if it["deleted"]:
            deleted += 1
            continue
        name = entries.clean_name(it["text"])
        thr = thresholds.get(name) or thresholds.get(name.replace(" ", ""))
        if thr is None:
            for k, v in thresholds.items():
                if k.replace(" ", "") == name.replace(" ", ""):
                    thr = v
        if thr is None:
            for k, v in thresholds.items():
                if k.startswith("총 VOCs") and name in k:
                    thr = f"{v} (총 VOCs 합산)"
        detail = "특정대기유해물질 (시행규칙 별표 2); 설치허가 기준농도(별표 8의2): " + (
            thr if thr else "표에 미기재 → 비고에 따라 0.00 (기준농도 없음)")
        entries.add_item(acc, it["no"], it["text"], detail)
    meta = common.law_meta(rule, a, "KR_CLEAN_AIR_SPECIFIC_HAP", LAW, "특정대기유해물질",
                           "대기환경보전법 제2조제9호, 같은 법 시행규칙 제4조 및 별표 2 (설치허가 적용기준: 시행규칙 제24조의2 및 별표 8의2)", [
                               "별표 8의2 기준농도 이상 발생 배출시설 → 배출시설 설치허가 대상(시행령 제11조제1항제1호)",
                               "변경허가 기준 강화: 배출시설 규모 100분의 30 이상 증설 시 변경허가(시행령 제11조제4항제1호)",
                               "배출시설 설치 제한 가능(법 제23조제8항)",
                               "배출허용기준 준수(시행규칙 별표 8)",
                           ])
    notes = ["별표 8의2 비고: 특정대기유해물질 중 표에 기준농도가 정해지지 않은 물질의 기준농도는 0.00으로 한다 (원문 인용)."]
    return listfile.build(meta, acc, len(items) - deleted, deleted, notes)


def _voc_records(text: str) -> list[dict]:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    start = lines.index("CAS No.") + 1
    recs, cur, expect = [], None, 1
    for ln in lines[start:]:
        if ln.startswith("*") or ln.startswith("나."):
            break
        if ln == str(expect):
            if cur:
                recs.append(cur)
            cur = {"no": expect, "cells": []}
            expect += 1
            continue
        if cur is not None:
            cur["cells"].append(ln)
    if cur:
        recs.append(cur)
    return recs


def build_voc() -> dict:
    doc = lawgo.fetch_admrul(VOC_NOTICE)
    hwp_path = config.RAW_ROOT / "voc_hwp" / "notice_2015_181.hwp"
    if not hwp_path.exists():
        hwp_path.parent.mkdir(parents=True, exist_ok=True)
        hwp_path.write_bytes(lawgo.download(VOC_HWP_URL))
    text = hwp_text.extract_text(hwp_path.read_bytes())
    acc = entries.new_accumulator()
    recs = _voc_records(text)
    for r in recs:
        cells = r["cells"]
        name_ko, name_en = cells[0], cells[1]
        cas_list = []
        for c in cells[2:]:
            cas_list += [casmod.normalize(f"{m[0]}-{m[1]}-{m[2]}") for m in casmod.CAS_IN_TEXT.findall(c)]
        acc["items"] += 1
        if not cas_list:
            entries.add_item(acc, str(r["no"]), name_ko, "VOC 고시 2.가", count=False)
            continue
        ko_parts = [p.strip() for p in name_ko.split(",")] if len(cas_list) == 2 and "," in name_ko and "-부텐" in name_ko else None
        en_parts = [p.strip() for p in name_en.split(",")] if ko_parts else None
        for i, c in enumerate(cas_list):
            role = None
            if ko_parts:
                nk, ne = ko_parts[i], en_parts[i]
            else:
                nk, ne = name_ko, name_en
                if i > 0:
                    role = "isomer_listed_in_parentheses"
            entries.add_law_cas(acc, str(r["no"]), c, nk, ne,
                                "배출시설(시행령 제45조제1항)의 관리대상 휘발성유기화합물 (고시 2.가)",
                                count=False, role=role)
    meta = {
        "list_id": "KR_CLEAN_AIR_VOC", "law": LAW, "title": "휘발성유기화합물(관리대상 VOC)",
        "legal_basis": "대기환경보전법 제2조제10호·제44조, 휘발성유기화합물 지정 고시(환경부고시 제2015-181호) 2.가",
        "source_url": config.admrul_page_url(VOC_NOTICE) + f" (첨부 HWP: {VOC_HWP_URL})",
        "amended_on": doc.promulgated, "law_effective": doc.effective, "law_mst": doc.mst,
        "raw_file": str(hwp_path),
        "obligations": [
            "특별대책지역·대기관리권역·VOC 배출규제 추가지역에서 시행령 제45조제1항 시설(석유정제·석유화학 제조/저장/출하, 저유소, 주유소, 세탁시설 등) 설치 시 휘발성유기화합물 배출시설 설치신고(법 제44조)",
            "배출 억제·방지시설 설치 및 검사·측정 결과 기록보존(법 제44조제5항·제13항, 시행규칙 별표 16)",
            "화학물질 배출량조사 대상 화학물질의 범위에 포함(화학물질관리법 시행령 제6조제3호)",
        ],
    }
    notes = [
        "law.go.kr XML은 표를 이미지로만 제공하므로 고시 첨부 HWP(본문)에서 표를 추출함. 첨부 HWP 머리말은 '환경부고시 제2015 - 호'로 번호가 공란(발령 전 문안 형식)이나 law.go.kr에 현행 고시(2015-181, 2015-09-11)의 본문 파일로 게시된 것임.",
        "고시 2.나: 배출시설 외 관리대상 VOC = 1기압 250℃ 이하에서 최소 비등점을 가지는 유기화합물(국립환경과학원장 공고 물질 제외) — 개별 CAS 목록 없음(family_entries에 기재).",
        "9번 '1-부텐, 2-부텐'은 CAS 2개(106-98-9, 107-01-7)로 분리, 36번 자일렌은 1330-20-7과 괄호 안 이성질체 CAS 3개를 함께 수록.",
    ]
    entries.add_family(acc, "2.나", "배출시설 외 관리대상 휘발성유기화합물",
                       "1기압 250℃ 이하에서 최소 비등점을 가지는 유기화합물(탄산 및 그 염류 등 국립환경과학원장 공고 물질 제외)",
                       count=False)
    return listfile.build(meta, acc, 37, 0, notes)


def build_all() -> list[dict]:
    rule = lawgo.fetch_law(RULE)
    return [build_pollutants(rule), build_monitoring(rule), build_specific_hap(rule), build_voc()]
