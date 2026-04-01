"""NCIS (한국환경공단 화학물질정보) adapter.

Source: data.go.kr B552584/kecoapi/ncissbstn
Provides: substance classification (유독물질, 허가대상, 사고대비), molecular formula/weight.
"""

import logging
from typing import Any, Dict

from backend.api.http_client import safe_get
from backend.config.settings import settings

logger = logging.getLogger(__name__)

NCIS_URL = "https://apis.data.go.kr/B552584/kecoapi/ncissbstn/chemSbstnList"


class NcisAdapter:
    def __init__(self):
        self.api_key = settings.KOSHA_SERVICE_KEY_DECODED

    def search_by_cas(self, cas_no: str) -> Dict[str, Any]:
        """Lookup substance by CAS number."""
        return self._search(search_gubun="2", search_nm=cas_no)

    def search_by_name(self, name: str) -> Dict[str, Any]:
        """Lookup substance by Korean/English name."""
        return self._search(search_gubun="1", search_nm=name)

    def _search(self, search_gubun: str, search_nm: str, num_of_rows: int = 10, page_no: int = 1) -> Dict[str, Any]:
        if not self.api_key:
            return {"status": "disabled", "message": "API key not configured"}

        params = {
            "serviceKey": self.api_key,
            "numOfRows": str(num_of_rows),
            "pageNo": str(page_no),
            "searchGubun": search_gubun,
            "searchNm": search_nm,
        }
        try:
            response = safe_get(NCIS_URL, params=params)
            response.raise_for_status()
            data = response.json()

            result_code = data.get("header", {}).get("resultCode", "")
            if str(result_code) != "200":
                msg = data.get("header", {}).get("resultMsg", "Unknown error")
                return {"status": "error", "message": msg}

            raw_items = data.get("body", {}).get("items", [])
            if not raw_items:
                return {"status": "success", "data": [], "total": 0, "source": "NCIS"}

            items = [self._normalize_item(it) for it in raw_items]
            return {
                "status": "success",
                "data": items,
                "total": len(items),
                "source": "NCIS",
            }
        except Exception as e:
            logger.error("NCIS search error: %s", e)
            return {"status": "error", "message": str(e)}

    @staticmethod
    def _normalize_item(raw: dict) -> Dict[str, Any]:
        classifications = []
        for t in raw.get("typeList", []):
            name = t.get("sbstnTypeNm", "")
            if name:
                classifications.append(name)

        return {
            "cas_no": (raw.get("casNo") or "").strip(),
            "ke_no": (raw.get("korexst") or "").strip(),
            "name_ko": (raw.get("sbstnNmKor") or "").strip(),
            "name_en": (raw.get("sbstnNmEng") or "").strip(),
            "synonyms_ko": (raw.get("sbstnNm2Kor") or "").strip(),
            "synonyms_en": (raw.get("sbstnNm2Eng") or "").strip(),
            "molecular_formula": (raw.get("mlcfrm") or "").strip(),
            "molecular_weight": (raw.get("mlcwgt") or "").strip(),
            "classifications": classifications,
        }
