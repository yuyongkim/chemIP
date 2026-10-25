"""Coverage cross-checks against data already cached in terminology.db (no API calls):

  * KOSHA MSDS section 15 (msds_details.section_no=15): which Korean-law item codes exist and
    how the '폐기물관리법 → 지정폐기물' flag relates to our waste lists;
  * NCIS classifications: confirm which environment lists NCIS already carries (POPs) and
    which it does not (ozone, PRTR, air/water/soil/odor lists).
"""
from __future__ import annotations

import json
import re
from collections import Counter

from . import cas as casmod
from . import termdb

_ITEM = re.compile(r"<item>(.*?)</item>", re.S)
_TAG = {k: re.compile(rf"<{k}>(.*?)</{k}>", re.S) for k in ("itemDetail", "msdsItemCode", "msdsItemNameKor")}


def _s15_items(xml: str):
    for m in _ITEM.finditer(xml or ""):
        it = m.group(1)
        code = _TAG["msdsItemCode"].search(it)
        name = _TAG["msdsItemNameKor"].search(it)
        det = _TAG["itemDetail"].search(it)
        yield (code.group(1) if code else None, name.group(1) if name else None, det.group(1) if det else None)


def kosha_section15(lists: list[dict]) -> dict:
    con = termdb.index().con
    chem_cas = {}
    for ext, cas_no in con.execute(
            "select external_id, cas_no from chemical_terms where source='KOSHA' and external_id is not null"):
        c = casmod.normalize(cas_no or "")
        if casmod.is_valid(c):
            chem_cas[ext] = c
    codes = Counter()
    code_names = {}
    waste_flag, waste_other = set(), Counter()
    flagged_docs, flagged_unmapped = 0, 0
    n_docs = 0
    for chem_id, xml in con.execute("select chem_id, xml_data from msds_details where section_no=15"):
        n_docs += 1
        for code, name, det in _s15_items(xml):
            if not code:
                continue
            codes[code[:3]] += 1
            code_names.setdefault(code[:3], name)
            if code == "O08" and det:
                for part in (p.strip() for p in det.split("|")):
                    if part == "지정폐기물":
                        flagged_docs += 1
                        if chem_id in chem_cas:
                            waste_flag.add(chem_cas[chem_id])
                        else:
                            flagged_unmapped += 1
                    elif part and part != "해당없음":
                        waste_other[part] += 1
    ours = set()
    for d in lists:
        if d["list_id"].startswith("KR_WASTE"):
            ours.update(e["cas"] for e in d["entries"])
    # how many KOSHA-flagged CAS are NCIS 유해화학물질-type classes (폐유독물질 route)?
    hazard_types = {"인체등유해성물질", "인체등유해성물질 세분류", "사고대비물질", "제한물질", "금지물질",
                    "허가물질", "제한물질 세분류", "금지물질 세분류"}
    ncis_haz = set()
    for cas_no, cls in con.execute("select cas_no, classifications from ncis_substance"):
        try:
            if any(e.get("sbstnClsfTypeNm") in hazard_types for e in json.loads(cls or "[]")):
                ncis_haz.add(casmod.normalize(cas_no))
        except ValueError:
            pass
    return {
        "msds_section15_docs_cached": n_docs,
        "section15_item_codes": {k: {"name": code_names[k], "occurrences": v} for k, v in sorted(codes.items())},
        "note": "KOSHA 15번 '법적 규제현황'의 국내법 항목은 산업안전보건법(O02)·화학물질관리법(O04)·위험물안전관리법(O06)·"
                "폐기물관리법(O08)·기타(O10)·화평법(O12)뿐이며 대기·물환경·토양·악취·오존층 법 항목은 없음 → "
                "환경법 목록은 KOSHA로 교차검증할 수 없고 폐기물관리법 플래그만 비교 가능.",
        "waste_flag_msds_docs": flagged_docs,
        "waste_flag_docs_without_cas_mapping": flagged_unmapped,
        "waste_flag_distinct_cas": len(waste_flag),
        "waste_flag_in_our_waste_entries": len(waste_flag & ours),
        "waste_flag_in_ncis_hazard_classes": len(waste_flag & ncis_haz),
        "waste_flag_in_neither": len(waste_flag - ours - ncis_haz),
        "waste_other_values": dict(waste_other.most_common(10)),
        "interpretation": "KOSHA '지정폐기물' 표시는 물질 목록과 1:1로 대응하지 않는다. 지정폐기물은 폐기물의 성상·발생원(폐유기용제, 폐유독물질, 폐산·폐알칼리 등)으로 정해지므로 "
                          "시행규칙 별표 1·2 기반 목록(우리 엔트리)과 NCIS 유해성 분류를 합쳐도 표시된 CAS의 다수를 설명하지 못한다(원인 미확인). "
                          "따라서 KOSHA 플래그는 참고 정보로만 쓰고 목록 검증 근거로 쓰지 않았다.",
    }


def ncis_overlap() -> dict:
    con = termdb.index().con
    types = Counter()
    for (cls,) in con.execute("select classifications from ncis_substance"):
        try:
            for e in json.loads(cls or "[]"):
                types[e.get("sbstnClsfTypeNm")] += 1
        except ValueError:
            pass
    return {
        "ncis_classification_types": dict(types.most_common()),
        "decision": {
            "잔류성오염물질 관리법": "NCIS '잔류성오염물질' 분류(%d건)가 이미 있어 별도 목록을 만들지 않음" % types.get("잔류성오염물질", 0),
            "오존층 보호법 특정물질": "NCIS 분류에 없음 → KR_OZONE_CONTROLLED_SUBSTANCES 수집",
            "배출량조사·배출저감계획서 대상": "NCIS 분류에 없음 → KR_CHEM_PRTR / KR_CHEM_EMISSION_REDUCTION_PLAN 수집",
        },
    }


def memberships(lists: list[dict], probe: list[str]) -> dict:
    out = {c: [] for c in probe}
    for d in lists:
        for e in d["entries"]:
            if e["cas"] in out:
                out[e["cas"]].append({"list_id": d["list_id"], "title": d["title"], "item_no": e["item_no"],
                                      "match_method": e["match_method"], "detail": e["detail"][:160]})
    return out
