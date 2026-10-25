"""Add a substance that a law names without a CAS number.

Unique terminology.db name match -> entry (match_method "name_match");
class term or no unique match -> family entry (never guessed).
"""
from __future__ import annotations

from . import list_model as lm


def add_named(ctx, lst: dict, name_ko: str, name_en: str, detail: str,
              class_terms: dict | None = None) -> bool:
    """Returns True when a CAS entry was added."""
    terms = class_terms or {}
    m = ctx.names.lookup(name_ko, name_en)
    note = f"법령 명칭 '{name_ko}'"          # provenance -> match_note, not detail
    if name_ko in terms:
        lm.add_family(lst, name_ko, name_en, detail, terms[name_ko], candidates=m.candidates, match_note=note)
        return False
    if m.ok:
        lm.add_entry(lst, m.cas, name_ko, name_en, detail, "name_match",
                     match_note=f"{note}; CAS 명칭 매칭: {m.source}")
        return True
    lm.add_family(lst, name_ko, name_en, detail, "명칭만 열거 - terminology.db에서 CAS 단일 확정 불가",
                  candidates=m.candidates, match_note=note)
    return False
