"""Pure: a Korean legal-basis string ("대기환경보전법 제2조제1호, 같은 법 시행규칙 제2조 및 별표 1") → citations of corpus
docs, and their resolution against the current text (article exists, 항/호 text, 별표 title and links). No DB, no files.

parse_basis(text, names) -> [{doc, refs: [{t: "art", no, label} | {t: "annex", no, label}]}]
  names = the corpus doc names (current versions). A doc named in the text but not in the corpus is never guessed:
  references after it (until the next known name) are dropped and listed in "unknown".
resolve(parsed, docs) -> (cites, unresolved)
  docs = {name: {id, kind, articles: {no: article}, annexes: [annex]}} (law_export_shape.doc_lookup)
  cite = {doc, name, t: "art" | "annex" | "doc", no, label, title, snippet, pdf?, file?}

Tested in tests/test_law_export.py.
"""
from __future__ import annotations

import re

from law_parse import norm_name

SUFFIXES = (" 시행령", " 시행규칙")
ART_RE = r"제\s*(\d+)\s*조(?:\s*의\s*(\d+))?((?:\s*제\s*\d+\s*(?:항|호)(?:\s*의\s*\d+)?|\s*[가-하]\s*목)*)"
ANNEX_RE = r"\[?별표\s*(?:(\d+)(?:\s*의\s*(\d+))?)?\]?"
SAME_RE = r"같은\s*법(?:\s*(시행령|시행규칙))?"
BARE_RE = r"(?<![가-힣])(시행령|시행규칙)(?=\s*(?:제\s*\d|별표))"
RESET_RE = r"[;「]|고시\s*제\s*\d[\d\-]*\s*호"
# text between two tokens: what is left after these is an unknown doc name (3+ Hangul in a row) → refs after it are not
# the previous doc's, and "같은 법" then means that unknown name
GAP_DROP_RE = re.compile(r"\([^)]*\)?|제\s*\d+\s*(?:항|호|목)(?:\s*의\s*\d+)?|[가-하]\s*목|~|(?:및|또는|단서|전단|후단|본문|각)")
GAP_NAME_RE = re.compile(r"[가-힣][가-힣ㆍ·\s]*[가-힣]")
SUB_RE = re.compile(r"제\s*(\d+)\s*(항|호)(?:\s*의\s*(\d+))?|([가-하])\s*목")
CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳"
SNIPPET_CHARS = 240


def _name_pattern(name: str) -> str:
    """Regex of one doc name: any run of spaces optional, the middle dot in any of its forms."""
    parts = []
    for ch in name.strip():
        if ch.isspace():
            if parts and parts[-1] != r"\s*":
                parts.append(r"\s*")
        elif ch in "ㆍ·‧・":
            parts.append("[ㆍ·‧・]")
        else:
            parts.append(re.escape(ch))
    return "".join(parts)


def base_of(name: str) -> str:
    for s in SUFFIXES:
        if name.endswith(s):
            return name[: -len(s)]
    return name


def _token_re(names) -> re.Pattern:
    alts = "|".join(_name_pattern(n) for n in sorted(set(names), key=len, reverse=True))
    return re.compile(
        rf"(?P<name>{alts})|(?P<same>{SAME_RE})|(?P<bare>{BARE_RE})|(?P<art>{ART_RE})|(?P<annex>{ANNEX_RE})|(?P<reset>{RESET_RE})")


def _art_no(base: str, branch: str | None) -> str:
    return f"{int(base)}의{int(branch)}" if branch else str(int(base))


def unknown_name(gap: str) -> str:
    """The doc name in the text between two tokens ("" when the gap holds only punctuation and connectors)."""
    rest = GAP_DROP_RE.sub(" ", gap or "")
    for m in GAP_NAME_RE.finditer(rest):
        name = " ".join(m.group(0).split())
        if len(re.sub(r"[^가-힣]", "", name)) >= 3 and re.search(r"[가-힣]{3,}", name.replace(" ", "")):
            return name
    return ""


def parse_basis(text: str, names) -> dict:
    """{"docs": [{doc, refs}], "unknown": [labels of references whose doc is not in the corpus]}."""
    by_norm = {norm_name(n): n for n in names}
    tok = _token_re(names)
    docs: list[dict] = []
    unknown: list[str] = []
    current: dict | None = None
    base = ""

    def open_doc(name: str | None) -> dict | None:
        if name is None:
            return None
        for d in docs:
            if d["doc"] == name:
                return d
        d = {"doc": name, "refs": []}
        docs.append(d)
        return d

    prev_end = 0
    for m in tok.finditer(text or ""):
        kind = m.lastgroup
        s = m.group(0)
        inside = text.count("(", 0, m.start()) > text.count(")", 0, m.start())  # a note in brackets names no new doc
        gap = "" if inside else unknown_name(text[prev_end:m.start()])
        prev_end = m.end()
        if gap and kind != "name":
            current, base = None, gap
            unknown.append(gap)
        if kind == "name":
            name = by_norm.get(norm_name(s))
            current = open_doc(name)
            base = base_of(name) if name else ""
        elif kind in ("same", "bare"):
            suffix = re.match(SAME_RE, s).group(1) if kind == "same" else s
            want = base + (f" {suffix}" if suffix else "") if base else ""
            current = open_doc(by_norm.get(norm_name(want)) if want else None)
            if current is None and want:
                unknown.append(want)
        elif kind == "reset":
            current = None
        elif kind == "art":
            g = re.match(ART_RE, s)
            ref = {"t": "art", "no": _art_no(g.group(1), g.group(2)), "label": re.sub(r"\s+", "", s)}
            (current["refs"].append(ref) if current is not None else unknown.append(ref["label"]))
        elif kind == "annex":
            g = re.match(ANNEX_RE, s)
            no = _art_no(g.group(1), g.group(2)) if g.group(1) else None
            ref = {"t": "annex", "no": no, "label": f"별표 {no}" if no else "별표"}
            (current["refs"].append(ref) if current is not None else unknown.append(ref["label"]))
    for d in docs:  # same ref twice (e.g. 제2조제6호 and 제2조제6호의2) stays once per label
        seen, refs = set(), []
        for r in d["refs"]:
            if r["label"] not in seen:
                seen.add(r["label"])
                refs.append(r)
        d["refs"] = refs
    return {"docs": docs, "unknown": unknown}


# ---------- resolution against the current text ----------

def sub_parts(label: str) -> dict:
    """"제2조제1항제3호의2가목" → {"para": "①", "item": "3의2", "sub": "가."} (only what the label names)."""
    out = {}
    after = re.sub(r"^제\s*\d+\s*조(?:\s*의\s*\d+)?", "", label)
    for m in SUB_RE.finditer(after):
        if m.group(4):
            out["sub"] = f"{m.group(4)}."
        elif m.group(2) == "항":
            n = int(m.group(1))
            out["para"] = CIRCLED[n - 1] if 0 < n <= len(CIRCLED) else str(n)
        else:
            out["item"] = _art_no(m.group(1), m.group(3))
    return out


def trim(s: str, n: int = SNIPPET_CHARS) -> str:
    s = " ".join((s or "").split())
    return s if len(s) <= n else s[: n - 1] + "…"


def article_snippet(article: dict, label: str) -> str:
    """The text the label points at: that 목 / 호 / 항 when the label names one and the article has it, else the article."""
    want = sub_parts(label)
    paras = article.get("paras") or []
    if want and paras:
        cand = paras if "para" not in want else [p for p in paras if p.get("no") == want["para"]]
        if cand:
            if "item" not in want:
                return trim(cand[0].get("text") or article["text"])
            for p in cand:
                for it in p.get("items") or []:
                    if it.get("no") == want["item"]:
                        if "sub" in want:
                            for sb in it.get("subitems") or []:
                                if sb.get("no") == want["sub"]:
                                    return trim(sb.get("text"))
                        return trim(it.get("text"))
    return trim(article["text"])


def resolve(parsed: dict, docs: dict, term: str = "") -> tuple[list[dict], list[str]]:
    """Citations that exist in the current corpus text. term (optional): an article citation is kept only when the
    article text contains it (curated basis check). Returns (cites, unresolved labels)."""
    cites, unresolved = [], list(parsed.get("unknown") or [])
    for d in parsed.get("docs") or []:
        doc = docs.get(d["doc"])
        if doc is None:
            unresolved.append(d["doc"])
            continue
        head = {"doc": doc["id"], "name": d["doc"]}
        if not d["refs"]:
            cites.append({**head, "t": "doc", "no": "", "label": d["doc"], "title": "", "snippet": ""})
            continue
        for r in d["refs"]:
            if r["t"] == "art":
                a = doc["articles"].get(r["no"])
                if a is None or (term and term not in a["text"]):
                    unresolved.append(f"{d['doc']} {r['label']}")
                    continue
                cites.append({**head, "t": "art", "no": r["no"], "label": r["label"], "title": a.get("title") or "",
                              "snippet": article_snippet(a, r["label"])})
            else:
                tables = [x for x in doc["annexes"] if x.get("annex_kind") == "별표"]
                hit = [x for x in tables if x.get("annex_no") == r["no"]] if r["no"] else (tables if len(tables) == 1 else [])
                if not hit:
                    unresolved.append(f"{d['doc']} {r['label']}")
                    continue
                x = hit[0]
                cites.append({**head, "t": "annex", "no": x["annex_no"], "label": r["label"], "title": x.get("title") or "",
                              "snippet": "", "pdf": x.get("pdf_url") or "", "file": x.get("file_url") or ""})
    return cites, unresolved
