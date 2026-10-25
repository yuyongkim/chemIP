"""생활화학제품 및 살생물제의 안전관리에 관한 법률 — 살생물물질 목록 (화학물질안전원 고시).

  KR_CPBSA_BIOCIDE_EXISTING_DEFERRED  승인유예대상 기존살생물물질의 지정 별표 (369 rows; 제품유형별 승인유예기간)
  KR_CPBSA_BIOCIDE_LOW_RISK           위해성이 낮은 살생물물질 별표 (물질승인 면제, 법 제12조제1항 단서)
Both tables print CAS numbers; rows without CAS ('고유번호 없음' / blank) are name-matched
(English names) and otherwise kept as family entries.
The list of *approved* biocidal substances (물질승인) is published only in 화학제품관리시스템
(chemp.mcee.go.kr), not as a 고시 — not collected here.
"""
from __future__ import annotations

import re

from kr_env import cas as casmod
from kr_env import common, entries, listfile

from . import lawsrc, quotes

ACT = "생활화학제품 및 살생물제의 안전관리에 관한 법률"
EXISTING = "승인유예대상 기존살생물물질의 지정"
LOW_RISK = "위해성이 낮은 살생물물질"
L_EXISTING, L_LOW = "KR_CPBSA_BIOCIDE_EXISTING_DEFERRED", "KR_CPBSA_BIOCIDE_LOW_RISK"
_CAS = re.compile(r"\b\d{2,7}-\d{2}-\d\b")
_TYPE = re.compile(r"^\d+-(?:[가-하]\.)?\s*\S")


def _cells(line: str) -> list[str]:
    """Raw (unstripped) cells of a '│'-delimited line; an inner '├──┼──┤' separator ends the line."""
    parts = line.rstrip().split("│")[1:]
    out = []
    for p in parts:
        if "├" in p or "┼" in p:
            out.append(p.split("├")[0].split("┼")[0])
            break
        out.append(p)
    return out


def _join(acc: str, raw: str) -> str:
    """Join wrapped cell text: no space when the previous fragment filled its column (mid-word wrap)."""
    frag = raw.strip()
    if not frag:
        return acc
    if not acc:
        return frag
    return acc + frag if acc.endswith("\x00") or acc[-1] in "-(" else acc + " " + frag


def _rows(text: str, ncols: int) -> list[dict]:
    rows, cur = [], None
    for ln in text.splitlines():
        if "│" not in ln:
            continue
        c = _cells(ln)
        if len(c) < 3:
            continue
        no = c[0].strip()
        if re.fullmatch(r"\d+", no):
            cur = {"no": no, "name": "", "cas_text": "", "types": [], "remark": "", "_full": False}
            rows.append(cur)
        elif cur is None or no:
            continue
        name_raw = c[1]
        if name_raw.strip():
            sep = "" if cur["_full"] or cur["name"].endswith(("-", "(")) else " "
            cur["name"] = (cur["name"] + sep + name_raw.strip()).strip()
            cur["_full"] = not name_raw.endswith(" ")      # column filled → next line continues the word
        cur["cas_text"] += " " + c[2].strip()
        if ncols >= 5 and len(c) >= 5:
            t, exp = c[3].strip(), c[4].strip()
            rem = c[5].strip() if len(c) > 5 else ""
            if t and _TYPE.match(t):
                cur["types"].append({"type": t, "deferral_until": exp, "remark": rem})
            elif t and cur["types"]:
                cur["types"][-1]["type"] += t
    return rows


def _name_parts(name: str) -> list[str]:
    return [p.strip() for p in name.split(";") if p.strip()]


def _add(acc: dict, row: dict, detail: str, ko: str | None, en: str | None) -> None:
    cas_list = [casmod.normalize(c) for c in _CAS.findall(row["cas_text"])]
    if cas_list:
        for k, c in enumerate(cas_list):
            entries.add_law_cas(acc, row["no"], c, ko or "", en, detail, count=(k == 0),
                                role="alternative_cas" if k else None)
        return
    parts = _name_parts(en or row["name"])
    if ko:
        entries.add_item(acc, row["no"], ko, detail + " — 고시에 CAS 없음", extra_names=parts)
    else:
        entries.add_item(acc, row["no"], parts[-1], detail + " — 고시에 CAS 없음", extra_names=parts[:-1] or None)
    if acc["unmatched"] and acc["unmatched"][-1]["item_no"] == row["no"]:
        u = acc["unmatched"].pop()
        acc["family_entries"].append({"name": row["name"], "detail": detail + " — 고시에 CAS 없음",
                                      "match_note": "terminology.db 정확명 불일치",
                                      "item_no": row["no"], "unmatched": True, "candidates": u["candidates"]})


def _fill_name_ko(e: dict) -> None:
    """The 고시 prints English names only: take name_ko from terminology.db (db_name_ko, already looked up
    by kr_env.entries for the law CAS) when the DB has one, and say where it came from."""
    if not e.get("name_ko") and e.get("db_name_ko"):
        e["name_ko"] = e["db_name_ko"]
        e["name_ko_source"] = "terminology.db"


def build_existing() -> dict:
    doc = lawsrc.fetch_admrul(EXISTING)
    a = lawsrc.annex(doc, 0)
    rows = _rows(a["text"], 6)
    acc = entries.new_accumulator()
    for r in rows:
        types = "; ".join(f"{t['type']} ~{t['deferral_until']}" + (f" ({t['remark']})" if t["remark"] not in ("", "-") else "")
                          for t in r["types"])
        status = "일부/전부 승인유예기간 만료" if any("만료" in t["remark"] for t in r["types"]) else "승인유예기간 유지"
        detail = f"승인유예대상 기존살생물물질 연번 {r['no']} [{status}] 제품유형·승인유예기간: {types}"
        _add(acc, r, detail, None, r["name"])
        for e in acc["entries"]:
            if e["item_no"] == r["no"]:
                e["product_types"] = r["types"]
                _fill_name_ko(e)
    meta = common.law_meta(doc, a, L_EXISTING, ACT, "승인유예대상 기존살생물물질 (살생물제품유형별 승인유예기간)",
                           "생활화학제품 및 살생물제의 안전관리에 관한 법률 제18조제3항, 승인유예대상 기존살생물물질의 지정 제2조 및 별표", [
                               "신고한 자(화학제품관리시스템 신고기업 목록 등재)만 승인유예기간까지 물질승인 없이 제조·수입 가능(법 제18조, 고시 비고 2)",
                               "승인유예기간 만료 물질: 법 제12조 물질승인 또는 제16조 물질동등성 인정 후에만 제조·수입(고시 비고 1)",
                               "신고자는 지정·고시일부터 1년 이내 물질승인 신청계획서 제출(법 제19조제1항)",
                           ], admrul=True)
    nums = [int(r["no"]) for r in rows]
    notes = [f"연번 1~{max(nums)} 중 파싱 {len(rows)}행 (연번 누락: {sorted(set(range(1, max(nums) + 1)) - set(nums)) or '없음'}).",
             "괄호 안 CAS(예: Imidacloprid '(105827-78-9)')와 같이 한 행에 CAS가 여럿이면 두 번째부터 role=alternative_cas.",
             "명칭은 고시의 영문명 그대로(세미콜론으로 구분된 동의어 포함). 고시에 국문명이 없어 name_ko는 "
             "terminology.db 국문명(CAS 일치)이 있을 때만 채움(name_ko_source=terminology.db)."]
    return listfile.build(meta, acc, max(nums), 0, notes)


def build_low_risk() -> dict:
    doc = lawsrc.fetch_admrul(LOW_RISK)
    a = lawsrc.annex(doc, 0)
    rows = _rows(a["text"], 3)
    acc = entries.new_accumulator()
    for r in rows:
        m = re.match(r"^(.*?[가-힣)\]]+[^(]*?)\s*\((.+)\)\s*$", r["name"])
        ko, en = (m.group(1).strip(), m.group(2).strip()) if m else (r["name"], None)
        en_name = re.sub(r",\s*[A-Z][A-Za-z0-9]*\d[A-Za-z0-9]*$", "", en).strip() if en else None   # drop formula
        _add(acc, r, f"위해성이 낮은 살생물물질 순번 {r['no']} — 물질승인 면제(법 제12조제1항 단서)", ko, en_name)
    meta = common.law_meta(doc, a, L_LOW, ACT, "위해성이 낮은 살생물물질 (물질승인 면제)",
                           "생활화학제품 및 살생물제의 안전관리에 관한 법률 제12조제1항 단서, 위해성이 낮은 살생물물질 제2조 및 별표", [
                               "살생물제품용으로 제조·수입하더라도 살생물물질 승인(법 제12조제1항 본문) 불요",
                               "해당 물질을 쓴 살생물제품은 여전히 제품승인 대상(법 제20조; 제품승인 기준 제2항제2호나목)",
                           ], admrul=True)
    return listfile.build(meta, acc, max(int(r["no"]) for r in rows), 0,
                          ["행에 CAS가 여럿이면(예: 황산 철(II) 수화물) 두 번째부터 role=alternative_cas.",
                           "CAS가 없는 행(페로몬·바이러스 등)은 family_entries."])


def build() -> list[dict]:
    return [build_existing(), build_low_risk()]


def permits() -> list[dict]:
    act = lawsrc.fetch_law(ACT)
    s12 = quotes.source(act, "제12조제1항", quotes.article(act, 12, contains="살생물물질을 제조 또는 수입하려는 자는"))
    s18 = quotes.source(act, "제18조제1항·제2항", quotes.article(act, 18, max_len=900))
    s20 = quotes.source(act, "제20조제1항", quotes.article(act, 20, contains="살생물제품을 국내에 판매하거나"))
    return [
        quotes.permit("KR_CPBSA_BIOCIDE_SUBSTANCE_APPROVAL", "살생물물질 승인(물질승인)", ACT, "승인",
                      [L_EXISTING, L_LOW],
                      "살생물제품에 쓰려고 살생물물질을 제조·수입하는 경우. 위해성이 낮은 살생물물질(KR_CPBSA_BIOCIDE_LOW_RISK)은 면제, "
                      "승인유예대상 기존살생물물질은 신고 시 유예기간까지 유예",
                      "기후에너지환경부장관", "법 제12조제1항", [s12]),
        quotes.permit("KR_CPBSA_EXISTING_BIOCIDE_NOTIFICATION", "기존살생물물질 신고(승인유예)", ACT, "신고",
                      [L_EXISTING], "2018.12.31. 이전 유통 살생물제품에 든 기존살생물물질을 유예기간 중 물질승인 없이 제조·수입하려는 경우 사전 신고",
                      "기후에너지환경부장관", "법 제18조", [s18]),
        quotes.permit("KR_CPBSA_BIOCIDAL_PRODUCT_APPROVAL", "살생물제품 승인(제품승인)", ACT, "승인",
                      [L_EXISTING, L_LOW], "살생물제품을 국내 판매·유통 목적으로 제조·수입하는 경우(제품 내 모든 살생물물질이 승인·고시·유예 범위 내여야 함)",
                      "기후에너지환경부장관", "법 제20조", [s20]),
    ]
