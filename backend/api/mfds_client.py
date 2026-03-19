from backend.api.http_client import safe_get
from backend.config.settings import settings


class MFDSClient:
    """MFDS drug product client (approval + easy drug info)."""

    APPROVAL_URL = (
        "https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07/"
        "getDrugPrdtPrmsnInq07"
    )
    EASY_INFO_URL = "https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList"

    def __init__(self, service_key: str | None = None, timeout: int | None = None):
        self.service_key = service_key or settings.DRUG_API_KEY_DECODED
        self.timeout = timeout or settings.HTTP_TIMEOUT_SECONDS

    @staticmethod
    def _normalize_items(raw_items) -> list[dict]:
        if isinstance(raw_items, dict) and "item" in raw_items:
            raw_items = raw_items["item"]
        if isinstance(raw_items, dict):
            raw_items = [raw_items]
        if not isinstance(raw_items, list):
            return []
        return [item for item in raw_items if isinstance(item, dict)]

    def search_approval(self, item_name: str, page: int = 1, num_of_rows: int = 10) -> dict:
        params = {
            "serviceKey": self.service_key,
            "item_name": item_name,
            "numOfRows": max(1, min(num_of_rows, 100)),
            "pageNo": max(1, page),
            "type": "json",
        }
        try:
            response = safe_get(self.APPROVAL_URL, params=params, timeout=self.timeout, verify=False)
            response.raise_for_status()
            payload = response.json()
            body = payload.get("body", {})
            items = self._normalize_items(body.get("items", []))
            return {"status": "success", "total": body.get("totalCount", 0), "items": items}
        except Exception as exc:
            return {"status": "error", "message": str(exc), "total": 0, "items": []}

    def search_easy_info(self, item_name: str, page: int = 1, num_of_rows: int = 10) -> dict:
        params = {
            "serviceKey": self.service_key,
            "itemName": item_name,
            "numOfRows": max(1, min(num_of_rows, 100)),
            "pageNo": max(1, page),
            "type": "json",
        }
        try:
            response = safe_get(self.EASY_INFO_URL, params=params, timeout=self.timeout, verify=False)
            response.raise_for_status()
            payload = response.json()
            body = payload.get("body", {})
            items = self._normalize_items(body.get("items", []))
            return {"status": "success", "total": body.get("totalCount", 0), "items": items}
        except Exception as exc:
            return {"status": "error", "message": str(exc), "total": 0, "items": []}

    # Backward-compatible aliases for legacy adapter call sites.
    def search_drug_approval(self, item_name: str, page: int = 1, num_of_rows: int = 10) -> dict:
        return self.search_approval(item_name=item_name, page=page, num_of_rows=num_of_rows)

    def search_drug_easy_info(self, item_name: str, page: int = 1, num_of_rows: int = 10) -> dict:
        return self.search_easy_info(item_name=item_name, page=page, num_of_rows=num_of_rows)
