"""The kr_lists JSON shape: create a list, add CAS entries / family entries, write it.

Shape (shared with sibling collectors):
  {list_id, law, title, jurisdiction:"KR", legal_basis, source_url, amended_on,
   retrieved, obligations:[...], entries:[{cas,name_ko,name_en,detail,match_method,match_note?}],
   family_entries:[...]}
detail = what the law says about the substance (shown to users).
match_note = how the collector tied the law name to a CAS (provenance; not shown). Absent when empty.
Extra keys used here: version, mixture_rules, count_check, notes.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from . import cas as casmod
from . import config


def law_url(mst: str) -> str:
    return f"https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq={mst}"


def admrul_url(seq: str) -> str:
    return f"https://www.law.go.kr/LSW/admRulInfoP.do?admRulSeq={seq}"


def ymd(s: str) -> str:
    s = re.sub(r"\D", "", s or "")
    return f"{s[:4]}-{s[4:6]}-{s[6:8]}" if len(s) == 8 else ""


def annex_amended(text: str) -> str:
    """'<개정 2022. 10. 18.>' in a 별표 header -> '2022-10-18' ('' if none)."""
    m = re.search(r"<\s*(?:개정|신설)\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?", text[:400])
    return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}" if m else ""


def new_list(list_id: str, law: str, title: str, legal_basis: str, source_url: str,
             amended_on: str, obligations: list[str], version: dict) -> dict:
    return {
        "list_id": list_id, "law": law, "title": title, "jurisdiction": "KR",
        "legal_basis": legal_basis, "source_url": source_url, "amended_on": amended_on,
        "retrieved": config.RETRIEVED, "version": version, "obligations": obligations,
        "entries": [], "family_entries": [], "mixture_rules": [], "count_check": [], "notes": [],
        "_invalid_cas": [],
    }


def _merge(rec: dict, key: str, text: str) -> None:
    """Append text to rec[key] with ' | ' unless already there; create the key only when text is non-empty."""
    if not text:
        return
    old = rec.get(key) or ""
    if text not in old:
        rec[key] = f"{old} | {text}" if old else text


def add_entry(lst: dict, cas_no: str, name_ko: str, name_en: str, detail: str,
              match_method: str, match_note: str = "") -> None:
    c = casmod.normalize(cas_no)
    if not casmod.is_valid(c):
        lst["_invalid_cas"].append({"cas": cas_no, "name_ko": name_ko, "detail": detail})
        return
    for e in lst["entries"]:
        if e["cas"] == c:
            _merge(e, "detail", detail)
            _merge(e, "match_note", match_note)
            return
    e = {"cas": c, "name_ko": name_ko, "name_en": name_en, "detail": detail, "match_method": match_method}
    _merge(e, "match_note", match_note)
    lst["entries"].append(e)


def add_family(lst: dict, name_ko: str, name_en: str, detail: str, rule: str,
               anchor_cas: list[str] | None = None, candidates: list[str] | None = None,
               match_note: str = "") -> None:
    fam = {
        "name": name_ko, "name_en": name_en, "detail": detail, "rule": rule,   # 'name' as in sibling lists
        "anchor_cas": [c for c in (anchor_cas or []) if casmod.is_valid(c)],
        "name_match_candidates": candidates or [],
    }
    _merge(fam, "match_note", match_note)
    lst["family_entries"].append(fam)


def write(lst: dict) -> Path:
    config.LIST_DIR.mkdir(parents=True, exist_ok=True)
    out = {k: v for k, v in lst.items() if not k.startswith("_")}
    path = config.LIST_DIR / f"{lst['list_id']}.json"
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2), "utf-8")
    return path
