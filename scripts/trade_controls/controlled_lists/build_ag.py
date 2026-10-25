"""Assemble australia_group.json from the AG PDF + Korean 전략물자수출입고시 [별표 2] 1C350."""
from __future__ import annotations

from common import cas_report


def build(meta: dict, ag: dict, kr1c350: dict, kr_rule: dict, src_info: dict) -> tuple[dict, list[str]]:
    problems: list[str] = []
    nums = [e["no"] for e in ag["entries"]]
    official = max(nums) if nums else 0
    if nums != list(range(1, official + 1)):
        problems.append(f"AG numbering not contiguous: {nums}")
    kr_items = kr1c350["items"]
    if sorted(kr_items) != nums:
        problems.append(f"KR 1C350 items {sorted(kr_items)} differ from AG items 1..{official}")
    entries = []
    for e in ag["entries"]:
        if not e.get("cas"):
            problems.append(f"AG item {e['no']} parsed without CAS: {e.get('text')}")
            continue
        k = kr_items.get(e["no"], {})
        if k.get("cas") != e["cas"] or k.get("cas_ko") != e["cas"]:
            problems.append(f"AG {e['no']} CAS {e['cas']} vs KR 1C350.{e['no']} en={k.get('cas')} ko={k.get('cas_ko')}")
        detail = f"CWC schedule per AG list: {e['cwc_schedule']}" if e["cwc_schedule"] else "CWC schedule column blank in AG list"
        if e["no"] in kr1c350["military_refs"]:
            detail += "; KR 1C350.{0}: 'SEE MILITARY GOODS CONTROLS' (군용물자목록 참조)".format(e["no"])
        entries.append({
            "cas": e["cas"],
            "name": e["name"],
            "name_ko": k.get("name_ko", ""),
            "category": f"AG CW precursor {e['no']} / KR 1C350.{e['no']}",
            "kr_control_no": f"1C350.{e['no']}",
            "ag_item": e["no"],
            "cwc_schedule": e["cwc_schedule"],
            "detail": detail,
        })
    rep = cas_report(entries)
    out = {
        "list_id": meta["list_id"],
        "title": meta["title"],
        "jurisdiction": meta["jurisdiction"],
        "directions": meta["directions"],
        "authority": meta["authority"],
        "kr_obligation": meta["kr_obligation"],
        "legal_basis": meta["legal_basis"],
        "source_url": meta["source_url"],
        "source_version": f"Australia Group Export Control List: Chemical Weapons Precursors, {ag['version']}",
        "retrieved": src_info["retrieved"],
        "kr_source": kr_rule,
        "raw_files": src_info["raw_files"],
        "counts": {
            "official_items": official,
            "parsed_entries": len(entries),
            "entries_with_cas": rep["entries_with_cas"],
            "family_entries_without_cas": 0,
            "kr_1c350_items": len(kr_items),
        },
        "validation": {"cas_checksum_failures": rep["cas_checksum_failures"], "problems": problems},
        "notes": [ag["technical_note"]],
        "entries": entries,
        "family_entries": [],
    }
    return out, problems
