"""산업안전보건기준에 관한 규칙: 관리대상 유해물질(별표 12), 특별관리물질(제420조제6호·별표 12 표기),
위험물질의 종류·기준량(별표 1·별표 9)."""
from __future__ import annotations

import re

from . import box_table
from . import list_model as lm
from . import outline_list
from . import text_list as tl
from .context import Ctx
from .named import add_named

LAW = "산업안전보건법"
_LABEL12 = "안전보건규칙 별표 12"

# 별표 12 items whose 특별관리물질 marking covers only part of the item.
# value: ("family", why) -> family entry only; ("name", 국문명, why) -> name-matched entry.
_PARTIAL_SPECIAL = {
    "2.3": ("family", "니켈 불용성화합물만 특별관리물질"),
    "2.12": ("name", "삼산화안티몬", "삼산화안티몬만 특별관리물질"),
    "2.24": ("family", "6가크롬 화합물만 특별관리물질"),
}


# 별표 12 items that name a further substance without giving its CAS.
_NAMED_IN_ITEM = {"2.3": ["니켈 카르보닐"]}


def _special_marking(s: tl.Substance) -> str:
    """'' (not special), 'full', or the conditional qualifier text."""
    for q in s.qualifiers:
        if "특별관리물질" in q:
            return "full" if q.startswith("특별관리물질") else q
    return ""


def build_managed(ctx: Ctx) -> tuple[dict, list]:
    text = ctx.annex("osha_std", 12)["text"]
    lst = lm.new_list(
        "KR_OSH_MANAGED_HAZARDOUS", LAW, "관리대상 유해물질",
        "산업안전보건법 제39조, 산업안전보건기준에 관한 규칙 제420조제1호·별표 12",
        ctx.url("osha_std"),
        lm.annex_amended(text) or lm.ymd(ctx.meta("osha_std")["promulgated"]),
        ["관리대상 유해물질 취급 작업 보건조치: 설비기준(밀폐·국소배기), 관리, 보호구 (안전보건규칙 제3편제1장)",
         "물질안전보건자료 대체자료 기재 불가 (MSDS 기준 고시 제16조제3호)"],
        ctx.version("osha_std"))
    kept = outline_list.populate(lst, text, _LABEL12)
    for it, s in kept:                       # substances named inside an item without their own CAS
        for name in _NAMED_IN_ITEM.get(it.ref, []):
            add_named(ctx, lst, name, "", f"{_LABEL12} {it.ref} ({s.name_ko})")
    return lst, kept


def build_special(ctx: Ctx, kept: list) -> dict:
    text = ctx.annex("osha_std", 12)["text"]
    lst = lm.new_list(
        "KR_OSH_SPECIAL_MANAGED", LAW, "특별관리물질 (발암성·생식세포 변이원성·생식독성 등)",
        "산업안전보건기준에 관한 규칙 제420조제6호·별표 12 (특별관리물질 표기)", ctx.url("osha_std"),
        lm.annex_amended(text) or lm.ymd(ctx.meta("osha_std")["promulgated"]),
        ["특별관리물질 취급 시 물질명·사용량·작업내용 등 기록 (안전보건규칙 제439조)",
         "특별관리물질 취급 시 유해성·주의사항 고지 (안전보건규칙 제440조)",
         "혼합물 함유 기준: 별표 12 각 호 혼합물 규정(0.1% 또는 0.3%)"],
        ctx.version("osha_std"))
    for it, s in kept:
        mark = _special_marking(s)
        if not mark:
            continue
        detail = f"{_LABEL12} {it.ref}" + ("" if mark == "full" else f"; 조건: {mark}")
        partial = _PARTIAL_SPECIAL.get(it.ref)
        if partial and partial[0] == "family":
            lm.add_family(lst, s.name_ko, s.name_en, detail, partial[1], anchor_cas=[])
            continue
        if partial and partial[0] == "name":
            add_named(ctx, lst, partial[1], "", f"{detail}; {partial[2]}")
            lm.add_family(lst, s.name_ko, s.name_en, detail, partial[2], anchor_cas=[])
            continue
        for c in s.entry_cas:
            lm.add_entry(lst, c, s.cas_names.get(c) or s.name_ko, s.name_en, detail, "law_cas")
        if s.family:
            lm.add_family(lst, s.name_ko, s.name_en, detail,
                          "물질군 전체가 특별관리물질(단서 제외분 주의) - 대표 CAS 외 구성원은 CAS로 열거되지 않음",
                          anchor_cas=s.cas)
    lst["mixture_rules"].append(
        "별표 12 각 호 혼합물 규정: 특별관리물질은 0.1%(일부 물질 0.3%) 이상 함유 혼합물도 해당 - 원문 참조")
    return lst


# ---------------------------------------------------------------- 위험물질 (별표 1 / 별표 9)
_QTY = re.compile(r"[\d,]+\s*(?:킬로그램|리터|세제곱미터)")
_SUB = re.compile(r"^\s*([가-하])\.\s*")
_SLOT = re.compile(r"^\s*\((\d)\)\s*")
_CATEGORY_END = re.compile(r"(류|화합물|유도체|과산화물|염류|수소화물|인화물|금속)\s*$")


def _is_category(title: str) -> bool:
    """'유기금속화합물(알킬알루미늄 … 제외한다)' -> True: judged with parentheticals removed."""
    return bool(_CATEGORY_END.search(re.sub(r"\([^()]*\)", "", title).strip()))


def _slots(lines: list[str]) -> list[dict]:
    """Group-row lines -> slots [{ref, title, text}] following 가./(1) markers."""
    subs: list[dict] = []
    for ln in lines:
        m = _SUB.match(ln)
        if m:
            subs.append({"mark": m.group(1), "title": ln[m.end():].strip(), "lines": [], "parts": []})
            continue
        if not subs:
            continue
        m = _SLOT.match(ln)
        if m:
            subs[-1]["parts"].append({"mark": m.group(1), "text": ln[m.end():].strip()})
        elif subs[-1]["parts"]:
            subs[-1]["parts"][-1]["text"] = tl._join(subs[-1]["parts"][-1]["text"], ln, set())
        elif subs[-1]["lines"] and not re.match(r"^\s{3,}\S", ln):   # wrapped line, not an example line
            subs[-1]["lines"][-1] = tl._join(subs[-1]["lines"][-1], ln, set())
        else:
            subs[-1]["lines"].append(ln.strip())
    slots = []
    for s in subs:
        if s["parts"]:
            for p in s["parts"]:
                slots.append({"ref": f"{s['mark']}({p['mark']})", "title": s["title"],
                              "text": p["text"], "examples": "", "part": True})
        else:
            examples = " ".join(s["lines"])
            title = s["title"]
            if examples and not _is_category(title):   # wrapped title, not an example line
                title, examples = tl._join(title, examples, set()), ""
            slots.append({"ref": s["mark"], "title": title, "text": examples or title,
                          "examples": examples, "part": False})
    return slots


def _names(slot: dict) -> tuple[list[str], str]:
    """Named substances in a slot and the condition text (농도 등)."""
    text = slot["examples"] or slot["text"]
    region = re.split(r"그\s*밖|\s*등\s*(?=LD50|가스|$)|\s+등\s", text)[0]
    cond = ""
    m = re.match(r"^\s*(농도가\s*\d+퍼센트\s*이상인)\s*", region)
    if m:
        cond, region = m.group(1), region[m.end():]
    names = []
    for tok in re.split(r"ㆍ|·|,\s", region):
        tok = re.sub(r"\s+", " ", tok).strip(" .,")
        if not tok or re.search(r"류$", tok) or re.search(r"LD50|LC50|인화점|분말|\d{2,}", tok):
            continue
        names.append(tok)
    return names, cond


# Names in 별표 1/9 that denote a class of compounds, so a single-CAS name match would be wrong.
_CLASS_TERMS = {"황화인": "황화인은 인의 황화물 전체(P4S3·P2S5·P4S7 등)를 가리키는 물질군 - 단일 CAS로 연결하지 않음"}


def _dangerous_slots(lst: dict, t9: str):
    """Yield (group no, group title, slot, 기준량) over 별표 9, splitting rows that hold
    several 호 and assigning the 기준량 column to slots in order."""
    for row in box_table.rows(t9):
        lines = [ln[0] for ln in row.lines if ln and ln[0].strip()]
        groups, cur = [], None
        for ln in lines:
            g = re.match(r"^\s*(\d)\.\s*(.*)$", ln)
            if g:
                cur = {"no": g.group(1), "title": g.group(2).strip(), "lines": []}
                groups.append(cur)
            elif cur:
                cur["lines"].append(ln)
        if not groups:
            continue
        for gr in groups:
            gr["slots"] = _slots(gr["lines"])
        qtys = _QTY.findall(row.cells[1] if len(row.cells) > 1 else "")
        n_slots = sum(len(gr["slots"]) for gr in groups)
        if len(qtys) == n_slots:
            flat = list(qtys)
        elif len(set(qtys)) == 1:
            flat = qtys[:1] * n_slots
        else:
            flat = [""] * n_slots
            lst["notes"].append(f"별표 9 {[g['no'] for g in groups]}호: 기준량 {len(qtys)}개 / 세목 {n_slots}개 - 정렬 불가, 원문 참조")
        lst["count_check"].append({"section": "별표 9 제" + "·".join(g["no"] for g in groups) + "호 기준량 정렬",
                                   "declared": len(qtys), "parsed": n_slots,
                                   "ok": len(qtys) == n_slots or len(set(qtys)) == 1})
        i = 0
        for gr in groups:
            for sl in gr["slots"]:
                yield gr["no"], gr["title"], sl, flat[i]
                i += 1


def build_dangerous(ctx: Ctx) -> dict:
    t1 = ctx.annex("osha_std", 1)["text"]
    t9 = ctx.annex("osha_std", 9)["text"]
    lst = lm.new_list(
        "KR_OSH_DANGEROUS_SUBSTANCES", LAW, "위험물질의 종류 및 기준량 (폭발성·물반응성·산화성·인화성·부식성·급성독성)",
        "산업안전보건기준에 관한 규칙 제16조·제17조·제225조·별표 1(종류), 제273조·별표 9(기준량)",
        ctx.url("osha_std"),
        lm.annex_amended(t9) or lm.annex_amended(t1),
        ["위험물질 취급 시 폭발·화재 예방조치 (안전보건규칙 제225조 등)",
         "기준량 이상 제조·취급 특수화학설비: 계측장치·자동경보장치·긴급차단장치 등 (안전보건규칙 제273조~제275조)",
         "기준량: 설비에서 하루 최대 제조·취급량, 순도 100% 기준, 2종 이상이면 합산비 R≥1 (별표 9 비고)"],
        ctx.version("osha_std"))
    for group, group_title, sl, qty in _dangerous_slots(lst, t9):
        _add_slot(ctx, lst, group, group_title, sl, qty)
    return lst


def _add_slot(ctx: Ctx, lst: dict, group: str, group_title: str, sl: dict, qty: str) -> None:
    base = f"별표 9 제{group}호{sl['ref']} {group_title} > {sl['title']}" + (f"; 기준량 {qty}" if qty else "")
    category = _is_category(sl["title"]) and not sl["part"]
    names, cond = _names(sl) if (sl["examples"] or not category) else ([], "")
    is_class = "그 밖" in sl["text"] or re.search(r"LD50|LC50|인화점", sl["text"]) or category
    if is_class or not names:
        lm.add_family(lst, sl["title"], "", base + (f"; 예시: {sl['examples']}" if sl["examples"] else ""),
                      "품목·성상 기준 분류(물질군) - 열거된 예시 물질만 CAS 매칭")
    for n in names:
        add_named(ctx, lst, n, "", base + (f"; 조건: {cond}" if cond else ""), _CLASS_TERMS)


def build(ctx: Ctx) -> list[dict]:
    managed, kept = build_managed(ctx)
    return [managed, build_special(ctx, kept), build_dangerous(ctx)]
