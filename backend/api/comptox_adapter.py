"""EPA CompTox (CTX API) adapter.

Provides access to US EPA Computational Toxicology and Exposure data.
API key required (free — request via ccte_api@epa.gov).
Key is sent as ``x-api-key`` header.

Base: https://comptox.epa.gov/ctx-api/v1/
Domains: chemical, hazard, exposure, bioactivity
"""

from __future__ import annotations

import logging
from typing import Any, Dict

import requests

from backend.api.http_client import safe_get, get_http_session
from backend.config.settings import settings

logger = logging.getLogger(__name__)

_BASE = "https://comptox.epa.gov/ctx-api/v1"


class CompToxAdapter:
    """Client for EPA CompTox CTX API (requires API key)."""

    def __init__(self, timeout: int | None = None):
        self.api_key = settings.COMPTOX_API_KEY
        self.timeout = timeout or max(settings.HTTP_TIMEOUT_SECONDS, 15)
        self.last_error: str | None = None

    def _clear_error(self) -> None:
        self.last_error = None

    def _set_error(self, message: str) -> None:
        self.last_error = message
        logger.warning("CompTox API issue: %s", message)

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

        try:
            resp = self._get(f"/chemical/search/equal/{query.strip()}")
            resp.raise_for_status()
            data = resp.json()
            items = data if isinstance(data, list) else [data] if data else []
            logger.info("CompTox search '%s': %d results", query, len(items))
            return {"status": "success", "data": items, "total": len(items)}

        except requests.Timeout:
            self._set_error("Request timeout")
            return {"status": "error", "message": "CompTox request timeout"}
        except requests.ConnectionError as exc:
            self._set_error(f"Connection error: {exc}")
            return {"status": "error", "message": f"CompTox connection error: {exc}"}
        except Exception as exc:
            self._set_error(f"Unexpected error: {exc}")
            logger.exception("CompTox search failed for '%s'", query)
            return {"status": "error", "message": str(exc)}

    def search_chemical_contains(self, query: str, top: int = 20) -> Dict[str, Any]:
        """Partial name search (contains)."""
        self._clear_error()
        if err := self._check_key():
            return err

        try:
            resp = self._get(f"/chemical/search/contain/{query.strip()}", params={"top": top})
            resp.raise_for_status()
            data = resp.json()
            items = data if isinstance(data, list) else [data] if data else []
            return {"status": "success", "data": items, "total": len(items)}

        except Exception as exc:
            self._set_error(f"Unexpected error: {exc}")
            return {"status": "error", "message": str(exc)}

    def get_chemical_detail(self, dtxsid: str, projection: str = "chemicaldetailstandard") -> Dict[str, Any]:
        """Get full chemical details by DTXSID.

        Projections: chemicaldetailall, chemicaldetailstandard,
                     chemicalidentifier, chemicalstructure, compact
        """
        self._clear_error()
        if err := self._check_key():
            return err

        try:
            resp = self._get(
                f"/chemical/detail/search/by-dtxsid/{dtxsid}",
                params={"projection": projection},
            )
            resp.raise_for_status()
            data = resp.json()
            return {"status": "success", "data": data}

        except Exception as exc:
            self._set_error(f"Unexpected error: {exc}")
            return {"status": "error", "message": str(exc)}

    # ------------------------------------------------------------------
    # Hazard
    # ------------------------------------------------------------------

    def get_hazard_toxval(self, dtxsid: str) -> Dict[str, Any]:
        """Get ToxValDB hazard data for a chemical."""
        self._clear_error()
        if err := self._check_key():
            return err

        try:
            resp = self._get(f"/hazard/toxval/search/by-dtxsid/{dtxsid}")
            resp.raise_for_status()
            data = resp.json()
            items = data if isinstance(data, list) else [data] if data else []
            return {"status": "success", "data": items, "total": len(items)}

        except Exception as exc:
            self._set_error(f"Unexpected error: {exc}")
            return {"status": "error", "message": str(exc)}

    def get_hazard_human(self, dtxsid: str) -> Dict[str, Any]:
        """Get human hazard data."""
        self._clear_error()
        if err := self._check_key():
            return err

        try:
            resp = self._get(f"/hazard/human/search/by-dtxsid/{dtxsid}")
            resp.raise_for_status()
            data = resp.json()
            items = data if isinstance(data, list) else [data] if data else []
            return {"status": "success", "data": items, "total": len(items)}

        except Exception as exc:
            self._set_error(f"Unexpected error: {exc}")
            return {"status": "error", "message": str(exc)}

    def get_cancer_summary(self, dtxsid: str) -> Dict[str, Any]:
        """Get cancer classification summary."""
        self._clear_error()
        if err := self._check_key():
            return err

        try:
            resp = self._get(f"/hazard/cancer-summary/search/by-dtxsid/{dtxsid}")
            resp.raise_for_status()
            data = resp.json()
            items = data if isinstance(data, list) else [data] if data else []
            return {"status": "success", "data": items, "total": len(items)}

        except Exception as exc:
            self._set_error(f"Unexpected error: {exc}")
            return {"status": "error", "message": str(exc)}

    # ------------------------------------------------------------------
    # Exposure
    # ------------------------------------------------------------------

    def get_functional_use(self, dtxsid: str) -> Dict[str, Any]:
        """Get functional use categories for a chemical."""
        self._clear_error()
        if err := self._check_key():
            return err

        try:
            resp = self._get(f"/exposure/ccd/functional-use/search/by-dtxsid/{dtxsid}")
            resp.raise_for_status()
            data = resp.json()
            items = data if isinstance(data, list) else [data] if data else []
            return {"status": "success", "data": items, "total": len(items)}

        except Exception as exc:
            self._set_error(f"Unexpected error: {exc}")
            return {"status": "error", "message": str(exc)}

    # ------------------------------------------------------------------
    # Batch (POST)
    # ------------------------------------------------------------------

    def batch_search(self, queries: list[str]) -> Dict[str, Any]:
        """Batch exact-name/CAS search (max 100 per request)."""
        self._clear_error()
        if err := self._check_key():
            return err

        try:
            resp = self._post("/chemical/search/equal/", queries[:100])
            resp.raise_for_status()
            data = resp.json()
            items = data if isinstance(data, list) else [data] if data else []
            return {"status": "success", "data": items, "total": len(items)}

        except Exception as exc:
            self._set_error(f"Unexpected error: {exc}")
            return {"status": "error", "message": str(exc)}

    def batch_detail(self, dtxsids: list[str], projection: str = "chemicaldetailstandard") -> Dict[str, Any]:
        """Batch chemical detail lookup (max 200 per request)."""
        self._clear_error()
        if err := self._check_key():
            return err

        try:
            resp = self._post(
                f"/chemical/detail/search/by-dtxsid/?projection={projection}",
                dtxsids[:200],
            )
            resp.raise_for_status()
            data = resp.json()
            items = data if isinstance(data, list) else [data] if data else []
            return {"status": "success", "data": items, "total": len(items)}

        except Exception as exc:
            self._set_error(f"Unexpected error: {exc}")
            return {"status": "error", "message": str(exc)}
