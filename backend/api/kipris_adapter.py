import requests
import xml.etree.ElementTree as ET
from backend.config.settings import settings

class KiprisAdapter:
    def __init__(self):
        self.api_key = settings.KIPRIS_API_KEY
        self.base_url = settings.KIPRIS_API_URL

    def search_patents(self, query: str, limit: int = 10):
        """
        Search patents using KIPRIS API.
        """
        if not self.api_key:
            print("KIPRIS_API_KEY is missing.")
            return []

        # KIPRIS API parameters (Word Search)
        params = {
            "word": query,
            "ServiceKey": self.api_key,
            "numOfRows": limit,
            "pageNo": 1
        }

        try:
            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()
            
            # KIPRIS returns XML
            return self._parse_xml_response(response.content)
        except Exception as e:
            print(f"Error fetching patents from KIPRIS: {e}")
            return []

    def _parse_xml_response(self, xml_content):
        patents = []
        try:
            root = ET.fromstring(xml_content)
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
            print(f"XML Parse Error: {e}")
        
        return patents
