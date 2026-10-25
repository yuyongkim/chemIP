"""Shared helpers for the per-law parsers: metadata blocks and annex dates."""
from __future__ import annotations

import re

from . import config, lawgo

_AMEND = re.compile(r"<\s*(?:개정|신설|전문개정)\s*([0-9.\s,]+?)\s*>")


def annex_amended(text: str) -> str | None:
    """Latest '<개정 2017. 1. 26.>' style date printed in an annex header, ISO formatted."""
    dates = []
    for m in _AMEND.finditer(text[:600] + text[-400:]):
        for d in re.findall(r"(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})", m.group(1)):
            dates.append(f"{d[0]}-{int(d[1]):02d}-{int(d[2]):02d}")
    return max(dates) if dates else None


def law_meta(doc: lawgo.LawDoc, annex: dict | None, list_id: str, law: str, title: str,
             legal_basis: str, obligations: list[str], admrul: bool = False) -> dict:
    annex_date = annex_amended(annex["text"]) if annex else None
    url = config.admrul_page_url(doc.name) if admrul else config.law_page_url(doc.name)
    meta = {
        "list_id": list_id, "law": law, "title": title, "legal_basis": legal_basis,
        "source_url": url,
        "amended_on": annex_date or doc.promulgated,
        "law_effective": doc.effective,
        "law_mst": doc.mst,
        "raw_file": str(doc.raw_path),
        "obligations": obligations,
    }
    meta["annex_amended_on"] = annex_date
    meta["_version_note"] = (f"{doc.name} 현행본(공포 {doc.promulgated}, 시행 {doc.effective}, "
                             f"law.go.kr 일련번호 {doc.mst})")
    return meta
