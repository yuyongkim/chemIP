"""Pure: where the current law text literally names a substance — its Korean list name or its CAS number.

terms(names_by_cas)          -> {term: {cas, ...}}   (variants: the name, the name without "(...)" notes and without
                                                        " 및 그 화합물"; Hangul names of NAME_MIN..MAX chars, not in NAME_STOP)
scan(text, terms, lengths)   -> [(start, end, term)]  whole-word hits (no Hangul right before; after it a non-Hangul
                                                        character, the end, or one particle then a non-Hangul character)
mentions(articles, terms)    -> {cas: {"rows": [[doc, article_no, term, snippet]], "total": n}}

Korean has no spaces between a word and its particle, so "황산" must not match inside "황산화물" or "아황산": the
boundary rule keeps only hits that stand as a word. Tested in tests/test_law_export.py.
"""
from __future__ import annotations

import re

import law_export_config as C

HANGUL_RE = re.compile(r"[가-힣]")
CAS_RE = re.compile(r"(?<![\d-])(\d{2,7}-\d{2}-\d)(?![\d-])")
NOTE_RE = re.compile(r"\s*[(\[（][^)\]）]*[)\]）]")
FAMILY_TAIL = (" 및 그 화합물", "및 그 화합물", " 및 그 염", " 화합물")
PARTICLES = sorted(["은", "는", "이", "가", "을", "를", "의", "과", "와", "도", "에", "로", "으로", "에서", "에는", "이나",
                    "나", "만", "등", "및"], key=len, reverse=True)


def _hangul(ch: str) -> bool:
    return "가" <= ch <= "힣"


def variants(name: str) -> set[str]:
    n = " ".join((name or "").split())
    out = {n, NOTE_RE.sub("", n).strip()}
    for v in list(out):
        for tail in FAMILY_TAIL:  # longest tail first; one cut per name
            if v.endswith(tail):
                out.add(v[: -len(tail)].strip())
                break
    return {v for v in out if v and HANGUL_RE.search(v) and C.NAME_MIN_CHARS <= len(v) <= C.NAME_MAX_CHARS
            and v not in C.NAME_STOP and _hangul(v[0])}


def terms(names_by_cas: dict[str, set[str]]) -> dict[str, set[str]]:
    out: dict[str, set[str]] = {}
    for cas, names in names_by_cas.items():
        for n in names:
            for v in variants(n):
                out.setdefault(v, set()).add(cas)
    return out


def _word_end_ok(text: str, j: int) -> bool:
    if j >= len(text) or not _hangul(text[j]):
        return True
    for p in PARTICLES:
        if text.startswith(p, j):
            k = j + len(p)
            return k >= len(text) or not _hangul(text[k])
    return False


def scan(text: str, term_map: dict, lengths: list[int]) -> list[tuple[int, int, str]]:
    """Whole-word hits of the Hangul terms, longest first at each word start. lengths: distinct term lengths, desc."""
    hits = []
    i, n = 0, len(text)
    while i < n:
        if _hangul(text[i]) and (i == 0 or not _hangul(text[i - 1])):
            for L in lengths:
                if i + L <= n:
                    t = text[i:i + L]
                    if t in term_map and _word_end_ok(text, i + L):
                        hits.append((i, i + L, t))
                        i += L - 1
                        break
        i += 1
    return hits


def snippet(text: str, start: int, end: int, ctx: int = C.MENTION_CONTEXT) -> str:
    a, b = max(0, start - ctx), min(len(text), end + ctx)
    s = " ".join(text[a:b].split())
    return ("…" if a > 0 else "") + s + ("…" if b < len(text) else "")


def mentions(articles: list[dict], term_map: dict[str, set[str]], cas_set: set[str] | None = None,
             keep: int = C.MENTION_MAX_PER_CAS) -> dict[str, dict]:
    """articles: [{doc, no, text}] in display order. A CAS written in the text counts for that CAS (when in cas_set,
    or any CAS when cas_set is None). One row per (CAS, doc, article)."""
    lengths = sorted({len(t) for t in term_map}, reverse=True)
    out: dict[str, dict] = {}
    seen: set[tuple] = set()

    def add(cas: str, a: dict, term: str, s: int, e: int) -> None:
        key = (cas, a["doc"], a["no"])
        if key in seen:
            return
        seen.add(key)
        rec = out.setdefault(cas, {"rows": [], "total": 0})
        rec["total"] += 1
        if len(rec["rows"]) < keep:
            rec["rows"].append([a["doc"], a["no"], term, snippet(a["text"], s, e)])

    for a in articles:
        text = a["text"] or ""
        for s, e, t in scan(text, term_map, lengths):
            for cas in sorted(term_map[t]):
                add(cas, a, t, s, e)
        for m in CAS_RE.finditer(text):
            if cas_set is None or m.group(1) in cas_set:
                add(m.group(1), a, m.group(1), m.start(1), m.end(1))
    return out
