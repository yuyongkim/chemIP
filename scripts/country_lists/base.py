"""파서 공용: 행 형식, CAS 체크섬, 읽기 전용 DB 연결, EPC 경로."""
from __future__ import annotations

import os
import re
import sqlite3
from dataclasses import dataclass
from pathlib import Path

EPC_ROOT = Path(os.environ.get("EPC_ROOT", Path.home() / "Desktop" / "EPC engineering"))
CAS_RE = re.compile(r"(?<![\d-])(\d{2,7})-(\d{2})-(\d)(?![\d-])")


@dataclass(frozen=True)
class Row:
    cas_no: str
    regulation: str
    detail: str
    source: str
    chemical_name: str


def cas_valid(cas: str) -> bool:
    """CAS 체크섬 검증. 표 파싱 오탐(날짜·번호)을 걸러낸다."""
    m = CAS_RE.fullmatch(cas)
    if not m:
        return False
    digits = (m.group(1) + m.group(2))[::-1]
    return sum(int(d) * (i + 1) for i, d in enumerate(digits)) % 10 == int(m.group(3))


def ro(path: Path) -> sqlite3.Connection:
    return sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)


def ecfr_db() -> Path:
    return EPC_ROOT / "datasets" / "ecfr_rag" / "ecfr_local_rag.sqlite3"


def jurisdiction_db(code: str) -> Path:
    return EPC_ROOT / "datasets" / "jurisdictions" / code / "index" / f"{code}_local_rag.sqlite3"


def kosha_db() -> Path:
    return EPC_ROOT / "datasets" / "kosha_rag" / "kosha_local_rag.sqlite3"
