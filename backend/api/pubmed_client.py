import os

from backend.api.http_client import safe_get
from backend.config.settings import settings


class PubMedClient:
    """PubMed E-utilities client using esearch + esummary."""

    ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    ESUMMARY_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"

    def __init__(self, api_key: str | None = None, timeout: int | None = None):
        self.api_key = api_key or os.getenv("PUBMED_API_KEY", "")
        self.timeout = timeout or settings.HTTP_TIMEOUT_SECONDS

    def _base_params(self) -> dict:
        params = {"db": "pubmed", "retmode": "json"}
        if self.api_key:
            params["api_key"] = self.api_key
        return params

    def search(self, term: str, retmax: int = 10) -> dict:
        params = self._base_params()
        params.update({"term": term, "retmax": max(1, min(retmax, 100))})
        try:
            search_response = safe_get(self.ESEARCH_URL, params=params, timeout=self.timeout)
            search_response.raise_for_status()
            search_payload = search_response.json()
            search_result = search_payload.get("esearchresult", {})
            id_list = search_result.get("idlist", [])
            if not id_list:
                return {"status": "success", "count": 0, "ids": [], "articles": []}

            summary_params = self._base_params()
            summary_params.update({"id": ",".join(id_list)})
            summary_response = safe_get(
                self.ESUMMARY_URL,
                params=summary_params,
                timeout=self.timeout,
            )
            summary_response.raise_for_status()
            summary_payload = summary_response.json().get("result", {})
            articles = []
            for pmid in id_list:
                row = summary_payload.get(str(pmid), {})
                if row:
                    articles.append(
                        {
                            "pmid": row.get("uid", str(pmid)),
                            "title": row.get("title", ""),
                            "pubdate": row.get("pubdate", ""),
                            "source": row.get("source", ""),
                            "authors": [a.get("name", "") for a in row.get("authors", []) if a.get("name")],
                        }
                    )

            return {
                "status": "success",
                "count": int(search_result.get("count", len(id_list))),
                "ids": id_list,
                "articles": articles,
            }
        except Exception as exc:
            return {"status": "error", "message": str(exc), "count": 0, "ids": [], "articles": []}
