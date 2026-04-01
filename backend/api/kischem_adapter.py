"""KISCHEM (화학물질안전원) adapter.

Source: data.go.kr dataset 15072442
Endpoint: apis.data.go.kr/1480802/iciskischem/kischemlist
Provides: chemical safety info including exposure symptoms, first-aid (inhale/skin/eye/oral).
"""

import logging
import xml.etree.ElementTree as ET
from typing import Any, Dict, List

from backend.api.http_client import safe_get
from backend.config.settings import settings

logger = logging.getLogger(__name__)

KISCHEM_URL = "http://apis.data.go.kr/1480802/iciskischem/kischemlist"


class KischemAdapter:
    def __init__(self):
        self.api_key = settings.KOSHA_SERVICE_KEY_DECODED

    def search(self, keyword: str = "", cas_no: str = "", num_of_rows: int = 20, page_no: int = 1) -> Dict[str, Any]:
        """Search KISCHEM for chemical safety/symptom data."""
        if not self.api_key:
            return {"status": "disabled", "message": "API key not configured"}

        params: dict[str, Any] = {
            "ServiceKey": self.api_key,
            "numOfRows": num_of_rows,
            "pageNo": page_no,
        }
        if cas_no:
            params["casNo"] = cas_no
        elif keyword:
            params["chemNm"] = keyword

        try:
            response = safe_get(KISCHEM_URL, params=params)
            response.raise_for_status()
            items = self._parse_xml(response.text)
            return {
                "status": "success",
                "data": items,
                "total": len(items),
                "source": "KISCHEM",
            }
        except Exception as e:
            logger.error("KISCHEM search error: %s", e)
            return {"status": "error", "message": str(e)}

    def get_by_cas(self, cas_no: str) -> Dict[str, Any]:
        """Lookup by CAS number."""
        return self.search(cas_no=cas_no, num_of_rows=5)

    @staticmethod
    def _parse_xml(xml_text: str) -> List[Dict[str, str]]:
        items = []
        try:
            root = ET.fromstring(xml_text)
            for item in root.findall(".//item"):
                record: dict[str, str] = {}
                field_map = {
                    "dataNo": "data_no",
                    "chemEn": "name_en",
                    "chemKo": "name_ko",
                    "casNo": "cas_no",
                    "symptom": "symptom",
                    "inhale": "inhale",
                    "skin": "skin",
                    "eyeball": "eye",
                    "oral": "oral",
                    "etc": "etc",
                }
                for xml_tag, key in field_map.items():
                    el = item.find(xml_tag)
                    if el is not None and el.text:
                        record[key] = el.text.strip()
                if record:
                    items.append(record)
        except ET.ParseError as e:
            logger.error("KISCHEM XML parse error: %s", e)
        return items
