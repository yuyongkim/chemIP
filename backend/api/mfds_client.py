from backend.api.http_client import safe_get
from backend.config.settings import settings


# Large embedded documents returned by the *DtlInq* (detail) operation; the
# list views never show them, so they are dropped to keep responses small.
_HEAVY_SUFFIXES = ("_DOC_DATA",)


class MFDSClient:
    """MFDS drug product client (approval + easy drug info).

    Approval routes come from ``settings.MFDS_APPROVAL_URLS`` (portal spec 08
    first, 07 kept as fallback). The next route is tried when one errors or
    returns no rows.
    """

    APPROVAL_URLS = tuple(settings.MFDS_APPROVAL_URLS)
    APPROVAL_URL = APPROVAL_URLS[0]
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

    @staticmethod
    def _slim(items: list[dict]) -> list[dict]:
        return [{k: v for k, v in it.items() if not k.endswith(_HEAVY_SUFFIXES)} for it in items]

    def _fetch_approval(self, url: str, params: dict) -> dict:
        response = safe_get(url, params=params, timeout=self.timeout, verify=False)
        response.raise_for_status()
        payload = response.json()
        header = payload.get("header", {}) if isinstance(payload, dict) else {}
        if header and str(header.get("resultCode", "00")) != "00":
            raise ValueError(f"resultCode {header.get('resultCode')}: {header.get('resultMsg', '')}")
        body = payload.get("body", {})
        items = self._slim(self._normalize_items(body.get("items", [])))
        return {"status": "success", "total": body.get("totalCount", 0), "items": items, "route": url.rsplit("/", 2)[-2]}

    def search_approval(self, item_name: str, page: int = 1, num_of_rows: int = 10) -> dict:
        params = {
            "serviceKey": self.service_key,
            "item_name": item_name,
            "numOfRows": max(1, min(num_of_rows, 100)),
            "pageNo": max(1, page),
            "type": "json",
        }
        first_empty: dict | None = None
        errors: list[str] = []
        for url in self.APPROVAL_URLS:
            try:
                result = self._fetch_approval(url, params)
            except Exception as exc:
                errors.append(f"{url.rsplit('/', 1)[-1]}: {exc}"[:200])
                continue
            if result["items"]:
                return result
            first_empty = first_empty or result
        if first_empty is not None:
            return first_empty
        return {"status": "error", "message": "; ".join(errors) or "no MFDS route", "total": 0, "items": []}

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
