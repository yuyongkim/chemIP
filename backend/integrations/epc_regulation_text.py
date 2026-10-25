"""EPC engineering 의 관할별 규제 본문 검색(127.0.0.1:15412)으로 물질의 근거 조문을 찾는다.

ChemIP 목록은 "등재되어 있다"까지만 알려 준다. 여기서는 그 나라 법령 본문 중 해당 물질을 다루는 조문을
하이브리드 검색으로 찾아 원문 발췌·출처 URL 과 함께 돌려준다. 서비스가 꺼져 있으면 available=False.
"""
from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any

from backend.api.http_client import get_http_session
from backend.integrations.sources import EPC_QUERY_URL

logger = logging.getLogger(__name__)

# ChemIP 국가 코드(intl_regulatory_store.REGULATION_LABELS) → EPC 관할 인덱스 코드
EPC_JURISDICTION = {"KR": "kor", "US": "usa", "EU": "eu", "NL": "nld", "MX": "mex", "IN": "india", "PK": "pak", "VN": "vnm"}
SNIPPET_CHARS = 600
TIMEOUT_SECONDS = 40


@lru_cache(maxsize=512)
def _search(query: str, jurisdiction: str, top_k: int) -> tuple[dict[str, Any], ...]:
    resp = get_http_session(max_retries=0).post(
        f"{EPC_QUERY_URL}/jurisdictions/query",
        json={"query": query, "jurisdictions": [jurisdiction], "top_k": top_k, "mode": "hybrid"},
        timeout=TIMEOUT_SECONDS,
    )
    resp.raise_for_status()
    hits = resp.json().get("results", {}).get(jurisdiction, [])
    return tuple(
        {
            "reference": h.get("reference_code", ""), "instrument": h.get("instrument_title", ""),
            "amended_on": h.get("amended_on", ""), "language": h.get("language", ""),
            "authoritative": h.get("authoritative"),
            "snippet": " ".join((h.get("snippet") or "").split())[:SNIPPET_CHARS],
            "source_url": h.get("source_url", ""),
        }
        for h in hits
    )


def find_provisions(country: str, cas: str, name: str = "", top_k: int = 4) -> dict[str, Any]:
    jurisdiction = EPC_JURISDICTION.get(country.upper())
    if not jurisdiction:
        return {"country": country, "available": False, "reason": "no_epc_index", "hits": []}
    query = " ".join(p for p in (name.strip(), cas.strip()) if p)
    try:
        hits = list(_search(query, jurisdiction, top_k))
    except Exception as exc:  # 서비스 미기동·시간 초과: 화면은 안내만 하고 나머지 패널은 계속 보인다
        logger.warning("EPC regulation text query failed: %s", exc)
        return {"country": country, "available": False, "reason": "service_unavailable", "hits": []}
    return {"country": country, "jurisdiction": jurisdiction, "query": query, "available": True, "hits": hits}
