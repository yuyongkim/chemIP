import logging
import socket
from typing import Any, Dict

import requests

from backend.api.http_client import safe_get
from backend.config.settings import settings

logger = logging.getLogger(__name__)


class KoshaMsdsAdapter:
    def __init__(self):
        self.base_url = settings.KOSHA_API_URL
        self.fallback_url = settings.KOSHA_FALLBACK_API_URL
        self.service_key = settings.KOSHA_SERVICE_KEY
        self._use_fallback = False

    def _is_primary_reachable(self, timeout: float = 2.0) -> bool:
        try:
            sock = socket.create_connection(("msds.kosha.or.kr", 443), timeout=timeout)
            sock.close()
            return True
        except (OSError, socket.timeout):
            return False

    def _get_base_url(self) -> str:
        if self._use_fallback:
            return self.fallback_url
        if not self._is_primary_reachable():
            logger.info("KOSHA primary unreachable, switching to data.go.kr fallback")
            self._use_fallback = True
            return self.fallback_url
        return self.base_url

    def _try_request(self, path: str, params: dict) -> Dict[str, Any]:
        """Try primary URL first, fall back to data.go.kr on failure."""
        urls_to_try = []
        if not self._use_fallback:
            urls_to_try.append(self.base_url)
        urls_to_try.append(self.fallback_url)

        last_error = None
        for base in urls_to_try:
            url = f"{base}/{path}"
            try:
                response = safe_get(url, params=params)
                response.raise_for_status()
                if base == self.fallback_url and not self._use_fallback:
                    logger.info("Fallback succeeded, caching preference")
                    self._use_fallback = True
                return {"status": "success", "data": response.text, "source": base}
            except (requests.Timeout, requests.ConnectionError) as e:
                last_error = e
                logger.debug("Failed on %s: %s", base, e)
                continue
            except Exception as e:
                last_error = e
                logger.debug("Error on %s: %s", base, e)
                continue

        logger.error("All KOSHA endpoints failed: %s", last_error)
        return {"status": "error", "message": f"All endpoints failed: {last_error}"}

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
        result = self._try_request("chemlist", params)
        if result["status"] == "success":
            logger.info("KOSHA MSDS search for '%s': success (via %s)", keyword, result.get("source", ""))
        return result

    def get_msds_detail(self, chem_id: str, section_seq: int = 1) -> Dict[str, Any]:
        """MSDS 상세 정보 조회 (1~16 항목)

        :param chem_id: 화학물질 ID (예: 001008)
        :param section_seq: 항목 번호 (1~16)
        """
        endpoint = f"getChemDetail{section_seq:02d}"
        params = {
            "serviceKey": self.service_key,
            "chemId": chem_id,
        }
        result = self._try_request(endpoint, params)
        if result["status"] == "success":
            logger.info("KOSHA MSDS detail for '%s' sec %s: success (via %s)",
                        chem_id, section_seq, result.get("source", ""))
        return result
