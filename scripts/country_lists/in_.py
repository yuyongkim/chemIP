"""인도: 화학사고(비상계획·대비·대응) 규칙 1996 부속서 임계량."""
from __future__ import annotations

import re
from typing import Iterable

from .base import Row, cas_valid, jurisdiction_db, ro

OWNED = ("IN_CHEM_ACCIDENT_RULES",)
# '1. Aldicarb 100 kg 116-06-3' 반복. 이름은 번호 뒤부터 수량 앞까지.
_ITEM = re.compile(
    r"\d+\.\s+(?P<name>.+?)\s+(?P<qty>[\d,\.]+\s*(?:kg|t|MT|tonnes?|tons?))\s+(?P<cas>\d{2,7}-\d{2}-\d)",
    re.IGNORECASE,
)


def parse_accident_rules() -> Iterable[Row]:
    with ro(jurisdiction_db("india")) as c:
        rows = c.execute("SELECT content FROM documents WHERE instrument = 'eppr_1996'").fetchall()
    for (text,) in rows:
        for m in _ITEM.finditer(text.replace("\n", " ")):
            if cas_valid(m["cas"]):
                yield Row(m["cas"], "IN_CHEM_ACCIDENT_RULES", f"Threshold: {m['qty']}",
                          "India Chemical Accidents Rules 1996", m["name"].strip())


PARSERS = {"in_accident": parse_accident_rules}
