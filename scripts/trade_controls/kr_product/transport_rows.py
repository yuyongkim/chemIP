"""Add one transport row (name pair + transport fields) to a kr_env accumulator.

Order: exact match of the printed name -> derived base substance (transport_names) ->
family entry when the name denotes a group/article/mixture -> unmatched otherwise.
Every dict appended for the row carries the transport fields (un_number, class, ...).
"""
from __future__ import annotations

import re

from kr_env import entries, termdb

from . import transport_names as tn


def _new(acc: dict, before: dict) -> list[dict]:
    out = []
    for k in ("entries", "family_entries", "unmatched"):
        out.extend(acc[k][before[k]:])
    return out


def _en_hits(en: str | None, ko: str, base: bool = False) -> set[str]:
    """CAS numbers the printed English name (or, with base=True, its derived base form) hits uniquely."""
    if not en:
        return set()
    forms = {en}
    if base:
        _, be, _ = tn.base_names(ko, en)
        forms = {be} if be else set()
    idx = termdb.index()
    return {r["cas"] for r in (idx.lookup(f) for f in forms) if r["status"] == "matched"}


# State/form words printed in parentheses ('(용액)', '(무수물)'); kr_env splits parentheses off as
# separate name forms and terminology.db carries junk synonyms for some of them.
QUALIFIER_FORMS = {termdb.norm(x) for x in (
    "용액", "수용액", "무수물", "고체", "액체", "건성", "습성", "용융상", "수화물", "현탁액", "유제",
    "혼합물", "solution", "anhydrous", "solid", "liquid", "molten", "hydrate")}


def _qualifier_hit(e: dict) -> bool:
    return any(termdb.norm(x) in QUALIFIER_FORMS for x in re.split(r"\s*/\s*", e.get("matched_name") or ""))


def _cross_check(acc: dict, before: dict, item_no: str, ko: str, en: str | None, detail: str) -> None:
    """Reject matches on a bare qualifier word or contradicted by the English name; label confirmation."""
    new = acc["entries"][before["entries"]:]
    if not new:
        return
    hits = _en_hits(en, ko)                       # conflicts only against the full printed English name
    confirm = hits | _en_hits(en, ko, base=True)
    keep = []
    for e in new:
        bad = _qualifier_hit(e) or (hits and e["cas"] not in hits and e.get("role") != "group_parent")
        if bad:
            base = tn.match_base(ko, en)
            if base and (base["cas"] in hits or not hits):   # e.g. '(용액)' split off as its own Korean form
                idx = termdb.index()
                e.update({"cas": base["cas"], "matched_name": base["matched_name"], "matched_via": base["via"],
                          "match_scope": "base_substance_of_entry", "role": base["role"],
                          "base_name_ko": base["base_name_ko"], "base_name_en": base["base_name_en"],
                          "db_name_ko": idx.name_ko.get(base["cas"]), "db_name_en": idx.name_en.get(base["cas"]),
                          "en_confirmed": base["cas"] in confirm, "replaced_rejected_hit": e["cas"]})
                keep.append(e)
                continue
            acc["unmatched"].append({"name": ko, "name_en": en, "detail": detail, "item_no": item_no,
                                     "reason": "qualifier_word_hit" if _qualifier_hit(e) else "ko_en_conflict",
                                     "candidates": sorted(hits | {e["cas"]})})
            continue
        e["en_confirmed"] = e["cas"] in confirm
        keep.append(e)
    del acc["entries"][before["entries"]:]
    acc["entries"].extend(keep)


def add_row(acc: dict, item_no: str, ko: str, en: str | None, detail: str, fields: dict,
            force_family: str | None = None, family_if_unmatched: str | None = None) -> None:
    """force_family: reason to record the row as a family entry without matching (e.g. N.O.S.).
    family_if_unmatched: reason used when no exact/base match exists (articles, class 1/7)."""
    ko = tn.strip_markers(ko)
    en = tn.strip_markers(en) if en else en
    before = {k: len(acc[k]) for k in ("entries", "family_entries", "unmatched")}
    if force_family:
        entries.add_family(acc, item_no, ko, detail, name_en=en, reason=force_family)
    else:
        # IMDG prints names in capitals; kr_env.termdb would treat an all-caps word as an acronym/code
        # and use it only as a last resort, so the English side is passed in lower case.
        en_form = en.lower() if en and en.isupper() else en
        entries.add_item(acc, item_no, ko, detail, extra_names=[en_form] if en_form else None)
        if len(acc["entries"]) == before["entries"] and len(acc["unmatched"]) > before["unmatched"]:
            base = tn.match_base(ko, en)
            if base:
                del acc["unmatched"][before["unmatched"]:]
                idx = termdb.index()
                acc["entries"].append({
                    "cas": base["cas"], "name_ko": ko, "name_en": en, "detail": detail,
                    "item_no": item_no, "match_method": "name_match",
                    "matched_name": base["matched_name"], "matched_via": base["via"],
                    "match_scope": "base_substance_of_entry", "role": base["role"],
                    "base_name_ko": base["base_name_ko"], "base_name_en": base["base_name_en"],
                    "db_name_ko": idx.name_ko.get(base["cas"]), "db_name_en": idx.name_en.get(base["cas"])})
        _cross_check(acc, before, item_no, ko, en, detail)
        new_unm = acc["unmatched"][before["unmatched"]:]
        if new_unm and len(acc["entries"]) == before["entries"] \
                and not any(u["reason"] == "ko_en_conflict" for u in new_unm):  # conflicts stay for review
            reason = family_if_unmatched
            if not reason and (tn.FAMILY_PATTERN.search(ko) or tn.FAMILY_PATTERN.search(en or "")):
                reason = "group/mixture/generic name (no single substance)"
            if reason:
                del acc["unmatched"][before["unmatched"]:]
                acc["family_entries"].append({"name": ko, "name_en": en, "detail": detail,
                                              "item_no": item_no, "reason": reason})
    for d in _new(acc, before):
        d.update(fields)
        printed = {termdb.norm(x) for x in re.split(r"\s*/\s*", d.get("matched_name") or "")}
        if d.get("match_method") == "name_match" and "match_scope" not in d and termdb.norm(ko) not in printed:
            d["match_scope"] = "base_substance_of_entry"   # printed name carries state/concentration qualifiers
        if en:
            d["name_en"] = en          # the printed proper shipping / product name, not a lower-cased form
