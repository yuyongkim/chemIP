"""산업안전보건법 물질안전보건자료(MSDS): 작성·제출 대상 범위(법 제110조, 시행령 제86조 제외 대상)와
영업비밀 대체자료 기재 제외물질(법 제112조제1항 단서, MSDS 기준 고시 제16조).

The 대체자료 제외 list is derived from lists built earlier (고시 제16조 cites them)."""
from __future__ import annotations

import re

from . import list_model as lm
from .context import Ctx
from .p_osh_decree import PRODUCT_ONLY_MARK

LAW = "산업안전보건법"
NOTICE = "msds_notice"

# 고시 제16조 각 호 -> list_id built by the other parsers (제6호 화평법 시행규칙 제35조제3항 단서: sibling scope).
_ART16 = {1: "KR_OSH_PROHIBITED", 2: "KR_OSH_PERMIT_REQUIRED", 3: "KR_OSH_MANAGED_HAZARDOUS",
          4: "KR_OSH_WEM", 5: "KR_OSH_SHE"}


def _notice_article(ctx: Ctx, no: int) -> str:
    root = ctx.law(NOTICE)
    for el in root.iter("조문내용"):
        t = "".join(el.itertext()).strip()
        if re.match(rf"^제{no}조\(", t):
            return t
    raise LookupError(f"MSDS 고시 제{no}조 not found")


def build_scope(ctx: Ctx) -> dict:
    lst = lm.new_list(
        "KR_OSH_MSDS_SCOPE", LAW, "물질안전보건자료 작성·제출 대상 (분류기준 해당 화학물질·혼합물)",
        "산업안전보건법 제110조·제104조, 같은 법 시행규칙 별표 18(분류기준), 같은 법 시행령 제86조(제외 대상)",
        ctx.url("osha_act"), lm.ymd(ctx.meta("osha_act")["promulgated"]),
        ["분류기준(시행규칙 별표 18)에 해당하는 화학물질·혼합물을 제조·수입하려는 자는 MSDS 작성·고용노동부장관 제출 (법 제110조제1항)",
         "분류기준 비해당 구성성분 명칭·함유량 별도 제출 (법 제110조제2항)",
         "MSDS 제공·게시·경고표시·교육 (법 제111조, 제114조, 제115조)",
         "개별 물질 목록이 아니라 분류기준(성상)으로 대상이 정해짐 - 제외 대상은 아래 family_entries"],
        ctx.version("osha_act"))
    art = ctx.article("osha_decree", 86)
    for ln in art.splitlines():
        m = re.match(r"^(\d+(?:의\d+)?)\.\s*(.+)$", ln.strip())
        if m:
            lm.add_family(lst, m.group(2), "", f"시행령 제86조 제{m.group(1)}호 (MSDS 작성·제출 제외)",
                          "제외 대상 범주 - 해당 법률·고시로 판정")
    return lst


def build_no_trade_secret(ctx: Ctx, lists: list[dict]) -> dict:
    meta = ctx.meta(NOTICE)
    art16 = _notice_article(ctx, 16)
    lst = lm.new_list(
        "KR_OSH_MSDS_NO_TRADE_SECRET", LAW, "물질안전보건자료 대체자료(영업비밀) 기재 제외물질",
        f"산업안전보건법 제112조제1항 단서, 고용노동부 고시 제{meta['promulgation_no']}호 「화학물질의 분류·표시 및 물질안전보건자료에 관한 기준」 제16조",
        ctx.url(NOTICE), lm.ymd(meta["promulgated"]),
        ["명칭·함유량을 대체자료로 적을 수 없음 - MSDS에 실제 명칭·함유량 기재 (법 제112조제1항 단서)"],
        ctx.version(NOTICE))
    by_id = {l["list_id"]: l for l in lists}
    for no, list_id in _ART16.items():
        src = by_id[list_id]
        for e in src["entries"]:
            if PRODUCT_ONLY_MARK in e["detail"]:      # only a product containing it is prohibited
                continue
            lm.add_entry(lst, e["cas"], e["name_ko"], e["name_en"],
                         f"고시 제16조제{no}호 ({src['title']}; 근거 목록 {list_id})", e["match_method"],
                         match_note=e.get("match_note", ""))
        for f in src["family_entries"]:
            lm.add_family(lst, f["name"], f["name_en"], f"고시 제16조제{no}호 ({list_id}): {f['detail']}",
                          f["rule"], anchor_cas=f["anchor_cas"], candidates=f["name_match_candidates"],
                          match_note=f.get("match_note", ""))
    lm.add_family(lst, "「화학물질의 등록 및 평가 등에 관한 법률」 시행규칙 제35조제3항 단서 화학물질", "",
                  "고시 제16조제6호", "화평법 소관(타 수집기 범위) - 이 목록에 CAS 미포함")
    lst["notes"].append("고시 제16조 원문: " + re.sub(r"\s+", " ", art16))
    return lst


def build(ctx: Ctx, lists: list[dict]) -> list[dict]:
    return [build_scope(ctx), build_no_trade_secret(ctx, lists)]
