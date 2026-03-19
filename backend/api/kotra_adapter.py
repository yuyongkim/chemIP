import json
import logging
import re
import xml.etree.ElementTree as ET
from html import unescape
from typing import Any, Dict, Optional

import requests

from backend.api.http_client import safe_get
from backend.config.settings import settings

logger = logging.getLogger(__name__)


def _coalesce(*values):
    for value in values:
        if value is None:
            continue
        if isinstance(value, str) and value.strip() == "":
            continue
        return value
    return ""


class KotraAdapter:
    def __init__(self):
        self.kotra_key = settings.KOTRA_SERVICE_KEY
        self.tourism_key = _coalesce(settings.TOURISM_API_KEY_DECODED, self.kotra_key)

    def _normalize_text(self, obj):
        if isinstance(obj, str):
            text = obj.strip()
            if not text:
                return ""
            try:
                repaired = text.encode("latin1").decode("utf-8")
                if re.search(r"[가-힣]", repaired) and not re.search(r"[가-힣]", text):
                    return repaired
            except Exception:
                pass
            return unescape(text)
        if isinstance(obj, list):
            return [self._normalize_text(item) for item in obj]
        if isinstance(obj, dict):
            return {key: self._normalize_text(value) for key, value in obj.items()}
        return obj

    def _parse_json(self, raw: str) -> Dict[str, Any]:
        try:
            if not raw:
                return {}
            return self._normalize_text(json.loads(raw))
        except Exception:
            return {}

    def _parse_xml(self, raw: bytes) -> Dict[str, Any]:
        try:
            root = ET.fromstring(raw)
            return self._element_to_dict(root)
        except Exception:
            return {}

    def _element_to_dict(self, element: ET.Element) -> Any:
        if len(element) == 0:
            text = element.text.strip() if element.text else ""
            return self._normalize_text(text)
        result: Dict[str, Any] = {}
        for child in element:
            child_value = self._element_to_dict(child)
            if child.tag in result:
                if not isinstance(result[child.tag], list):
                    result[child.tag] = [result[child.tag]]
                result[child.tag].append(child_value)
            else:
                result[child.tag] = child_value
        if element.attrib:
            result.update({f"@{k}": self._normalize_text(v) for k, v in element.attrib.items()})
        return result

    def _extract_items(self, data: Dict[str, Any]) -> tuple[list[Any], int]:
        if not isinstance(data, dict):
            return [], 0

        items = []
        total = 0
        response = data.get("response", data)

        if isinstance(response, dict):
            header = response.get("header")
            if isinstance(header, dict):
                result_code = str(header.get("resultCode", ""))
                if result_code and result_code != "00":
                    result_msg = header.get("resultMsg", "")
                    return [], 0

            body = response.get("body", response)
        else:
            body = data

        if isinstance(body, dict):
            if isinstance(body.get("items"), dict):
                nested = body["items"]
                if isinstance(nested, dict) and "item" in nested:
                    items = nested["item"]
            elif "items" in body:
                items = body["items"]
            elif "itemList" in body:
                items = body["itemList"]
            elif isinstance(body.get("item"), list):
                items = body["item"]
            elif isinstance(body.get("item"), dict):
                items = [body["item"]]
            else:
                candidate = body.get("itemList", body.get("item", body.get("items")))
                if isinstance(candidate, list):
                    items = candidate
                elif isinstance(candidate, dict):
                    items = [candidate]

            if isinstance(body.get("totalCount"), (int, str)):
                try:
                    total = int(body.get("totalCount", 0))
                except Exception:
                    total = 0
            if isinstance(body.get("totalCnt"), (int, str)):
                try:
                    total = int(body.get("totalCnt", 0))
                except Exception:
                    pass
            if isinstance(body.get("numOfRows"), (int, str)) and total == 0 and isinstance(body.get("pageNo"), (int, str)):
                total = len(items)

        if isinstance(items, dict):
            items = items.get("item", [])
        if isinstance(items, dict):
            items = [items]
        if not isinstance(items, list):
            items = []

        return [self._normalize_text(item) for item in items], total or len(items)

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

    def _map_product_news(self, item: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "newsTitl": item.get("newsTitl", "") or item.get("sj", "") or item.get("title", ""),
            "cntryNm": item.get("cntryNm", "") or item.get("natNm", ""),
            "newsWrtDt": item.get("newsWrtDt", "") or item.get("regDt", "") or item.get("writedate", ""),
            "kotraNewsUrl": item.get("kotraNewsUrl", "") or item.get("newsUrl", "") or item.get("url", ""),
            "newsBdt": item.get("newsBdt", "") or item.get("cntntSumar", "") or item.get("summary", ""),
            "cntntSumar": item.get("cntntSumar", "") or item.get("summary", ""),
            "source": item.get("source", "KOTRA"),
        }

    def _map_strategy(self, item: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "title": item.get("title", "") or item.get("newsTitl", ""),
            "country": item.get("country", "") or item.get("cntryNm", "") or item.get("natNm", ""),
            "date": item.get("date", "") or item.get("newsWrtDt", "") or item.get("regDt", ""),
            "url": item.get("url", "") or item.get("newsUrl", "") or item.get("kotraNewsUrl", ""),
            "summary": item.get("summary", "") or item.get("cntntSumar", "") or item.get("newsBdt", ""),
            "source": item.get("source", "KOTRA"),
        }

    def _map_price(self, item: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "itemName": item.get("itemName", "") or item.get("itemNm", "") or item.get("cmdltNm", ""),
            "price": item.get("price", "") or item.get("itemPrc", ""),
            "unit": item.get("unit", "") or item.get("untNm", ""),
            "country": item.get("country", "") or item.get("cntryNm", "") or item.get("natNm", ""),
            "currency": item.get("currency", "") or item.get("mnyUtNm", ""),
            "category": item.get("category", "") or item.get("ctgryNm", ""),
            "date": item.get("date", "") or item.get("regDt", ""),
            "url": item.get("url", "") or item.get("newsUrl", ""),
            "source": item.get("source", "KOTRA"),
        }

    def _map_fraud(self, item: Dict[str, Any]) -> Dict[str, Any]:
        plain = self._html_to_text(item.get("bdtCntnt", "") or item.get("cntntSumar", "") or item.get("content", ""))
        country = item.get("cntryNm", "") or self._extract_labeled_value(plain, ["발생국가", "국가"])
        period = item.get("regDt", "") or self._extract_labeled_value(plain, ["발생시기", "시기"])
        amount = self._extract_labeled_value(plain, ["피해금액", "금액"])
        source_url = item.get("kotraNewsUrl", "") or item.get("newsUrl", "") or item.get("url", "")
        return {
            "title": item.get("title", "") or item.get("newsTitl", "") or "무역 사기 사례",
            "content": item.get("bdtCntnt", "") or item.get("cntntSumar", ""),
            "plainText": plain,
            "date": period,
            "incidentPeriod": period,
            "country": country,
            "amount": amount,
            "category": item.get("ctgryNm", "") or self._infer_fraud_category(plain),
            "url": source_url,
            "source": item.get("source", "KOTRA"),
        }

    def _html_to_text(self, html_text: str) -> str:
        text = html_text or ""
        text = re.sub(r"(?i)<br\s*/?>", "\n", text)
        text = re.sub(r"(?i)</p>", "\n", text)
        text = re.sub(r"<[^>]+>", "", text)
        text = unescape(text)
        text = re.sub(r"\r\n?", "\n", text)
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{2,}", "\n", text)
        return text.strip()

    def _extract_labeled_value(self, text: str, labels: list[str]) -> str:
        for label in labels:
            match = re.search(rf"{re.escape(label)}\s*[:：]?\s*([^\n]+)", text)
            if match:
                return match.group(1).strip()
        return ""

    def _infer_fraud_category(self, text: str) -> str:
        if not text:
            return ""
        rules = [
            ("비자/초청", ["비자", "초청장", "불법 체류"]),
            ("결제/송금", ["송금", "결제", "T/T", "입금"]),
            ("물류/선적", ["선적", "물류비", "운송", "배송"]),
            ("사칭/위장 바이어", ["사칭", "위장", "가짜", "악용"]),
        ]
        for label, terms in rules:
            if any(term in text for term in terms):
                return label
        return "기타"

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

    def _map_country_info(self, item: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "countryCode": item.get("isoWd2CntCd", "") or item.get("nat2CntCd", ""),
            "countryName": item.get("natnNm", "") or item.get("countryName", ""),
            "title": item.get("subject", "") or item.get("title", ""),
            "summary": item.get("overview", "") or item.get("content", ""),
            "source": "KOTRA National Info",
        }

    def _map_import_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "hsCode": item.get("hscd", "") or item.get("HSCD", ""),
            "productName": item.get("cmdltName", "") or item.get("productName", ""),
            "regulation": item.get("reglCn", "") or item.get("regulation", ""),
            "country": item.get("probeTgtNatName", "") or item.get("HQURT_NAME", ""),
            "startDate": item.get("regStrDe", "") or item.get("REGL_STR_DE", ""),
            "endDate": item.get("regEndDe", "") or item.get("REGL_END_DE", ""),
            "source": "KOTRA Import Regulation",
        }

    def _map_enterprise_success(self, item: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "title": item.get("titl", "") or item.get("title", ""),
            "country": item.get("natnNm", "") or item.get("country", ""),
            "summary": item.get("cn", "") or item.get("summary", ""),
            "industry": item.get("indust", "") or item.get("industry", ""),
            "company": item.get("entpNm", "") or item.get("company", ""),
            "date": item.get("regDt", "") or item.get("date", ""),
            "source": "KOTRA Enterprise Success",
        }


