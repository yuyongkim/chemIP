"""Assemble drug_precursors.json: INCB Red List Tables I/II joined with KR 시행령 [별표 8]."""
from __future__ import annotations

import re

from common import cas_report, name_key


def _incb_keys(e: dict) -> set[str]:
    keys = {name_key(e["name"])}
    no_paren = re.sub(r"\([^()]*\)", "", e["name"]).strip()
    keys.add(name_key(no_paren))
    for abbr in re.findall(r"\(([^()]*)\)", e["name"]):
        keys.add(name_key(abbr))
    return {k for k in keys if k}


def _kr_keys(r: dict) -> list[str]:
    en = r["name_en"]
    keys = [name_key(en)] + [name_key(p) for p in en.split(", ")]
    return [k for k in keys if k]


def _match(kr_rows: list[dict], incb: list[dict], aliases: list[dict]) -> dict[int, int]:
    """Return {kr_row_index: incb_index}."""
    index: dict[str, int] = {}
    for i, e in enumerate(incb):
        for k in _incb_keys(e):
            index.setdefault(k, i)
    alias = {name_key(a["kr_name_en"]): name_key(a["incb_name"]) for a in aliases}
    out = {}
    for j, r in enumerate(kr_rows):
        hit = next((alias[k] for k in _kr_keys(r) if k in alias and alias[k] in index), None)
        if hit:
            out[j] = index[hit]
            continue
        for k in _kr_keys(r):
            if k in index:
                out[j] = index[k]
                break
    return out


def build(meta: dict, incb: dict, kr_rows: list[dict], aliases: list[dict], cas_lookup, kr_law: dict,
          src_info: dict) -> tuple[dict, list[str]]:
    problems: list[str] = []
    for t in ("I", "II"):
        if incb["anchor_count"][t] != len(incb[f"table_{t}"]):
            problems.append(f"INCB Table {t}: {incb['anchor_count'][t]} HS/CAS rows but {len(incb[f'table_{t}'])} parsed")
    incb_all = [dict(e, table="I") for e in incb["table_I"]] + [dict(e, table="II") for e in incb["table_II"]]
    for g in ("1군", "2군"):
        nums = [r["no"] for r in kr_rows if r["group"] == g]
        if nums != list(range(1, len(nums) + 1)):
            problems.append(f"KR 별표 8 {g} numbering not contiguous: {nums}")
    match = _match(kr_rows, incb_all, aliases)
    by_incb: dict[int, dict] = {i: kr_rows[j] for j, i in match.items()}
    if len(by_incb) != len(match):
        problems.append("two KR rows matched the same INCB substance")

    entries, family = [], []
    for i, e in enumerate(incb_all):
        kr = by_incb.get(i)
        row = {
            "cas": e["cas"],
            "name": e["name"],
            "name_ko": kr["name_ko"] if kr else "",
            "category": f"INCB Table {e['table']}" + (f" / KR 원료물질 {kr['group']} {kr['no']}" if kr else " / KR 별표 8 미수록"),
            "incb_table": e["table"],
            "kr_group": kr["group"] if kr else "",
            "kr_annex_no": kr["no"] if kr else None,
            "hs_code": e["hs_code"],
            "detail": _detail(kr, e),
            "cas_source": "INCB Red List",
        }
        (entries if e["cas"] else family).append(row)
        if not e["cas"]:
            row["detail"] = ("CAS 'n/a' in INCB Red List. " + row["detail"]).strip()
    for j, r in enumerate(kr_rows):
        if j in match:
            continue
        hit = cas_lookup(r["name_en"]) if r["name_en"] else {"cas": "", "cid": None, "error": "no English name"}
        row = {
            "cas": hit["cas"],
            "name": r["name_en"],
            "name_ko": r["name_ko"],
            "category": f"KR 원료물질 {r['group']} {r['no']} / not in INCB Tables I-II",
            "incb_table": "",
            "kr_group": r["group"],
            "kr_annex_no": r["no"],
            "hs_code": "",
            "detail": _detail(r, None),
            "cas_source": f"PubChem CID {hit['cid']} synonym (CAS not printed in 별표 8)" if hit["cas"] else "",
        }
        if hit["cas"]:
            entries.append(row)
        else:
            row["detail"] = (f"CAS not resolved ({hit['error']}). " + row["detail"]).strip()
            family.append(row)
    unmatched_incb = [e["name"] for i, e in enumerate(incb_all) if i not in by_incb]
    rep = cas_report(entries)
    out = {
        "list_id": meta["list_id"],
        "title": meta["title"],
        "jurisdiction": meta["jurisdiction"],
        "directions": meta["directions"],
        "authority": meta["authority"],
        "kr_obligation": " / ".join(f"{k}: {v}" for k, v in meta["kr_obligation"].items()),
        "kr_obligation_by_group": meta["kr_obligation"],
        "legal_basis": meta["legal_basis"],
        "source_url": meta["source_url"],
        "source_version": f"INCB Red List, {incb['edition']}",
        "retrieved": src_info["retrieved"],
        "kr_source": kr_law,
        "raw_files": src_info["raw_files"],
        "counts": {
            "incb_table_I": len(incb["table_I"]),
            "incb_table_II": len(incb["table_II"]),
            "incb_hs_cas_rows": incb["anchor_count"],
            "kr_1군": sum(1 for r in kr_rows if r["group"] == "1군"),
            "kr_2군": sum(1 for r in kr_rows if r["group"] == "2군"),
            "kr_matched_to_incb": len(match),
            "kr_only": len(kr_rows) - len(match),
            "incb_not_in_kr": len(unmatched_incb),
            "entries_with_cas": rep["entries_with_cas"],
            "entries_cas_from_pubchem": sum(1 for e in entries if e["cas_source"].startswith("PubChem")),
            "family_entries_without_cas": len(family),
        },
        "validation": {
            "cas_checksum_failures": rep["cas_checksum_failures"],
            "problems": problems,
            "incb_substances_not_in_kr_annex": unmatched_incb,
        },
        "notes": [
            "INCB: the salts of Table I/II substances are also controlled; salts of hydrochloric and sulphuric acid are excluded from Table II.",
            "KR: 별표 8 covers the listed substances and their salts (염류); 염산·황산은 염류 제외.",
            "Name matching KR->INCB is by normalised English name plus name_aliases.json; CAS numbers for KR-only substances come from PubChem, not from the law.",
        ],
        "entries": entries,
        "family_entries": family,
    }
    return out, problems


def _detail(kr: dict | None, incb: dict | None) -> str:
    parts = []
    if kr:
        lim = [f"최대거래량 {kr['max_qty']}" if kr["max_qty"] else "", f"최고농도 {kr['max_conc']}" if kr["max_conc"] else ""]
        lim = [x for x in lim if x]
        parts.append("KR 거래기록 작성 면제 기준(시행령 제19조, 별표 8): " + (", ".join(lim) if lim else "설정 없음(거래마다 기록·2년 보존)"))
    if incb and incb.get("preparations_hs"):
        parts.append("; ".join(incb["preparations_hs"]))
    return "; ".join(parts)
