"""Fill a kr_lists list from an outline-style annex whose items carry CAS numbers
(산안법 별표 12 / 21 / 22 / 26 and similar)."""
from __future__ import annotations

from . import list_model as lm
from . import text_list as tl


def _detail(label: str, it: tl.Item, s: tl.Substance, extra: str = "") -> str:
    cat = " > ".join(t for t in it.titles if t)
    parts = [f"{label} {it.ref}" + (f" ({cat})" if cat else "")]
    parts += s.qualifiers
    if s.isomers:
        parts.append("'등': 이성질체 등 동일 속성 화합물 포함")
    if extra:
        parts.append(extra)
    return "; ".join(parts)


def populate(lst: dict, text: str, label: str, select=None, extra_for=None) -> list[tuple]:
    """Add every substance leaf of the annex outline to lst.

    select(item, substance) -> bool   keep only some leaves (default: all)
    extra_for(item, substance) -> str extra detail text
    Returns [(item, substance)] that were kept, for callers that need them.
    """
    roots, note = tl.parse_outline(text)
    if note:
        lst["notes"].append(note)
    kept = []
    for it in tl.leaves(roots):
        if tl.is_mixture_rule(it.text):
            lst["mixture_rules"].append(f"{label} {it.ref}: {tl.parse_substance(it.text).raw}")
            continue
        s = tl.parse_substance(it.text)
        if select and not select(it, s):
            continue
        kept.append((it, s))
        extra = extra_for(it, s) if extra_for else ""
        detail = _detail(label, it, s, extra)
        for c in s.entry_cas:
            lm.add_entry(lst, c, s.cas_names.get(c) or s.name_ko, s.name_en, detail, "law_cas")
        if s.family or not s.cas:
            rule = ("법령 표의 물질군(화합물·염·동족체 등) - 대표 CAS 외 구성원은 CAS로 열거되지 않음"
                    if s.cas else "법령 표에 CAS가 기재되지 않은 항목")
            lm.add_family(lst, s.name_ko, s.name_en, detail, rule, anchor_cas=s.cas)
    _count_check(lst, roots, label)
    return kept


def _count_check(lst: dict, items: list[tl.Item], label: str) -> None:
    for it in items:
        if it.children:
            declared = tl.declared_count(it.text)
            if declared is not None:
                direct = sum(1 for ch in it.children
                             if ch.children or not tl.is_mixture_rule(ch.text))
                leaf = sum(1 for lf in tl.leaves(it.children) if not tl.is_mixture_rule(lf.text))
                parsed = direct if declared == direct or declared != leaf else leaf
                lst["count_check"].append({"section": f"{label} {it.ref} {it.text}",
                                           "declared": declared, "parsed": parsed,
                                           "ok": declared == parsed})
            _count_check(lst, it.children, label)
