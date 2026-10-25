"""안전확인대상생활화학제품 지정 및 안전·표시기준 (기후에너지환경부 고시) 별표 2 — 품목별 화학물질 안전기준.

Three lists, one entry per (품목, 물질):
  KR_CPBSA_PROHIBITED        <표> 제품 내 함유금지물질
  KR_CPBSA_CONTENT_LIMITS    <표> 함유물질 함량 기준 / 사용물질 함량 기준 / 방출량 기준 / 사용가능 주성분 함량 기준
  KR_CPBSA_PRESERVATIVES     '사용가능 보존용 물질' 본문 열거 (표4 외 2)·3) 항목)
Names are not printed with CAS in the 고시 → exact-name match against terminology.db only.
Count check: rows parsed per table = numbered rows counted directly in the table text.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from kr_env import common, entries, listfile

from . import annex_tables, lawsrc, names, quotes

ACT = "생활화학제품 및 살생물제의 안전관리에 관한 법률"
RULE = "안전확인대상생활화학제품 지정 및 안전·표시기준"
L_PROHIBITED, L_LIMITS, L_PRESERV = "KR_CPBSA_PROHIBITED", "KR_CPBSA_CONTENT_LIMITS", "KR_CPBSA_PRESERVATIVES"
_FOOT = re.compile(r"\s*\(\d+\)\s*$")
_DATA = Path(__file__).with_name("data") / "cpbsa_classes.json"


def _classes() -> dict:
    return json.loads(_DATA.read_text(encoding="utf-8"))


def _kind(caption: str) -> str | None:
    if "함유금지" in caption:
        return L_PROHIBITED
    if any(k in caption for k in ("함량 기준", "함량기준", "방출량")):
        return L_LIMITS
    return None


def _product(t: annex_tables.Table) -> str:
    return t.chapter if t.chapter and t.chapter != t.part else t.part


def _add_name(acc: dict, item_no: str, raw: str, detail: str, classes: dict) -> None:
    name = _FOOT.sub("", raw).strip().strip('"').strip()
    if (any(name.startswith(c) for c in classes["classes"]) or any(k in name for k in classes["non_substance_keywords"])
            or re.search(r"(계|류)$", name)):
        entries.add_family(acc, item_no, name, detail)
        return
    m = re.match(r"^(.+?)\s*의\s*합$", name)
    if m:                                   # 'MIT, CMIT의 합' -> limit on the sum
        parts, note = [p.strip() for p in re.split(r",\s*", m.group(1))], "합계 기준"
    elif re.search(r"\s*또는\s*", name) and not name.startswith("("):
        parts, note = [p.strip() for p in re.split(r"\s*또는\s*", name)], None
    else:
        parts, note = [name], None
    for k, p in enumerate(parts):
        d = detail if len(parts) == 1 else f"{detail} — '{name}'의 일부" + (f" ({note})" if note else "")
        entries.add_item(acc, item_no, p, d, extra_names=names.english_for(p), count=(k == 0))


def _detail(t: annex_tables.Table, row: dict) -> str:
    crit = "; ".join(f"{h}: {v}" if h else v for h, v in row["criteria"] if v)
    sub = f" {row['subgroup']}" if row["subgroup"] else ""
    unit = f" ({t.unit})" if t.unit else ""
    return f"{_product(t)}{sub} — <표{t.caption_no}> {t.caption}: {crit}{unit}"


def _preservative_lists(text: str) -> list[tuple[str, str, str]]:
    """[(product, item label, line)] for the enumerated lines under '사용가능 보존용 물질'."""
    out, product, part, inside = [], "", "", False
    for ln in text.splitlines():
        s = ln.strip()
        m = re.match(r"^제(\d+)부\s*(.+)$", s)
        if m and "│" not in s:
            part = product = f"제{m.group(1)}부 {m.group(2)}"
            continue
        m = re.match(r"^제(\d+)장\s*(.+)$", s)
        if m and "│" not in s:
            product, inside = f"제{m.group(1)}장 {m.group(2)}", False
            continue
        if re.match(r"^\d+\.\s*(제품 내 )?사용가능 보존용 물질", s):
            inside = True
            continue
        if inside and re.match(r"^\d+\.\s", s):
            inside = False
        m = re.match(r"^(\d)\)\s*(.+)$", s) if inside else None
        if m and "표" not in m.group(2)[:6] and "법 제" not in m.group(2):
            out.append((product or part, m.group(1), m.group(2)))
    return out


def _split_names(line: str) -> tuple[list[str], str]:
    cond = ""
    m = re.search(r"\(([^()]*(?:한함|제외)[^()]*)\)\s*$", line)
    if m:
        cond, line = m.group(1), line[:m.start()]
    parts = re.findall(r'"[^"]*"|[^,"]+(?:,(?!\s)[^,"]*)*', line)   # keep "A, B" quoted names whole
    return [p.strip().strip('"').strip() for p in parts if p.strip(' ,"')], cond


def build() -> list[dict]:
    doc = lawsrc.fetch_admrul(RULE)
    a = lawsrc.annex(doc, 2)
    classes = _classes()
    accs = {k: entries.new_accumulator() for k in (L_PROHIBITED, L_LIMITS, L_PRESERV)}
    official = {k: 0 for k in accs}
    per_table = []
    for t in annex_tables.tables(a["text"]):
        kind = _kind(t.caption)
        if not kind or not t.header:
            continue
        official[kind] += t.raw_numbered_rows
        per_table.append({"product": _product(t), "table": f"<표{t.caption_no}> {t.caption}",
                          "rows": len(t.rows), "list_id": kind})
        for row in t.rows:
            item = f"{_product(t).split('(')[0]}|표{t.caption_no}{('|' + row['subgroup'][:2]) if row['subgroup'] else ''}|{row['no']}"
            _add_name(accs[kind], item, row["name"], _detail(t, row), classes)
    for product, label, line in _preservative_lists(a["text"]):
        listed, cond = _split_names(line)
        official[L_PRESERV] += len(listed)
        for k, n in enumerate(listed):
            detail = f"{product.split('(')[0]} — 제품 내 사용가능 보존용 물질 {label})" + (f" [{cond}]" if cond else "")
            _add_name(accs[L_PRESERV], f"{product.split('(')[0]}|보존{label}|{k + 1}", n, detail, classes)
    obligations = [
        "안전확인대상생활화학제품 제조·수입자: 시험·검사기관에서 안전기준 적합확인(법 제10조제1항, 유효기간 3년) 후 제품정보·성분·함량 신고(제10조제4항)",
        "함유금지물질 함유 금지(검출허용한도가 있는 경우 비의도적 혼입에 한해 그 이하), 함량제한물질 기준치 준수(별표 2)",
        "확인·신고·표시기준 위반 시 제조·수입 금지 명령 대상(법 제11조)",
    ]
    meta_common = dict(law=ACT, legal_basis="생활화학제품 및 살생물제의 안전관리에 관한 법률 제9조·제10조, "
                       "안전확인대상생활화학제품 지정 및 안전·표시기준 제5조제1항제1호 및 별표 2", obligations=obligations)
    titles = {L_PROHIBITED: "안전확인대상생활화학제품 품목별 함유금지물질",
              L_LIMITS: "안전확인대상생활화학제품 품목별 함량제한물질(함유·사용·방출 기준, 사용가능 주성분)",
              L_PRESERV: "안전확인대상생활화학제품 품목별 사용가능 보존용 물질(본문 열거분)"}
    out = []
    for lid, acc in accs.items():
        names.drop_rejected(acc)
        meta = common.law_meta(doc, a, lid, ACT, titles[lid], meta_common["legal_basis"], obligations, admrul=True)
        meta["groups"] = [p for p in per_table if p["list_id"] == lid] if lid != L_PRESERV else None
        if meta["groups"] is None:
            del meta["groups"]
        notes = ["엔트리는 (품목, 물질) 쌍 단위 — 같은 CAS가 여러 품목에 반복됨. detail에 품목·표·기준치 기재.",
                 "고시에 CAS가 인쇄되지 않아 terminology.db 정확명 일치로만 CAS 부여; 실패분은 unmatched.",
                 "'A 또는 B' 행은 A·B 각각 엔트리(항목 수는 1).",
                 f"물질군·비물질 항목(data/cpbsa_classes.json)은 family_entries."]
        if lid == L_PRESERV:
            notes.append("표4(사용물질 함량 기준)에 있는 보존용 물질은 KR_CPBSA_CONTENT_LIMITS에 수록; 여기는 본문 2)·3) 열거 물질만. "
                         "공통기준 4.의 승인 살생물물질·위해성 낮은 살생물물질·승인유예 기존살생물물질 허용은 KR_CPBSA_BIOCIDE_* 목록 참조.")
        out.append(listfile.build(meta, acc, official[lid], 0, notes))
    return out


def permits() -> list[dict]:
    act = lawsrc.fetch_law(ACT)
    s10 = quotes.source(act, "제10조제1항·제4항", quotes.article(act, 10, max_len=1200))
    s9 = quotes.source(act, "제9조", quotes.article(act, 9))
    return [quotes.permit(
        "KR_CPBSA_SAFETY_CONFIRMATION", "안전확인대상생활화학제품 안전기준 적합확인 및 신고", ACT, "확인·신고",
        [L_PROHIBITED, L_LIMITS, L_PRESERV],
        "고시 별표 1의 안전확인대상생활화학제품(세정제·방향제·탈취제·코팅제 등)을 제조·수입하려는 경우 — 별표 2 품목별 함유금지·함량제한 기준 적합",
        "기후에너지환경부장관(지정 시험·검사기관 확인)", "법 제9조·제10조, 고시 제5조 및 별표 2", [s9, s10])]
