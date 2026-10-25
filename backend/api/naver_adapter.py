"""NAVER 뉴스 검색 API client.

NAVER 개발자센터 검색 API 이용약관(2.1~2.4) 준수 사항 — 이 모듈이 지키는 것:
* 결과는 받은 필드 그대로 돌려준다(KOTRA 형식으로 바꾸지 않는다).
* 각 항목에 ``source="naver"`` 와 표시용 ``source_label`` 을 붙여 출처를 구분한다.
* 응답은 메모리 캐시에만 짧게(``NAVER_TEMP_CACHE_SECONDS``) 둔다. DB·파일 저장 금지.
* AI·근거 수집 경로(backend/core/evidence_collector.py, report_builder.py,
  backend/api/routes/ai.py)는 이 모듈을 쓰지 않는다 — tests/test_naver_compliance.py.
"""

from backend.api.http_client import safe_get
from backend.config.settings import settings

NAVER_SOURCE = "naver"
NAVER_SOURCE_LABEL = "네이버 검색결과"
NAVER_PROVIDER_URL = "https://developers.naver.com/products/service-api/search/search.md"
# In-memory only (http_client._response_cache); well under the 21-day temp limit.
NAVER_TEMP_CACHE_SECONDS = 600

# Fields passed through exactly as NAVER returns them.
_PASS_THROUGH_FIELDS = ("title", "originallink", "link", "description", "pubDate")


def _empty(status: str, message: str) -> dict:
    return {
        "status": status, "data": [], "total": 0, "message": message,
        "source": NAVER_SOURCE, "source_label": NAVER_SOURCE_LABEL,
    }


def to_naver_item(raw: dict) -> dict:
    """Keep NAVER's own fields unmodified and add the source markers."""
    item = {key: raw.get(key, "") for key in _PASS_THROUGH_FIELDS}
    item["source"] = NAVER_SOURCE
    item["source_label"] = NAVER_SOURCE_LABEL
    return item


class NaverAdapter:
    def __init__(self):
        self.client_id = settings.NAVER_CLIENT_ID
        self.client_secret = settings.NAVER_CLIENT_SECRET
        self.base_url = "https://openapi.naver.com/v1/search/news.json"

    def search_news(self, keyword: str, start: int = 1, display: int = 10, sort: str = "date") -> dict:
        if not self.client_id or not self.client_secret:
            return _empty("disabled", "NAVER API key is not configured")

        headers = {
            "X-Naver-Client-Id": self.client_id,
            "X-Naver-Client-Secret": self.client_secret,
        }
        params = {
            "query": keyword,
            "display": max(1, min(display, 100)),
            "start": max(1, start),
            "sort": sort if sort in ("sim", "date") else "date",
        }

        try:
            resp = safe_get(self.base_url, params=params, headers=headers,
                            cache_ttl=NAVER_TEMP_CACHE_SECONDS)
            if resp.status_code != 200:
                return _empty("error", f"Naver API HTTP {resp.status_code}")
            data = resp.json()
            items = data.get("items", []) if isinstance(data, dict) else []
            mapped = [to_naver_item(it) for it in items if isinstance(it, dict)]
            return {
                "status": "success",
                "data": mapped,
                "total": data.get("total", len(mapped)),
                "source": NAVER_SOURCE,
                "source_label": NAVER_SOURCE_LABEL,
                "provider_url": NAVER_PROVIDER_URL,
            }
        except Exception as e:
            return _empty("error", str(e))
