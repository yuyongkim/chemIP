"""EPA CompTox (CTX API) adapter.

Provides access to US EPA Computational Toxicology and Exposure data.
API key required (free — request via ccte_api@epa.gov).
Key is sent as ``x-api-key`` header.

Base: https://comptox.epa.gov/ctx-api/v1/
Domains: chemical, hazard, exposure, bioactivity

Error handling and list coercion: backend/api/adapter_support.py.
"""

from __future__ import annotations

import logging
from typing import Any, Callable, Dict

import requests

from backend.api.adapter_support import ErrorTrackingMixin, as_list
from backend.api.http_client import safe_get, get_http_session
from backend.config.settings import settings

logger = logging.getLogger(__name__)

_BASE = "https://comptox.epa.gov/ctx-api/v1"

# GET paths that answer a list (or one object) for a DTXSID; one public method each.
_DTXSID_LIST_PATHS = {
    "toxval": "/hazard/toxval/search/by-dtxsid/{dtxsid}",
    "human": "/hazard/human/search/by-dtxsid/{dtxsid}",
    "cancer": "/hazard/cancer-summary/search/by-dtxsid/{dtxsid}",
    "functional_use": "/exposure/ccd/functional-use/search/by-dtxsid/{dtxsid}",
}


class CompToxAdapter(ErrorTrackingMixin):
    """Client for EPA CompTox CTX API (requires API key)."""

    _error_label = "CompTox"

    def __init__(self, timeout: int | None = None):
        self.api_key = settings.COMPTOX_API_KEY
        self.timeout = timeout or max(settings.HTTP_TIMEOUT_SECONDS, 15)
        self.last_error: str | None = None

    @property
    def _headers(self) -> dict[str, str]:
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
        }

    def _check_key(self) -> dict[str, str] | None:
        if not self.api_key:
            self._set_error("COMPTOX_API_KEY not configured")
            return {"status": "disabled", "message": "EPA CompTox API key not configured. Request one at ccte_api@epa.gov"}
        return None

    def _get(self, path: str, params: dict[str, Any] | None = None) -> requests.Response:
        return safe_get(
            f"{_BASE}{path}",
            params=params,
            headers=self._headers,
            timeout=self.timeout,
        )

    def _post(self, path: str, json_body: Any) -> requests.Response:
        session = get_http_session()
        return session.post(
            f"{_BASE}{path}",
            json=json_body,
            headers=self._headers,
            timeout=self.timeout,
        )

    def _keyed_call(self, fetch: Callable[[], requests.Response], *, as_items: bool = True) -> Dict[str, Any]:
        """Key check, then one request: {"status", "data": [...], "total"} (or raw "data" when as_items=False)."""
        self._clear_error()
        if err := self._check_key():
            return err

        def call() -> Dict[str, Any]:
            resp = fetch()
            resp.raise_for_status()
            data = resp.json()
            if not as_items:
                return {"status": "success", "data": data}
            items = as_list(data)
            return {"status": "success", "data": items, "total": len(items)}

        return self._guarded(call)

    # ------------------------------------------------------------------
    # Chemical search
    # ------------------------------------------------------------------

    def search_chemical(self, query: str) -> Dict[str, Any]:
        """Search by exact name or CAS number → returns DTXSID matches."""
        self._clear_error()
        if err := self._check_key():
            return err
        if not query or not query.strip():
            return {"status": "error", "message": "Empty query"}

        def call() -> Dict[str, Any]:
            resp = self._get(f"/chemical/search/equal/{query.strip()}")
            resp.raise_for_status()
            items = as_list(resp.json())
            logger.info("CompTox search '%s': %d results", query, len(items))
            return {"status": "success", "data": items, "total": len(items)}

        return self._guarded(call, timeout_message="CompTox request timeout", connection_prefix="CompTox",
                             failure_log=("CompTox search failed for '%s'", query))

    def search_chemical_contains(self, query: str, top: int = 20) -> Dict[str, Any]:
        """Partial name search (contains)."""
        return self._keyed_call(lambda: self._get(f"/chemical/search/contain/{query.strip()}", params={"top": top}))

    def get_chemical_detail(self, dtxsid: str, projection: str = "chemicaldetailstandard") -> Dict[str, Any]:
        """Get full chemical details by DTXSID.

        Projections: chemicaldetailall, chemicaldetailstandard,
                     chemicalidentifier, chemicalstructure, compact
        """
        return self._keyed_call(
            lambda: self._get(f"/chemical/detail/search/by-dtxsid/{dtxsid}", params={"projection": projection}),
            as_items=False,
        )

    # ------------------------------------------------------------------
    # Hazard / exposure
    # ------------------------------------------------------------------

    def _by_dtxsid(self, kind: str, dtxsid: str) -> Dict[str, Any]:
        return self._keyed_call(lambda: self._get(_DTXSID_LIST_PATHS[kind].format(dtxsid=dtxsid)))

    def get_hazard_toxval(self, dtxsid: str) -> Dict[str, Any]:
        """Get ToxValDB hazard data for a chemical."""
        return self._by_dtxsid("toxval", dtxsid)

    def get_hazard_human(self, dtxsid: str) -> Dict[str, Any]:
        """Get human hazard data."""
        return self._by_dtxsid("human", dtxsid)

    def get_cancer_summary(self, dtxsid: str) -> Dict[str, Any]:
        """Get cancer classification summary."""
        return self._by_dtxsid("cancer", dtxsid)

    def get_functional_use(self, dtxsid: str) -> Dict[str, Any]:
        """Get functional use categories for a chemical."""
        return self._by_dtxsid("functional_use", dtxsid)

    # ------------------------------------------------------------------
    # Batch (POST)
    # ------------------------------------------------------------------

    def batch_search(self, queries: list[str]) -> Dict[str, Any]:
        """Batch exact-name/CAS search (max 100 per request)."""
        return self._keyed_call(lambda: self._post("/chemical/search/equal/", queries[:100]))

    def batch_detail(self, dtxsids: list[str], projection: str = "chemicaldetailstandard") -> Dict[str, Any]:
        """Batch chemical detail lookup (max 200 per request)."""
        return self._keyed_call(lambda: self._post(f"/chemical/detail/search/by-dtxsid/?projection={projection}", dtxsids[:200]))
