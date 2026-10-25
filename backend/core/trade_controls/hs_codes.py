"""CAS -> HS 품목번호(HS6 / EU CN8 / 한국 HSK10) 조회. 원천은 hs_codes.sqlite (읽기 전용).

테이블: cas_hs(cas, hs6, cn8, hsk10, description, source), 선택 hs6_heading(hs6, title_en, title_ko), meta(key, value).
선택 뷰 v_cas_hsk10_candidates(cas, hs6, hsk10, name_ko, name_en): 관세청이 CAS->HSK 대응을 내지 않아
같은 HS6 아래 HSK10 줄을 "후보"로만 보여 준다.
"""
from __future__ import annotations

import logging
import sqlite3
from pathlib import Path

from backend.core.trade_controls import paths

logger = logging.getLogger(__name__)

# meta 중 화면에 내보낼 키(출처·버전·라이선스·주의). 수집 원본 경로 같은 내부 값은 내보내지 않는다.
_PUBLIC_META_SUFFIXES = ("_version", "_license", "_url", "_note", "_legal_basis")
_PUBLIC_META_KEYS = ("retrieved",)


def _connect(path: Path) -> sqlite3.Connection | None:
    if not path.is_file():
        return None
    conn = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def _has_table(conn: sqlite3.Connection, table: str) -> bool:
    return conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone() is not None


def lookup(cas: str) -> list[dict]:
    """CAS 하나의 HS 코드 행들. 파일이 없거나 형식이 다르면 빈 목록."""
    conn = _connect(paths.file_path(paths.HS_DB_FILE))
    if conn is None:
        return []
    try:
        if not _has_table(conn, "cas_hs"):
            return []
        if _has_table(conn, "hs6_heading"):
            sql = ("SELECT c.cas, c.hs6, c.cn8, c.hsk10, c.description, c.source, h.title_en, h.title_ko "
                   "FROM cas_hs c LEFT JOIN hs6_heading h ON h.hs6 = c.hs6 WHERE c.cas = ?")
        else:
            sql = "SELECT cas, hs6, cn8, hsk10, description, source FROM cas_hs WHERE cas = ?"
        rows = [dict(r) for r in conn.execute(sql, (cas,)).fetchall()]
    except sqlite3.Error as exc:
        logger.warning("trade_controls: hs_codes 조회 실패: %s", exc)
        return []
    finally:
        conn.close()
    return [{k: (v if v is not None else "") for k, v in r.items()} for r in rows]


def meta() -> dict[str, str]:
    """출처·버전·라이선스 같은 meta 표 내용(공개 키만)."""
    conn = _connect(paths.file_path(paths.HS_DB_FILE))
    if conn is None:
        return {}
    try:
        if not _has_table(conn, "meta"):
            return {}
        rows = conn.execute("SELECT key, value FROM meta").fetchall()
        return {
            str(r["key"]): str(r["value"]) for r in rows
            if str(r["key"]) in _PUBLIC_META_KEYS or str(r["key"]).endswith(_PUBLIC_META_SUFFIXES)
        }
    except sqlite3.Error:
        return {}
    finally:
        conn.close()


def hsk10_candidates(cas: str, limit: int = 30) -> list[dict]:
    """같은 HS6 아래 한국 HSK10 후보. 뷰가 없으면 빈 목록."""
    conn = _connect(paths.file_path(paths.HS_DB_FILE))
    if conn is None:
        return []
    try:
        if conn.execute("SELECT 1 FROM sqlite_master WHERE type='view' AND name='v_cas_hsk10_candidates'").fetchone() is None:
            return []
        rows = conn.execute(
            "SELECT DISTINCT hs6, hsk10, name_ko, name_en FROM v_cas_hsk10_candidates WHERE cas = ? ORDER BY hsk10 LIMIT ?",
            (cas, limit),
        ).fetchall()
    except sqlite3.Error as exc:
        logger.warning("trade_controls: HSK10 후보 조회 실패: %s", exc)
        return []
    finally:
        conn.close()
    return [{k: (r[k] if r[k] is not None else "") for k in r.keys()} for r in rows]
