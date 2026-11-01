"""KOTRA (data.go.kr B410001) and Korea Tour API client: one request helper + one search method per service.

Payload parsing: backend/api/kotra_parsing.py. Item mapping: backend/api/kotra_mappers.py.
The old private helper names (_parse_json, _map_fraud, ...) stay on the class as aliases.
"""
import logging
from typing import Any, Dict, Optional

import requests

from backend.api import kotra_mappers as M
from backend.api import kotra_parsing
from backend.api.http_client import safe_get
from backend.api.text_utils import coalesce, normalize_text
from backend.config.settings import settings

logger = logging.getLogger(__name__)


class KotraAdapter:

    # Old private names (pure helpers now in kotra_parsing / kotra_mappers).
    _parse_json = staticmethod(kotra_parsing.parse_json)
    _parse_xml = staticmethod(kotra_parsing.parse_xml)
    _element_to_dict = staticmethod(kotra_parsing.element_to_dict)
    _extract_items = staticmethod(kotra_parsing.extract_items)
    _map_product_news = staticmethod(M.map_product_news)
    _map_strategy = staticmethod(M.map_strategy)
    _map_price = staticmethod(M.map_price)
    _map_fraud = staticmethod(M.map_fraud)
    _map_country_info = staticmethod(M.map_country_info)
    _map_import_item = staticmethod(M.map_import_item)
    _map_enterprise_success = staticmethod(M.map_enterprise_success)
    _html_to_text = staticmethod(M.html_to_text)
    _extract_labeled_value = staticmethod(M.extract_labeled_value)
    _infer_fraud_category = staticmethod(M.infer_fraud_category)

    def _normalize_text(self, obj):
        return normalize_text(obj)

    def __init__(self):
        self.kotra_key = settings.KOTRA_SERVICE_KEY
        self.tourism_key = coalesce(settings.TOURISM_API_KEY_DECODED, self.kotra_key)

    def _request(
        self,
        url: str,
        params: Optional[Dict[str, Any]] = None,
        timeout: int = settings.HTTP_TIMEOUT_SECONDS,
        is_tourism: bool = False,
    ) -> Dict[str, Any]:
        if not self.kotra_key:
            return {"status": "error", "message": "KOTRA API key is not configured", "total": 0, "data": []}

        service_key = self.tourism_key if is_tourism else self.kotra_key
        request_params = {
            "serviceKey": service_key,
        }
        if is_tourism:
            request_params["_type"] = "json"
        else:
            request_params["type"] = "json"
        if params:
            request_params.update({k: v for k, v in params.items() if v is not None and v != ""})

        try:
            response = safe_get(url, params=request_params, timeout=timeout, verify=False)
            status_code = response.status_code

            if status_code == 404:
                return {"status": "error", "message": f"404 Not Found: {url}", "total": 0, "data": []}
            if status_code == 500:
                return {"status": "error", "message": "500 Internal Server Error from upstream", "total": 0, "data": []}
            if status_code >= 500:
                return {"status": "error", "message": f"Server Error ({status_code})", "total": 0, "data": []}
            if status_code != 200:
                return {"status": "error", "message": f"HTTP {status_code}", "total": 0, "data": []}

            payload = self._parse_json(response.text)
            if not payload:
                payload = self._parse_xml(response.content)

            items, total = self._extract_items(payload)
            return {"status": "success", "total": total, "data": items}
        except requests.Timeout:
            return {"status": "error", "message": "Timeout while calling KOTRA API", "total": 0, "data": []}
        except requests.RequestException as e:
            return {"status": "error", "message": f"Request failed: {e}", "total": 0, "data": []}
        except Exception as e:
            return {"status": "error", "message": f"Unexpected error: {e}", "total": 0, "data": []}

    def search_market_news(self, keyword: str, country: str = "", industry: str = "", page_no: int = 1, num_of_rows: int = 10) -> dict:
        result = self._request(
            settings.KOTRA_MARKET_NEWS_URL,
            {
                "search1": country,
                "search2": keyword,
                "search5": industry,
                "pageNo": page_no,
                "numOfRows": num_of_rows,
            },
        )
        if result["status"] == "success":
            result["data"] = [self._map_product_news(item) for item in result["data"]]
        return result

    def search_entry_strategy(self, country: str = "", page_no: int = 1, num_of_rows: int = 10) -> dict:
        result = self._request(
            settings.KOTRA_ENTRY_STRATEGY_URL,
            {"search1": country, "pageNo": page_no, "numOfRows": num_of_rows},
        )
        if result["status"] == "success":
            result["data"] = [self._map_strategy(item) for item in result["data"]]
        return result

    def search_price_info(self, country: str = "", page_no: int = 1, num_of_rows: int = 10) -> dict:
        result = self._request(
            settings.KOTRA_PRICE_INFO_URL,
            {"search1": country, "pageNo": page_no, "numOfRows": num_of_rows},
        )
        if result["status"] == "success":
            result["data"] = [self._map_price(item) for item in result["data"]]
        return result

    def search_fraud_cases(self, page_no: int = 1, num_of_rows: int = 10) -> dict:
        result = self._request(
            settings.KOTRA_FRAUD_CASE_URL,
            {"pageNo": page_no, "numOfRows": num_of_rows},
        )
        if result["status"] == "success":
            result["data"] = [self._map_fraud(item) for item in result["data"]]
        return result

    def search_overseas_market_news(self, country: str = "", keyword: str = "", page_no: int = 1, num_of_rows: int = 10) -> dict:
        return self.search_market_news(keyword=keyword, country=country, page_no=page_no, num_of_rows=num_of_rows)

    def search_national_information(self, iso_country_code: str, page_no: int = 1, num_of_rows: int = 10) -> dict:
        if not iso_country_code:
            return {"status": "error", "message": "iso_country_code required", "total": 0, "data": []}
        result = self._request(
            settings.KOTRA_NATIONAL_INFO_URL,
            {"isoWd2CntCd": iso_country_code, "pageNo": page_no, "numOfRows": num_of_rows},
        )
        if result["status"] == "success":
            result["data"] = [self._map_country_info(item) for item in result["data"]]
        return result

    def search_import_restriction_items(self, keyword: str = "", country_code: str = "", page_no: int = 1, num_of_rows: int = 10) -> dict:
        params: Dict[str, Any] = {
            "pageNo": page_no,
            "numOfRows": num_of_rows,
        }
        if keyword:
            params["search1"] = keyword
        if country_code:
            params["isoWd2CntCd"] = country_code
        result = self._request(
            settings.KOTRA_IMPORT_RESTRICTION_URL,
            params,
        )
        if result["status"] == "success":
            result["data"] = [self._map_import_item(item) for item in result["data"]]
        return result

    def search_enterprise_success_cases(self, keyword: str = "", country: str = "", page_no: int = 1, num_of_rows: int = 10) -> dict:
        params = {"pageNo": page_no, "numOfRows": num_of_rows}
        if keyword:
            params["search1"] = keyword
        if country:
            params["search2"] = country
        result = self._request(
            settings.KOTRA_ENTERPRISE_SUCCESS_URL,
            params,
        )
        if result["status"] == "success":
            result["data"] = [self._map_enterprise_success(item) for item in result["data"]]
        return result

    def search_tourism_korean(self, keyword: str = "", area_code: str = "", page_no: int = 1, num_of_rows: int = 10) -> dict:
        return self._request(
            settings.TOURISM_KOREAN_URL,
            {
                "MobileOS": "ETC",
                "MobileApp": "ChemIP",
                "pageNo": page_no,
                "numOfRows": num_of_rows,
                "keyword": keyword,
                "areaCode": area_code,
            },
            is_tourism=True,
        )

    def search_tourism_english(self, keyword: str = "", area_code: str = "", page_no: int = 1, num_of_rows: int = 10) -> dict:
        return self._request(
            settings.TOURISM_ENGLISH_URL,
            {
                "MobileOS": "ETC",
                "MobileApp": "ChemIP",
                "pageNo": page_no,
                "numOfRows": num_of_rows,
                "keyword": keyword,
                "areaCode": area_code,
            },
            is_tourism=True,
        )
