"""산업안전보건법 시행규칙: 작업환경측정 대상 유해인자(별표 21), 특수건강진단 대상 유해인자(별표 22)."""
from __future__ import annotations

from . import list_model as lm
from . import outline_list
from .context import Ctx

LAW = "산업안전보건법"


def _chemical_or_dust(it, s) -> bool:
    """Skip physical factors (소음·고열·방사선 등) and night work; they are not substances."""
    top = it.titles[0] if it.titles else it.text
    return not any(k in top for k in ("물리적", "야간작업"))


def build_wem(ctx: Ctx) -> dict:
    text = ctx.annex("osha_rule", 21)["text"]
    lst = lm.new_list(
        "KR_OSH_WEM", LAW, "작업환경측정 대상 유해인자",
        "산업안전보건법 제125조, 같은 법 시행규칙 제186조·별표 21", ctx.url("osha_rule"),
        lm.annex_amended(text) or lm.ymd(ctx.meta("osha_rule")["promulgated"]),
        ["해당 유해인자에 노출되는 근로자가 있는 작업장은 작업환경측정 실시 (법 제125조제1항, 시행규칙 제186조)",
         "신규 대상 시 30일 이내 측정, 이후 반기 1회 이상 (노출기준 초과 시 3개월 1회) (시행규칙 제190조)",
         "측정 결과 보고·근로자 통지 (법 제125조제5항·제6항)",
         "물질안전보건자료 대체자료 기재 불가 (MSDS 기준 고시 제16조제4호)"],
        ctx.version("osha_rule"))
    outline_list.populate(lst, text, "시행규칙 별표 21", select=_chemical_or_dust)
    return lst


def build_she(ctx: Ctx) -> dict:
    text = ctx.annex("osha_rule", 22)["text"]
    lst = lm.new_list(
        "KR_OSH_SHE", LAW, "특수건강진단 대상 유해인자",
        "산업안전보건법 제130조제1항, 같은 법 시행규칙 제201조·별표 22 (시기·주기: 별표 23)",
        ctx.url("osha_rule"),
        lm.annex_amended(text) or lm.ymd(ctx.meta("osha_rule")["promulgated"]),
        ["특수건강진단대상업무 종사 근로자 특수건강진단 실시 (법 제130조제1항)",
         "배치전건강진단 (법 제130조제2항), 수시건강진단 (법 제130조제3항)",
         "실시 시기·주기: 시행규칙 제202조·별표 23",
         "물질안전보건자료 대체자료 기재 불가 (MSDS 기준 고시 제16조제5호)"],
        ctx.version("osha_rule"))
    outline_list.populate(lst, text, "시행규칙 별표 22", select=_chemical_or_dust)
    return lst


def build(ctx: Ctx) -> list[dict]:
    return [build_wem(ctx), build_she(ctx)]
