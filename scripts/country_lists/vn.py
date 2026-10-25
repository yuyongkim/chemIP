"""베트남: 법령 24/2026/ND-CP 부록 I~IV."""
from __future__ import annotations

import re
from typing import Iterable

from .base import Row, cas_valid, jurisdiction_db, ro

APPENDIX = {
    "Phụ lục I": ("VN_DECREE24_APP_I", "중점 화학공업 기본 화학물질"),
    "Phụ lục II": ("VN_DECREE24_APP_II", "조건부 생산·거래 화학물질"),
    "Phụ lục III": ("VN_DECREE24_APP_III", "특별 통제 대상 화학물질(마약류 전구체 포함)"),
    "Phụ lục IV": ("VN_DECREE24_APP_IV", "사고예방·대응계획 대상 화학물질"),
}
OWNED = tuple(code for code, _ in APPENDIX.values())


def parse_decree24() -> Iterable[Row]:
    """평문 표라 'IUPAC명 / 베트남명 / CAS / 화학식' 순서로 나열된다. CAS 두 토큰 앞을 물질명으로 쓴다."""
    with ro(jurisdiction_db("vnm")) as c:
        rows = c.execute(
            "SELECT section, content FROM documents WHERE instrument = 'vnm_decree_24_2026' ORDER BY id"
        ).fetchall()
    for section, text in rows:
        key = (section or "").strip()
        if key not in APPENDIX:
            continue
        code, label = APPENDIX[key]
        tokens = [t.strip() for t in re.split(r"\s/\s|\n", text) if t.strip()]
        for i, tok in enumerate(tokens):
            if not cas_valid(tok):
                continue
            name = tokens[i - 2] if i >= 2 and not cas_valid(tokens[i - 2]) else ""
            yield Row(tok, code, label, "Vietnam Decree 24/2026/ND-CP", name)


PARSERS = {"vn_decree24": parse_decree24}
