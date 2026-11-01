"""Find reliable substance terms in patent text: Aho-Corasick over normalised text + context rules + CAS regex.

Two phases per text:
  1. candidates = automaton hits that sit on word boundaries (blockers included);
     overlapping candidates are resolved longest-first, so 'ethylene oxide' beats 'ethylene';
  2. survivors are dropped if they are blockers or if their context shows they name something else
     (motif word after, substituent word before, glued into a systematic name).
"""
import re
import unicodedata

import ahocorasick

import config
from cas import find_cas
from script_class import script_of, is_hangul

_FOLLOWERS = frozenset(config.NON_SUBSTANCE_FOLLOWERS)
_FOLLOWER_PREFIXES = tuple(config.NON_SUBSTANCE_FOLLOWER_PREFIXES)
_PREV_WORDS = frozenset(config.SUBSTITUENT_PREFIX_WORDS)


def build_automaton(term_to_cas, blockers=()):
    """Automaton whose values are (term, cas, script). Blockers have cas=None: they win overlaps but emit nothing."""
    a = ahocorasick.Automaton()
    for term in blockers:
        a.add_word(term, (term, None, script_of(term)))
    for term, cas in term_to_cas.items():
        a.add_word(term, (term, cas, script_of(term)))
    a.make_automaton()
    return a


# ---------- phase 1: word boundaries ----------

def _hangul_tail_ok(text, end):
    """After a Hangul term: end of word, or a particle followed by end of word ('벤젠을', '벤젠으로')."""
    nxt = text[end:end + 1]
    if not nxt or not nxt.isalnum():
        return True
    if not is_hangul(nxt):
        return False
    for p in config.HANGUL_PARTICLES:
        if text.startswith(p, end):
            after = text[end + len(p):end + len(p) + 1]
            if not after or not after.isalnum():
                return True
    return False


def _on_boundary(text, start, end, script):
    if script == "cjk":            # Chinese/Japanese text has no word boundaries
        return True
    if start > 0 and text[start - 1].isalnum():
        return False
    if script == "hangul":
        return _hangul_tail_ok(text, end)
    return end >= len(text) or not text[end].isalnum()


def _longest_first(hits):
    if len(hits) < 2:
        return hits
    hits.sort(key=lambda h: (h[0] - h[1], h[0]))
    kept, taken = [], []
    for h in hits:
        if all(h[1] <= s or h[0] >= e for s, e in taken):
            kept.append(h)
            taken.append((h[0], h[1]))
    return kept


# ---------- phase 2: context ----------

def _glued_into_systematic_name(text, start, end, script):
    """'...(pyridin-2-yl)benzene', ')벤젠', 'benzene-1,4-diol', 'benzene(…' are pieces of a longer name."""
    if start > 0 and text[start - 1] in config.GLUED_BEFORE:
        return True
    if script != "latin":
        return False
    nxt = text[end:end + 1]
    return (nxt != "" and nxt in config.GLUED_AFTER) or (nxt == "-" and text[end + 1:end + 2].isdigit())


_LEADING_WORD = re.compile(r"[a-z]+")
_TRAILING_WORD = re.compile(r"[a-z]+$")


def _next_word(text, end):
    """Letters of the next word ('ring;b' -> 'ring')."""
    if text[end:end + 1] != " ":
        return ""
    m = _LEADING_WORD.match(text, end + 1)
    return m.group(0) if m else ""


def _prev_word(text, start):
    if start < 2 or text[start - 1] != " ":
        return ""
    m = _TRAILING_WORD.search(text[max(0, start - 24):start - 1])
    return m.group(0) if m else ""


def _names_something_else(text, start, end):
    """Latin hit followed by a motif word ('benzene ring') or preceded by a substituent word
    ('isopropyl benzene', 'chloro benzene') names a motif or a different compound."""
    nxt = _next_word(text, end)
    if nxt and (nxt in _FOLLOWERS or nxt.startswith(_FOLLOWER_PREFIXES)):
        return True
    prev = _prev_word(text, start)
    return bool(prev) and (prev in _PREV_WORDS or (prev.endswith("yl") and len(prev) > 3))


def context_rejects(text, start, end):
    """Phase-2 context test for one Latin hit on lower-cased text (also used to re-check stored rows)."""
    return _glued_into_systematic_name(text, start, end, "latin") or _names_something_else(text, start, end)


def find_terms(automaton, text):
    """[(start, end, term, cas)] on lower-cased normalised text."""
    cands = [(end_idx - len(term) + 1, end_idx + 1, term, cas, script)
             for end_idx, (term, cas, script) in automaton.iter(text)]
    cands = [c for c in cands if _on_boundary(text, c[0], c[1], c[4])]
    out = []
    for start, end, term, cas, script in _longest_first(cands):
        if cas is None or _glued_into_systematic_name(text, start, end, script):
            continue
        if script == "latin" and _names_something_else(text, start, end):
            continue
        out.append((start, end, term, cas))
    return out


def find_cas_hits(text, cas_set):
    return [(pos, pos + len(c), c, c) for c, pos in find_cas(text) if c in cas_set]


def match_text(automaton, cas_set, raw_text):
    """Return (display_text, hits).

    display_text is NFKC + collapsed whitespace in original case; hit offsets index both display_text and
    its lower-cased form (same length for nearly all text; if not, the lower-cased text is displayed).
    """
    raw_text = raw_text or ""
    display = " ".join((raw_text if raw_text.isascii() else unicodedata.normalize("NFKC", raw_text)).split())
    text = display.lower()
    if not text:
        return display, []
    if len(text) != len(display):
        display = text
    hits = find_terms(automaton, text)
    if "-" in text:
        hits += find_cas_hits(text, cas_set)
    return display, hits
