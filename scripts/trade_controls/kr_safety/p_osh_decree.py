"""산업안전보건법 시행령: 제조등금지물질(제87조), 허가대상물질(제88조),
허용기준 설정 유해인자(별표 26) + 허용기준 값(시행규칙 별표 19)."""
from __future__ import annotations

import re

from . import box_table
from . import list_model as lm
from . import outline_list
from . import text_list as tl
from .context import Ctx

LAW = "산업안전보건법"
# Marks 제87조 entries where only a product containing the substance is prohibited
# (백연 페인트, 벤젠 고무풀, 황린 성냥); derived lists must not treat the substance as prohibited.
PRODUCT_ONLY_MARK = "자체의 제조 금지 아님"


def _article_items(text: str) -> list[tuple[str, str]]:
    """'1. ...' lines of an article -> [(no, text)]."""
    out = []
    for ln in text.splitlines():
        m = re.match(r"^(\d+)\.\s+(.*)$", ln.strip())
        if m:
            out.append((m.group(1), m.group(2)))
    return out


def _from_article(ctx: Ctx, lst: dict, art_no: int, label: str, product_items: dict) -> None:
    """Substance 호 -> entries; mixture / cross-reference 호 -> mixture_rules / family."""
    for no, text in _article_items(ctx.article("osha_decree", art_no)):
        s = tl.parse_substance(text)
        ref = f"{label} 제{no}호"
        if "혼합물" in text and ("해당하는 물질을 포함한" in text or "물질을 포함한 혼합물" in text):
            lst["mixture_rules"].append(f"{ref}: {s.raw}")
            continue
        if not s.cas:
            lm.add_family(lst, s.name_ko, s.name_en, f"{ref}: {s.raw}",
                          "CAS 미기재 항목(공정·위임·타법 인용)")
            continue
        extra = product_items.get(no, "")
        detail = f"{ref}" + (f"; {extra}" if extra else "") + (
            "; '등': 이성질체 등 동일 속성 화합물 포함" if s.isomers else "")
        for c in s.entry_cas:
            lm.add_entry(lst, c, s.cas_names.get(c) or s.name_ko, s.name_en, detail, "law_cas")
        if s.family:
            lm.add_family(lst, s.name_ko, s.name_en, detail,
                          "법령 표의 물질군(염·화합물 등) - 대표 CAS 외 구성원은 CAS로 열거되지 않음",
                          anchor_cas=s.cas)


def build_prohibited(ctx: Ctx) -> dict:
    lst = lm.new_list(
        "KR_OSH_PROHIBITED", LAW, "제조등금지물질 (제조·수입·양도·제공·사용 금지)",
        "산업안전보건법 제117조제1항, 같은 법 시행령 제87조", ctx.url("osha_decree"),
        lm.ymd(ctx.meta("osha_decree")["promulgated"]),
        ["제조·수입·양도·제공·사용 금지 (법 제117조제1항)",
         "시험·연구·검사 목적은 지방고용노동관서장 승인 시 예외 (법 제117조제2항, 시행규칙 제172조)",
         "물질안전보건자료 대체자료 기재 불가 (화학물질의 분류·표시 및 MSDS 기준 고시 제16조제1호)"],
        ctx.version("osha_decree"))
    _from_article(ctx, lst, 87, "시행령 제87조", {
        "3": "백연을 포함한 페인트만 해당(포함 중량비 2% 이하 제외) - 백연 " + PRODUCT_ONLY_MARK,
        "4": "벤젠을 포함하는 고무풀만 해당(포함 중량비 5% 이하 제외) - 벤젠 " + PRODUCT_ONLY_MARK,
        "7": "황린 성냥만 해당 - 황린 " + PRODUCT_ONLY_MARK,
    })
    return lst


def build_permit_required(ctx: Ctx) -> dict:
    lst = lm.new_list(
        "KR_OSH_PERMIT_REQUIRED", LAW, "허가대상물질 (제조·사용 허가)",
        "산업안전보건법 제118조제1항, 같은 법 시행령 제88조", ctx.url("osha_decree"),
        lm.ymd(ctx.meta("osha_decree")["promulgated"]),
        ["제조·사용 전 고용노동부장관(지방고용노동관서장) 허가 (법 제118조제1항, 시행규칙 제173조)",
         "허가기준(제조·사용설비, 작업방법) 유지 의무 (법 제118조제3항)",
         "작업환경측정·특수건강진단 대상 (시행규칙 별표 21 제1호마목, 별표 22 제1호마목)",
         "물질안전보건자료 대체자료 기재 불가 (MSDS 기준 고시 제16조제2호)"],
        ctx.version("osha_decree"))
    _from_article(ctx, lst, 88, "시행령 제88조", {})
    return lst


_PEL_COLS = ["TWA ppm", "TWA mg/㎥", "STEL ppm", "STEL mg/㎥"]


def _fmt(vals: list[str]) -> str:
    out = []
    for i, v in enumerate(vals[:4]):
        if not v:
            continue
        label = _PEL_COLS[i] if not re.search(r"개/", v) else _PEL_COLS[i].split()[0]
        out.append(f"{label} {v}")
    return ", ".join(out)


def _pel_values(ctx: Ctx) -> dict[str, str]:
    """시행규칙 별표 19 rows -> {item no: 'TWA ... ; STEL ...'}."""
    out: dict[str, str] = {}
    for r in box_table.rows(ctx.annex("osha_rule", 19)["text"]):
        m = re.match(r"^(\d+)\.", r.cells[0] if r.cells else "")
        if not m:
            continue
        vals = r.cells[1:]
        if vals and re.search(r"[가-힣]", vals[0]):           # per-form rows (6가크롬 불용성/수용성)
            parts = []
            for line in r.lines:
                form, rest = line[1].strip(), [v.strip() for v in line[2:]]
                if form:
                    parts.append(form + " " + _fmt(rest))
            out[m.group(1)] = "; ".join(parts)
        else:
            out[m.group(1)] = _fmt(vals)
    return out


def build_pel(ctx: Ctx) -> dict:
    lst = lm.new_list(
        "KR_OSH_PEL_LIMIT", LAW, "허용기준 이하 유지 대상 유해인자 (허용기준 설정물질)",
        "산업안전보건법 제107조제1항, 같은 법 시행령 제84조·별표 26, 같은 법 시행규칙 제145조·별표 19",
        ctx.url("osha_decree"),
        lm.annex_amended(ctx.annex("osha_decree", 26)["text"]) or lm.ymd(ctx.meta("osha_decree")["promulgated"]),
        ["작업장 노출 농도를 허용기준 이하로 유지 (법 제107조제1항; 위반 시 과태료)",
         "허용기준 값: 시행규칙 별표 19 (TWA/STEL)"],
        ctx.version("osha_decree"))
    values = _pel_values(ctx)
    kept = outline_list.populate(
        lst, ctx.annex("osha_decree", 26)["text"], "시행령 별표 26",
        extra_for=lambda it, s: ("허용기준(시행규칙 별표 19): " + values[it.mark]) if it.mark in values else "")
    missing = [it.mark for it, _ in kept if it.mark not in values]
    lst["count_check"].append({"section": "시행령 별표 26 항목 수 = 시행규칙 별표 19 행 수",
                               "declared": len(kept), "parsed": len(values),
                               "ok": len(kept) == len(values) and not missing})
    return lst


def build(ctx: Ctx) -> list[dict]:
    return [build_prohibited(ctx), build_permit_required(ctx), build_pel(ctx)]
