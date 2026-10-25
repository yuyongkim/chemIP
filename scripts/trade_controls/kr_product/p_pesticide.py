"""농약관리법: 농촌진흥청 고시의 원제(유효성분) 목록.

  KR_PESTICIDE_REGISTRATION_RESTRICTED  농약 및 원제의 등록기준 별표 8의2 품목 등록이 제한되는 농약
  KR_PESTICIDE_ADI                      같은 고시 별표 4의2 1일섭취허용량·농작업자노출허용량 (평가된 원제)
  KR_PESTICIDE_PIC_ANNEX3               농약의 수출입 승인기준 별표 1 로테르담협약 부속서Ⅲ 등재물질
  KR_PESTICIDE_SPECIAL_MANAGED          농약등 및 원제의 취급제한기준 제9조 특별관리 대상 농약등(훈증제 등)

None of these tables prints CAS numbers: entries are exact-name matches (Korean name plus the
printed English common name) against terminology.db; rows the DB lacks are looked up on PubChem by
the printed English common name (accepted only when the name maps to exactly one CID; tagged
match_method=pubchem). Anything else stays unmatched / family.
"""
from __future__ import annotations

import re

from kr_env import common, entries, listfile

from . import lawsrc, names, quotes
from .box_groups import box_groups, joined
from .pubchem import resolve_pubchem

LAW = "농약관리법"
REG_RULE = "농약 및 원제의 등록기준"
PIC_RULE = "농약의 수출입 승인기준"
HANDLING_RULE = "농약등 및 원제의 취급제한기준"
_KO_EN = re.compile(r"^(.*?[가-힣][^()]*?)\s*\(\s*([A-Za-z0-9][^가-힣]*)\)\s*$")


def _en_forms(en: str) -> list[str]:
    """'1,2-dibromoethane(Ethylene dibromide)' -> [whole, '1,2-dibromoethane', 'Ethylene dibromide']."""
    en = re.sub(r"\s+", " ", en or "").strip()
    if en.endswith(")") and en.count(")") > en.count("("):
        en = en[:-1].strip()          # stray ')' printed in the table (e.g. 'Sulfur)')
    if not en or en == "-":
        return []
    out = [en]
    m = re.match(r"^(.*?)\s*\((.+)\)\s*$", en)
    if m and m.group(1).strip():
        out += [m.group(1).strip(), m.group(2).strip()]
    head = re.split(r"\s+(?:and its|and their)\s+", en)[0].strip()
    if head != en:
        out.append(head)
    return out


def _ko_clean(ko: str) -> tuple[str, str | None]:
    """Strip a Korean parenthetical such as '(‘…’을 포함한다)' -> (name, remark)."""
    m = re.match(r"^(.*?)\s*\((.*[가-힣].*)\)\s*$", ko)
    if m and m.group(1).strip() and ("포함" in m.group(2) or "‘" in m.group(2) or len(m.group(2)) > 25):
        return m.group(1).strip(), m.group(2).strip()
    return ko, None


def _ko(col: list) -> str:
    """Korean name cell from raw fragments: wrapped lines are cut mid-word -> join without space."""
    return re.sub(r"\s+", " ", "".join(f for seg in col for f in seg)).strip()


def _en(col: list) -> tuple[str, str]:
    """English cell from raw fragments: (joined with spaces, joined without) — the table wraps
    both at word boundaries and mid-word, and padding does not tell which."""
    frags = [f for seg in col for f in seg]
    return re.sub(r"\s+", " ", " ".join(frags)).strip(), re.sub(r"\s+", " ", "".join(frags)).strip()


def _add_ai(acc: dict, item_no, ko: str, en, detail: str) -> None:
    """One active ingredient row (counted once). en: str or (spaced, unspaced) variants."""
    acc["items"] += 1
    ko, remark = _ko_clean(re.sub(r"\s+", " ", ko).strip())
    if remark:
        detail = f"{detail}; 비고: {remark}"
    en, en_alt = (en, None) if isinstance(en, str) else en
    extra = _en_forms(en)
    if en_alt and en_alt != en:
        extra += [f for f in _en_forms(en_alt) if f not in extra]
    n_unm = len(acc["unmatched"])
    base = names.family_base(ko)
    if base:
        entries.add_family(acc, item_no, ko, detail, count=False, base_name=base, name_en=en or None)
        extra = extra[-1:]
        entries.add_item(acc, item_no, base, f"{detail} — '{ko}' 중 {base} 자체", extra_names=extra or None,
                         count=False)
    else:
        entries.add_item(acc, item_no, ko, detail, extra_names=extra or None, count=False)
    for u in acc["unmatched"][n_unm:]:
        u["name_en"] = en or None
        u["_en_forms"] = extra


def _is_header(g) -> bool:
    col = g[0] if g else []
    first = (_ko(col) if col and isinstance(col[0], list) else joined(col)) if col else ""
    return bool(re.match(r"^(번호|연\s*번|농약의 종류|한글명|구분)", first)) or not first


# --------------------------------------------------------------------------- 별표 8의2
def build_registration_restricted(doc) -> dict:
    a = lawsrc.annex(doc, 8, 2)
    acc = entries.new_accumulator()
    nums = []
    for g in box_groups(a["text"], raw=True)[0]:
        if _is_header(g):
            continue
        no = _ko(g[0])
        nums.append(int(no))
        _add_ai(acc, no, _ko(g[1]), _en(g[2]),
                "품목 등록이 제한되는 농약 원제 (농약 및 원제의 등록기준 별표 8의2)")
    official = max(nums) if nums else 0
    notes = [f"terminology.db에 없는 원제 {resolve_pubchem(acc)}건은 고시의 영문 일반명으로 PubChem 조회(이름→CID 1건일 때만) → match_method=pubchem."]
    if nums != list(range(1, official + 1)):
        notes.append(f"번호 불연속: {nums}")
    meta = common.law_meta(doc, a, "KR_PESTICIDE_REGISTRATION_RESTRICTED", LAW, "품목 등록이 제한되는 농약(원제)",
                           "농약관리법 제8조·제14조제2항·제17조; 농약 및 원제의 등록기준(농촌진흥청 고시) 제3조제3항제16호 및 별표 8의2",
                           ["별표 8의2 원제를 유효성분으로 하여 제조한 농약은 품목 등록(국내 제조·수입) 신청 반려 대상(고시 제3조제3항제16호)",
                            "법 제14조제2항에 따라 등록이 취소되었거나 이에 준하는 사유로 사용이 금지된 농약"], admrul=True)
    notes.append("공식 개수 = 표의 마지막 번호(1부터 연속 확인).")
    names.drop_rejected(acc, meta["list_id"])
    return listfile.build(meta, acc, official, 0, notes)


# --------------------------------------------------------------------------- 별표 4의2
def build_adi(doc) -> dict:
    a = lawsrc.annex(doc, 4, 2)
    tables = box_groups(a["text"], raw=True)
    if len(tables) != 2:
        raise ValueError(f"별표 4의2: expected 2 tables, got {len(tables)}")
    acc = entries.new_accumulator()
    printed, rows1 = [], 0
    for g in tables[0]:
        if _is_header(g):
            continue
        rows1 += 1
        no = _ko(g[0])
        printed.append(no)
        adi, aoel = _ko(g[3]), _ko(g[4])
        _add_ai(acc, f"1-{rows1}(연번{no})", _ko(g[1]), _en(g[2]),
                f"농약 1일섭취허용량(ADI) {adi} mg/kg bw/day; 농작업자노출허용량(AOEL) {aoel} mg/kg bw/day "
                f"(농약 및 원제의 등록기준 별표 4의2 제1호)")
    rows2 = 0
    for g in tables[1]:
        if _is_header(g):
            continue
        rows2 += 1
        _add_ai(acc, f"2-{rows2}", _ko(g[0]), _en(g[1]),
                f"일일섭취허용량 설정 면제 농약 — 면제사유: {_en(g[2])[0]} (별표 4의2 제2호)")
    official = _count_rows(a["text"])
    n_pub = resolve_pubchem(acc)
    meta = common.law_meta(doc, a, "KR_PESTICIDE_ADI", LAW, "농약의 1일섭취허용량 및 농작업자노출허용량 설정 원제",
                           "농약관리법 제8조·제17조; 농약 및 원제의 등록기준(농촌진흥청 고시) 제3조제2항제3호의2 및 별표 4의2",
                           ["국내 등록 심사 시 적용되는 원제별 ADI·AOEL(등록 농약 유효성분의 사실상 목록)",
                            "농약 제조·수입·원제 판매는 농약관리법 제3조(영업 등록)·제8조/제16조/제17조(품목·원제 등록) 대상"],
                           admrul=True)
    meta["groups"] = {"1. 일일섭취허용량 설정 원제": rows1, "2. 일일섭취허용량 설정 면제 농약": rows2}
    seen, dup = set(), []
    for n in printed:
        if n in seen:
            dup.append(n)
        seen.add(n)
    nums = sorted({int(n) for n in printed if n.isdigit()})
    missing = sorted(set(range(1, max(nums) + 1)) - set(nums)) if nums else []
    notes = [f"제1호 표 행 수 {rows1}, 마지막 연번 {printed[-1] if printed else None}; 고시 원문의 연번 중복 {dup}, 누락 {missing} — 행 기준으로 셈(번호는 item_no에 병기).",
             "공식 개수 = 두 표의 데이터 행 수(가로 구분선 블록, 독립 계수).",
             f"terminology.db에 없는 원제 {n_pub}건은 고시의 영문 일반명으로 PubChem 조회(이름→CID 1건일 때만) → match_method=pubchem."]
    names.drop_rejected(acc, meta["list_id"])
    return listfile.build(meta, acc, official, 0, notes)


def _count_rows(text: str) -> int:
    n = 0
    for table in re.findall(r"(?ms)^┌.*?^└[^\n]*", text):
        for b in re.split(r"(?m)^[├┌└][^\n]*$", table):
            t = re.sub(r"[│├┤┼─┬┴\s]", "", b)
            if t and "농약의종류" not in t and not re.match(r"^(연번|번호|한글명)", t):
                n += 1
    return n


# --------------------------------------------------------------------------- PIC 별표 1
def build_pic(doc) -> dict:
    a = lawsrc.annex(doc, 1)
    acc = entries.new_accumulator()
    groups = {}
    for g in box_groups(a["text"])[0]:
        if _is_header(g):
            continue
        cat = re.sub(r"\s+", "", joined(g[0]))
        segs, decisions = g[1], g[2]
        if len(segs) != len(decisions):
            raise ValueError(f"PIC {cat}: {len(segs)} substances vs {len(decisions)} decisions")
        for i, (seg, dec) in enumerate(zip(segs, decisions), 1):
            seg = re.sub(r"\s+", " ", seg).strip()
            detail = f"로테르담협약 부속서Ⅲ 등재물질 [{cat}] 수입결정: {dec} (농약의 수출입 승인기준 별표 1): {seg}"
            m = _KO_EN.match(seg)
            ko, en = (m.group(1).strip(), m.group(2).strip()) if m else (seg, "")
            no = f"{cat}-{i}"
            if cat != "원제" or "주성분" in ko:
                # formulation entries: the listing covers the formulation, link its active ingredient(s)
                acc["items"] += 1
                entries.add_family(acc, no, seg, detail + " — 제형(품목) 단위 등재", count=False)
                head = re.split(r"\s*주성분", ko)[0].strip()
                if "주성분" in ko and head:
                    entries.add_item(acc, no, head, detail + f" — 제형의 유효성분 {head}",
                                     extra_names=_en_forms(re.split(r"\s*\(", en)[0])[:1] or None, count=False)
                continue
            if "화합물" in ko:
                acc["items"] += 1
                entries.add_family(acc, no, re.split(r"\s*\(", ko)[0], detail, count=False, name_en=en or None)
                continue
            _add_ai(acc, no, ko, en, detail)
        groups[cat] = len(segs)
    official = _count_pic(a["text"])
    n_pub = resolve_pubchem(acc)
    meta = common.law_meta(doc, a, "KR_PESTICIDE_PIC_ANNEX3", LAW, "로테르담협약 부속서Ⅲ 등재물질(농약)",
                           "농약관리법 제14조·제15조·제30조; 농약의 수출입 승인기준(농촌진흥청 고시) 제4조·제6조 및 별표 1",
                           ["수출: 수출예정일 90일 이전까지 협약 대상물질 수출승인신청서·수출자 책임보증서 제출, 농촌진흥청장 수출승인(고시 제4조)",
                            "수입: 별표 1의 수입결정내용(수입거부/수입승인) 확인(고시 제6조)"], admrul=True)
    meta["groups"] = groups
    notes = ["공식 개수 = 표 각 구분(원제 / 고위해성 농약품목) 안의 하위 행 수(독립 계수: 부분 구분선 + 1).",
             "고위해성 농약품목은 제형 단위 등재 → family_entries, 단일 유효성분이 명시된 경우만 그 성분을 이름 매칭.",
             f"PubChem 보완 매칭 {n_pub}건(영문명→CID 1건일 때만)."]
    names.drop_rejected(acc, meta["list_id"])
    return listfile.build(meta, acc, official, 0, notes)


def _count_pic(text: str) -> int:
    table = re.findall(r"(?ms)^┌.*?^└[^\n]*", text)[0]
    blocks = [b for b in re.split(r"(?m)^├[^\n]*$", table)[1:] if re.sub(r"[│├┤┼─┬┴└\s]", "", b)]
    return sum(1 + len(re.findall(r"(?m)^│[^│\n]*├", b)) for b in blocks)


# --------------------------------------------------------------------------- 취급제한기준 제9조
def build_special_managed(doc) -> dict:
    text = quotes._admrul_article(doc, 9)
    acc = entries.new_accumulator()
    paras = re.findall(r"(?m)^\s*([①-⑳])\s*(.+)$", text)
    n = 0
    for mark, body in paras:
        body = re.sub(r"<[^>]*>", "", body).strip()
        if not body or body.startswith("삭제"):
            continue
        detail = f"특별관리 대상 농약등 (농약등 및 원제의 취급제한기준 제9조{mark}): 시중 농약판매업소 보관·진열·판매 금지 등"
        if "개미류" in body:
            n += 1
            entries.add_family(acc, f"9{mark}", body, detail, count=False)
            acc["items"] += 1
            continue
        for part in re.split(r",\s*|\s+및\s+", body):
            part = part.strip()
            if not part:
                continue
            n += 1
            acc["items"] += 1
            m = re.match(r"^(.+?)\s*(?:판상)?훈증제\s*(?:\((.+)\))?$", part)
            name = m.group(1).strip() if m else part
            extra = None
            if m and m.group(2) and re.fullmatch(r"[A-Z]{2,}", m.group(2)):
                extra = [m.group(2)]
            entries.add_item(acc, f"9{mark}", name, f"{detail} — {part}", extra_names=extra, count=False)
    meta = common.law_meta(doc, None, "KR_PESTICIDE_SPECIAL_MANAGED", LAW, "중독·안전사고 방지를 위한 특별관리 대상 농약등",
                           "농약관리법 제23조, 같은 법 시행령 제20조; 농약등 및 원제의 취급제한기준(농촌진흥청 고시) 제9조",
                           ["시중 농약 판매업소 보관·진열·판매 금지, 지정 기관·실수요자에게만 공급(제9조제1항·제2항)",
                            "알루미늄포스파이드 훈증제: 사전 사용계획서·안전사용교육 이수확인서, 반기별 공급·판매 실적 보고(제9조제2항)"],
                           admrul=True)
    notes = ["조문 본문(제9조 각 항)의 품목을 1건씩 셈(훈증제 제형·농도는 detail에 원문 유지). 공식 개수 = 같은 조문의 쉼표/및 구분 품목 수.",
             "별표 1(품목·제품별 독성구분)은 law.go.kr에서 xlsx 첨부로만 제공 — 제품(상표) 단위 목록이라 물질 목록에서 제외."]
    names.drop_rejected(acc, meta["list_id"])
    return listfile.build(meta, acc, n, 0, notes)


def build() -> list[dict]:
    reg = lawsrc.fetch_admrul(REG_RULE)
    pic = lawsrc.fetch_admrul(PIC_RULE)
    handling = lawsrc.fetch_admrul(HANDLING_RULE)
    return [build_registration_restricted(reg), build_adi(reg), build_pic(pic), build_special_managed(handling)]


def permits() -> list[dict]:
    law = lawsrc.fetch_law(LAW)
    reg = lawsrc.fetch_admrul(REG_RULE)
    pic = lawsrc.fetch_admrul(PIC_RULE)
    handling = lawsrc.fetch_admrul(HANDLING_RULE)
    s3 = quotes.source(law, "제3조제1항", quotes.article(law, 3, contains="제조업ㆍ원제업 또는 수입업을 하려는 자"))
    s8 = quotes.source(law, "제8조제1항", quotes.article(law, 8, contains="품목별로 농촌진흥청장에게 등록"))
    s16 = quotes.source(law, "제16조제1항", quotes.article(law, 16, contains="종류별로 농촌진흥청장에게 등록"))
    s17 = quotes.source(law, "제17조제1항", quotes.article(law, 17, contains="수입하여 판매하려고 할 때"))
    sreg = quotes.source(reg, "제3조제3항제16호", quotes.article(reg, 3, admrul=True, contains="별표 8의2"), admrul=True)
    p4 = quotes.source(pic, "제4조제1항", quotes.article(pic, 4, admrul=True, contains="수출예정일 90일"), admrul=True)
    p6 = quotes.source(pic, "제6조제1항", quotes.article(pic, 6, admrul=True, contains="별표1의 수입결정내용"), admrul=True)
    h9 = quotes.source(handling, "제9조제2항제1호",
                       quotes.article(handling, 9, admrul=True, contains="해당 제조업자 또는 수입업자는 다음 각 목 중"), admrul=True)
    return [
        quotes.permit("KR_PESTICIDE_BUSINESS_REGISTRATION", "농약 제조업·원제업·수입업 등록", LAW, "등록",
                      ["KR_PESTICIDE_ADI", "KR_PESTICIDE_REGISTRATION_RESTRICTED"],
                      "농약(원제 포함)을 국내 제조·원제 생산·수입하여 판매하려는 경우(영업 등록)",
                      "농촌진흥청장", "농약관리법 제3조제1항", [s3]),
        quotes.permit("KR_PESTICIDE_PRODUCT_REGISTRATION", "농약 품목·원제·수입농약 등록", LAW, "등록",
                      ["KR_PESTICIDE_ADI", "KR_PESTICIDE_REGISTRATION_RESTRICTED"],
                      "농약을 국내 제조·판매(품목별), 원제를 생산·판매(종류별), 농약·원제를 수입·판매(품목·종류별)하려는 경우. "
                      "별표 8의2 원제를 유효성분으로 한 농약은 등록 신청 반려 대상",
                      "농촌진흥청장", "농약관리법 제8조제1항·제16조제1항·제17조제1항; 농약 및 원제의 등록기준 제3조제3항제16호",
                      [s8, s16, s17, sreg]),
        quotes.permit("KR_PESTICIDE_PIC_EXPORT_APPROVAL", "로테르담협약 대상 농약 수출승인", LAW, "승인",
                      ["KR_PESTICIDE_PIC_ANNEX3"],
                      "부속서Ⅲ 등재물질을 협약 당사국에 수출하려는 경우 수출예정일 90일 전 신청; 수입 시 별표 1 수입결정내용 확인",
                      "농촌진흥청장", "농약관리법 제14조·제15조·제30조; 농약의 수출입 승인기준 제4조·제6조", [p4, p6]),
        quotes.permit("KR_PESTICIDE_SPECIAL_MANAGED_SUPPLY", "특별관리 대상 농약등 공급·판매 제한", LAW, "제한",
                      ["KR_PESTICIDE_SPECIAL_MANAGED"],
                      "훈증제 등 제9조 품목: 시중 판매업소 판매 금지, 지정 기관·실수요자에게만 공급",
                      "농촌진흥청장", "농약관리법 제23조; 농약등 및 원제의 취급제한기준 제9조", [h9]),
    ]
