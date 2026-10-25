"""Parse outline-style annex text (1. / 가. / 1) / 가)) into items, and split one
substance item into Korean name, English name, CAS numbers and qualifiers.

law.go.kr renders 별표 text with a fixed line width, so one item may wrap over
several lines (even mid-word or mid-CAS). Continuation lines are joined back here.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from . import cas as casmod

_HANGUL_MARKS = "가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허"
_LEVELS = [
    (1, re.compile(r"^\s*(\d+)\.\s+(?=\S)")),                         # 1.
    (2, re.compile(rf"^\s*([{_HANGUL_MARKS}])\.\s+(?=\S)")),         # 가.
    (3, re.compile(r"^\s*(\d+)\)\s*(?=\S)")),                         # 1)
    (4, re.compile(rf"^\s*([{_HANGUL_MARKS}])\)\s+(?=\S)")),         # 가)
]
_NOTE_START = re.compile(r"^\s*(※\s*)?비\s*고")
_HANGUL = re.compile(r"[가-힣]")
_COUNT = re.compile(r"\((\d+)종\)")


@dataclass
class Item:
    level: int
    mark: str
    text: str
    path: list[str] = field(default_factory=list)   # ancestor marks + own mark
    titles: list[str] = field(default_factory=list)  # ancestor texts
    children: list["Item"] = field(default_factory=list)

    @property
    def ref(self) -> str:
        return ".".join(self.path)


def _join(prev: str, nxt: str, vocab: set[str]) -> str:
    """Join a wrapped line to the previous one, deciding whether a space was lost.

    Latin words split mid-word ("co" + "mpounds") are re-joined when the joined
    word occurs unbroken elsewhere in the same annex (vocab).
    """
    a, b = prev.rstrip(), nxt.strip()
    if not a:
        return b
    if a.endswith("-") or b.startswith("-") or a.endswith("[") or a.endswith("("):
        return a + b
    if _HANGUL.match(a[-1]) and (_HANGUL.match(b[0]) or b[0] in ")]"):
        return a + b
    if a[-1].isdigit() and b[0].isdigit():
        return a + b
    ma, mb = re.search(r"[A-Za-z]+$", a), re.match(r"[A-Za-z]+", b)
    if ma and mb and (ma.group(0) + mb.group(0)).lower() in vocab:
        return a + b
    return a + " " + b


def _match_level(line: str):
    for lvl, rx in _LEVELS:
        m = rx.match(line)
        if m:
            return lvl, m.group(1), line[m.end():]
    return None


def _in_sequence(level: int, mark: str, last_mark: dict[int, str]) -> bool:
    """A marker is accepted only as the first of its level or the successor of the last one."""
    prev = last_mark.get(level)
    if mark.isdigit():
        return (prev is None and mark == "1") or (prev is not None and prev.isdigit()
                                                  and int(mark) == int(prev) + 1)
    first = _HANGUL_MARKS[0]
    if prev is None:
        return mark == first
    i = _HANGUL_MARKS.find(prev)
    return i >= 0 and i + 1 < len(_HANGUL_MARKS) and _HANGUL_MARKS[i + 1] == mark


def parse_outline(text: str, skip_lines: int = 0) -> tuple[list[Item], str]:
    """Return (top-level items with children, trailing 비고 text)."""
    lines = [ln.rstrip() for ln in text.splitlines() if ln.strip()]
    lines = lines[skip_lines:]
    vocab = {w.lower() for w in re.findall(r"[A-Za-z]{4,}", text)}
    flat: list[Item] = []
    note_lines: list[str] = []
    in_note = False
    last_mark: dict[int, str] = {}
    for ln in lines:
        if in_note or _NOTE_START.match(ln):
            in_note = True
            note_lines.append(ln.strip())
            continue
        hit = _match_level(ln)
        if hit and flat and flat[-1].text.rstrip().endswith("-"):
            hit = None                       # "12179-04-" + "3)(..." is a wrapped CAS
        if hit and not _in_sequence(hit[0], hit[1], last_mark):
            hit = None                       # marker out of order -> wrapped text
        if hit:
            lvl, mark, rest = hit
            flat.append(Item(level=lvl, mark=mark, text=rest.strip()))
            last_mark[lvl] = mark
            for deeper in [k for k in last_mark if k > lvl]:
                del last_mark[deeper]
        elif flat:
            flat[-1].text = _join(flat[-1].text, ln, vocab)
    # build tree with a level stack
    roots: list[Item] = []
    stack: list[Item] = []
    for it in flat:
        while stack and stack[-1].level >= it.level:
            stack.pop()
        it.path = [s.mark for s in stack] + [it.mark]
        it.titles = [s.text for s in stack]
        (stack[-1].children if stack else roots).append(it)
        stack.append(it)
    return roots, " ".join(note_lines)


def leaves(items: list[Item]) -> list[Item]:
    out: list[Item] = []
    for it in items:
        if it.children:
            out.extend(leaves(it.children))
        else:
            out.append(it)
    return out


def declared_count(title: str) -> int | None:
    m = _COUNT.search(title or "")
    return int(m.group(1)) if m else None


def is_mixture_rule(text: str) -> bool:
    return bool(re.search(r"까지의?.*(물질|규정).*혼합\s*물|함유한\s*혼합물$", text)) and "혼합" in text


# ---------------------------------------------------------------- substance
@dataclass
class Substance:
    raw: str
    name_ko: str
    name_en: str
    cas: list[str]
    cas_names: dict            # cas -> Korean token that precedes "[cas]"
    qualifiers: list[str]      # trailing groups e.g. 특별관리물질, 분진·흄
    isomers: bool              # "등" after CAS
    family: bool               # 및 그 화합물 / 염 / 동족체 / 류
    anchor_only: list = field(default_factory=list)   # CAS that only anchors "X[cas] 화합물"

    @property
    def entry_cas(self) -> list[str]:
        """CAS numbers that are themselves covered (anchor-only ones removed)."""
        return [c for c in self.cas if c not in self.anchor_only]


def _top_groups(s: str) -> list[tuple[int, int]]:
    """Spans of top-level (...) / [...] groups."""
    spans, depth, start = [], 0, None
    for i, ch in enumerate(s):
        if ch in "([":
            if depth == 0:
                start = i
            depth += 1
        elif ch in ")]" and depth:
            depth -= 1
            if depth == 0 and start is not None:
                spans.append((start, i + 1))
    return spans


_FAMILY_RX = re.compile(r"및\s*그|[과와]\s*그\s*염|화합물|염류|및\s*요오드화물|동족체|휘발물|류$|류\(|가공")


def parse_substance(text: str) -> Substance:
    raw = re.sub(r"\s+", " ", text).strip()
    groups = _top_groups(raw)
    en_span = None
    for a, b in groups:
        inner = raw[a + 1:b - 1].replace("등", "")
        if not _HANGUL.search(inner) and re.search(r"[A-Za-z]{2}", inner):
            en_span = (a, b)
            break
    if en_span:
        ko_part, en_inner, tail = raw[:en_span[0]], raw[en_span[0] + 1:en_span[1] - 1], raw[en_span[1]:]
    else:
        ko_part, en_inner, tail = raw, "", ""
    # Korean token -> CAS for "니켈[7440-02-0]" style
    cas_names = {}
    for m in re.finditer(r"(?:^|,\s*|및\s+)([^,\[\]]+?)\s*\[\s*([\d\s-]+?)\s*\]", ko_part):
        c = casmod.normalize(m.group(2))
        cas_names[c] = m.group(1)
    name_ko = re.sub(r"\[\s*[\d\s-]+?\s*\]", "", ko_part)
    name_ko = re.sub(r"\s+", " ", name_ko).strip(" ,;")
    # English: drop the trailing "; CAS ..." part
    name_en = re.split(r";\s*(?=[\d\s,-]+(등)?\s*$)", en_inner)[0].strip() if en_inner else ""
    name_en = re.sub(r";\s*$", "", name_en).strip()
    qualifiers = [tail[a + 1:b - 1].strip() for a, b in _top_groups(tail)]
    cas_list = casmod.find_all(raw)
    # "니켈[7440-02-0] 화합물" / "6가크롬[18540-29-9] 화합물": the CAS only anchors a compound
    # group; the cited substance itself is not covered (unlike "납[..] 및 그 무기화합물").
    anchor_only = [casmod.normalize(m.group(1)) for m in
                   re.finditer(r"\[\s*([\d\s-]+?)\s*\]\s*화합물", ko_part)]
    isomers = bool(re.search(r"\d\s*등", raw))
    family = bool(_FAMILY_RX.search(name_ko))
    return Substance(raw=raw, name_ko=name_ko, name_en=name_en, cas=cas_list,
                     cas_names=cas_names, qualifiers=qualifiers, isomers=isomers, family=family,
                     anchor_only=anchor_only)
