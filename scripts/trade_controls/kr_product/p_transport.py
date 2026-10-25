"""Transport lists (UN number / class / packing group; marine pollution category).

  KR_TRANSPORT_SHIP_DGL    위험물 선박운송 기준(해양수산부 고시) 별표 1 위험물목록 (attached HWP)
  KR_TRANSPORT_MARINE_NLS  선박에서의 오염방지에 관한 규칙 별표 1 제2호 유해액체물질의 목록

Air (항공위험물운송기술기준 별표 1) is not built: the annex is a scanned reproduction of the
ICAO Technical Instructions Table 3-1 (2017-2018 edition, English PDF, ICAO copyright) with
wrapped names and cross references that cannot be parsed reliably. See notes of the ship list.
"""
from __future__ import annotations

from kr_env import common, listfile

from . import lawsrc, names, quotes, transport_nls, transport_rows, transport_ship

SHIP_LAW = "선박안전법"
SHIP_RULE = "위험물 선박운송 및 저장규칙"
AIR_LAW = "항공안전법"
MARINE_LAW = "해양환경관리법"


def _ship_doc() -> dict:
    doc, rows, stats, src = transport_ship.load()
    acc = {"entries": [], "family_entries": [], "unmatched": [], "items": 0}
    seen: dict[str, int] = {}
    for r in rows:
        un = r["un_number"]
        seen[un] = seen.get(un, 0) + 1
        item_no = f"UN{un}" + (f"#{seen[un]}" if seen[un] > 1 else "")
        fields = {k: r[k] for k in ("un_number", "class", "subsidiary_risk", "packing_group", "marine_pollutant")}
        fields.update({k: r[k] for k in ("class_printed", "subsidiary_note", "packing_group_note",
                                          "columns_unparsed", "row_end_inferred") if k in r})
        detail = (f"위험물 선박운송 기준 별표 1 UN{un} {r['name_ko']} / {r['name_en'] or ''} — 정표찰(등급) {r['class']}, "
                  f"부표찰 {r['subsidiary_risk'] or '-'}, 용기등급 {r['packing_group'] or '-'}"
                  + (", 해양오염물질(P)" if r["marine_pollutant"] else ""))
        nos = "N.O.S" in (r["name_en"] or "").upper() or "별도의 품명" in r["name_ko"]
        art = None
        if r["class"].startswith("1.") or r["class"] in ("6.2", "7"):
            art = f"class {r['class']} entry (explosive / infectious / radioactive) with no single-substance DB match"
        transport_rows.add_row(acc, item_no, r["name_ko"], r["name_en"], detail, fields,
                               force_family="N.O.S./generic entry (별도의 품명이 명시된 것은 제외)" if nos else None,
                               family_if_unmatched=art)
    annex = lawsrc.annex(doc, 1)
    meta = common.law_meta(
        doc, annex, "KR_TRANSPORT_SHIP_DGL", SHIP_LAW, "선박 위험물목록 (국제연합번호·등급·용기등급)",
        "선박안전법 제41조, 위험물 선박운송 및 저장규칙 제2조제1호·제3조, 위험물 선박운송 기준(해양수산부 고시) "
        "제2조제1항~제8항 및 별표 1 위험물목록", [
            "선박으로 위험물을 적재·운송·저장하려는 자: 적재·운송·저장 방법의 적합 여부에 대해 해양수산부장관의 검사 또는 승인(선박안전법 제41조제2항)",
            "선장: 화약류·일정량 이상 고압가스·독물·유기과산화물 운송 시 관할 지방해양수산청장등의 적재검사(위험물 선박운송 및 저장규칙 제204조)",
            "별표 1의 등급(정표찰)·부표찰·용기등급·특별요건에 따른 용기·포장, 표찰, 적재·격리 기준 준수 (IMDG Code 기반)",
        ], admrul=True)
    meta["groups"] = {"rows": stats["rows"], "distinct_un_numbers": len(seen),
                      "row_starts_in_table_region": stats["row_starts_in_table_region"],
                      "rows_with_unparsed_columns": sum(1 for r in rows if r.get("columns_unparsed")),
                      "rows_end_inferred": [r["un_number"] for r in rows if r.get("row_end_inferred")]}
    official = stats["row_starts_in_table_region"]
    notes = [
        f"원본: law.go.kr 첨부 '{src['attachment_name']}' ({src['attachment_url']}), raw {src['raw_file']}. "
        "XML 별표 1 본문은 첨부 안내뿐이라 HWP를 kr_env.hwp_text로 텍스트화해 파싱.",
        "official_item_count = 표 영역에서 4자리 국제연합번호 줄 바로 다음 줄이 국문 품명인 경우의 수(행 시작 수). "
        "parsed_items = 첫 열과 마지막 열(국제연합번호 반복)이 짝지어지고 등급 칸이 확인된 행 수.",
        "별표 1은 IMDG Code 위험물목록(Dangerous Goods List)의 국문 고시본. IMDG Code 원문은 IMO 저작물(유료)이며 내려받지 않음; "
        "본 목록은 공공 고시(저작권법 제7조 비보호 저작물)에서만 추출.",
        "CAS 연결: 인쇄된 품명(국문+영문) 정확 일치 → 불일치 시 수용액/용액·괄호 조건·쉼표 이하 수식어를 고정 규칙으로 제거한 기본 물질명 정확 일치"
        "(match_scope=base_substance_of_entry, role=solution_of/qualified_entry/mixtures_of). N.O.S.·물질군·제품(탄약 등)은 family_entries.",
        "검증: 영문 품명이 DB에서 다른 CAS를 정확히 가리키면 국문 매칭을 버리고 unmatched(ko_en_conflict)로 보냄; '(용액)'·'(무수물)' 같은 "
        "상태어 단독 매칭은 폐기(qualifier_word_hit). en_confirmed=false는 국문 정확 일치뿐이고 영문(복수형·총칭 IMDG 품명 예: BUTANOLS)은 "
        "DB 단일 일치가 없는 경우 — 검토 대상.",
        "항공: 항공위험물운송기술기준(국토교통부 고시 제2023-52호) 별표 1 위험물 목록은 ICAO Technical Instructions Table 3-1(2017-2018 EDITION) "
        "영문 PDF 복제본(ICAO 저작물)이라 신뢰성 있게 파싱할 수 없어 목록화하지 않음. 국제연합번호·등급·용기등급은 UN 모델규칙 기준으로 "
        "선박과 공통이나, 항공 금지(FORBIDDEN)·포장지침·수량한도는 이 목록에 포함되지 않음.",
        "도로(ADR): 한국은 ADR을 채택하지 않음(국내 도로 운송은 위험물안전관리법·고압가스 안전관리법 등). ADR Table A 미수록.",
    ]
    if official != stats["rows"]:
        notes.append(f"주의: 행 시작 {official} vs 파싱 {stats['rows']}행.")
    if names.drop_rejected(acc, "KR_TRANSPORT_SHIP_DGL"):
        notes.append("검토 결과 잘못된 DB 이름 일치(이성질체 군을 단일 이성질체로 연결 등)는 data/match_rejects.json에 따라 unmatched로 이동.")
    return listfile.build(meta, acc, official, 0, notes)


def _nls_doc() -> dict:
    doc, annex, rows, stats = transport_nls.load()
    acc = {"entries": [], "family_entries": [], "unmatched": [], "items": 0}
    by_cat: dict[str, int] = {}
    for n, r in enumerate(rows, 1):
        cat = r["pollution_category"]
        by_cat[cat] = by_cat.get(cat, 0) + 1
        detail = f"선박에서의 오염방지에 관한 규칙 별표 1 제2호 유해액체물질: {r['name_ko']} / {r['name_en'] or ''} — 오염분류 {cat}"
        transport_rows.add_row(acc, str(n), r["name_ko"], r["name_en"], detail, {"pollution_category": cat})
    meta = common.law_meta(
        doc, annex, "KR_TRANSPORT_MARINE_NLS", MARINE_LAW, "유해액체물질 목록 (MARPOL 부속서 II 오염분류 X·Y·Z·OS)",
        "해양환경관리법 제2조제7호·제22조제1항제3호·제27조, 선박에서의 오염방지에 관한 규칙 제3조 및 별표 1", [
            "X류: 해양배출 금지 / Y류: 해양배출 제한 / Z류: 해양배출 일부 제한 (선박에서의 오염방지에 관한 규칙 제3조제1항)",
            "선박으로부터 유해액체물질 배출은 해양수산부령이 정하는 해역·사전처리·배출방법에 따를 때만 허용(해양환경관리법 제22조제1항제3호, 규칙 별표 5)",
            "유해액체물질을 산적운반하는 선박 소유자: 유해액체물질오염방지설비 설치, 배출방법·설비 지침서 작성·검인(해양환경관리법 제27조)",
        ])
    meta["groups"] = by_cat
    notes = ["official_item_count = 표 2(유해액체물질의 목록)에서 오염분류(X/Y/Z/OS)가 인쇄된 행 수.",
             "목록에 없는 물질은 IBC Code에 따름(별표 1 비고). 국문/영문 품명 각각 정확 일치로 CAS 연결; "
             "혼합물·이성질체 군·알킬 범위 표기는 family_entries."]
    if stats["category_cells"] != stats["rows"]:
        notes.append(f"주의: 오염분류 셀 {stats['category_cells']} vs 파싱 행 {stats['rows']}.")
    if names.drop_rejected(acc, "KR_TRANSPORT_MARINE_NLS"):
        notes.append("검토 결과 잘못된 DB 이름 일치(이성질체 군·탄소수 범위를 단일 물질로 연결 등)는 data/match_rejects.json에 따라 unmatched로 이동.")
    return listfile.build(meta, acc, stats["category_cells"], 0, notes)


def build() -> list[dict]:
    return [_ship_doc(), _nls_doc()]


def permits() -> list[dict]:
    ship_act = lawsrc.fetch_law(SHIP_LAW)
    ship_rule = lawsrc.fetch_law(SHIP_RULE)
    air = lawsrc.fetch_law(AIR_LAW)
    marine = lawsrc.fetch_law(MARINE_LAW)
    out = [
        quotes.permit(
            "KR_SHIP_DG_INSPECTION_APPROVAL", "선박 위험물 적재·운송·저장 방법 검사 또는 승인", SHIP_LAW, "검사/승인",
            ["KR_TRANSPORT_SHIP_DGL"], "위험물(별표 1 위험물목록 수록 물질 등)을 선박으로 적재·운송·저장하려는 경우",
            "해양수산부장관(지방해양수산청장 등)", "선박안전법 제41조제1항·제2항",
            [quotes.source(ship_act, "제41조", quotes.article(ship_act, 41))]),
        quotes.permit(
            "KR_SHIP_DG_LOADING_INSPECTION", "위험물적재검사 (위험물적재검사증)", SHIP_RULE, "검사",
            ["KR_TRANSPORT_SHIP_DGL"],
            "해양수산부장관이 정하는 화약류, 일정 용적·질량 이상의 고압가스, 독물, 유기과산화물을 선박으로 운송하려는 선장 (외국항 선적 등 예외)",
            "관할 지방해양수산청장등", "위험물 선박운송 및 저장규칙 제204조",
            [quotes.source(ship_rule, "제204조", quotes.article(ship_rule, 204, contains="검사를 받아야 한다"))]),
        quotes.permit(
            "KR_AIR_DG_TRANSPORT_PERMIT", "항공 위험물 운송허가", AIR_LAW, "허가",
            ["KR_TRANSPORT_SHIP_DGL"],
            "항공기로 국토교통부령으로 정하는 위험물을 운송하려는 경우 (운항증명 소지자가 기준 충족 시 허가 간주). "
            "UN번호·등급은 선박 목록과 공통이나 항공 금지·수량한도는 항공위험물운송기술기준(ICAO TI)으로 별도 확인 필요",
            "국토교통부장관", "항공안전법 제70조, 항공위험물운송기술기준(국토교통부 고시)",
            [quotes.source(air, "제70조", quotes.article(air, 70))]),
        quotes.permit(
            "KR_MARINE_NLS_DISCHARGE_EQUIPMENT", "유해액체물질 배출 제한 및 오염방지설비·지침서 검인", MARINE_LAW, "의무/검인",
            ["KR_TRANSPORT_MARINE_NLS"],
            "유해액체물질(별표 1 X·Y·Z류 등)을 산적운반하는 선박 / 선박으로부터 유해액체물질을 배출하는 경우",
            "해양수산부장관", "해양환경관리법 제22조제1항제3호, 제27조",
            [quotes.source(marine, "제22조제1항 본문", quotes.article(marine, 22, contains="누구든지 선박으로부터")),
             quotes.source(marine, "제22조제1항제3호", quotes.article(marine, 22, contains="유해액체물질을 배출하는")),
             quotes.source(marine, "제27조", quotes.article(marine, 27))]),
    ]
    return out
