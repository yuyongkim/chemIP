"""Turn one parser result + its metadata (sources/*.json) into the output list JSON, with count checks.

Output shape (read by backend/core/trade_controls/lists.py, folder intl_lists/):
{"list_id","jurisdiction","law","title","directions","obligation_for_kr_exporter","legal_basis",
 "source_url","source_version","retrieved","license", "entries":[{"cas","name","detail"}],"family_entries":[...],
 "stats":{...},"validation_problems":[...],"notes":[...],"raw_files":[...]}
"""
from __future__ import annotations

from intl_common import cas_is_valid

META_FIELDS = (
    "list_id", "jurisdiction", "law", "title", "directions", "obligation_for_kr_exporter", "legal_basis",
    "source_url", "license", "absence_note",
)


def _dedupe(entries: list[dict]) -> list[dict]:
    """Same CAS twice in one list: keep one entry, join the details."""
    by_cas: dict[str, dict] = {}
    out: list[dict] = []
    for e in entries:
        hit = by_cas.get(e["cas"])
        if hit is None:
            by_cas[e["cas"]] = dict(e)
            out.append(by_cas[e["cas"]])
        elif e.get("detail") and e["detail"] not in hit.get("detail", ""):
            hit["detail"] = f"{hit['detail']} | {e['detail']}".strip(" |")
    return out


def make_list(meta: dict, parsed: dict, retrieved: str) -> dict:
    entries = _dedupe(parsed.get("entries") or [])
    families = parsed.get("family_entries") or []
    problems = list(parsed.get("problems") or [])
    # Errors printed in the official source itself, checked by hand and explained in sources/*.json
    known = meta.get("known_source_errors") or {}
    notes_known = [f"원문 오류 {cas}: {why}" for cas, why in known.items() if any(cas in p for p in problems)]
    problems = [p for p in problems if not any(cas in p for cas in known)]
    bad =[e["cas"] for e in entries if not cas_is_valid(e["cas"])]
    if bad:
        problems.append(f"CAS check digit failures: {bad}")
    official = parsed.get("official_count")
    counted = parsed.get("counted")
    if official is not None and counted is not None and official != counted:
        problems.append(f"count mismatch: official {official} ({parsed.get('official_count_basis', '')}) vs parsed {counted}")
    out = {field: meta[field] for field in META_FIELDS if field in meta}
    out.update({
        "source_version": parsed.get("source_version") or meta.get("source_version", ""),
        "retrieved": retrieved,
        "entries": entries,
        "family_entries": families,
        "stats": {
            "official_count": official,
            "official_count_basis": parsed.get("official_count_basis", ""),
            "parsed_items": counted,
            "entries": len(entries),
            "distinct_cas": len({e["cas"] for e in entries}),
            "family_entries": len(families),
            "cas_check_digit_failures": len(bad),
            "count_check": "ok" if not problems else "problem",
        },
        "validation_problems": problems,
        "notes": [*(meta.get("notes") or []), *(parsed.get("notes") or []), *notes_known],
        "raw_files": parsed.get("files") or [],
    })
    return out
