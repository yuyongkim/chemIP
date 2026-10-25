"""Assemble, validate and write one kr_lists/<LIST_ID>.json file."""
from __future__ import annotations

import json
from pathlib import Path

from . import cas as casmod
from . import config


def build(meta: dict, acc: dict, official_count: int, deleted: int = 0, notes: list[str] | None = None) -> dict:
    """meta: list_id, law, title, legal_basis, source_url, amended_on, obligations, (optional) extra keys.

    official_count = items counted in the official table (excluding 삭제 rows).
    """
    entries = acc["entries"]
    bad = [e["cas"] for e in entries if not casmod.is_valid(e["cas"])]
    distinct = sorted({e["cas"] for e in entries})
    by_method: dict[str, int] = {}
    for e in entries:
        by_method[e["match_method"]] = by_method.get(e["match_method"], 0) + 1
    problems = []
    if acc["items"] != official_count:
        problems.append(f"parsed items {acc['items']} != official count {official_count}")
    if bad:
        problems.append(f"invalid CAS check digit: {bad}")
    out = {
        "list_id": meta["list_id"],
        "law": meta["law"],
        "title": meta["title"],
        "jurisdiction": "KR",
        "legal_basis": meta["legal_basis"],
        "source_url": meta["source_url"],
        "amended_on": meta["amended_on"],
        "retrieved": config.RETRIEVED,
        "obligations": meta["obligations"],
    }
    for k in ("annex_amended_on", "law_effective", "law_mst", "raw_file", "groups"):
        if k in meta:
            out[k] = meta[k]
    if "_version_note" in meta:
        out["version_note"] = meta["_version_note"]
    out["stats"] = {
        "official_item_count": official_count,
        "deleted_items": deleted,
        "parsed_items": acc["items"],
        "entries": len(entries),
        "distinct_cas": len(distinct),
        "entries_by_match_method": by_method,
        "family_entries": len(acc["family_entries"]),
        "unmatched": len(acc["unmatched"]),
        "cas_check_digit_failures": len(bad),
        "count_check": "ok" if not problems else "MISMATCH",
    }
    out["validation_problems"] = problems
    out["notes"] = list(notes or [])
    if "annex_amended_on" in meta and meta["annex_amended_on"] is None:
        out["notes"].append("별표 머리에 개정일 표기가 없어 amended_on에는 해당 법령 현행본의 공포일을 기재함(version_note 참조).")
    out["entries"] = entries
    out["family_entries"] = acc["family_entries"]
    out["unmatched"] = acc["unmatched"]
    return out


def write(doc: dict) -> Path:
    config.OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = config.OUT_DIR / f"{doc['list_id']}.json"
    path.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
    return path
