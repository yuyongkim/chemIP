"""화장품법 제8조: 화장품 안전기준 등에 관한 규정(식약처 고시) 별표 1·별표 2.

  KR_COSMETIC_PROHIBITED  별표 1 사용할 수 없는 원료       (원료명 | CAS No. | 화학물질명)
  KR_COSMETIC_RESTRICTED  별표 2 사용상의 제한이 필요한 원료 (보존제 / 자외선 차단성분 / 염모제 / 기타)

The 고시 prints a representative CAS (with its chemical name) per row; a row can list several
CAS in sub-rows. Those CAS are recorded as law_cas. Rows without CAS ("-") are name-matched.
"X 및 그 염류 / 에스텔류" rows additionally get a family entry (the law notes other CAS may apply).

The sub-row-aware box-table reader lives in box_groups.py (shared with p_pesticide).
"""
from __future__ import annotations

import re

from kr_env import cas as casmod
from kr_env import common, entries, listfile

from . import lawsrc, names, quotes
from .box_groups import box_groups, cas_in, joined

LAW = "화장품법"
RULE = "화장품 안전기준 등에 관한 규정"
_SECTIONS_2 = ["보존제 성분", "자외선 차단성분", "염모제 성분", "기타"]


# --------------------------------------------------------------------------- helpers
def bad_law_cas(acc: dict, item_no, printed: str, name: str, detail: str) -> None:
    """The law prints a CAS whose check digit fails: never use it. Record it as unverified and
    fall back to an exact name match (which yields the DB's CAS, or nothing)."""
    acc["unmatched"].append({"name": name, "detail": detail, "item_no": item_no,
                             "reason": "law_printed_cas_fails_check_digit", "printed_cas": printed,
                             "candidates": []})
    before = len(acc["entries"])
    entries.add_item(acc, item_no, name, detail, count=False,
                     match_note=f"고시 기재 CAS {printed}는 검증숫자 오류, 이름으로 매칭")
    for e in acc["entries"][before:]:
        e["law_printed_cas_invalid"] = printed


def _strip_footnote(name: str) -> tuple[str, bool]:
    """'1-나프톨 및 그 염류1)' -> ('1-나프톨 및 그 염류', True) (별표 1 footnote 1: 염모제 기준 적합 시 제외)."""
    if name.endswith("1)") and name.count(")") > name.count("("):
        return name[:-2].rstrip(), True
    return name, False


def _is_descriptive(name: str) -> bool:
    return len(name) > 60 or "「" in name or name.startswith("(")


def _add_row(acc: dict, item_no: str, name: str, cas_segments: list[str], chem_segments: list[str],
             detail: str) -> None:
    """One table row: law CAS per sub-row, or name match when no CAS is printed."""
    acc["items"] += 1
    pairs = []
    for i, seg in enumerate(cas_segments):
        chem = chem_segments[i] if i < len(chem_segments) and len(chem_segments) == len(cas_segments) else None
        for c in cas_in(seg):
            pairs.append((c, chem))
    if pairs:
        for c, chem in pairs:
            if not casmod.is_valid(c):
                bad_law_cas(acc, item_no, c, chem or name, detail)
                continue
            entries.add_law_cas(acc, item_no, c, chem or name, None, detail, count=False,
                                role="representative_cas")
            acc["entries"][-1]["raw_name"] = name
        if names.family_base(name):
            entries.add_family(acc, item_no, name, detail + " — 염류·에스텔류 전체가 대상(대표 CAS만 기재됨)",
                               count=False, base_name=names.family_base(name))
        return
    if _is_descriptive(name):
        entries.add_family(acc, item_no, name, detail, count=False)
        return
    base = names.family_base(name)
    if base:
        entries.add_family(acc, item_no, name, detail, count=False, base_name=base)
        entries.add_item(acc, item_no, base, f"{detail} — '{name}' 중 {base} 자체", count=False)
        return
    entries.add_item(acc, item_no, name, detail, count=False)


def _data_groups(groups: list) -> list:
    """Drop header groups (the row naming the columns)."""
    return [g for g in groups if not re.match(r"^원\s*료\s*명", joined(g[0][:1]) if g[0] else "")]


# --------------------------------------------------------------------------- lists
def build_prohibited(doc) -> dict:
    a = lawsrc.annex(doc, 1)
    tables = box_groups(a["text"])
    acc = entries.new_accumulator()
    rows = 0
    for g in _data_groups(tables[0]):
        name, dye = _strip_footnote(joined(g[0]))
        rows += 1
        detail = "화장품에 사용할 수 없는 원료 (화장품 안전기준 등에 관한 규정 별표 1)"
        if dye:
            detail += " — 단, 별표 2 염모제 성분 기준에 적합한 경우 제외(별표 1 유의사항 2)"
        _add_row(acc, f"1-{rows}", name, g[1] if len(g) > 1 else [], g[2] if len(g) > 2 else [], detail)
    meta = common.law_meta(doc, a, "KR_COSMETIC_PROHIBITED", LAW, "화장품에 사용할 수 없는 원료",
                           "화장품법 제8조제1항, 제15조제5호; 화장품 안전기준 등에 관한 규정(식품의약품안전처 고시) 제3조 및 별표 1",
                           ["화장품의 제조·수입 시 해당 원료 사용 금지(화장품법 제8조제1항)",
                            "해당 원료를 사용한 화장품의 판매·판매 목적 제조·수입·보관·진열 금지(화장품법 제15조제5호)",
                            "맞춤형화장품에도 사용 불가(고시 제5조제1호)"], admrul=True)
    notes = ["표에 항목 번호가 없어 공식 개수는 표의 행(가로 구분선 사이 블록) 수로 셈. item_no '1-N'은 표 순서.",
             "고시 유의사항 1: 기재된 CAS No.는 대표 예시이며 다른 번호의 화학물질도 해당될 수 있음 → law_cas 엔트리에 role=representative_cas.",
             "CAS 미기재('-') 행은 이름 정확 일치로만 매칭; 설명형 항목(장기 목록, 다른 법 인용 등)은 family_entries."]
    names.drop_rejected(acc, meta["list_id"])
    return listfile.build(meta, acc, _count_rows(a["text"], 1), 0, notes)


def build_restricted(doc) -> dict:
    a = lawsrc.annex(doc, 2)
    tables = box_groups(a["text"])
    if len(tables) != len(_SECTIONS_2):
        raise ValueError(f"별표 2: expected {len(_SECTIONS_2)} tables, got {len(tables)}")
    acc = entries.new_accumulator()
    groups_count = {}
    for sec, groups in zip(_SECTIONS_2, tables):
        n = 0
        for g in _data_groups(groups):
            if re.match(r"^농도상한", joined(g[0])):
                continue
            name = joined(g[0])
            n += 1
            limit, note = joined(g[1]), joined(g[2])
            detail = f"화장품 사용상의 제한이 필요한 원료 [{sec}] 사용한도: {limit or '-'}"
            if note:
                detail += f"; 비고: {note}"
            _add_row(acc, f"2-{sec[:2]}-{n}", name, g[3] if len(g) > 3 else [], g[4] if len(g) > 4 else [],
                     detail)
        groups_count[sec] = n
    meta = common.law_meta(doc, a, "KR_COSMETIC_RESTRICTED", LAW, "화장품에 사용상의 제한이 필요한 원료",
                           "화장품법 제8조제2항, 제15조제5호; 화장품 안전기준 등에 관한 규정(식품의약품안전처 고시) 제4조 및 별표 2",
                           ["별표 2의 사용한도·사용 범위 안에서만 사용(화장품법 제8조제2항)",
                            "별표 2에 없는 보존제·자외선 차단제 등은 사용 불가(고시 제4조)",
                            "기준 위반 원료 사용 화장품의 판매 등 금지(화장품법 제15조제5호)"], admrul=True)
    meta["groups"] = groups_count
    notes = ["별표 2는 표 4개(보존제 성분 / 자외선 차단성분 / 염모제 성분 / 기타). law.go.kr 텍스트에서 '* 자외선 차단성분' 제목이 표 뒤에 찍혀 있어 표 순서로 구분함.",
             "공식 개수는 각 표의 행 수(항목 번호 없음). CAS는 대표 예시(유의사항 1).",
             "detail에 사용한도·비고 원문 유지."]
    official = sum(_count_rows_table(t) for t in _split_tables(a["text"]))
    names.drop_rejected(acc, meta["list_id"])
    return listfile.build(meta, acc, official, 0, notes)


# --------------------------------------------------------------------------- independent row count
def _split_tables(text: str) -> list[str]:
    return re.findall(r"(?ms)^┌.*?^└[^\n]*", text)


def _count_rows_table(table: str) -> int:
    """Rows = blocks between full separators that contain text, minus the header block(s)."""
    blocks = re.split(r"(?m)^[├┌└][^\n]*$", table)
    n = 0
    for b in blocks:
        txt = re.sub(r"[│├┤┼─┬┴\s]", "", b)
        if not txt or re.match(r"^원료명", txt) or txt.startswith("농도상한"):
            continue
        n += 1
    return n


def _count_rows(text: str, expected_tables: int) -> int:
    tabs = _split_tables(text)
    if len(tabs) != expected_tables:
        raise ValueError(f"expected {expected_tables} tables, got {len(tabs)}")
    return sum(_count_rows_table(t) for t in tabs)


def build() -> list[dict]:
    doc = lawsrc.fetch_admrul(RULE)
    return [build_prohibited(doc), build_restricted(doc)]


def permits() -> list[dict]:
    law = lawsrc.fetch_law(LAW)
    rule = lawsrc.fetch_admrul(RULE)
    s8 = quotes.source(law, "제8조", quotes.article(law, 8, max_len=1200))
    s15 = quotes.source(law, "제15조제5호", quotes.article(law, 15, contains="제8조제1항 또는 제2항"))
    s3 = quotes.source(rule, "제3조", quotes.article(rule, 3, admrul=True), admrul=True)
    s4 = quotes.source(rule, "제4조", quotes.article(rule, 4, admrul=True), admrul=True)
    s_reg = quotes.source(law, "제3조제1항", quotes.article(law, 3, contains="화장품제조업 또는 화장품책임판매업을 하려는 자"))
    return [
        quotes.permit("KR_COSMETIC_INGREDIENT_BAN", "화장품 사용금지 원료 사용 금지", LAW, "금지",
                      ["KR_COSMETIC_PROHIBITED"],
                      "별표 1 원료를 화장품 제조·수입에 사용하거나, 그 화장품을 판매·판매목적 제조·수입·보관·진열",
                      "식품의약품안전처장", "화장품법 제8조제1항, 제15조제5호; 화장품 안전기준 등에 관한 규정 제3조·별표 1",
                      [s8, s15, s3]),
        quotes.permit("KR_COSMETIC_INGREDIENT_RESTRICTION", "화장품 사용제한 원료 사용기준 준수", LAW, "제한",
                      ["KR_COSMETIC_RESTRICTED"],
                      "별표 2 원료를 화장품에 사용할 때 사용한도·비고의 범위 준수; 별표 2 외 보존제·자외선 차단제 사용 불가",
                      "식품의약품안전처장", "화장품법 제8조제2항, 제15조제5호; 화장품 안전기준 등에 관한 규정 제4조·별표 2",
                      [s8, s15, s4]),
        quotes.permit("KR_COSMETIC_BUSINESS_REGISTRATION", "화장품제조업·화장품책임판매업 등록", LAW, "등록",
                      ["KR_COSMETIC_PROHIBITED", "KR_COSMETIC_RESTRICTED"],
                      "화장품을 제조하거나 유통·판매(수입 포함)하려는 경우 — 물질 목록과 무관한 영업 등록이며, 목록 원료 취급 화장품 사업자의 전제 요건",
                      "식품의약품안전처장", "화장품법 제3조제1항", [s_reg]),
    ]
