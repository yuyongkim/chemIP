"""Pure parsers for 법제처 OPEN API JSON (no network, no DB): search hits, 현행 pick, law/admrul body → doc + articles
+ 별표, history rows, and the article-level diff between two versions. Tested with recorded fixtures
(tests/test_law_corpus.py).

Shapes:
  hit     {name, law_id, serial, law_type, promulgated_on, promulgation_no, effective_on, amend_type, ministry, status}
  article {seq, article_no ("9" / "9의2" / "본문"), article_key, kind ("article" | "heading" | "body"), title, text, paras, effective_on}
          paras = [{no, text, items: [{no, text, subitems: [{no, text}]}]}] (법령); None for 행정규칙 (one text string)
  annex   {annex_no ("1" / "1의2"), annex_key, annex_kind (별표/서식), title, pdf_url, file_url}
"""
from __future__ import annotations

import re

from law_config import SITE

DOTS = str.maketrans({"·": "ㆍ", "‧": "ㆍ", "・": "ㆍ", "•": "ㆍ"})

ADM_ART_RE = re.compile(r"^\s*제\s*(\d+)\s*조(?:\s*의\s*(\d+))?\s*(?:\(([^)]*)\))?")
DIFF_KINDS = ("article", "body")   # "body" = the whole text of a 행정규칙 without 제N조
DELETED_RE = re.compile(r"^제\s*\d+\s*조(?:의\s*\d+)?\s*(?:\([^)]*\))?\s*삭제")
SEARCH_FIELDS = {
    "law": ("LawSearch", "law", {"name": "법령명한글", "law_id": "법령ID", "serial": "법령일련번호", "law_type": "법령구분명",
                                 "promulgated_on": "공포일자", "promulgation_no": "공포번호", "effective_on": "시행일자",
                                 "amend_type": "제개정구분명", "ministry": "소관부처명", "status": "현행연혁코드"}),
    "admrul": ("AdmRulSearch", "admrul", {"name": "행정규칙명", "law_id": "행정규칙ID", "serial": "행정규칙일련번호",
                                          "law_type": "행정규칙종류", "promulgated_on": "발령일자", "promulgation_no": "발령번호",
                                          "effective_on": "시행일자", "amend_type": "제개정구분명", "ministry": "소관부처명",
                                          "status": "현행연혁구분"}),
}
DATE_FIELDS = ("promulgated_on", "effective_on")


def norm_name(name: str) -> str:
    """Name compare key: no spaces, one middle-dot form."""
    return re.sub(r"\s+", "", (name or "").translate(DOTS))


def as_list(x) -> list:
    return [] if x is None else x if isinstance(x, list) else [x]


def iso8(d) -> str:
    d = str(d or "").strip()
    return f"{d[:4]}-{d[4:6]}-{d[6:8]}" if len(d) == 8 and d.isdigit() else ""


def texts(x) -> list[str]:
    """Strings from a value that may be a string or nested lists of strings."""
    if x is None:
        return []
    if isinstance(x, str):
        return [x]
    if isinstance(x, list):
        return [s for v in x for s in texts(v)]
    return [str(x)]


def clean(s: str) -> str:
    return "\n".join(line.strip() for line in "\n".join(texts(s)).splitlines() if line.strip())


def link(path: str) -> str:
    path = (path or "").strip()
    return SITE + path if path.startswith("/") else path


# ---------- search ----------

def search_hits(data: dict, kind: str) -> tuple[list[dict], int]:
    """(hits, totalCnt) of a lawSearch answer (target law/eflaw → kind "law", admrul → "admrul")."""
    root_key, row_key, fields = SEARCH_FIELDS[kind]
    root = data.get(root_key) or {}
    hits = []
    for el in as_list(root.get(row_key)):
        h = {k: str(el.get(src) or "").strip() for k, src in fields.items()}
        for k in DATE_FIELDS:
            h[k] = iso8(h[k])
        hits.append(h)
    try:
        total = int(root.get("totalCnt") or 0)
    except ValueError:
        total = len(hits)
    return hits, total


def pick_current(hits: list[dict], name: str) -> tuple[dict | None, str]:
    """The 현행 hit whose name equals `name` (space/middle-dot insensitive). (hit, "") or (None, reason)."""
    want = norm_name(name)
    same = [h for h in hits if norm_name(h["name"]) == want]
    if not same:
        near = sorted({h["name"] for h in hits})[:5]
        return None, "no exact name match" + (f" (search gave: {', '.join(near)})" if near else " (no search hits)")
    cur = [h for h in same if h["status"] == "현행"]
    if not cur:
        return None, f"exact name found but no 현행 version (status: {', '.join(sorted({h['status'] for h in same}))})"
    ids = {h["law_id"] for h in cur}
    if len(ids) > 1:
        return None, f"ambiguous: {len(ids)} different IDs are 현행 under this name ({', '.join(sorted(ids))})"
    return max(cur, key=lambda h: (h["promulgated_on"], h["serial"])), ""


# ---------- law body (lawService target=law) ----------

def _no(base, branch) -> str:
    base, branch = str(base or "").strip().rstrip("."), str(branch or "").strip().lstrip("0")
    return f"{base}의{branch}" if branch else base


def _law_paras(arts_hang) -> tuple[list[dict], list[str]]:
    paras, lines = [], []
    for hang in as_list(arts_hang):
        if not isinstance(hang, dict):
            continue
        p_text = clean(hang.get("항내용"))
        items = []
        if p_text:
            lines.append(p_text)
        for ho in as_list(hang.get("호")):
            if not isinstance(ho, dict):
                continue
            i_text = clean(ho.get("호내용"))
            subs = []
            if i_text:
                lines.append(i_text)
            for mok in as_list(ho.get("목")):
                if not isinstance(mok, dict):
                    continue
                m_text = clean(mok.get("목내용"))
                if m_text:
                    lines.append(m_text)
                subs.append({"no": str(mok.get("목번호") or "").strip(), "text": m_text})
            items.append({"no": _no(ho.get("호번호"), ho.get("호가지번호")), "text": i_text, "subitems": subs})
        paras.append({"no": str(hang.get("항번호") or "").strip(), "text": p_text, "items": items})
    return paras, lines


def law_articles(body: dict) -> list[dict]:
    out = []
    for seq, u in enumerate(as_list((body.get("조문") or {}).get("조문단위")), 1):
        if not isinstance(u, dict):
            continue
        head = clean(u.get("조문내용"))
        paras, lines = _law_paras(u.get("항"))
        out.append({"seq": seq, "article_no": _no(u.get("조문번호"), u.get("조문가지번호")),
                    "article_key": str(u.get("조문키") or ""),
                    "kind": "article" if u.get("조문여부") == "조문" else "heading",
                    "title": str(u.get("조문제목") or "").strip(), "text": "\n".join([head] + lines).strip(),
                    "paras": paras or None, "effective_on": iso8(u.get("조문시행일자"))})
    return out


def annexes(body: dict) -> list[dict]:
    out = []
    for u in as_list((body.get("별표") or {}).get("별표단위")):
        if not isinstance(u, dict):
            continue
        out.append({"annex_no": _no(str(u.get("별표번호") or "").lstrip("0") or "0", u.get("별표가지번호")),
                    "annex_key": str(u.get("별표키") or ""), "annex_kind": str(u.get("별표구분") or "별표").strip(),
                    "title": str(u.get("별표제목") or "").strip(),
                    "pdf_url": link(u.get("별표서식PDF파일링크")), "file_url": link(u.get("별표서식파일링크"))})
    return out


def law_doc(data: dict) -> dict:
    """lawService target=law JSON → {meta, articles, annexes}."""
    body = data.get("법령")
    if not isinstance(body, dict):
        raise ValueError("no 법령 element in the answer")
    b = body.get("기본정보") or {}
    ministry = b.get("소관부처")
    law_type = b.get("법종구분")
    meta = {"name": str(b.get("법령명_한글") or "").strip(), "law_id": str(b.get("법령ID") or ""),
            "law_type": (law_type.get("content") if isinstance(law_type, dict) else law_type) or "",
            "promulgated_on": iso8(b.get("공포일자")), "promulgation_no": str(b.get("공포번호") or ""),
            "effective_on": iso8(b.get("시행일자")), "amend_type": str(b.get("제개정구분") or ""),
            "ministry": (ministry.get("content") if isinstance(ministry, dict) else ministry) or ""}
    return {"meta": meta, "articles": law_articles(body), "annexes": annexes(body)}


# ---------- 행정규칙 body (lawService target=admrul) ----------

def admrul_articles(body: dict) -> list[dict]:
    out = []
    for seq, s in enumerate(texts(body.get("조문내용")), 1):
        text = clean(s)
        if not text:
            continue
        m = ADM_ART_RE.match(text)
        out.append({"seq": seq, "article_no": _no(m.group(1), m.group(2)) if m else "", "article_key": "",
                    "kind": "article" if m else "heading", "title": (m.group(3) or "").strip() if m else "",
                    "text": text, "paras": None, "effective_on": ""})
    if out and not any(a["kind"] == "article" for a in out):  # 조문형식여부 N: the rule is one text, no 제N조
        out = [{**a, "kind": "body", "article_no": "본문" if len(out) == 1 else f"본문{i}"} for i, a in enumerate(out, 1)]
    return out


def admrul_doc(data: dict) -> dict:
    body = data.get("AdmRulService")
    if not isinstance(body, dict):
        raise ValueError("no AdmRulService element in the answer")
    b = body.get("행정규칙기본정보") or {}
    meta = {"name": str(b.get("행정규칙명") or "").strip(), "law_id": str(b.get("행정규칙ID") or ""),
            "law_type": str(b.get("행정규칙종류") or ""), "promulgated_on": iso8(b.get("발령일자")),
            "promulgation_no": str(b.get("발령번호") or ""), "effective_on": iso8(b.get("시행일자")),
            "amend_type": str(b.get("제개정구분명") or ""), "ministry": str(b.get("소관부처명") or "")}
    return {"meta": meta, "articles": admrul_articles(body), "annexes": annexes(body)}


def doc(kind: str, data: dict) -> dict:
    return law_doc(data) if kind == "law" else admrul_doc(data)


# ---------- article diff ----------

def _norm_text(t: str) -> str:
    return re.sub(r"\s+", "", t or "")


def _is_deleted(t: str) -> bool:
    return bool(DELETED_RE.match((t or "").strip()))


def diff_articles(old: list[dict], new: list[dict]) -> list[tuple[str, str, str]]:
    """[(change, article_no, title)] with change ∈ added / removed / modified. Headings (장·절) are ignored;
    an article whose text becomes "제N조 삭제" counts as removed."""
    o = {a["article_no"]: a for a in old if a["kind"] in DIFF_KINDS and a["article_no"]}
    n = {a["article_no"]: a for a in new if a["kind"] in DIFF_KINDS and a["article_no"]}
    out = []
    for no, a in n.items():
        if no not in o:
            if not _is_deleted(a["text"]):
                out.append(("added", no, a["title"]))
        elif _norm_text(a["text"]) != _norm_text(o[no]["text"]):
            if _is_deleted(a["text"]) and not _is_deleted(o[no]["text"]):
                out.append(("removed", no, o[no]["title"]))
            elif _is_deleted(o[no]["text"]) and not _is_deleted(a["text"]):
                out.append(("added", no, a["title"]))
            else:
                out.append(("modified", no, a["title"] or o[no]["title"]))
    for no, a in o.items():
        if no not in n and not _is_deleted(a["text"]):
            out.append(("removed", no, a["title"]))
    return sorted(out, key=lambda r: (_sort_key(r[1]), r[0]))


def _sort_key(no: str) -> tuple[int, int]:
    m = re.match(r"^(\d+)(?:의(\d+))?", no or "")
    return (int(m.group(1)), int(m.group(2) or 0)) if m else (10 ** 6, 0)
