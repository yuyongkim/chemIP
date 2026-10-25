"""KOSHA MSDS OpenAPI client.

Routes are tried in the order of ``settings.KOSHA_MSDS_ROUTES`` (profiles in
``kosha_msds_routes.py``). The default first route is the data.go.kr 15157612
service; the older routes are fallbacks used only when it fails.
"""

import logging
import re
import threading
import time
from typing import Any, Dict

from backend.api.http_client import safe_get
from backend.api.kosha_msds_routes import KoshaRoute, resolve_routes
from backend.config.settings import settings

logger = logging.getLogger(__name__)

# A route that failed is skipped for this long (unless it is the only one left).
ROUTE_COOLDOWN_SECONDS = 300

_RESULT_CODE_RE = re.compile(r"<resultCode>\s*([^<\s]+)\s*</resultCode>")


def _response_error(text: str) -> str | None:
    """Return why a 200 response is not a usable KOSHA answer, or None if it is."""
    match = _RESULT_CODE_RE.search(text or "")
    if not match:
        return "no resultCode in response"
    if match.group(1) != "00":
        return f"resultCode {match.group(1)}"
    return None


class KoshaMsdsAdapter:
    def __init__(self, route_names: list[str] | None = None):
        self.routes: list[KoshaRoute] = resolve_routes(route_names or settings.KOSHA_MSDS_ROUTES)
        self.service_key = settings.KOSHA_SERVICE_KEY
        self._failed_until: dict[str, float] = {}
        self._lock = threading.Lock()
        # Kept for callers/scripts that read these attributes.
        self.base_url = self.routes[0].base_url
        self.fallback_url = self.routes[1].base_url if len(self.routes) > 1 else ""

    def _ordered_routes(self) -> list[KoshaRoute]:
        now = time.monotonic()
        with self._lock:
            ready = [r for r in self.routes if self._failed_until.get(r.name, 0) <= now]
            cooling = [r for r in self.routes if r not in ready]
        return ready + cooling

    def _mark(self, route: KoshaRoute, ok: bool) -> None:
        with self._lock:
            if ok:
                self._failed_until.pop(route.name, None)
            else:
                self._failed_until[route.name] = time.monotonic() + ROUTE_COOLDOWN_SECONDS

    def _try_request(self, url_for, params: dict) -> Dict[str, Any]:
        """Try each configured route in turn; return the first valid answer."""
        errors: list[str] = []
        for route in self._ordered_routes():
            url = url_for(route)
            try:
                response = safe_get(url, params=params)
                response.raise_for_status()
                problem = _response_error(response.text)
                if problem:
                    raise ValueError(problem)
            except Exception as exc:  # network, HTTP, or API-level error
                self._mark(route, ok=False)
                errors.append(f"{route.name}: {type(exc).__name__}: {exc}"[:200])
                logger.debug("KOSHA route %s failed: %s", route.name, exc)
                continue
            self._mark(route, ok=True)
            return {"status": "success", "data": response.text, "source": route.base_url, "route": route.name}

        logger.error("All KOSHA routes failed: %s", "; ".join(errors))
        return {"status": "error", "message": "All KOSHA routes failed: " + "; ".join(errors)}

    def search_msds(
        self,
        keyword: str,
        page_no: int = 1,
        num_of_rows: int = 10,
        search_condition: int = 0,
    ) -> Dict[str, Any]:
        """화학물질명 또는 CAS No.로 MSDS 검색

        :param search_condition: 0(국문명), 1(CAS No), 2(UN No), 3(KE No), 4(EN No)
        """
        params = {
            "serviceKey": self.service_key,
            "searchWrd": keyword,
            "searchCnd": search_condition,
            "numOfRows": num_of_rows,
            "pageNo": page_no,
        }
        result = self._try_request(lambda r: r.list_url(), params)
        if result["status"] == "success":
            logger.info("KOSHA MSDS search for '%s': success (via %s)", keyword, result.get("route", ""))
        return result

    def get_msds_detail(self, chem_id: str, section_seq: int = 1) -> Dict[str, Any]:
        """MSDS 상세 정보 조회 (1~16 항목)

        :param chem_id: 화학물질 ID (예: 001008)
        :param section_seq: 항목 번호 (1~16)
        """
        params = {
            "serviceKey": self.service_key,
            "chemId": chem_id,
        }
        result = self._try_request(lambda r: r.detail_url(section_seq), params)
        if result["status"] == "success":
            logger.info("KOSHA MSDS detail for '%s' sec %s: success (via %s)",
                        chem_id, section_seq, result.get("route", ""))
        return result
