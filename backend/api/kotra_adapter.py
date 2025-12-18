import requests
import xml.etree.ElementTree as ET
from backend.config.settings import settings

class KotraAdapter:
    def __init__(self):
        self.base_url = "https://apis.data.go.kr/B410001/kotra_overseasMarketNews/ovseaMrktNews"
        self.service_key = settings.KOTRA_API_KEY_DECODED

    def search_market_news(self, keyword: str, country: str = "", industry: str = "", page_no: int = 1, num_of_rows: int = 10) -> dict:
        # User confirmed Product DB endpoint works for "Market News" content
        # Endpoint: https://apis.data.go.kr/B410001/cmmdtDb/cmmdtDb
        url = "https://apis.data.go.kr/B410001/cmmdtDb/cmmdtDb"
        
        params = {
            "serviceKey": self.service_key,
            "search1": country,  # Country
            "search2": keyword,  # Title/Keyword
            "search3": "",       # Author
            "search4": "",       # Date
            "numOfRows": num_of_rows,
            "pageNo": page_no,
            "type": "json"
        }

        try:
            # Verify=False to bypass common Gov API SSL issues
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            
            response = requests.get(url, params=params, timeout=10, verify=False)
            
            try:
                data = response.json()
                
                # Parse specific structure of Product DB
                # Structure: response -> body -> itemList -> item (list)
                items = []
                if "response" in data and "body" in data["response"]:
                    body = data["response"]["body"]
                    if body and "itemList" in body and body["itemList"]:
                         raw_items = body["itemList"]["item"]
                         # Ensure it is a list (API might return dict for single item)
                         if isinstance(raw_items, dict):
                             raw_items = [raw_items]
                             
                         for item in raw_items:
                             items.append({
                                 "newsTitl": item.get("newsTitl", ""),
                                 "cntryNm": item.get("cntryNm", "") or country or "Global", 
                                 "newsWrtDt": item.get("regDt", ""), 
                                 "kotraNewsUrl": item.get("kotraNewsUrl", ""),
                                 "newsBdt": f"Product: {item.get('cmdltNmKorn', '')}, HS: {item.get('hsCdNm', '')}" 
                             })
                
                return {"status": "success", "data": items}
            except ValueError:
                 return {"status": "success", "data": [], "raw": response.text}
                 
        except Exception as e:
            return {"status": "error", "message": str(e)}
