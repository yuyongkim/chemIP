import logging
import xml.etree.ElementTree as ET
from typing import Any

import requests

from backend.api.http_client import safe_get
from backend.config.settings import settings

logger = logging.getLogger(__name__)


class KiprisAdapter:
    def __init__(self):
        self.api_key = settings.KIPRIS_API_KEY
        self.base_url = settings.KIPRIS_API_URL
        self.detail_url = self.base_url.replace("getWordSearch", "getBibliographyDetailInfoSearch")
        self.last_error: str | None = None

    def _clear_error(self) -> None:
        self.last_error = None

    def _set_error(self, message: str) -> None:
        self.last_error = message
        logger.warning("KIPRIS API issue: %s", message)

    @staticmethod
    def _extract_api_error(root: ET.Element) -> str | None:
        """
        KIPRIS error responses are often HTTP 200 with non-success header codes.
        """
        result_code = (root.findtext(".//resultCode") or "").strip()
        success_yn = (root.findtext(".//successYN") or "").strip().upper()
        result_msg = (root.findtext(".//resultMsg") or "").strip()

        if not result_code and not success_yn and not result_msg:
            return None

        is_success = result_code == "00" or success_yn == "Y"
        if is_success:
            return None

        parts: list[str] = []
        if result_code:
            parts.append(f"code={result_code}")
        if result_msg:
            parts.append(result_msg)
        return " | ".join(parts) if parts else "Unknown KIPRIS API error"

    def search_patents(self, query: str, limit: int = 10):
        """
        Search patents using KIPRIS API.
        """
        self._clear_error()
        if not self.api_key:
            self._set_error("KIPRIS_API_KEY is missing.")
            return []

        # KIPRIS API parameters (Word Search)
        params = {
            "word": query,
            "ServiceKey": self.api_key,
            "numOfRows": limit,
            "pageNo": 1
        }

        try:
            response = safe_get(self.base_url, params=params)

            if response.status_code == 200:
                # KIPRIS returns XML
                return self._parse_xml_response(response.text)
            else:
                self._set_error(f"HTTP {response.status_code}")
                return []
                
        except requests.exceptions.Timeout:
            self._set_error("Request timeout")
            return []
        except requests.exceptions.RequestException as e:
            self._set_error(f"Connection error: {e}")
            return []
        except Exception as e:
            self._set_error(f"Unexpected error: {e}")
            return []

    def _parse_xml_response(self, xml_content):
        patents = []
        try:
            root = ET.fromstring(xml_content)
            api_error = self._extract_api_error(root)
            if api_error:
                self._set_error(api_error)
                return []

            # Adjust path based on actual KIPRIS XML structure
            # Usually <response><body><items><item>...
            items = root.findall(".//item")
            
            for item in items:
                patent = {
                    "applicationNumber": item.findtext("applicationNumber"),
                    "applicationDate": item.findtext("applicationDate"),
                    "inventionTitle": item.findtext("inventionTitle"),
                    "applicantName": item.findtext("applicantName"),
                    "abstract": item.findtext("astrtCont"), # Abstract content
                    "indexNo": item.findtext("indexNo"),
                    "registerStatus": item.findtext("registerStatus"),
                    "pubNumber": item.findtext("publicationNumber"),
                    "pubDate": item.findtext("publicationDate"),
                }
                patents.append(patent)
                
        except ET.ParseError as e:
            self._set_error(f"XML parse error: {e}")
        
        return patents

    @staticmethod
    def _normalize_application_number(application_number: str) -> str:
        return "".join(ch for ch in (application_number or "") if ch.isdigit())

    def get_patent_detail(self, application_number: str) -> dict[str, Any] | None:
        """
        Fetch detailed KIPRIS patent information using application number.
        """
        self._clear_error()
        if not self.api_key:
            self._set_error("KIPRIS_API_KEY is missing.")
            return None

        normalized = self._normalize_application_number(application_number)
        if len(normalized) < 10:
            self._set_error(f"Invalid application number: {application_number}")
            return None

        params = {
            "applicationNumber": normalized,
            "ServiceKey": self.api_key,
            "numOfRows": 1,
            "pageNo": 1,
        }

        try:
            response = safe_get(self.detail_url, params=params)
            if response.status_code != 200:
                self._set_error(f"HTTP {response.status_code}")
                return None

            return self._parse_detail_xml_response(response.text)
        except requests.exceptions.Timeout:
            self._set_error("Request timeout")
            return None
        except requests.exceptions.RequestException as e:
            self._set_error(f"Connection error: {e}")
            return None
        except Exception as e:
            self._set_error(f"Unexpected error: {e}")
            return None

    def _parse_detail_xml_response(self, xml_content: str) -> dict[str, Any] | None:
        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError as e:
            self._set_error(f"XML parse error: {e}")
            return None

        api_error = self._extract_api_error(root)
        if api_error:
            self._set_error(api_error)
            return None

        item = root.find("./body/item")
        if item is None:
            item = root.find(".//body/items/item")
        if item is None:
            return None

        biblio = item.find("biblioSummaryInfoArray/biblioSummaryInfo")
        abstract_node = item.find("abstractInfoArray/abstractInfo/astrtCont")
        applicant_node = item.find("applicantInfoArray/applicantInfo")

        claims = [
            (claim.findtext("claim") or "").strip()
            for claim in item.findall("claimInfoArray/claimInfo")
            if (claim.findtext("claim") or "").strip()
        ]

        application_number = (biblio.findtext("applicationNumber") if biblio is not None else "") or ""
        if not application_number:
            return None

        return {
            "applicationNumber": application_number,
            "applicationDate": (biblio.findtext("applicationDate") if biblio is not None else "") or "",
            "inventionTitle": (biblio.findtext("inventionTitle") if biblio is not None else "") or "",
            "inventionTitleEng": (biblio.findtext("inventionTitleEng") if biblio is not None else "") or "",
            "registerStatus": (biblio.findtext("registerStatus") if biblio is not None else "") or "",
            "registerNumber": (biblio.findtext("registerNumber") if biblio is not None else "") or "",
            "openNumber": (biblio.findtext("openNumber") if biblio is not None else "") or "",
            "publicationNumber": (biblio.findtext("publicationNumber") if biblio is not None else "") or "",
            "applicantName": (applicant_node.findtext("name") if applicant_node is not None else "") or "",
            "applicantNameEng": (applicant_node.findtext("engName") if applicant_node is not None else "") or "",
            "abstract": (abstract_node.text if abstract_node is not None and abstract_node.text else "").strip(),
            "claims": claims,
            "imagePath": (item.findtext("imagePathInfo/path") or "").strip(),
            "imageLargePath": (item.findtext("imagePathInfo/largePath") or "").strip(),
        }
