"""파키스탄(Sindh 주): Hazardous Substances Rules 2014 열거 물질."""
from __future__ import annotations

from typing import Iterable

from .base import Row, cas_valid, jurisdiction_db, ro

OWNED = ("PK_SINDH_HAZSUB",)


def parse_sindh() -> Iterable[Row]:
    """문서 한 건이 '번호.', 이름, CAS 세 줄이다."""
    with ro(jurisdiction_db("pak")) as c:
        rows = c.execute(
            "SELECT content FROM documents WHERE instrument = 'pak_sindh_hazardous_substances_rules_2014'"
        ).fetchall()
    for (text,) in rows:
        lines = [x.strip() for x in text.split("\n") if x.strip()]
        if len(lines) != 3 or not cas_valid(lines[2]):
            continue
        yield Row(lines[2], "PK_SINDH_HAZSUB", "Sindh 유해물질 규칙 2014 열거 물질",
                  "Sindh Hazardous Substances Rules 2014", lines[1])


PARSERS = {"pk_sindh": parse_sindh}
