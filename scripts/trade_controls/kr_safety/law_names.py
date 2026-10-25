"""Name -> CAS pairs printed together in Korean law tables, used to cross-check
(and, when terminology.db has no Korean name, to resolve) name-only entries."""
from __future__ import annotations

import re

from . import text_list as tl
from .p_osh_oel import oel_rows

_OUTLINE_ANNEXES = [("osha_std", 12), ("osha_rule", 21), ("osha_rule", 22), ("osha_decree", 26)]
_ARTICLES = [87, 88]


def pairs(ctx) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for r in oel_rows(ctx):
        if len(r["cas"]) == 1:
            out += [(r["name_ko"], r["cas"][0]), (r["name_en"], r["cas"][0])]
    texts = [it.text for key, no in _OUTLINE_ANNEXES
             for it in tl.leaves(tl.parse_outline(ctx.annex(key, no)["text"])[0])]
    for art in _ARTICLES:                                   # 시행령 제87조·제88조 호
        texts += [ln.split(".", 1)[1] for ln in ctx.article("osha_decree", art).splitlines()
                  if ln[:1].isdigit() and "." in ln]
    for text in texts:
        s = tl.parse_substance(text)
        if len(s.entry_cas) == 1 and not s.family:
            out += [(s.name_ko, s.entry_cas[0]), (s.name_en, s.entry_cas[0])]
        for c, token in s.cas_names.items():                # "황린[12185-10-3]" style tokens
            if c in s.entry_cas:
                out.append((re.sub(r"\([^()]*\)", "", token).strip(), c))
    return out
