"""어린이제품 공통안전기준 (산업통상부 고시) 3.1 유해화학물질 안전요건.

The law.go.kr XML shows the 3.1.x tables only as images, so the text is read from the
고시 HWP attachment ("2. 어린이제품 공통안전기준.hwp"). Items counted (official table rows):
3.1.1 유해원소 용출 8, 3.1.2 유해원소 함유량 2, 3.1.3 프탈레이트 7, 3.1.4 니트로사민류 7 +
생성 가능물질 7, 3.1.5 폼알데하이드·아릴아민 2 (pH는 물질이 아니므로 제외), 3.1.6 석면 1.
"""
from __future__ import annotations

import re

from kr_env import common, entries, listfile

from . import attachments, lawsrc, names, quotes

ACT = "어린이제품 안전 특별법"
RULE = "어린이제품 공통안전기준"
LIST_ID = "KR_CHILD_COMMON_SAFETY_CHEMICALS"
HWP_NAME = "2. 어린이제품 공통안전기준.hwp"
_CAS = re.compile(r"CAS No\.\s*([0-9]{2,7}-[0-9]{2}-[0-9])(?:\s*또는\s*([0-9]{2,7}-[0-9]{2}-[0-9]))?")
_ELEMENT = re.compile(r"^(총\s*)?([가-힣]+)\(([A-Z][a-z]?)\)")
_LIMIT = re.compile(r"(\d[\d ]*(?:\.\d+)?)\s*mg/kg\s*이하")
_FOOT = re.compile(r"(\d+\.\d+?)([12])\)")


def _section_lines(lines: list[str]) -> dict[str, list[str]]:
    out, cur = {}, None
    for ln in lines:
        m = re.match(r"^(3\.1\.[1-6]|3\.2)\s", ln)
        if m:
            cur = m.group(1)
            if cur == "3.2":
                break
            out[cur] = [ln]
        elif cur:
            out[cur].append(ln)
    return out


def _elements(acc: dict, sec: str, lines: list[str], what: str) -> None:
    for i, ln in enumerate(lines):
        m = _ELEMENT.match(ln)
        if not m:
            continue
        lim = _LIMIT.search(lines[i + 1]) if i + 1 < len(lines) else None
        limit = lim.group(0) if lim else "허용치 미확인"
        name = names.element_name(m.group(2))
        entries.add_element_group(acc, f"{sec}-{m.group(3)}", name,
                                  f"{what} {m.group(1) or ''}{m.group(2)}({m.group(3)}) {limit} (공통안전기준 {sec})")
        if sec == "3.1.1":   # soluble-element limit, not total content
            fam = acc["family_entries"][-1]
            fam["detail"] = fam["detail"].replace("원소 총량 기준", "원소 용출량 기준")


def _cas_rows(acc: dict, sec: str, lines: list[str], detail_of) -> None:
    for i, ln in enumerate(lines):
        m = _CAS.search(ln)
        if not m:
            continue
        label = ln[:m.start()].rstrip(", ").strip()
        ko, en = (label.split(" (", 1) + [None])[:2] if " (" in label else (None, label)
        en = en.rstrip(")") if en else None
        detail = detail_of(i, label)
        for k, c in enumerate(c for c in m.groups() if c):
            entries.add_law_cas(acc, f"{sec}-{i}", c, ko or "", en, detail, count=(k == 0),
                                role="alternative_cas" if k else None)


def build() -> list[dict]:
    doc = lawsrc.fetch_admrul(RULE)
    url = dict(attachments.attachment_links(doc))[HWP_NAME]
    path = attachments.fetch(url, "child", f"common_safety_{doc.number}.hwp")
    sec = _section_lines(attachments.hwp_lines(path))
    acc = entries.new_accumulator()
    _elements(acc, "3.1.1", sec["3.1.1"], "유해원소 용출 허용치")
    _elements(acc, "3.1.2", sec["3.1.2"], "유해원소 함유량 허용치")
    ph = next((l for l in sec["3.1.3"] if "총 합" in l), "")
    _cas_rows(acc, "3.1.3", sec["3.1.3"], lambda i, lab: f"프탈레이트계 가소제 {ph} (7종 합계, 합성수지제) (공통안전기준 3.1.3)")
    nitro = sec["3.1.4"]
    split = next(i for i, l in enumerate(nitro) if l.startswith("니트로사민류 생성 가능"))
    limits = [_FOOT.sub(r"\1 (비고 \2)", l) for l in nitro if "mg/kg" in l]

    def nitro_detail(i, lab):
        grp, lim = ("니트로사민류", limits[0]) if i < split else ("니트로사민류 생성 가능물질", limits[1])
        return f"{grp} 총 합 {lim} (탄성중합체, 공통안전기준 3.1.4)"
    _cas_rows(acc, "3.1.4", nitro, nitro_detail)
    s5 = sec["3.1.5"]
    for i, ln in enumerate(s5):
        if ln.startswith("폼알데하이드"):
            entries.add_item(acc, "3.1.5-폼알데하이드", "폼알데하이드",
                             f"폼알데하이드 {s5[i + 1]} (개별안전기준 없는 섬유제품, 피부 접촉; 공통안전기준 3.1.5)")
        elif ln.startswith("아릴아민"):
            entries.add_family(acc, "3.1.5-아릴아민", "아릴아민",
                               f"아릴아민 {s5[i + 1]} (염색 섬유; 대상물질은 KS K 0147·KS K 0739; 공통안전기준 3.1.5)",
                               hint="carcinogenic aromatic amines from azo dyes (KS K 0147 list, not in the 고시)")
    if any("석면" in l for l in sec["3.1.6"]):
        entries.add_family(acc, "3.1.6-석면", "석면", "사용금지 물질: 석면을 사용하거나 검출되어서는 안 됨 (공통안전기준 3.1.6)",
                           hint="asbestos (fibrous silicates); generic CAS not printed in the 고시")
    meta = common.law_meta(doc, None, LIST_ID, ACT, "어린이제품 공통안전기준 유해화학물질 안전요건",
                           "어린이제품 안전 특별법 제25조제2항(공급자적합성확인 안전기준), 어린이제품 공통안전기준 3.1", [
                               "만 13세 이하 어린이제품 제조·수입업자: 공통안전기준(유해화학물질 허용치) 적용 시험·검사 후 공급자적합성확인 및 표시(법 제25조)",
                               "개별 안전기준이 있는 안전인증·안전확인 대상 어린이제품도 공통안전기준을 함께 적용(공통안전기준 1. 비고)",
                               "안전인증·안전확인·공급자적합성확인 표시 없는 제품의 판매·수입·진열·보관 금지(법 제20조·제24조 등)",
                           ], admrul=True)
    meta["amended_on"] = doc.promulgated
    meta["raw_file"] = str(path)
    notes = [f"표는 law.go.kr XML에서 이미지로만 제공되어 고시 첨부 HWP({HWP_NAME})에서 읽음.",
             "DINP·DIDP는 고시에 CAS가 2개씩 병기됨 → 두 번째 CAS는 role=alternative_cas 엔트리로 추가(항목 수에는 미포함).",
             "니트로사민 7종은 '니트로사민류'와 '니트로사민류 생성 가능물질' 두 표에 모두 있어 각각 엔트리로 수록.",
             "pH(4.0~7.5)는 물질이 아니므로 제외. 금속 항목은 원소 총량/용출 기준이라 family(원소)+원소 엔트리."]
    return [listfile.build(meta, acc, 34, 0, notes)]


def permits() -> list[dict]:
    act = lawsrc.fetch_law(ACT)
    s25 = quotes.source(act, "제25조제1항·제2항", quotes.article(act, 25, max_len=700))
    return [quotes.permit(
        "KR_CHILD_SUPPLIER_CONFORMITY", "어린이제품 공급자적합성확인(공통안전기준 시험·검사) 및 표시", ACT, "자가확인·표시",
        [LIST_ID],
        "만 13세 이하 어린이제품(공급자적합성확인대상)에 공통안전기준 3.1 유해화학물질이 허용치를 초과하지 않음을 시험·검사로 확인",
        "산업통상부장관(국가기술표준원 고시)", "어린이제품 안전 특별법 제25조, 어린이제품 공통안전기준", [s25])]
