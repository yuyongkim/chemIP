import logging
from typing import Any, Dict

import requests

from backend.api.http_client import safe_get
from backend.config.settings import settings

logger = logging.getLogger(__name__)


class KoshaMsdsAdapter:
    def __init__(self):
        self.base_url = settings.KOSHA_API_URL
        self.service_key = settings.KOSHA_SERVICE_KEY

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
        url = f"{self.base_url}/chemlist"
        params = {
            "serviceKey": self.service_key,
            "searchWrd": keyword,
            "searchCnd": search_condition,
            "numOfRows": num_of_rows,
            "pageNo": page_no,
        }
        try:
            response = safe_get(url, params=params)
            response.raise_for_status()
            logger.info("KOSHA MSDS search for '%s': success", keyword)
            return {"status": "success", "data": response.text}
        except requests.Timeout:
            logger.warning("KOSHA MSDS search timeout for '%s'", keyword)
            return {"status": "error", "message": "Request timeout"}
        except requests.ConnectionError as e:
            logger.error("KOSHA MSDS connection error: %s", e)
            return {"status": "error", "message": f"Connection error: {e}"}
        except Exception as e:
            logger.error("KOSHA MSDS search error: %s", e)
            return {"status": "error", "message": str(e)}

    def get_msds_detail(self, chem_id: str, section_seq: int = 1) -> Dict[str, Any]:
        """MSDS 상세 정보 조회 (1~16 항목)

        :param chem_id: 화학물질 ID (예: 001008)
        :param section_seq: 항목 번호 (1~16)
        """
        endpoint = f"chemdetail{section_seq:02d}"
        url = f"{self.base_url}/{endpoint}"
        params = {
            "serviceKey": self.service_key,
            "chemId": chem_id,
        }
        try:
            response = safe_get(url, params=params)
            response.raise_for_status()
            logger.info("KOSHA MSDS detail for '%s' section %s: success", chem_id, section_seq)
            return {"status": "success", "data": response.text}
        except requests.Timeout:
            logger.warning("KOSHA MSDS detail timeout for '%s' section %s", chem_id, section_seq)
            return {"status": "error", "message": "Request timeout"}
        except requests.ConnectionError as e:
            logger.error("KOSHA MSDS detail connection error: %s", e)
            return {"status": "error", "message": f"Connection error: {e}"}
        except Exception as e:
            logger.error("KOSHA MSDS detail error: %s", e)
            return {"status": "error", "message": str(e)}

