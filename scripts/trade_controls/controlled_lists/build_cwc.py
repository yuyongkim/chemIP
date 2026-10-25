"""Assemble cwc_schedules.json from OPCW schedules + Korean 생화학무기법 [별표]."""
from __future__ import annotations

from common import cas_report

# OPCW item numbers per schedule/part, in the order the Korean annex numbers them 1), 2), ...
# (Korean 1종 가 = Schedule 1A items (1)-(8); 1종 나 = Schedule 1B (9)-(12); etc.)
OFFICIAL_ITEMS = {1: 16, 2: 14, 3: 17}


def _kr_index(kr_items: list[dict]) -> dict:
    """Map (kind, part, no) -> kr item, and CAS -> kr label."""
    by_pos = {(i["kind"], i["part"], i["no"]): i for i in kr_items if i["no"]}
    by_cas = {}
    for i in kr_items:
        if i["no"]:
            for c in i["cas"]:
                by_cas[c] = f"{i['kind']}종화학물질 {i['part']}목 {i['no']})"
    return {"pos": by_pos, "cas": by_cas}


def _kr_label(schedule: int, part: str, item: int, sched_items: list[dict], kr: dict) -> str:
    """Positional mapping: n-th OPCW item of Schedule s part A/B -> s종 가/나 n)."""
    part_items = sorted(i["item"] for i in sched_items if i["schedule"] == schedule and i["part"] == part)
    pos = part_items.index(item) + 1
    kr_part = "가" if part == "A" else "나"
    if (schedule, kr_part, pos) in kr["pos"]:
        return f"{schedule}종화학물질 {kr_part}목 {pos})"
    return ""


def build(meta: dict, schedules: dict, kr_items: list[dict], kr_law: dict, src_info: dict) -> tuple[dict, list[str]]:
    problems: list[str] = []
    kr = _kr_index(kr_items)
    entries, families, exemptions, all_items = [], [], [], []
    for s in (1, 2, 3):
        r = schedules[s]
        all_items += r["items"]
        nums = sorted(i["item"] for i in r["items"])
        if nums != list(range(1, OFFICIAL_ITEMS[s] + 1)):
            problems.append(f"Schedule {s}: item numbers {nums} != 1..{OFFICIAL_ITEMS[s]}")
    for s in (1, 2, 3):
        r = schedules[s]
        for group, target in ((r["entries"], entries), (r["families"], families), (r["exemptions"], exemptions)):
            for e in group:
                part = e["category"].split()[1][-1]
                item = int(e["category"].split("(")[1].rstrip(")"))
                label = _kr_label(s, part, item, all_items, kr)
                if e.get("cas") and group is not r["exemptions"]:
                    kr_cas = kr["cas"].get(e["cas"])
                    if label and kr_cas and kr_cas != label:
                        problems.append(f"KR mapping conflict {e['cas']}: positional {label} vs annex {kr_cas}")
                    if label and not kr_cas:
                        problems.append(f"{e['cas']} ({e['name']}) not printed in KR annex under {label}")
                row = dict(e)
                row["kr_category"] = f"{s}종" if label else ""
                row["kr_annex_item"] = label or ("not enumerated in KR 법률 [별표]; 별표 {0}.다목(대통령령 위임) 해당 여부 확인 필요".format(s))
                target.append(row)
    # CAS printed in KR annex but absent from OPCW parse
    opcw_cas = {e["cas"] for e in entries}
    for cas, label in kr["cas"].items():
        if cas not in opcw_cas:
            problems.append(f"KR annex CAS {cas} ({label}) not found in OPCW schedules")
    rep = cas_report(entries)
    rep["cas_checksum_failures"] += cas_report(exemptions)["cas_checksum_failures"]
    out = {
        "list_id": meta["list_id"],
        "title": meta["title"],
        "jurisdiction": meta["jurisdiction"],
        "directions": meta["directions"],
        "authority": meta["authority"],
        "kr_obligation": " / ".join(f"{k}: {v}" for k, v in meta["kr_obligation"].items()),
        "kr_obligation_by_category": meta["kr_obligation"],
        "legal_basis": meta["legal_basis"],
        "source_url": meta["source_url"],
        "source_version": src_info["version"],
        "retrieved": src_info["retrieved"],
        "kr_source": kr_law,
        "raw_files": src_info["raw_files"],
        "counts": {
            "official_numbered_items": OFFICIAL_ITEMS,
            "parsed_numbered_items": {s: len(schedules[s]["items"]) for s in (1, 2, 3)},
            "entries_with_cas": rep["entries_with_cas"],
            "family_entries_without_cas": len(families),
            "exemptions": len(exemptions),
        },
        "validation": {"cas_checksum_failures": rep["cas_checksum_failures"], "problems": problems},
        "notes": [
            "Schedule entries marked 'example of family' are e.g. members; the whole family (see family_entries) is controlled.",
            "exemptions are explicitly excluded from the schedule item named in 'detail' and must NOT be treated as controlled under it.",
            "KR mapping is positional (OPCW Schedule s, part A/B, n-th item -> s종화학물질 가/나목 n)) and cross-checked by CAS against the Korean annex text.",
        ],
        "entries": entries,
        "family_entries": families,
        "exemptions": exemptions,
    }
    return out, problems
