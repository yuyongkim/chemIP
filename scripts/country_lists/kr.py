"""한국: 산업안전보건법 시행령 별표 13 유해·위험물질 규정량(공정안전보고서 제출 대상)."""
from __future__ import annotations

import re
from collections import defaultdict
from typing import Iterable

from .base import CAS_RE, Row, cas_valid, kosha_db, ro

SOURCE = "산업안전보건법 시행령 [별표 13] 유해ㆍ위험물질 규정량(제43조제1항 관련)"
OWNED = ("KR_OSHA_PSM",)

_CAS_RUN = r"(?:\d{2,7}-\d{2}-\d\s*,?\s*)+"
# "<번호> <물질명> <CAS[, CAS]> 제조ㆍ취급ㆍ저장: <kg> [<이어지는 CAS>] [<물질명 끝: '12.6% 이상)'>]"
# 원문 표는 칸이 줄바꿈되어 있어 물질명 끝이나 추가 CAS 가 규정량 뒤로 밀려 나온다.
_ENTRY = re.compile(rf"(\d{{1,2}}) ([^\d:][^:]*?) ({_CAS_RUN})제조ㆍ취급ㆍ저장: ([\d,]+)"
                    rf"((?:\s*\d{{2,7}}-\d{{2}}-\d,?)*)(?:\s+([\d.]+% (?:이상|미만)\)))?")


def _table_text() -> str:
    with ro(kosha_db()) as c:
        row = c.execute(
            "SELECT content FROM documents WHERE title LIKE '%별표 13%유해%위험물질 규정량%' LIMIT 1"
        ).fetchone()
    return " ".join(str(row[0]).split()) if row else ""


def parse_psm() -> Iterable[Row]:
    """같은 CAS 가 농도별로 두 번 나오면(불산·염산) 한 행으로 합친다. 인화성 가스·액체(CAS 없음)는 제외한다."""
    by_cas: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for m in _ENTRY.finditer(_table_text()):
        name, kg = (m.group(2).strip() + (" " + m.group(6) if m.group(6) else "")), m.group(4)
        for cas in CAS_RE.finditer(m.group(3) + " " + m.group(5)):
            if cas_valid(cas.group(0)):
                by_cas[cas.group(0)].append((name, kg))
    for cas, entries in by_cas.items():
        if len(entries) == 1:
            detail = f"규정량(제조·취급·저장): {entries[0][1]} kg"
        else:
            detail = "규정량(제조·취급·저장): " + "; ".join(f"{n} {kg} kg" for n, kg in entries)
        yield Row(cas, "KR_OSHA_PSM", detail, SOURCE, entries[0][0])


PARSERS = {"kr_osha_psm": parse_psm}
