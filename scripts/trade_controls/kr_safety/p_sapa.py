"""중대재해 처벌 등에 관한 법률 시행령: 직업성 질병 원인 물질(별표 1),
중대시민재해 원료·제조물(별표 5). Built after the OSH and gas lists (별표 1 제13호와
별표 5 제1호는 그 목록을 인용한다)."""
from __future__ import annotations

import re

from . import list_model as lm
from . import text_list as tl
from .context import Ctx
from .named import add_named

LAW = "중대재해 처벌 등에 관한 법률"

# Names in 별표 1 that denote a group, not one substance.
_CLASS_TERMS = {
    "유기주석": "유기주석 화합물 전체(물질군) - 단일 CAS로 연결하지 않음",
    "디이소시아네이트": "디이소시아네이트 화합물 전체(물질군) - 단일 CAS로 연결하지 않음",
}
# 별표 1 제11호 is written as '인[백린(白燐), 황린(黃燐) 등 금지물질에 해당하는 동소체로 한정한다]이나 그 화합물'.
_ITEM_NAMES_OVERRIDE = {"11": ["백린", "황린"]}
# 별표 1 제1호~제16호 are chemical agents; 제17호~ are biological / physical / oxygen deficiency.
_LAST_CHEMICAL_ITEM = 16
_FAMILY_TAIL = re.compile(r"^(.+?)(?:이나|나)\s*그\s*화합물")


def _split_agents(segment: str) -> tuple[list[tuple[str, str]], list[str]]:
    """'톨루엔(toluene)ㆍ크실렌(xylene) 등 유기화합물' -> ([(ko, en)], [family phrases])."""
    families = []
    seg = segment
    m = re.search(r"\s*등\s*(유기화합물)\s*$", seg)
    if m:
        families.append(f"{m.group(1)} (열거 물질 외 '등')")
        seg = seg[:m.start()]
    fm = _FAMILY_TAIL.match(seg)
    if fm:
        families.append(seg.split("(")[0].strip() if "(" in seg else seg.strip())
        seg = fm.group(1)
    agents = []
    for tok in re.split(r"ㆍ|·|,\s*|\s+또는\s+", seg):
        tok = tok.strip()
        if not tok:
            continue
        em = re.match(r"^(.+?)\(([A-Za-z][^()]*)\)$", tok)
        agents.append((em.group(1).strip(), em.group(2).strip()) if em else (tok, ""))
    return agents, families


def build_occupational(ctx: Ctx, by_id: dict) -> dict:
    text = ctx.annex("sapa_decree", 1)["text"]
    lst = lm.new_list(
        "KR_SAPA_OCCUPATIONAL_DISEASE", LAW, "직업성 질병(중대산업재해) 원인 화학적 인자",
        "중대재해 처벌 등에 관한 법률 제2조제2호다목, 같은 법 시행령 제2조·별표 1",
        ctx.url("sapa_decree"), lm.ymd(ctx.meta("sapa_decree")["promulgated"]),
        ["동일 유해요인으로 급성중독 등 직업성 질병자가 1년 이내 3명 이상 발생 시 중대산업재해 (법 제2조제2호다목)",
         "사업주·경영책임자의 안전보건 확보의무 (법 제4조) 위반 시 처벌 대상"],
        ctx.version("sapa_decree"))
    roots, _ = tl.parse_outline(text)
    for it in roots:
        t = re.sub(r"\s+", " ", it.text)
        if int(it.mark) > _LAST_CHEMICAL_ITEM:
            lst["notes"].append(f"별표 1 제{it.mark}호 (생물·물리·산소결핍 인자, 물질 아님): {t}")
            continue
        if it.mark == "13":
            for child in it.children:
                lst["notes"].append(f"별표 1 제13호{child.mark}목: {child.text}")
            _derived(lst, by_id.get("KR_OSH_WEM"), r"별표 21 1\.", "별표 1 제13호가목 (작업환경측정 대상 유해인자 중 화학적 인자)")
            _derived(lst, by_id.get("KR_OSH_SHE"), r"별표 22 1\.", "별표 1 제13호나목 (특수건강진단 대상 유해인자 중 화학적 인자)")
            continue
        m = re.match(r"^(.+?)에\s*노출(?:\([^)]*\))?되?어?\s*발생한\s*(.+)$", t)
        if not m:
            lst["notes"].append(f"별표 1 제{it.mark}호 (화학물질 아님): {t}")
            continue
        segment, disease = m.group(1), m.group(2)
        ref = f"별표 1 제{it.mark}호; 질병: {disease.rstrip('.')}"
        if it.mark in _ITEM_NAMES_OVERRIDE:
            agents, families = [(n, "") for n in _ITEM_NAMES_OVERRIDE[it.mark]], [segment]
        else:
            agents, families = _split_agents(segment)
        for fam in families:
            lm.add_family(lst, fam, "", ref, "물질군 또는 '등'으로 열거된 범위 - 대표 물질만 CAS 매칭")
        for ko, en in agents:
            add_named(ctx, lst, ko, en, ref + (f"; 법령 병기 영문 '{en}'" if en else ""), _CLASS_TERMS)
    return lst


def _derived(lst: dict, src: dict | None, ref_rx: str, label: str) -> None:
    """Copy chemical-factor entries of another list (by its legal reference) into lst."""
    if not src:
        lst["notes"].append(f"{label}: 원 목록 없음")
        return
    rx = re.compile(ref_rx)
    for e in src["entries"]:
        if rx.search(e["detail"]):
            lm.add_entry(lst, e["cas"], e["name_ko"], e["name_en"],
                         f"{label}; 근거 목록 {src['list_id']}", e["match_method"],
                         match_note=e.get("match_note", ""))


def build_civil(ctx: Ctx, by_id: dict) -> dict:
    text = ctx.annex("sapa_decree", 5)["text"]
    lst = lm.new_list(
        "KR_SAPA_CIVIL_MATERIALS", LAW, "중대시민재해 예방 조치 대상 원료·제조물",
        "중대재해 처벌 등에 관한 법률 제9조제1항제1호, 같은 법 시행령 제8조제3호·별표 5",
        ctx.url("sapa_decree"), lm.annex_amended(text) or lm.ymd(ctx.meta("sapa_decree")["promulgated"]),
        ["유해·위험요인 주기적 점검, 중대시민재해 우려 시 신고·조치, 발생 시 보고·신고·조치, 원인조사 개선조치 (시행령 제8조제3호)",
         "업무처리절차 마련 (시행령 제8조제4호)"],
        ctx.version("sapa_decree"))
    roots, _ = tl.parse_outline(text)
    for it in roots:
        t = re.sub(r"\s+", " ", it.text)
        if it.mark == "1":
            _derived(lst, by_id.get("KR_GAS_TOXIC"), r".", "별표 5 제1호 (고압가스 안전관리법 독성가스)")
            lm.add_family(lst, "그 밖의 독성가스", "", f"별표 5 제1호: {t}",
                          "고압가스 안전관리법 시행규칙 제2조제1항제2호 성상 기준 독성가스 포함")
        else:
            lm.add_family(lst, t, "", f"별표 5 제{it.mark}호",
                          "타 법률의 물질·제품 범주 인용 - 해당 법률 목록으로 판정")
    return lst


def build(ctx: Ctx, lists: list[dict]) -> list[dict]:
    by_id = {l["list_id"]: l for l in lists}
    return [build_occupational(ctx, by_id), build_civil(ctx, by_id)]
