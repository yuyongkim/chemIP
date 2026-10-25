"""KIPRIS Plus 이용약관 제19조 대응 — 노출 방식 스위치와 KIPRIS 바로가기 링크.

제19조는 한국특허정보원의 서면 허락 없이 검색 결과를 제3자에게 제공하거나 가공하는 것을
금지한다. 운영자가 코드 수정 없이 바꿀 수 있도록 두 설정을 둔다(.env):

* ``KIPRIS_PUBLIC_DISPLAY`` (기본 true) — false 이면 검색 결과 목록 대신
  "KIPRIS에서 보기" 링크만 돌려준다(KIPRIS Plus 호출 자체를 하지 않는다).
* ``KIPRIS_IN_AI`` (기본 true) — false 이면 AI 근거 수집에서 KIPRIS 를 뺀다.

설정값은 호출 시점에 ``settings`` 에서 읽는다(테스트에서 바꿔 끼울 수 있게).
"""

from __future__ import annotations

from urllib.parse import quote

from backend.config.settings import settings

KIPRIS_SEARCH_URL = "https://www.kipris.or.kr/khome/search/searchResult.do?queryText={q}"
KIPRIS_LINK_LABEL = "KIPRIS에서 보기"
DISPLAY_FULL = "full"
DISPLAY_LINK_ONLY = "link_only"


def public_display_enabled() -> bool:
    return bool(settings.KIPRIS_PUBLIC_DISPLAY)


def ai_evidence_enabled() -> bool:
    return bool(settings.KIPRIS_IN_AI)


def display_mode() -> str:
    return DISPLAY_FULL if public_display_enabled() else DISPLAY_LINK_ONLY


def search_link(query: str) -> str:
    return KIPRIS_SEARCH_URL.format(q=quote((query or "").strip(), safe=""))


def policy() -> dict:
    return {
        "display_mode": display_mode(),
        "kipris_public_display": public_display_enabled(),
        "kipris_in_ai": ai_evidence_enabled(),
        "link_label": KIPRIS_LINK_LABEL,
    }


KIPRIS_EVIDENCE_TYPE = "kipris_patent"


def contains_kipris_evidence(result: dict | None) -> bool:
    """True when a stored AI result cites KIPRIS rows (``sources[].type``)."""
    sources = (result or {}).get("sources") or []
    return any(isinstance(s, dict) and s.get("type") == KIPRIS_EVIDENCE_TYPE for s in sources)


def link_only_search(query: str, page: int, limit: int) -> dict:
    """Search response shape with no KIPRIS rows — only a deep link to KIPRIS."""
    return {
        "query": query,
        "results": [],
        "total": 0,
        "page": page,
        "limit": limit,
        "total_pages": 0,
        "display_mode": DISPLAY_LINK_ONLY,
        "kipris_link": search_link(query),
        "link_label": KIPRIS_LINK_LABEL,
    }


def link_only_detail(application_number: str) -> dict:
    return {
        "applicationNumber": application_number,
        "display_mode": DISPLAY_LINK_ONLY,
        "kipris_link": search_link(application_number),
        "link_label": KIPRIS_LINK_LABEL,
    }
