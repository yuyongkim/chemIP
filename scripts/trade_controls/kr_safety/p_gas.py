"""고압가스 안전관리법: 가연성가스·독성가스·특수고압가스(시행규칙 제2조제1항),
특정고압가스(법 제20조제1항, 시행령 제16조)."""
from __future__ import annotations

import re

from . import list_model as lm
from .context import Ctx
from .named import add_named

LAW = "고압가스 안전관리법"

# 시행규칙 제2조제1항 호 번호 -> (list_id, title, obligations)
_RULE_DEFS = {
    1: ("KR_GAS_FLAMMABLE", "가연성가스",
        ["고압가스 제조·저장·판매 허가 기준 적용 (법 제4조, 시행령 제3조: 가연성가스 충전은 규모 무관 '고압가스 충전' 허가)",
         "시설·기술·검사 기준 (시행규칙 별표 4·8 등)"]),
    2: ("KR_GAS_TOXIC", "독성가스",
        ["고압가스저장소 설치허가 기준량 축소: 액화 1톤(허용농도 200ppm 이하 100kg), 압축 100㎥(허용농도 200ppm 이하 10㎥) (시행규칙 제2조제2항)",
         "독성가스 충전은 규모 무관 '고압가스 충전' 허가 (시행령 제3조제1항제3호가목)",
         "중대재해처벌법 시행령 별표 5 제1호 원료·제조물 (중대시민재해 예방 조치 대상)"]),
    28: ("KR_GAS_SPECIAL", "특수고압가스 (반도체 세정 등 특수 용도)",
         ["시행규칙 별표 8 등 특수고압가스 사용시설 기준"]),
}


# Number of gases enumerated in each provision, counted by hand from the text read on
# 2026-10-24 (시행규칙 MST 286887, 법 MST 283919, 시행령 MST 286839). A change in the law
# shows up as a count_check failure.
_EXPECTED = {"rule1": 32, "rule2": 31, "rule28": 7, "act20": 9, "decree16": 11}
# Gas mixtures named in the law that have no single CAS RN.
_CLASS_TERMS = {"천연가스": "천연가스는 메탄 주성분 혼합가스 - 단일 CAS로 연결하지 않음"}


def _add_gas(ctx: Ctx, lst: dict, law_name: str, where: str) -> None:
    """'압축모노실란' / '액화알진' -> look up the gas without its state prefix."""
    m = re.match(r"^(압축|액화)(.+)$", law_name)
    name, state = (m.group(2), m.group(1)) if m else (law_name, "")
    detail = where + (f"; 법령 표기 '{law_name}'({state} 상태)" if state else "")
    add_named(ctx, lst, name, "", detail, _CLASS_TERMS)


def _names_before_rest(text: str) -> list[str]:
    """'"X"란 Aㆍ Bㆍ C 및 그 밖에 ...' -> [A, B, C]."""
    m = re.search(r'"[^"]+"\s*(?:이)?란\s*(.+?)\s*및\s*그\s*밖에', text)
    if not m:
        return []
    return [n.strip() for n in re.split(r"ㆍ|·", m.group(1)) if n.strip()]


def _rule_item(ctx: Ctx, no: int) -> str:
    art = ctx.article("gas_rule", 2)
    m = re.search(rf"(?m)^{no}\.\s+(.*)$", art)
    if not m:
        raise LookupError(f"고압가스 시행규칙 제2조제1항제{no}호 not found")
    return m.group(1)


def build_rule_lists(ctx: Ctx) -> list[dict]:
    out = []
    for no, (list_id, title, obligations) in _RULE_DEFS.items():
        text = _rule_item(ctx, no)
        lst = lm.new_list(list_id, LAW, title, f"고압가스 안전관리법 시행규칙 제2조제1항제{no}호",
                          ctx.url("gas_rule"), lm.ymd(ctx.meta("gas_rule")["promulgated"]),
                          obligations, ctx.version("gas_rule"))
        names = _names_before_rest(text)
        exp = _EXPECTED[f"rule{no}"]
        lst["count_check"].append({"section": f"시행규칙 제2조제1항제{no}호 열거 가스 수 (원문 수동 계수 {exp})",
                                   "declared": exp, "parsed": len(names), "ok": exp == len(names)})
        for n in names:
            _add_gas(ctx, lst, n, f"시행규칙 제2조제1항제{no}호 열거")
        rule = re.split(r"및\s*그\s*밖에", text, maxsplit=1)
        if len(rule) == 2:
            lm.add_family(lst, f"그 밖의 {title}", "", f"시행규칙 제2조제1항제{no}호: 그 밖에{rule[1]}",
                          "성상 기준(정의 조항) - 열거되지 않은 가스는 성상으로 판정")
        out.append(lst)
    return out


def build_specific(ctx: Ctx) -> dict:
    lst = lm.new_list(
        "KR_GAS_SPECIFIC", LAW, "특정고압가스 (사용신고 대상)",
        "고압가스 안전관리법 제20조제1항, 같은 법 시행령 제16조, 같은 법 시행규칙 제46조",
        ctx.url("gas_act"), lm.ymd(ctx.meta("gas_act")["promulgated"]),
        ["사용 전 시장·군수·구청장에게 특정고압가스 사용신고 (법 제20조제1항; 사용개시 7일 전, 시행규칙 제46조제2항)",
         "신고 대상: 액화 저장능력 500kg 이상, 압축 50㎥ 이상, 배관 공급, 또는 시행규칙 제46조제1항제4호 열거 가스 사용 (시행규칙 제46조제1항)",
         "사용시설 완성검사·정기검사 (법 제20조제4항)"],
        ctx.version("gas_act"))
    act = ctx.article("gas_act", 20)
    m = re.search(r"①\s*(.+?),\s*그\s*밖에\s*대통령령으로", act)
    act_names = [n.strip() for n in re.split(r"ㆍ|·", m.group(1))] if m else []
    for n in act_names:
        _add_gas(ctx, lst, n, "법 제20조제1항 열거")
    dec = ctx.article("gas_decree", 16)
    dec_names = [re.sub(r"^\d+\.\s*", "", ln).strip() for ln in dec.splitlines() if re.match(r"^\d+\.\s", ln)]
    for n in dec_names:
        _add_gas(ctx, lst, n, "시행령 제16조 열거")
    for label, got, key in (("법 제20조제1항", act_names, "act20"), ("시행령 제16조", dec_names, "decree16")):
        lst["count_check"].append({"section": f"{label} 열거 가스 수 (원문 수동 계수 {_EXPECTED[key]})",
                                   "declared": _EXPECTED[key], "parsed": len(got), "ok": _EXPECTED[key] == len(got)})
    return lst


def build(ctx: Ctx) -> list[dict]:
    return build_rule_lists(ctx) + [build_specific(ctx)]
