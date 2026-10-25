"""고용노동부 고시 「화학물질 및 물리적 인자의 노출기준」 별표 1 (화학물질의 노출기준)."""
from __future__ import annotations

import re

from . import box_table
from . import cas as casmod
from . import list_model as lm
from .context import Ctx
from .named import add_named

LAW = "산업안전보건법"
KEY = "oel_notice"


def oel_rows(ctx: Ctx) -> list[dict]:
    """별표 1 table -> [{no, name_ko, name_en, formula, twa_ppm, twa_mg, stel_ppm, stel_mg, remark, cas, see}]."""
    out = []
    for r in box_table.rows(ctx.annex(KEY, 1)["text"]):
        c = r.cells
        if not c or not re.fullmatch(r"\d+", c[0].strip()):
            continue
        row = {"no": int(c[0]), "name_ko": c[1] if len(c) > 1 else "", "name_en": c[2] if len(c) > 2 else "",
               "formula": c[3] if len(c) > 3 else "", "see": "", "irregular": r.irregular}
        if len(c) >= 9:
            row.update(twa_ppm=c[4], twa_mg=c[5], stel_ppm=c[6], stel_mg=c[7], remark=" ".join(c[8:]))
        else:                                   # "… 참조" rows: limit given under another name
            row.update(twa_ppm="", twa_mg="", stel_ppm="", stel_mg="", remark=" ".join(c[4:]))
            if "참조" in row["remark"]:
                row["see"] = row["remark"]
        row["cas"] = casmod.find_all(row["remark"])
        out.append(row)
    return out


def _limits(r: dict) -> str:
    def v(x, unit):
        if not x or x in ("-", "—"):
            return ""
        return x if re.search(r"개/", x) else f"{x} {unit}"     # fibre counts carry their own unit
    parts = []
    twa = " / ".join(p for p in (v(r["twa_ppm"], "ppm"), v(r["twa_mg"], "mg/㎥")) if p)
    stel = " / ".join(p for p in (v(r["stel_ppm"], "ppm"), v(r["stel_mg"], "mg/㎥")) if p)
    if twa:
        parts.append(f"TWA {twa}")
    if stel:
        parts.append(f"STEL {stel}")
    return ", ".join(parts)


def build(ctx: Ctx) -> list[dict]:
    meta = ctx.meta(KEY)
    lst = lm.new_list(
        "KR_OSH_OEL", LAW, "화학물질의 노출기준 (TWA·STEL·C)",
        f"산업안전보건법 제106조, 고용노동부 고시 제{meta['promulgation_no']}호 「화학물질 및 물리적 인자의 노출기준」 별표 1",
        ctx.url(KEY), lm.ymd(meta["promulgated"]),
        ["노출기준: 작업환경측정 결과 평가·관리 기준 (고시 제1조~제3조)",
         "측정치가 노출기준 초과 시 작업환경측정 주기 단축 등 (시행규칙 제190조)",
         "혼재 시 상가작용 노출기준 산출 (고시 제6조)"],
        ctx.version(KEY))
    rows = oel_rows(ctx)
    nums = [r["no"] for r in rows]
    gaps = sorted(set(range(1, max(nums) + 1)) - set(nums)) if nums else []
    lst["count_check"].append({"section": "노출기준 별표 1 일련번호 연속성", "declared": max(nums) if nums else 0,
                               "parsed": len(set(nums)), "ok": not gaps, "missing_numbers": gaps})
    for r in rows:
        if r["see"]:
            lst["notes"].append(f"별표 1 {r['no']} {r['name_ko']} ({r['name_en']}): {r['see']}")
            continue
        detail = f"노출기준 별표 1 {r['no']}"
        lim = _limits(r)
        if lim:
            detail += f"; {lim}"
        rem = re.sub(r"\[[\d\s-]+\]\s*,?", "", r["remark"]).strip(" ,")
        if rem:
            detail += f"; 비고: {rem}"
        if r["cas"]:
            for c in r["cas"]:
                lm.add_entry(lst, c, r["name_ko"], r["name_en"], detail, "law_cas")
        else:
            add_named(ctx, lst, r["name_ko"], r["name_en"], detail + "; 고시에 CAS 미기재")
    return [lst]
