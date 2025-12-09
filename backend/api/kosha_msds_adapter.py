import requests
import xml.etree.ElementTree as ET
from backend.config.settings import settings

class KoshaMsdsAdapter:
    def __init__(self):
        self.base_url = settings.KOSHA_API_URL
        self.service_key = settings.KOSHA_SERVICE_KEY

    def search_msds(self, keyword: str, page_no: int = 1, num_of_rows: int = 10, search_condition: int = 0) -> dict:
        """
        화학물질명 또는 CAS No.로 MSDS 검색
        :param search_condition: 0(국문명), 1(CAS No), 2(UN No), 3(KE No), 4(EN No)
        """
        # Correct operation based on search: chemlist
        url = f"{self.base_url}/chemlist"
        
        params = {
            "serviceKey": self.service_key,
            "searchWrd": keyword,
            "searchCnd": search_condition, # Required parameter!
            "numOfRows": num_of_rows,
            "pageNo": page_no
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            # XML parsing would go here, returning raw text for now as requested for sample output
            return {"status": "success", "data": response.text}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def get_msds_detail(self, chem_id: str, section_seq: int = 1) -> dict:
        """
        MSDS 상세 정보 조회 (1~16 항목)
        :param chem_id: 화학물질 ID (예: 001008)
        :param section_seq: 항목 번호 (1~16)
        """
        # Endpoint format: /chemdetail01, /chemdetail02, ... /chemdetail16
        endpoint = f"chemdetail{section_seq:02d}"
        url = f"{self.base_url}/{endpoint}"
        
        params = {
            "serviceKey": self.service_key,
            "chemId": chem_id
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            return {"status": "success", "data": response.text}
        except Exception as e:
            return {"status": "error", "message": str(e)}

