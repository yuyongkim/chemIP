"""오존층 보호 등을 위한 특정물질의 관리에 관한 법률: 제1종(시행령 별표 1)·제2종(별표 2) 특정물질.

NCIS classifications in terminology.db do not carry the ozone-law list (checked: no
'특정물질' class), so it is collected here.
"""
from __future__ import annotations

import re

from . import cas as casmod
from . import common, entries, lawgo, listfile, termdb, textutil

LAW = "오존층 보호 등을 위한 특정물질의 관리에 관한 법률"
DECREE = "오존층 보호 등을 위한 특정물질의 관리에 관한 법률 시행령"
# C3 CFCs of Montreal Annex B Group I are formula groups (all isomers); ODP ranges also mark groups.
_C3_CFC = {"CFC-211", "CFC-212", "CFC-213", "CFC-214", "CFC-215", "CFC-216", "CFC-217"}


_KO_EN = [("모노", "mono"), ("디", "di"), ("트리", "tri"), ("테트라", "tetra"), ("펜타", "penta"),
          ("헥사", "hexa"), ("헵타", "hepta"), ("옥타", "octa"), ("데카", "deca"),
          ("클로로", "chloro"), ("플루오로", "fluoro"), ("플르오로", "fluoro"), ("플로오로", "fluoro"),
          ("플로로", "fluoro"), ("브로모", "bromo"), ("메탄", "methane"), ("에탄", "ethane"),
          ("프로판", "propane"), ("부탄", "butane"), ("펜탄", "pentane")]


def halocarbon_en(ko: str) -> str | None:
    """Deterministic transliteration of a Korean systematic halocarbon name
    ('1,1,1,2-테트라플루오로에탄' -> '1,1,1,2-tetrafluoroethane'). None if any part is unknown.
    The law's own misspellings (플르오로, 플로오로, 트리플로로) map to 'fluoro'."""
    m = re.match(r"^([\d,]+-)?(.+)$", ko.replace(" ", ""))
    loc, rest = m.group(1) or "", m.group(2)
    out = ""
    while rest:
        for k, e in sorted(_KO_EN, key=lambda kv: -len(kv[0])):
            if rest.startswith(k):
                out += e
                rest = rest[len(k):]
                break
        else:
            return None
    if not re.search(r"(methane|ethane|propane|butane|pentane)$", out):
        return None
    return loc + out


def _code_key(code: str) -> str:
    return re.sub(r"[\s\-]", "", code or "").lower()


def montreal_code_table() -> dict[str, tuple[str, str]]:
    """Code -> (CAS, name) from terminology.db intl_regulatory (regulation='MONTREAL_ODS'), read-only.
    Used only as an independent cross-check of the name match."""
    out = {}
    con = termdb.index().con
    for cas_no, name in con.execute(
            "select cas_no, chemical_name from intl_regulatory where regulation='MONTREAL_ODS'"):
        m = re.match(r"^((?:CFC|HCFC|HFC|HBFC|Halon)[\s\-]?[0-9A-Za-z]+)", name or "")
        if m and casmod.is_valid(cas_no or ""):
            out[_code_key(m.group(1))] = (cas_no, name)
    return out


def _match_specific(acc, no, name, ko, code, detail, codes) -> None:
    en = halocarbon_en(ko)
    r = termdb.match_name(ko, [en] if en else None)
    code_hit = codes.get(_code_key(code)) if code else None
    if r["status"] == "matched":
        if code_hit and code_hit[0] != r["cas"]:
            acc["items"] += 1
            acc["unmatched"].append({"name": name, "detail": detail, "item_no": no, "reason": "name_vs_code_conflict",
                                     "candidates": [r["cas"], code_hit[0]],
                                     "note": f"이름 매칭 {r['cas']} ({r['matched_name']}) vs 코드표 {code} → {code_hit[0]} ({code_hit[1]})"})
            return
        entries.add_item(acc, no, ko, detail + (f"; 코드 {code}" if code else ""), extra_names=[en] if en else None)
        acc["entries"][-1]["name_ko"] = name
        if code_hit:
            acc["entries"][-1]["code_crosscheck"] = f"intl_regulatory MONTREAL_ODS {code} = {code_hit[0]} (일치)"
        return
    if code_hit and en and en.lower() in code_hit[1].lower():
        acc["items"] += 1
        acc["entries"].append({"cas": code_hit[0], "name_ko": name, "name_en": en, "detail": detail + f"; 코드 {code}",
                               "item_no": no, "match_method": "name_match", "matched_via": "montreal_code_table+systematic_name",
                               "matched_name": f"{code} / {code_hit[1]}",
                               "db_name_ko": termdb.index().name_ko.get(code_hit[0]),
                               "db_name_en": termdb.index().name_en.get(code_hit[0])})
        return
    entries.add_item(acc, no, ko, detail + (f"; 코드 {code}" if code else ""), extra_names=[en] if en else None)
    if acc["unmatched"] and acc["unmatched"][-1]["item_no"] == no:
        acc["unmatched"][-1]["name"] = name


def _rows(text: str) -> list[dict]:
    """Line-based parse: a new item starts when the 호 column holds a number."""
    out, group = [], None
    for row in textutil.table_rows(text):
        cells = [c for c in row]
        if len(cells) < 5:
            continue
        g, no, name, formula, idx = (c.strip() for c in cells[:5])
        if g:
            group = g
        if no.isdigit():
            out.append({"group": group, "no": no, "name": name, "formula": formula, "index": idx})
        elif out and (name or formula or idx):
            last = out[-1]
            last["name"] += name          # wrapped mid-word in the fixed-width table
            last["formula"] += formula
            last["index"] += idx
    return out


def _build(decree, annex_no: int, kind: str) -> tuple[dict, int]:
    codes = montreal_code_table()
    a = lawgo.annex(decree, annex_no)
    acc = entries.new_accumulator()
    rows = _rows(a["text"])
    index_label = "오존파괴지수" if annex_no == 1 else "지구온난화지수"
    for r in rows:
        m = re.match(r"^(.+?)\(([^()]*(?:\([^()]*\)[^()]*)*)\)$", r["name"])
        ko, code = (m.group(1).strip(), m.group(2).strip()) if m else (r["name"].strip(), None)
        if code and not re.match(r"^(CFC|HCFC|HFC|HBFC|Halon)", code):
            ko, code = r["name"].strip(), None          # parenthesis is a synonym, not a code
        detail = f"{kind} 제{r['group']}군 제{r['no']}호, 화학식 {r['formula']}, {index_label} {r['index']}"
        is_group = "~" in r["index"] or (code in _C3_CFC)
        if is_group:
            entries.add_family(acc, r["no"], r["name"], detail + " — 이성질체 군(지수가 범위로 표시되거나 몬트리올의정서상 분자식 군)",
                               formula=r["formula"], code=code)
        else:
            _match_specific(acc, r["no"], r["name"], ko, code, detail, codes)
    return acc, len(rows)


def build() -> dict:
    decree = lawgo.fetch_law(DECREE)
    acc1, n1 = _build(decree, 1, "제1종 특정물질(오존층파괴물질)")
    acc2, n2 = _build(decree, 2, "제2종 특정물질(수소불화탄소)")
    acc = entries.new_accumulator()
    for k in ("entries", "family_entries", "unmatched"):
        acc[k] = acc1[k] + acc2[k]
    acc["items"] = acc1["items"] + acc2["items"]
    meta = common.law_meta(decree, lawgo.annex(decree, 1), "KR_OZONE_CONTROLLED_SUBSTANCES", LAW,
                           "특정물질(제1종 오존층파괴물질·제2종 수소불화탄소)",
                           "오존층 보호 등을 위한 특정물질의 관리에 관한 법률 제2조제1호, 같은 법 시행령 제2조 및 별표 1·별표 2", [
                               "특정물질 제조업 허가(법 제4조, 산업통상부장관)",
                               "특정물질 수입 허가(법 제11조) 및 수출 승인(법 제11조의2)",
                               "제조·수입 부담금(법 제24조의2), 사용합리화 및 회수·재활용 관리",
                           ])
    meta["groups"] = {"제1종(별표 1)": n1, "제2종(별표 2)": n2}
    notes = ["별표 2 마지막 행(제114호 트리플루오로메탄 HFC-23)의 '군' 칸은 law.go.kr 텍스트에서 '?'로 표시됨(원문 로마숫자 문자 깨짐).",
             "ODP/GWP가 범위로 표시된 항목과 CFC-211~217(분자식 군)은 이성질체 군으로 family_entries에 수록, 개별 CAS 미지정.",
             "별표 1 참고 1): 1,1,2-트리클로로에탄은 제Ⅴ군 제20호(C2H3Cl3)에 해당하지 않는다 (원문)."]
    return listfile.build(meta, acc, n1 + n2, 0, notes)


def build_all() -> list[dict]:
    return [build()]
