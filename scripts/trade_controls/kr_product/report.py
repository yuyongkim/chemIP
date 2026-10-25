"""Cross-list outputs: kr_permits_product.json, KR_PRODUCT_unverified.json, _index_product.json.

Reads back only the list files with this collector's prefixes, so sibling lists are never touched.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from . import config

LIST_PREFIXES = ("KR_CPBSA_", "KR_COSMETIC_", "KR_PESTICIDE_", "KR_TRANSPORT_", "KR_ELV_EEE_",
                 "KR_CHILD_", "KR_POPS_")


_SUSPICIOUS = re.compile(r"polymer|reaction product|\bwith\b|telomer", re.I)


def fold_unmatched(doc: dict) -> dict:
    """Copy unmatched law items into family_entries (flag unmatched=True) so consumers reading only
    entries/family_entries still see every law item; the 'unmatched' block itself is kept."""
    have = {(f.get("item_no"), f.get("name")) for f in doc["family_entries"]}
    for u in doc.get("unmatched", []):
        key = (u.get("item_no"), u.get("name"))
        if key not in have:
            doc["family_entries"].append({"name": u.get("name"), "detail": u.get("detail"), "item_no": u.get("item_no"),
                                          "unmatched": True, "reason": u.get("reason"),
                                          "candidates": u.get("candidates", [])[:10],
                                          **({"match_note": u["match_note"]} if u.get("match_note") else {})})
    doc["stats"]["family_entries_incl_unmatched"] = len(doc["family_entries"])
    return doc


def suspicious(e: dict) -> bool:
    """Name match whose DB English name looks like an unrelated polymer/reaction product."""
    return (e.get("match_method") == "name_match" and e.get("matched_via") in ("ko_only", "synonym")
            and bool(_SUSPICIOUS.search(e.get("db_name_en") or "")))


def _lists() -> list[dict]:
    out = []
    for p in sorted(config.OUT_DIR.glob("KR_*.json")):
        if p.name.startswith(LIST_PREFIXES):
            out.append(json.loads(p.read_text(encoding="utf-8")))
    return out


def _dump(path: Path, obj) -> Path:
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")
    return path


def write_permits(items: list[dict]) -> Path:
    return _dump(config.PERMITS_OUT, {
        "jurisdiction": "KR",
        "scope": "생활화학제품·살생물제, 화장품, 농약, 전기·전자제품·자동차, 어린이제품, 잔류성오염물질, 위험물 운송",
        "retrieved": config.RETRIEVED,
        "note": "verified_text는 law.go.kr 현행 법령·고시 XML에서 읽은 원문 인용. trigger.list_ids는 kr_lists/ 목록 ID.",
        "permits": items,
    })


def write_unverified() -> Path:
    rows = []
    for d in _lists():
        for u in d.get("unmatched", []):
            rows.append({"list_id": d["list_id"], **u})
        for prob in d.get("validation_problems", []):
            rows.append({"list_id": d["list_id"], "problem": prob})
        for e in d.get("entries", []):
            if suspicious(e):
                rows.append({"list_id": d["list_id"], "problem": "suspicious name match (DB record looks unrelated) — review",
                             "cas": e["cas"], "name": e.get("name_ko"), "db_name_en": e.get("db_name_en")})
            if e.get("match_method") == "law_cas" and e.get("cas_check_digit_ok") is False:
                rows.append({"list_id": d["list_id"], "problem": "law-printed CAS fails check digit",
                             "cas": e["cas"], "name": e.get("name_ko") or e.get("name_en")})
    return _dump(config.UNVERIFIED_OUT, {
        "retrieved": config.RETRIEVED,
        "note": "이름→CAS 매칭 실패·모호, 공식 개수 불일치, CAS 검증숫자 오류. 추정 매칭 없음.",
        "count": len(rows), "items": rows})


def write_index() -> Path:
    idx = []
    probe: dict[str, list] = {c: [] for c in config.PROBE_CAS}
    for d in _lists():
        st = d.get("stats", {})
        idx.append({"list_id": d["list_id"], "law": d["law"], "title": d["title"],
                    "legal_basis": d["legal_basis"], "amended_on": d["amended_on"],
                    "official_item_count": st.get("official_item_count"),
                    "entries": st.get("entries"), "distinct_cas": st.get("distinct_cas"),
                    "family_entries": st.get("family_entries"), "unmatched": st.get("unmatched"),
                    "count_check": st.get("count_check")})
        for e in d.get("entries", []):
            if e["cas"] in probe:
                row = {"list_id": d["list_id"], "detail": e.get("detail")}
                if e.get("un_number"):
                    row["un_number"] = e["un_number"]
                probe[e["cas"]].append(row)
    return _dump(config.INDEX_OUT, {
        "retrieved": config.RETRIEVED, "lists": idx,
        "probe_memberships": {f"{c} {n}": probe[c] for c, n in config.PROBE_CAS.items()}})
