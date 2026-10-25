"""물질 쪽 사실: NCIS 분류(유독물질·사고대비물질 등)와 국가별 규제 목록 등재 코드. 읽기 전용.

규칙 평가(rules.py)는 여기서 모은 값만 본다.
"""
from __future__ import annotations

import json
import logging
import sqlite3
from typing import Any

from backend.config.settings import settings
from backend.core.intl_regulatory_store import get_by_cas as get_international_by_cas

logger = logging.getLogger(__name__)

_SUBCATEGORY_SUFFIX = " 세분류"  # "제한물질 세분류" 도 "제한물질" 로 본다


def base_category(name: str) -> str:
    name = (name or "").strip()
    return name[: -len(_SUBCATEGORY_SUFFIX)].strip() if name.endswith(_SUBCATEGORY_SUFFIX) else name


def ncis_record(cas: str) -> dict[str, Any]:
    """terminology.db ncis_substance 한 행. 없으면 빈 dict."""
    try:
        conn = sqlite3.connect(f"file:{settings.TERMINOLOGY_DB_PATH}?mode=ro", uri=True)
    except sqlite3.Error as exc:
        logger.warning("trade_controls: terminology.db 를 열지 못했습니다: %s", exc)
        return {}
    try:
        row = conn.execute(
            "SELECT name_kor, name_eng, classifications FROM ncis_substance WHERE cas_no = ?", (cas,)
        ).fetchone()
    except sqlite3.Error:
        return {}
    finally:
        conn.close()
    if not row:
        return {}
    try:
        raw = json.loads(row[2] or "[]")
    except ValueError:
        raw = []
    classes = [
        {
            "category": base_category(c.get("sbstnClsfTypeNm", "")),
            "category_raw": (c.get("sbstnClsfTypeNm") or "").strip(),
            "unq_no": (c.get("unqNo") or "").strip(),
            "content": (c.get("contInfo") or "").strip(),
            "exception": (c.get("excpInfo") or "").strip(),
            "announcement": (c.get("ancmntInfo") or "").strip(),
        }
        for c in raw if isinstance(c, dict)
    ]
    return {"name_ko": (row[0] or "").strip(), "name_en": (row[1] or "").strip(), "classifications": classes}


def intl_listings(cas: str) -> dict[str, Any]:
    """intl_regulatory 등재 내역(국가별). 조회 실패 시 빈 구조."""
    try:
        return get_international_by_cas(cas)
    except Exception as exc:  # DB 잠김 등으로 화면 전체가 죽지 않게 한다
        logger.warning("trade_controls: 국가별 목록 조회 실패: %s", exc)
        return {"cas_no": cas, "count": 0, "jurisdictions": {}}


def regulation_codes(intl: dict[str, Any]) -> set[str]:
    """intl 결과에 들어 있는 규제 코드(ROTTERDAM_PIC 등) 집합."""
    return {item.get("regulation", "") for items in (intl.get("jurisdictions") or {}).values() for item in items} - {""}
