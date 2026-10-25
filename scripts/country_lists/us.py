"""미국: OSHA PSM 부록 A(임계량), OSHA 1910.1000 Table Z-1 공기 중 허용기준(PEL), TSCA SNUR(40 CFR 721)."""
from __future__ import annotations

import re
from collections import defaultdict
from typing import Iterable

from .base import CAS_RE, Row, cas_valid, ecfr_db, ro

OWNED = ("US_OSHA_PSM", "US_OSHA_PEL", "US_TSCA_SNUR")

_SNUR_IDENT = re.compile(r"subject to reporting under this section", re.I)
_PMN = re.compile(r"PMN\s+(P[-‑]\d{2}[-‑]\d+)")
_SECTION = re.compile(r"^§\s*(721\.\d+)\s*")


def parse_psm() -> Iterable[Row]:
    """29 CFR 1910.119 Appendix A. 행 형식: 이름 | CAS | 임계량(lb)."""
    with ro(ecfr_db()) as c:
        rows = c.execute(
            "SELECT content FROM documents WHERE id LIKE 'ecfr-tbl:29-1910-1910.119-%' ORDER BY id"
        ).fetchall()
    for (text,) in rows:
        parts = [p.strip() for p in text.split("|")]
        if len(parts) < 3 or not cas_valid(parts[1]):
            continue
        yield Row(parts[1], "US_OSHA_PSM", f"Threshold Quantity: {parts[2]} lb",
                  "OSHA 29 CFR 1910.119 App. A", parts[0])


def parse_pel() -> Iterable[Row]:
    """29 CFR 1910.1000 Table Z-1. 행 형식: 이름 | CAS | ppm | mg/m3 (CAS 칸이 있는 행만)."""
    with ro(ecfr_db()) as c:
        rows = c.execute(
            "SELECT content FROM documents WHERE id LIKE 'ecfr-tbl:29-1910-1910.1000-%' ORDER BY id"
        ).fetchall()
    for (text,) in rows:
        parts = [p.strip() for p in text.split("|")]
        if len(parts) < 3 or not cas_valid(parts[1]):
            continue
        yield Row(parts[1], "US_OSHA_PEL", "PEL (8h TWA) ppm | mg/m3: " + " | ".join(parts[2:]),
                  "OSHA 29 CFR 1910.1000 Table Z-1", parts[0])


def _cas_in(texts) -> list[str]:
    return list(dict.fromkeys(m.group(0) for t in texts for m in CAS_RE.finditer(t) if cas_valid(m.group(0))))


def parse_snur() -> Iterable[Row]:
    """40 CFR 721 Subpart E(§721.100~): 조문 하나가 물질(군) 하나다.
    물질 지정 단락('... is subject to reporting under this section')의 CAS 를 받는다.
    지정 단락에 CAS 가 없는 물질군 조문은 조문 안에 인용된 CAS 를 받고 detail 에 표시한다."""
    with ro(ecfr_db()) as c:
        rows = c.execute(
            "SELECT id, title, content FROM documents WHERE id LIKE 'ecfr:ECFR-40-721.%' ORDER BY id"
        ).fetchall()
    sections: dict[str, dict] = {}
    for doc_id, title, text in rows:
        num = doc_id.split("-")[2]
        if float(num[4:] or 0) < 100:  # Subpart A~D 는 총칙
            continue
        sec = sections.setdefault(num, {"title": title, "chunks": []})
        sec["chunks"].append(text)

    by_cas: dict[str, list[tuple[str, str, str]]] = defaultdict(list)
    for num, sec in sections.items():
        ident = [t for t in sec["chunks"] if _SNUR_IDENT.search(t)]
        cas_list, how = _cas_in(ident), ""
        if not cas_list:
            cas_list, how = _cas_in(sec["chunks"]), "category rule, CAS cited in section"
        pmn = ", ".join(dict.fromkeys(_PMN.findall(" ".join(ident))))
        name = _SECTION.sub("", sec["title"]).rstrip(".")
        note = "; ".join(x for x in (f"PMN {pmn}" if pmn else "", how) if x)
        for cas in cas_list:
            by_cas[cas].append((num, note, name))

    for cas, hits in by_cas.items():
        refs = " · ".join(f"§ {num}" + (f" ({note})" if note else "") for num, note, _ in hits)
        yield Row(cas, "US_TSCA_SNUR", f"Significant New Use Rule {refs}", "EPA 40 CFR Part 721 Subpart E", hits[0][2])


PARSERS = {"us_psm": parse_psm, "us_pel": parse_pel, "us_snur": parse_snur}
