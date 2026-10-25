"""위험물안전관리법 시행령 별표 1: 위험물 및 지정수량 (유별·품명 기준).

Every 품명 becomes a family entry with its 지정수량. Substances the table or its
비고 name individually (칼륨, 질산, 비고 12~17의 예시 물질 등) are name-matched to CAS.
Substances that fall in a 품명 only by property (e.g. benzene as 제1석유류) are NOT
listed - the class rule is recorded instead.
"""
from __future__ import annotations

import re

from . import box_table
from . import list_model as lm
from .context import Ctx
from .named import add_named

LAW = "위험물안전관리법"

# 품명 that are one substance (table names them); everything else in the table is a class.
_SINGLE = {"칼륨", "나트륨", "황린", "적린", "황", "마그네슘", "과염소산", "과산화수소", "질산", "하이드록실아민"}
# 비고 conditions that limit a single-substance 품명.
_CONDITIONS = {
    "황": "순도 60중량퍼센트 이상 (비고 3)",
    "과산화수소": "농도 36중량퍼센트 이상 (비고 22)",
    "질산": "비중 1.49 이상 (비고 23)",
    "마그네슘": "2mm 체 미통과 덩어리·지름 2mm 이상 막대 모양 제외 (비고 6)",
}
_QTY = re.compile(r"[\d,]+\s*(?:킬로그램|리터)")


def _items(text: str) -> list[dict]:
    """Table lines -> [{class, nature, name, qty:[...], sub:[...]}] in table order."""
    items, cls, nature = [], "", ""
    for ln in text.splitlines():
        if not box_table._is_table_line(ln) or box_table._is_separator(ln):
            continue
        cells = [c.strip() for c in box_table._cells(ln)]
        if len(cells) < 4:
            continue
        if re.match(r"^제\d류", cells[0]):
            cls, nature = cells[0], ""
        if cells[1] and not cells[1].startswith("성질"):
            nature += cells[1]
        name_cell, qty_cell = cells[2], cells[-1]
        sub_cell = cells[3] if len(cells) == 5 else ""
        m = re.match(r"^(\d+)\.\s*(.*)$", name_cell)
        if m and cls:
            items.append({"class": cls, "nature_lines": nature, "no": m.group(1), "name": m.group(2),
                          "qty": [], "sub": []})
        elif items and name_cell and not m:
            items[-1]["name"] = box_table._join_cell(items[-1]["name"], name_cell, set())
        if items and (qty_cell or sub_cell):
            if sub_cell:
                items[-1]["sub"].append(f"{sub_cell} {qty_cell}".strip())
            elif qty_cell:
                items[-1]["qty"].append(qty_cell)
        if items:
            items[-1]["nature"] = nature
    _merge_split_quantities(items)
    full_nature: dict[str, str] = {}                 # 성질 text spans the whole 유별 block
    for it in items:
        full_nature[it["class"]] = it.get("nature", "")
    for it in items:
        it["nature"] = full_nature[it["class"]]
    return items


def _merge_split_quantities(items: list[dict]) -> None:
    """'10. 그 밖에 …' and '11. … 함유한 것' share one 지정수량 cell that wraps over their lines
    ('50킬로그램, 300킬로' + '그램 또는 1,000킬로' + '그램'): give both the joined text."""
    i = 0
    while i < len(items) - 1:
        q = "".join(items[i]["qty"]).replace(" ", "")
        if q and not re.search(r"(그램|리터)$", q):
            joined = re.sub(r"\s+", "", "".join(items[i]["qty"] + items[i + 1]["qty"]))
            joined = re.sub(r"(그램|리터)(,|또는)", r"\1\2 ", joined).replace("또는", " 또는 ")
            items[i]["qty"] = items[i + 1]["qty"] = [joined]
            i += 2
            continue
        i += 1


def _remarks(text: str) -> str:
    i = text.find("비고")
    return re.sub(r"\s+", " ", text[i:]) if i >= 0 else ""


def build(ctx: Ctx) -> list[dict]:
    text = ctx.annex("hazmat_decree", 1)["text"]
    lst = lm.new_list(
        "KR_HAZMAT_DESIGNATED", LAW, "위험물 및 지정수량 (제1류~제6류)",
        "위험물안전관리법 제2조제1항제1호·제2호, 같은 법 시행령 제2조·제3조·별표 1",
        ctx.url("hazmat_decree"),
        lm.annex_amended(text) or lm.ymd(ctx.meta("hazmat_decree")["promulgated"]),
        ["지정수량 이상 저장·취급은 허가받은 제조소등에서만 (법 제5조제1항); 2종 이상은 지정수량 배수 합 1 이상이면 해당 (법 제5조제5항)",
         "제조소등 설치·변경 허가 - 시·도지사 (법 제6조제1항); 품명·수량·배수 변경 신고 1일 전 (법 제6조제2항)",
         "위험물안전관리자 선임·신고 (법 제15조), 예방규정 (법 제17조), 정기점검·검사 (법 제18조)",
         "지정수량 미만은 시·도 조례 기준 (법 제4조)"],
        ctx.version("hazmat_decree"))
    items = _items(text)
    cls_qty: dict[str, str] = {}
    for it in items:
        q = " ".join(it["qty"])
        if it["class"] == "제5류" and q:
            cls_qty["제5류"] = q
    for it in items:
        qty = " / ".join(it["sub"]) if it["sub"] else re.sub(r"\s+", " ", " ".join(it["qty"])).strip()
        if not qty and it["class"] in cls_qty:
            qty = cls_qty[it["class"]]
        nature = re.sub(r"\s+", "", it.get("nature", ""))
        detail = f"시행령 별표 1 {it['class']}({nature}) {it['no']}. {it['name']}" + (f"; 지정수량 {qty}" if qty else "")
        name = it["name"].strip()
        if name in _SINGLE:
            cond = _CONDITIONS.get(name, "")
            add_named(ctx, lst, name, "", detail + (f"; 조건: {cond}" if cond else ""))
        else:
            lm.add_family(lst, name, "", detail, "유별·품명(성상) 기준 - 개별 물질은 성상 시험·고시로 판정")
    lst["count_check"].append({"section": "별표 1 품명 행 수 (제1류 11, 제2류 9, 제3류 12, 제4류 7, 제5류 11, 제6류 5)",
                               "declared": 55, "parsed": len(items), "ok": len(items) == 55})
    # 비고 12~17: examples named in the definitions of 특수인화물·석유류
    rem = _remarks(text)
    for m in re.finditer(r'"(특수인화물|제1석유류|제2석유류|제3석유류|제4석유류)"(?:이라\s*함은|라\s*함은|이란|란)\s*(.+?)\s*그\s*밖에', rem):
        cls_name, names = m.group(1), [n.strip() for n in re.split(r",\s*", m.group(2)) if n.strip()]
        it = next((i for i in items if i["name"].startswith(cls_name) or cls_name in i["name"]), None)
        qty = (" / ".join(it["sub"]) if it and it["sub"] else " ".join(it["qty"]) if it else "")
        for n in names:
            add_named(ctx, lst, n, "", f"시행령 별표 1 비고: '{cls_name}' 정의에 예시로 열거; 제4류 {cls_name}"
                      + (f"; 지정수량 {qty}" if qty else ""))
    lst["notes"].append("열거되지 않은 물질(예: 벤젠, 톨루엔)은 인화점 등 성상으로 품명이 정해진다 - 이 목록에는 넣지 않음. "
                        "알코올류는 탄소수 1~3 포화1가 알코올(비고 14)로 정의되나 개별 물질명이 열거되지 않아 물질군으로만 기록.")
    return [lst]
