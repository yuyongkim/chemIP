"""멕시코: NOM-028-STPS-2012 부록 A 위험 화학물질 임계량."""
from __future__ import annotations

import re
from typing import Iterable

from .base import Row, cas_valid, jurisdiction_db, ro

OWNED = ("MX_NOM028_THRESHOLD",)


_NO = re.compile(r"^\d{1,3}\.$")
_QTY = re.compile(r"^[\d,.]+$")


def parse_nom028() -> Iterable[Row]:
    """표 A1 이 '번호. / 이름 / CAS / 임계량(kg)' 줄 단위로 나열돼 있다.
    물질 하나가 문서 한 건인 구간과, 여러 물질이 한 문서(청크 경계에서 이어짐)인 구간이 섞여 있어
    문서를 원래 순서로 이어 붙인 뒤 줄 패턴으로 읽는다."""
    with ro(jurisdiction_db("mex")) as c:
        rows = c.execute("SELECT content FROM documents WHERE instrument = 'mex_nom028' ORDER BY rowid").fetchall()
    lines = [ln.strip() for (text,) in rows for ln in text.splitlines() if ln.strip()]
    hits: dict[str, list[tuple[str, str]]] = {}
    for i in range(2, len(lines) - 1):
        if cas_valid(lines[i]) and _NO.match(lines[i - 2]) and _QTY.match(lines[i + 1]):
            hits.setdefault(lines[i], []).append((lines[i - 1], lines[i + 1]))
    # 같은 CAS 가 형태별로 다른 임계량을 가질 수 있다(예: 무수 암모니아 / 암모니아수). 한 행에 모두 적는다.
    for cas, items in hits.items():
        if len(items) == 1:
            detail = f"Cantidad umbral: {items[0][1]} kg"
        else:
            detail = "Cantidad umbral: " + "; ".join(f"{name} {qty} kg" for name, qty in items)
        yield Row(cas, "MX_NOM028_THRESHOLD", detail, "NOM-028-STPS-2012 Apéndice A", items[0][0])


PARSERS = {"mx_nom028": parse_nom028}
