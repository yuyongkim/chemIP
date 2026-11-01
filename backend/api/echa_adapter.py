"""ECHA (European Chemicals Agency) adapter.

Provides access to EU REACH registration data, CLP classification,
and substance information via ECHA CHEM public REST endpoints.
No API key required.

Endpoint layout (reverse-engineered from ECHA CHEM Angular SPA):
    /api-substance/v1/substance       — substance search
    /api-dossier-list/v1/dossier      — REACH dossier list
    /api-registrants/v1/registrants   — registrant companies
    /api-cnl-inventory/harmonized/    — CLP harmonised classification

Response parsing: backend/api/echa_parsing.py. Error handling: backend/api/adapter_support.py.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

import requests

from backend.api.adapter_support import ErrorTrackingMixin
from backend.api.echa_parsing import REACH_LIST_LABELS, first_value, normalize_search_results, reach_status
from backend.api.http_client import safe_get
from backend.config.settings import settings

logger = logging.getLogger(__name__)

_BASE = "https://chem.echa.europa.eu"
_SUBSTANCE_SEARCH = f"{_BASE}/api-substance/v1/substance"
_DOSSIER_LIST = f"{_BASE}/api-dossier-list/v1/dossier"
_REGISTRANTS = f"{_BASE}/api-registrants/v1/registrants"
_CLP_HARMONIZED = f"{_BASE}/api-cnl-inventory/harmonized"


class EchaAdapter(ErrorTrackingMixin):
    """Client for ECHA CHEM public substance data (no auth required)."""

    _error_label = "ECHA"

    # Old private names, kept for callers that used them.
    _first = staticmethod(first_value)
    _normalize_search_results = staticmethod(normalize_search_results)
    _reach_status = staticmethod(reach_status)
    _REACH_LIST_LABELS = REACH_LIST_LABELS

    def __init__(self, timeout: int | None = None):
        self.timeout = timeout or max(settings.HTTP_TIMEOUT_SECONDS, 15)
        self.last_error: str | None = None

    def _get(self, url: str, params: dict[str, Any] | None = None) -> requests.Response:
        return safe_get(
            url,
            params=params,
            headers={"Accept": "application/json"},
            timeout=self.timeout,
        )

    def _get_json(self, url: str, params: dict[str, Any] | None = None) -> Any:
        resp = self._get(url, params)
        resp.raise_for_status()
        return resp.json()

    def _list_call(self, url: str, params: dict[str, Any], *, label: str, noun: str, rml_id: str, timeout_message: str,
                   failure_log: str) -> Dict[str, Any]:
        """GET a paged ECHA list endpoint and answer {"status", "data": items, "total": len(items)}."""
        def call() -> Dict[str, Any]:
            items = self._get_json(url, params).get("items", [])
            logger.info("ECHA %s for %s: %d %s", label, rml_id, len(items), noun)
            return {"status": "success", "data": items, "total": len(items)}

        return self._guarded(call, timeout_message=timeout_message, connection_prefix="ECHA", failure_log=(failure_log, rml_id))

    # ------------------------------------------------------------------
    # Public methods
    # ------------------------------------------------------------------

    def search_substance(
        self,
        query: str,
        *,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """Search ECHA for a substance by name, CAS, or EC number.

        The ECHA search endpoint auto-detects the query type.
        """
        self._clear_error()
        if not query or not query.strip():
            return {"status": "error", "message": "Empty query"}

        params = {
            "searchText": query.strip(),
            "pageIndex": max(1, page),
            "pageSize": min(max(1, page_size), 100),
        }

        def call() -> Dict[str, Any]:
            payload = self._get_json(_SUBSTANCE_SEARCH, params)
            items = normalize_search_results(payload)
            total = payload.get("state", {}).get("totalItems", len(items))
            logger.info("ECHA substance search '%s': %d results", query, total)
            return {"status": "success", "data": items, "total": total}

        return self._guarded(call, timeout_message="ECHA request timeout", connection_prefix="ECHA",
                             failure_log=("ECHA search failed for '%s'", query))

    def get_dossier_list(self, rml_id: str) -> Dict[str, Any]:
        """Retrieve REACH registration dossiers for a substance.

        Args:
            rml_id: ECHA substance index (e.g. ``"100.000.685"`` for benzene).
        """
        self._clear_error()
        if not rml_id:
            return {"status": "error", "message": "Missing rml_id"}
        params = {"rmlId": rml_id, "legislation": "REACH", "pageIndex": 1, "pageSize": 100}
        return self._list_call(_DOSSIER_LIST, params, label="dossier list", noun="dossiers", rml_id=rml_id,
                               timeout_message="ECHA dossier request timeout", failure_log="ECHA dossier list failed for %s")

    def get_registrants(self, rml_id: str) -> Dict[str, Any]:
        """Get companies that registered a substance under REACH."""
        self._clear_error()
        if not rml_id:
            return {"status": "error", "message": "Missing rml_id"}
        params = {"rmlId": rml_id, "pageIndex": 1, "pageSize": 100}
        return self._list_call(_REGISTRANTS, params, label="registrants", noun="entries", rml_id=rml_id,
                               timeout_message="ECHA registrant request timeout", failure_log="ECHA registrants failed for %s")

    def get_clp_classification(self, rml_id: str) -> Dict[str, Any]:
        """Look up harmonised CLP classification for a substance.

        Args:
            rml_id: ECHA substance index (e.g. ``"100.000.685"``).
        """
        self._clear_error()
        if not rml_id:
            return {"status": "error", "message": "Missing rml_id"}

        def call() -> Dict[str, Any]:
            payload = self._get_json(f"{_CLP_HARMONIZED}/{rml_id}/classifications")
            classifications = payload if isinstance(payload, list) else payload.get("items", [])
            logger.info("ECHA CLP for %s: %d classifications", rml_id, len(classifications))
            return {"status": "success", "data": classifications, "total": len(classifications)}

        return self._guarded(call, timeout_message="ECHA CLP request timeout", connection_prefix="ECHA",
                             failure_log=("ECHA CLP lookup failed for %s", rml_id))

    def _clp_entry(self, kind: str, classification_id: str) -> Dict[str, Any]:
        self._clear_error()
        if not classification_id:
            return {"status": "error", "message": "Missing classification_id"}
        return self._guarded(lambda: {"status": "success", "data": self._get_json(f"{_CLP_HARMONIZED}/{kind}/{classification_id}")})

    def get_clp_labelling(self, classification_id: str) -> Dict[str, Any]:
        """Get hazard statements and signal word for a classification entry."""
        return self._clp_entry("labelling", classification_id)

    def get_clp_pictograms(self, classification_id: str) -> Dict[str, Any]:
        """Get GHS pictogram codes for a classification entry."""
        return self._clp_entry("pictograms", classification_id)
