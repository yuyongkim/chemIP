"""Turn one law item (as printed) into list entries / family entries / unmatched.

Result containers are plain dicts so every parser fills the same shape:
    acc = new_accumulator()
    add_item(acc, item_no, name, detail)              # name-only law items
    add_law_cas(acc, item_no, cas, name_ko, ...)      # law prints the CAS
`detail` is what the law says (shown to users). `match_note` (optional) is collector provenance
about how a CAS was tied to the name - stored separately, never mixed into detail.
"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

from . import cas as casmod
from . import termdb

DATA = Path(__file__).with_name("data")
_COMPOUND = re.compile(r"^(.+?)\s*(?:및|과|와|또는)\s*그\s*화합물$")
_AND = re.compile(r"^([^\s()]+)\s+및\s+([^\s()]+)$")


@lru_cache(maxsize=1)
def _families() -> dict:
    return json.loads((DATA / "families.json").read_text(encoding="utf-8"))


def clean_name(name: str) -> str:
    """Remove alignment spacing ('벤  젠' -> '벤젠') and collapse whitespace."""
    s = re.sub(r"(?<=[가-힣])\s{2,}(?=[가-힣])", "", name or "")
    s = re.sub(r"(?<=^[가-힣])\s+(?=[가-힣]$)", "", s)
    return re.sub(r"\s+", " ", s).strip()


def new_accumulator() -> dict:
    return {"entries": [], "family_entries": [], "unmatched": [], "items": 0}


def _is_class(name: str) -> bool:
    n = termdb.norm(name)
    return any(termdb.norm(c) == n for c in _families()["class_names"])


def _class_hint(name: str) -> str | None:
    for k, v in _families()["class_hints"].items():
        if termdb.norm(k) == termdb.norm(name):
            return v
    return None


def _db_names(cas_no: str) -> dict:
    idx = termdb.index()
    return {"db_name_ko": idx.name_ko.get(cas_no), "db_name_en": idx.name_en.get(cas_no)}


def _with_note(rec: dict, match_note: str | None) -> dict:
    if match_note:
        rec["match_note"] = match_note
    return rec


def _substance(acc: dict, item_no, name: str, detail: str, extra=None, role: str | None = None,
               match_note: str | None = None) -> None:
    r = termdb.match_name(name, extra)
    if r["status"] == "matched":
        e = {"cas": r["cas"], "name_ko": name, "name_en": r.get("name_en") or (extra or [None])[0] or _db_names(r["cas"])["db_name_en"],
             "detail": detail, "item_no": item_no, "match_method": "name_match",
             "matched_name": r["matched_name"], "matched_via": r["via"]}
        if r.get("conflict"):
            e["match_conflict"] = r["conflict"]
        if role:
            e["role"] = role
        e.update(_db_names(r["cas"]))
        acc["entries"].append(_with_note(e, match_note))
    else:
        acc["unmatched"].append(_with_note({"name": name, "detail": detail, "item_no": item_no,
                                            "reason": "ambiguous_name" if r["status"] == "ambiguous" else "no_exact_name_in_db",
                                            "candidates": r["candidates"][:10]}, match_note))


def add_item(acc: dict, item_no, raw_name: str, detail: str, extra_names: list[str] | None = None,
             count: bool = True, match_note: str | None = None) -> None:
    """One law item given by name only."""
    name = clean_name(raw_name)
    if count:
        acc["items"] += 1
    fam = _families()
    m = _COMPOUND.match(name)
    if m:
        base = clean_name(m.group(1))
        acc["family_entries"].append(_with_note({"name": name, "detail": detail, "item_no": item_no,
                                                 "element": fam["elements"].get(base), "base_name": base}, match_note))
        if base not in fam["no_element_entry"]:
            _substance(acc, item_no, base, f"{detail} — '{name}' 중 {base} 자체", role="group_parent",
                       match_note=match_note)
        return
    if _is_class(name):
        acc["family_entries"].append(_with_note({"name": name, "detail": detail, "item_no": item_no,
                                                 "hint": _class_hint(name)}, match_note))
        return
    m = _AND.match(name)
    if m and "화합물" not in name:
        for part in (m.group(1), m.group(2)):
            _substance(acc, item_no, part, f"{detail} — '{name}'의 일부", match_note=match_note)
        return
    if name.endswith("화합물") or name.endswith("류") or "그 밖에" in name:
        base = re.sub(r"\s*화합물$", "", name)
        acc["family_entries"].append(_with_note({"name": name, "detail": detail, "item_no": item_no,
                                                 "element": fam["elements"].get(base), "hint": _class_hint(name)}, match_note))
        return
    _substance(acc, item_no, name, detail, extra_names, match_note=match_note)


def add_law_cas(acc: dict, item_no, raw_cas: str, name_ko: str, name_en: str | None, detail: str,
                count: bool = True, role: str | None = None) -> None:
    """One law item printed with its CAS number."""
    if count:
        acc["items"] += 1
    c = casmod.normalize(raw_cas)
    e = {"cas": c, "name_ko": clean_name(name_ko) if name_ko else None, "name_en": name_en,
         "detail": detail, "item_no": item_no, "match_method": "law_cas", "cas_check_digit_ok": casmod.is_valid(c)}
    if role:
        e["role"] = role
    e.update(_db_names(c))
    acc["entries"].append(e)


def add_family(acc: dict, item_no, name: str, detail: str, count: bool = True, **extra) -> None:
    if count:
        acc["items"] += 1
    fe = {"name": clean_name(name), "detail": detail, "item_no": item_no}
    fe.update({k: v for k, v in extra.items() if v is not None})
    acc["family_entries"].append(fe)


def add_element_group(acc: dict, item_no, name: str, detail: str, count: bool = True) -> None:
    """A parameter measured as the element in total (e.g. 먹는물 '납', '크롬'): family entry with
    the element hint plus the element itself as an entry."""
    if count:
        acc["items"] += 1
    sym = _families()["elements"].get(name)
    acc["family_entries"].append({"name": name, "detail": detail + " — 원소 총량 기준(모든 화합물 형태 포함)",
                                  "item_no": item_no, "element": sym})
    _substance(acc, item_no, name, detail + " — 원소 자체", role="group_parent")
