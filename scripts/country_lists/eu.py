"""EU: Seveso III(2012/18/EU) 부록 I 2부 지정 물질 임계량(톤)."""
from __future__ import annotations

import re
from typing import Iterable

from .base import Row, cas_valid, jurisdiction_db, ro

OWNED = ("EU_SEVESO_III",)
_NO = re.compile(r"^\d+\.\s*")


def parse_seveso() -> Iterable[Row]:
    """행 형식: '번호. 이름 | CAS | 하위 임계량 | 상위 임계량'(임계량은 톤, 일부 행은 한 칸)."""
    with ro(jurisdiction_db("eu")) as c:
        rows = c.execute(
            "SELECT content FROM documents WHERE instrument LIKE '32012L0018%' AND section = 'PART 2'"
        ).fetchall()
    for (text,) in rows:
        parts = [p.strip() for p in text.split("|")]
        if len(parts) < 2 or not cas_valid(parts[1]):
            continue
        qty = " / ".join(parts[2:]) or "-"
        yield Row(parts[1], "EU_SEVESO_III", f"Qualifying quantity (t) lower/upper: {qty}",
                  "Directive 2012/18/EU Annex I Part 2", _NO.sub("", parts[0]))


PARSERS = {"eu_seveso": parse_seveso}
