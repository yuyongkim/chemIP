"""QA report: count checks, CAS checksum rejects, unmatched / name-matched names,
KOSHA MSDS section 15 (법적 규제현황) cross-check, and memberships of probe substances.
Written to trade_controls/kr_safety_qa.json (outside kr_lists, which holds lists only)."""
from __future__ import annotations

import json
import re
import sqlite3
from collections import defaultdict

from . import cas as casmod
from . import config

PROBES = {"71-43-2": "벤젠", "108-88-3": "톨루엔", "50-00-0": "포름알데히드",
          "7664-41-7": "암모니아", "7664-39-3": "불화수소"}

# KOSHA section 15 O02 (산업안전보건법에 의한 규제) token prefix -> our list_id
_KOSHA_O02 = [("노출기준설정", "KR_OSH_OEL"), ("관리대상유해", "KR_OSH_MANAGED_HAZARDOUS"),
              ("작업환경측정", "KR_OSH_WEM"), ("특수건강진단", "KR_OSH_SHE"),
              ("허용기준설정", "KR_OSH_PEL_LIMIT"), ("특별관리", "KR_OSH_SPECIAL_MANAGED"),
              ("위험물질", "KR_OSH_DANGEROUS_SUBSTANCES"), ("금지물질", "KR_OSH_PROHIBITED"),
              ("허가", "KR_OSH_PERMIT_REQUIRED")]
_O02 = re.compile(r"<itemDetail>([^<]*)</itemDetail><lev>1</lev><msdsItemCode>O02</msdsItemCode>")
_O06 = re.compile(r"<itemDetail>([^<]*)</itemDetail><lev>1</lev><msdsItemCode>O06</msdsItemCode>")


def _kosha_flags() -> tuple[dict, dict]:
    """-> ({list_id: set(cas)}, {cas: 위험물안전관리법 text}) from KOSHA MSDS section 15 cache."""
    con = sqlite3.connect(f"file:{config.TERMINOLOGY_DB.as_posix()}?mode=ro", uri=True)
    try:
        cas_of = {}
        for ext, cas_no in con.execute("SELECT external_id, cas_no FROM chemical_terms WHERE source='KOSHA'"):
            c = casmod.normalize(cas_no or "")
            if ext and casmod.is_valid(c):
                cas_of[ext] = c
        flags: dict[str, set] = defaultdict(set)
        hazmat: dict[str, str] = {}
        for chem_id, xml in con.execute("SELECT chem_id, xml_data FROM msds_details WHERE section_no=15"):
            c = cas_of.get(chem_id)
            if not c or not xml:
                continue
            m = _O02.search(xml)
            if m:
                flags["_known"].add(c)
                for tok in m.group(1).split("|"):
                    tok = tok.strip()
                    for prefix, list_id in _KOSHA_O02:
                        if tok.startswith(prefix):
                            flags[list_id].add(c)
            m = _O06.search(xml)
            if m:
                hazmat[c] = m.group(1).strip()
        return flags, hazmat
    finally:
        con.close()


def build(ctx, lists: list[dict]) -> dict:
    summary, unmatched, name_matched, counts, invalid = [], [], [], [], []
    for l in lists:
        e = l["entries"]
        summary.append({"list_id": l["list_id"], "title": l["title"], "legal_basis": l["legal_basis"],
                        "entries": len(e), "law_cas": sum(x["match_method"] == "law_cas" for x in e),
                        "name_match": sum(x["match_method"] == "name_match" for x in e),
                        "family_entries": len(l["family_entries"]),
                        "count_check_ok": all(c["ok"] for c in l["count_check"]) if l["count_check"] else None})
        counts += [dict(c, list_id=l["list_id"]) for c in l["count_check"] if not c["ok"]]
        invalid += [dict(x, list_id=l["list_id"]) for x in l.get("_invalid_cas", [])]
        for f in l["family_entries"]:
            if f["rule"].startswith("명칭만") or "단일 CAS로 연결하지 않음" in f["rule"]:
                unmatched.append({"list_id": l["list_id"], "name_ko": f["name"], "rule": f["rule"],
                                  "candidates": f["name_match_candidates"]})
        for x in e:
            if x["match_method"] == "name_match":
                name_matched.append({"list_id": l["list_id"], "cas": x["cas"], "name_ko": x["name_ko"],
                                     "how": x.get("match_note", "").split("CAS 명칭 매칭: ")[-1]})
        for x in e:                                      # entries are validated on insert; re-check
            if not casmod.is_valid(x["cas"]):
                invalid.append({"list_id": l["list_id"], "cas": x["cas"], "detail": "entry with bad checksum"})
    flags, hazmat = _kosha_flags()
    known = flags.pop("_known", set())
    by_id = {l["list_id"]: l for l in lists}
    kosha = []
    for list_id, kset in flags.items():
        ours = {x["cas"] for x in by_id[list_id]["entries"]} if list_id in by_id else set()
        ours_known = ours & known
        kosha.append({"list_id": list_id, "kosha_flagged": len(kset), "ours": len(ours),
                      "ours_with_kosha_msds": len(ours_known), "both": len(ours & kset),
                      "ours_with_kosha_msds_but_not_flagged": sorted(ours_known - kset),
                      "kosha_only_count": len(kset - ours),
                      "note": "KOSHA 15번 항목은 물질군 구성원(화합물·염 등)·혼합물·작성 시점 기준까지 표시하므로 "
                              "kosha_only는 주로 물질군 구성원이며, not_flagged는 KOSHA MSDS 갱신 지연 가능성이 있음"})
    probes = {}
    for c, name in PROBES.items():
        probes[c] = {"name_ko": name,
                     "lists": [{"list_id": l["list_id"], "detail": x["detail"], "match_method": x["match_method"],
                                "match_note": x.get("match_note", "")}
                               for l in lists for x in l["entries"] if x["cas"] == c],
                     "kosha_section15_hazmat": hazmat.get(c, ""),
                     "kosha_section15_osh_flags": [lid for lid, s in flags.items() if c in s]}
    return {"retrieved": config.RETRIEVED, "lists": summary, "count_check_failures": counts,
            "invalid_cas": invalid, "unmatched_or_class_names": unmatched,
            "name_matched_entries": name_matched, "kosha_crosscheck": kosha, "probes": probes}


def write(data: dict):
    config.QA_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2), "utf-8")
    return config.QA_JSON
