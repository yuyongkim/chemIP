"""화재의 예방 및 안전관리에 관한 법률 시행령 별표 2: 특수가연물 (품명별 수량).

특수가연물 is defined by material category (면화류, 가연성 고체류, 고무류·플라스틱류 …),
not by named chemical substances, so the list has family entries only.
"""
from __future__ import annotations

from . import box_table
from . import list_model as lm
from .context import Ctx

LAW = "화재의 예방 및 안전관리에 관한 법률"


def build(ctx: Ctx) -> list[dict]:
    text = ctx.annex("fire_decree", 2)["text"]
    lst = lm.new_list(
        "KR_FIRE_SPECIAL_COMBUSTIBLES", LAW, "특수가연물 (품명별 기준수량 이상)",
        "화재의 예방 및 안전관리에 관한 법률 제17조제5항, 같은 법 시행령 제19조·별표 2 (저장·취급 기준: 별표 3)",
        ctx.url("fire_decree"), lm.annex_amended(text) or lm.ymd(ctx.meta("fire_decree")["promulgated"]),
        ["기준수량 이상 저장·취급 시 특수가연물 저장·취급 기준 준수 - 표지 설치, 쌓는 높이·면적·이격거리 (시행령 별표 3)"],
        ctx.version("fire_decree"))
    sub_parent = ""
    for r in box_table.rows(text):
        cells = [c for c in r.cells]
        if not cells or cells[0] == "품명":
            continue
        for line in r.lines:                       # one row block may hold several 품명 lines
            vals = [v.strip() for v in line]
            if len(vals) == 2 and vals[0]:
                lm.add_family(lst, vals[0], "", f"시행령 별표 2: {vals[0]} {vals[1]}", "재료 범주 기준 - 개별 화학물질 열거 없음")
            elif len(vals) == 3:
                sub_parent = vals[0] or sub_parent
                lm.add_family(lst, f"{sub_parent}({vals[1]})", "", f"시행령 별표 2: {sub_parent} {vals[1]} {vals[2]}",
                              "재료 범주 기준 - 개별 화학물질 열거 없음")
    lst["count_check"].append({"section": "별표 2 품명 행 수 (고무류·플라스틱류 2행 포함)", "declared": 11,
                               "parsed": len(lst["family_entries"]), "ok": len(lst["family_entries"]) == 11})
    return [lst]
