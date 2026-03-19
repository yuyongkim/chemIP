from backend.api.http_client import safe_get
from backend.config.settings import settings


class OpenFDAClient:
    """Lightweight client for OpenFDA drug label search."""

    BASE_URL = "https://api.fda.gov/drug/label.json"

    def __init__(self, timeout: int | None = None):
        self.timeout = timeout or settings.HTTP_TIMEOUT_SECONDS

    def search_labels(self, search_query: str, limit: int = 10, skip: int = 0) -> dict:
        params = {
            "search": search_query,
            "limit": max(1, min(limit, 100)),
            "skip": max(0, skip),
        }
        try:
            response = safe_get(self.BASE_URL, params=params, timeout=self.timeout)
            response.raise_for_status()
            payload = response.json()
            return {
                "status": "success",
                "meta": payload.get("meta", {}),
                "results": payload.get("results", []),
            }
        except Exception as exc:
            return {"status": "error", "message": str(exc), "meta": {}, "results": []}
