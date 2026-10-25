"""잔류성오염물질의 종류 및 특정면제에 관한 규정 (기후에너지환경부 고시) 별표 1 — 잔류성오염물질 (POPs + 수은).

별표 1 제1호 '가. 물질목록' = 34 Stockholm groups (고유번호, 부속서 A/B/C, 특정면제 ○/-);
'나. 구체적 물질목록 및 화학물질식별번호' = the substances of each group with CAS ('-' = residual
'그 밖의 ...' class, kept as a family entry). 제2호 = 수은 (CAS printed) and 수은화합물 (family).
Count check: one record per CAS cell / '-' cell in 나 (cross-checked against a raw CAS count).
"""
from __future__ import annotations

import re

from kr_env import common, entries, listfile

from . import lawsrc, quotes

ACT = "잔류성오염물질 관리법"
RULE = "잔류성오염물질의 종류 및 특정면제에 관한 규정"
LIST_ID = "KR_POPS_SUBSTANCES"
_GID = re.compile(r"^\d{4}-\d{1,2}$")
_CASF = re.compile(r"^\d{2,7}-\d{2}-\d$")
_CAS_ANY = re.compile(r"(?<![\d-])\d{2,7}-\d{2}-\d(?![\d-])")
_CAS_CELL = re.compile(r"(?m)│\s*\d{2,7}-\d{2}-\d\s*│\s*$")
_DASH_CELL = re.compile(r"(?m)│\s*-\s*│\s*$")
_BOX = re.compile(r"^[─┌┐└┘├┤┬┴┼│\s]*$")
ANNEX_MEANING = {"A": "취급금지(부속서 A)", "B": "취급제한(부속서 B)", "C": "비의도적 생산(부속서 C)"}


def _cells(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("│").split("│")]


def _groups(part_a: str) -> dict[str, dict]:
    """가. 물질목록: {gid: {annex, name, exemption}}"""
    out, cur = {}, None
    for ln in part_a.splitlines():
        if _BOX.match(ln) or "│" not in ln:
            continue
        c = _cells(ln)
        if len(c) < 4:
            continue
        if _GID.match(c[0]):
            cur = c[0]
            out[cur] = {"annex": c[1], "name": c[2], "exemption": c[3] == "○"}
        elif cur and not c[0] and c[2]:
            out[cur]["name"] += " " + c[2]
    return out


def _records(part_b: str) -> list[dict]:
    """나. 구체적 물질목록: [{gid, name, cas|None}] one per CAS/'-' cell."""
    recs, cur, gid = [], None, None
    for ln in part_b.splitlines():
        if _BOX.match(ln) or "│" not in ln:
            continue
        c = _cells(ln)
        if _GID.match(c[0]):
            gid = c[0]
        last = c[-1]
        text = [x for i, x in enumerate(c[:-1]) if x and not (i == 0 and _GID.match(x))
                and not (i == 1 and re.fullmatch(r"[ABC](, ?[ABC])*", x)) and not x.isdigit()]
        if _CASF.match(last) or last == "-":
            cur = {"gid": gid, "parts": text, "cas": last if last != "-" else None}
            recs.append(cur)
        elif last == "":
            if cur is not None and not _GID.match(c[0]) and not any(x.isdigit() for x in c[:-1]):
                cur["parts"].extend(text)
            else:
                cur = None        # group header without CAS (sub rows follow)
        else:
            cur = None            # (sub)group heading spanning the CAS column
    for r in recs:
        r["name"] = re.sub(r"\s+", " ", "".join(_join(r["parts"]))).strip()
    return recs


def _join(parts: list[str]) -> list[str]:
    out = []
    for p in parts:
        if out and not (re.match(r"[가-힣]$", out[-1][-1:]) and re.match(r"^[가-힣]", p)):
            out.append(" " if not out[-1].endswith(("-", ",", "(")) and not p.startswith((")", ",")) else "")
        out.append(p)
    return out


def _split_name(name: str) -> tuple[str, str | None]:
    m = re.match(r"^(.*?[가-힣].*?)\s*\(([^가-힣]+)\)$", name)
    return (m.group(1).strip(), m.group(2).strip()) if m else (name, None)


def build() -> list[dict]:
    doc = lawsrc.fetch_admrul(RULE)
    a = lawsrc.annex(doc, 1)
    text = a["text"]
    ia, ib, ic = text.index("가. 물질목록"), text.index("나. 구체적 물질목록"), text.index("2. 「수은에 관한")
    groups = _groups(text[ia:ib])
    part_b = text[ib:text.index("비고", ib)]
    recs = _records(part_b)
    acc = entries.new_accumulator()
    for r in recs:
        g = groups.get(r["gid"], {})
        annex = g.get("annex", "")
        detail = (f"잔류성오염물질 {r['gid']} {g.get('name', '')} — 스톡홀름협약 부속서 {annex} "
                  f"({', '.join(ANNEX_MEANING[x.strip()] for x in annex.split(',') if x.strip() in ANNEX_MEANING)})"
                  f"; 특정면제 {'있음(별표 2)' if g.get('exemption') else '없음'}")
        ko, en = _split_name(r["name"])
        if r["cas"]:
            entries.add_law_cas(acc, r["gid"], r["cas"], ko, en, detail)
            acc["entries"][-1]["annex"] = annex
        else:
            entries.add_family(acc, r["gid"], r["name"], detail, annex=annex)
    empty = [gid for gid in groups if not any(r["gid"] == gid for r in recs)]
    for gid in empty:      # e.g. 다이옥신·퓨란: whole class, no individual rows in 나목
        g = groups[gid]
        entries.add_family(acc, gid, g["name"], f"잔류성오염물질 {gid} {g['name']} — 스톡홀름협약 부속서 {g['annex']} "
                           f"(나목에 개별 물질·CAS 없음, 물질군 전체)", annex=g["annex"])
    hg = text[ic:]
    m = re.search(r"가\.\s*수은\s*:\s*\(Hg\(0\),\s*CAS No\.\s*([0-9-]+)\)", hg)
    entries.add_law_cas(acc, "Hg-가", m.group(1), "수은", "Mercury", "미나마타협약 잔류성오염물질: 수은 Hg(0) — 취급제한(법 제13조제3항)")
    entries.add_family(acc, "Hg-나", "수은화합물", "미나마타협약 잔류성오염물질: 수은화합물 — 취급제한(법 제13조제3항)",
                       element="Hg")
    raw_cas = len(_CAS_CELL.findall(part_b))          # CAS in the 화학물질식별번호 column
    in_names = len(_CAS_ANY.findall(part_b)) - raw_cas  # CAS quoted inside a name ("67584-55-8 기반의 폴리머")
    dash = len(_DASH_CELL.findall(part_b))
    official = raw_cas + dash + len(empty) + 2
    meta = common.law_meta(doc, a, LIST_ID, ACT, "잔류성오염물질의 종류 (스톡홀름협약 POPs·미나마타협약 수은)",
                           "잔류성오염물질 관리법 제2조제1호·제13조, 잔류성오염물질의 종류 및 특정면제에 관한 규정 제2조 및 별표 1", [
                               "부속서 A(취급금지): 제조·수출입·사용 금지 — 협약 허용 특정용도·시험연구 시약 예외(법 제13조제1항, 특정면제 별표 2)",
                               "부속서 B·수은(취급제한): 협약이 정한 용도 등에 한해 제조·수출입·사용(법 제13조제3항), 용기·포장 표시 등 관리기준(제13조제4항)",
                               "특정면제·허용용도로 수출할 때마다 기후에너지환경부장관 수출승인(법 제13조제5항)",
                               "부속서 C(비의도적 생산): 배출시설 배출허용기준 준수(법 제14조), 배출원·배출량 조사(제18조)",
                               "화학물질관리법상 제한·금지물질 및 농약관리법상 농약은 법 제13조 적용 제외",
                           ], admrul=True)
    meta["groups"] = {gid: {**g, "records": sum(1 for r in recs if r["gid"] == gid)} for gid, g in groups.items()}
    notes = [f"제1호 가목 물질군 {len(groups)}개, 나목 개별물질 행 {len(recs)}개(CAS {raw_cas} + '-' {dash}), "
             f"나목에 개별 행이 없는 물질군 {len(empty)}개({', '.join(empty)}) + 제2호 수은·수은화합물 2개.",
             f"명칭 안에 인용된 CAS {in_names}건(예: '67584-55-8 기반의 폴리머')은 해당 물질의 CAS가 아니므로 엔트리로 만들지 않음.",
             "CAS가 '-'인 '그 밖의 …' 행은 물질군이므로 family_entries로 수록.",
             "고시 제3조: 부속서 A·B 물질이 비의도적 불순물·부산물로 미량 존재하면 제외; 단쇄염화파라핀은 혼합물 중 1% 이상이면 해당.",
             "law.go.kr 텍스트에서 일부 위첨자(입체·고리 번호)가 '?'로 깨져 있음 — 명칭만 해당, CAS는 원문 그대로."]
    if len(groups) != 34:
        notes.append(f"주의: 물질군 수 {len(groups)} (34 기대)")
    return [listfile.build(meta, acc, official, 0, notes)]


def permits() -> list[dict]:
    act = lawsrc.fetch_law(ACT)
    s1 = quotes.source(act, "제13조제1항", quotes.article(act, 13, contains="누구든지 취급금지"))
    s3 = quotes.source(act, "제13조제3항", quotes.article(act, 13, contains="취급제한 잔류성오염물질[스톡홀름협약"))
    s5 = quotes.source(act, "제13조제5항", quotes.article(act, 13, contains="수출을 하려는 때마다"))
    return [
        quotes.permit("KR_POPS_HANDLING_PROHIBITION", "취급금지 잔류성오염물질 제조·수출입·사용 금지", ACT, "금지",
                      [LIST_ID], "스톡홀름협약 부속서 A 물질(annex에 A 포함). 협약 허용 특정용도(고시 별표 2)·시험연구 시약 용도만 예외",
                      "기후에너지환경부장관", "잔류성오염물질 관리법 제13조제1항·제2항", [s1]),
        quotes.permit("KR_POPS_HANDLING_RESTRICTION", "취급제한 잔류성오염물질 용도 제한", ACT, "제한",
                      [LIST_ID], "스톡홀름협약 부속서 B 물질 및 수은·수은화합물: 협약이 정한 용도에 한해 제조·수출입·사용, 관리기준 준수",
                      "기후에너지환경부장관", "잔류성오염물질 관리법 제13조제3항·제4항", [s3]),
        quotes.permit("KR_POPS_EXPORT_APPROVAL", "잔류성오염물질 수출승인", ACT, "승인",
                      [LIST_ID], "취급금지(특정면제 용도)·취급제한(부속서 B 용도) 잔류성오염물질 또는 수은을 수출할 때마다",
                      "기후에너지환경부장관", "잔류성오염물질 관리법 제13조제5항", [s5]),
    ]
