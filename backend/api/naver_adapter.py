from backend.api.http_client import safe_get
from backend.config.settings import settings


class NaverAdapter:
    def __init__(self):
        self.client_id = settings.NAVER_CLIENT_ID
        self.client_secret = settings.NAVER_CLIENT_SECRET
        self.base_url = "https://openapi.naver.com/v1/search/news.json"

    def search_news(self, keyword: str, start: int = 1, display: int = 10, sort: str = "date") -> dict:
        if not self.client_id or not self.client_secret:
            return {"status": "disabled", "data": [], "total": 0, "message": "NAVER API key is not configured"}

        headers = {
            "X-Naver-Client-Id": self.client_id,
            "X-Naver-Client-Secret": self.client_secret,
        }
        params = {
            "query": keyword,
            "display": max(1, min(display, 100)),
            "start": max(1, start),
            "sort": sort if sort in ("sim", "date") else "date",
        }

        try:
            resp = safe_get(
                self.base_url,
                params=params,
                headers=headers,
            )
            if resp.status_code != 200:
                return {"status": "error", "data": [], "total": 0, "message": f"Naver API HTTP {resp.status_code}"}
            data = resp.json()
            items = data.get("items", []) if isinstance(data, dict) else []
            mapped = []
            for it in items:
                mapped.append(
                    {
                        "newsTitl": it.get("title", ""),
                        "newsWrtDt": it.get("pubDate", ""),
                        "newsWirtNm": "Naver",
                        "cntryNm": "KR",
                        "newsBdt": it.get("description", ""),
                        "kotraNewsUrl": "",
                        "newsUrl": it.get("originallink") or it.get("link") or "",
                        "cntntSumar": it.get("description", ""),
                        "source": "Naver",
                    }
                )
            return {"status": "success", "data": mapped, "total": data.get("total", len(mapped))}
        except Exception as e:
            return {"status": "error", "data": [], "total": 0, "message": str(e)}
