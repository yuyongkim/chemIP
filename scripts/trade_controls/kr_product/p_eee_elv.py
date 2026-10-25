"""전기·전자제품 및 자동차의 자원순환에 관한 법률 시행령 별표 1의2 (유해물질의 함유기준) — Korean RoHS / ELV.

Table: "1. 전기·전자제품" (10 substances) and "2. 자동차" (4 substances). Rows that share a
merged 함유기준 cell form a group; a group ends at a '┼' or '└' border line.
"""
from __future__ import annotations

import re

from kr_env import common, entries, listfile

from . import lawsrc, quotes

LAW = "전기ㆍ전자제품 및 자동차의 자원순환에 관한 법률"
DECREE = LAW + " 시행령"
LIST_ID = "KR_ELV_EEE_HAZARDOUS_SUBSTANCES"
_ROW = re.compile(r"^│\s*([가-하])\.\s*(.+?)\s*│(.*)│\s*$")
_SECTION = re.compile(r"^\s*([12])\.\s*(전기·전자제품|자동차)\s*$")
_ELEMENTS = {"납", "수은", "카드뮴"}
_FAMILY = {"육가크롬": "Cr(VI) compounds", "폴리브롬화비페닐": "PBBs (polybrominated biphenyls)",
           "폴리브롬화디페닐에테르": "PBDEs (polybrominated diphenyl ethers)"}


def _groups(text: str) -> list[dict]:
    """[{section, product, rows:[(letter, name)], limit}] in table order."""
    out, section, cur = [], None, None
    for ln in text.splitlines():
        s = ln.strip()
        m = _SECTION.match(s)
        if m:
            section = (m.group(1), m.group(2))
            continue
        if section is None:
            continue
        if s.startswith("├") or s.startswith("┌") or s.startswith("└"):
            tail = re.sub(r"[─┼┤├┌┐└┘┬┴│]", " ", s).strip()
            if cur and tail:
                cur["limit"] += " " + tail
            if ("┼" in s or s.startswith("└")) and cur:
                out.append(cur)
                cur = None
            continue
        r = _ROW.match(s)
        if r:
            if cur is None:
                cur = {"section": section[0], "product": section[1], "rows": [], "limit": ""}
            cur["rows"].append((r.group(1), r.group(2).strip()))
            cur["limit"] += " " + r.group(3).strip()
        elif cur and s.startswith("│"):
            cur["limit"] += " " + s.strip("│ ").split("│")[-1].strip()
    return out


def build() -> list[dict]:
    decree = lawsrc.fetch_law(DECREE)
    a = lawsrc.annex(decree, 1, 2)
    acc = entries.new_accumulator()
    n = 0
    for g in _groups(a["text"]):
        limit = re.sub(r"\s+", " ", g["limit"]).strip()
        for letter, raw in g["rows"]:
            n += 1
            name = re.sub(r"\s+", "", raw.split("(")[0])
            abbr = re.findall(r"\(([A-Z]+)\)", raw)
            item = f"{'EEE' if g['section'] == '1' else 'ELV'}-{letter}"
            detail = f"{g['product']} 유해물질 함유기준: {limit} (시행령 별표 1의2 제{g['section']}호 {letter}목)"
            if name in _ELEMENTS:
                entries.add_element_group(acc, item, name, detail)
            elif name in _FAMILY:
                entries.add_family(acc, item, name, detail, hint=_FAMILY[name])
            else:
                entries.add_item(acc, item, raw.strip(), detail, extra_names=abbr or None)
    meta = common.law_meta(decree, a, LIST_ID, LAW, "전기·전자제품 및 자동차의 유해물질 함유기준 (한국형 RoHS·ELV)",
                           "전기ㆍ전자제품 및 자동차의 자원순환에 관한 법률 제9조제1항, 같은 법 시행령 제9조제1항 및 별표 1의2", [
                               "대상 전기·전자제품·자동차 제조·수입업자: 제조단계에서 유해물질 함유기준 준수(법 제9조제1항; 예외 시행령 별표 2, 연구·개발·수출 목적 제외)",
                               "함유기준 준수 여부를 스스로 확인하여 출고일(수입은 수입신고일)부터 3개월 이내 공표(법 제11조, 시행령 제11조)",
                           ])
    notes = ["금속(납·수은·카드뮴)은 동일물질 내 원소 중량 기준이므로 family_entries(원소) + 원소 자체 엔트리로 수록.",
             "육가크롬·PBB·PBDE는 물질군이므로 family_entries로만 수록(대표 CAS를 추정하지 않음)."]
    return [listfile.build(meta, acc, n, 0, notes)]


def permits() -> list[dict]:
    law = lawsrc.fetch_law(LAW)
    decree = lawsrc.fetch_law(DECREE)
    s9 = quotes.source(law, "제9조제1항", quotes.article(law, 9, contains="함유기준을 지켜야"))
    s11 = quotes.source(law, "제11조", quotes.article(law, 11))
    d8 = quotes.source(decree, "제8조", quotes.article(decree, 8, max_len=1600))
    d9 = quotes.source(decree, "제9조제1항", quotes.article(decree, 9, contains="별표 1의2"))
    d11 = quotes.source(decree, "제11조제2항", quotes.article(decree, 11, contains="3개월 이내"))
    return [
        quotes.permit("KR_EEE_ELV_HAZARDOUS_CONTENT_COMPLIANCE", "전기·전자제품·자동차 유해물질 함유기준 준수",
                      LAW, "준수의무", [LIST_ID],
                      "DC 1,500 V / AC 1,000 V 이하 전기·전자제품(시행령 제8조제1항 제외품목 제외) 또는 승용·9인승 이하 승합·경형/소형 화물자동차(제8조제2항)를 제조·수입하는 경우, 동일물질 기준 함유기준 초과 금지",
                      "기후에너지환경부장관·산업통상부장관", "법 제9조제1항, 시행령 제8조·제9조 및 별표 1의2", [s9, d8, d9]),
        quotes.permit("KR_EEE_ELV_COMPLIANCE_DISCLOSURE", "유해물질 함유기준 준수 여부 자가확인·공표",
                      LAW, "공표", [LIST_ID],
                      "대상 제품 제조업자는 출고일, 수입업자는 최초 수입신고일부터 3개월 이내 운영관리정보체계 등에 공표",
                      "운영관리정보체계(법 제38조) 또는 자사 홈페이지(운영기관의 장에게 통지)", "법 제11조, 시행령 제11조", [s11, d11]),
    ]
