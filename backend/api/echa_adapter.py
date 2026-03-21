"""ECHA (European Chemicals Agency) adapter.

Provides access to EU REACH registration data, CLP classification,
and substance information via ECHA CHEM public REST endpoints.
No API key required.

Endpoint layout (reverse-engineered from ECHA CHEM Angular SPA):
    /api-substance/v1/substance       — substance search
    /api-dossier-list/v1/dossier      — REACH dossier list
    /api-registrants/v1/registrants   — registrant companies
    /api-cnl-inventory/harmonized/    — CLP harmonised classification
"""

from __future__ import annotations

import logging
from typing import Any, Dict

import requests

from backend.api.http_client import safe_get
from backend.config.settings import settings

logger = logging.getLogger(__name__)

_BASE = "https://chem.echa.europa.eu"
_SUBSTANCE_SEARCH = f"{_BASE}/api-substance/v1/substance"
_DOSSIER_LIST = f"{_BASE}/api-dossier-list/v1/dossier"
_REGISTRANTS = f"{_BASE}/api-registrants/v1/registrants"
_CLP_HARMONIZED = f"{_BASE}/api-cnl-inventory/harmonized"


class EchaAdapter:
    """Client for ECHA CHEM public substance data (no auth required)."""

    def __init__(self, timeout: int | None = None):
        self.timeout = timeout or max(settings.HTTP_TIMEOUT_SECONDS, 15)
        self.last_error: str | None = None

    def _clear_error(self) -> None:
        self.last_error = None

    def _set_error(self, message: str) -> None:
        self.last_error = message
        logger.warning("ECHA API issue: %s", message)

    def _get(self, url: str, params: dict[str, Any] | None = None) -> requests.Response:
        return safe_get(
            url,
            params=params,
            headers={"Accept": "application/json"},
            timeout=self.timeout,
        )

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

        try:
            resp = self._get(_SUBSTANCE_SEARCH, params)
            resp.raise_for_status()
            payload = resp.json()

            items = self._normalize_search_results(payload)
            state = payload.get("state", {})
            total = state.get("totalItems", len(items))
            logger.info("ECHA substance search '%s': %d results", query, total)
            return {"status": "success", "data": items, "total": total}

        except requests.Timeout:
            self._set_error("Request timeout")
            return {"status": "error", "message": "ECHA request timeout"}
        except requests.ConnectionError as exc:
            self._set_error(f"Connection error: {exc}")
            return {"status": "error", "message": f"ECHA connection error: {exc}"}
        except Exception as exc:
            self._set_error(f"Unexpected error: {exc}")
            logger.exception("ECHA search failed for '%s'", query)
            return {"status": "error", "message": str(exc)}

    def get_dossier_list(self, rml_id: str) -> Dict[str, Any]:
        """Retrieve REACH registration dossiers for a substance.

        Args:
            rml_id: ECHA substance index (e.g. ``"100.000.685"`` for benzene).
        """
        self._clear_error()
        if not rml_id:
            return {"status": "error", "message": "Missing rml_id"}

        params = {
            "rmlId": rml_id,
            "legislation": "REACH",
            "pageIndex": 1,
            "pageSize": 100,
        }

        try:
            resp = self._get(_DOSSIER_LIST, params)
            resp.raise_for_status()
            payload = resp.json()
            items = payload.get("items", [])
            logger.info("ECHA dossier list for %s: %d dossiers", rml_id, len(items))
            return {"status": "success", "data": items, "total": len(items)}

        except requests.Timeout:
            self._set_error("Request timeout")
            return {"status": "error", "message": "ECHA dossier request timeout"}
        except requests.ConnectionError as exc:
            self._set_error(f"Connection error: {exc}")
            return {"status": "error", "message": f"ECHA connection error: {exc}"}
        except Exception as exc:
            self._set_error(f"Unexpected error: {exc}")
            logger.exception("ECHA dossier list failed for %s", rml_id)
            return {"status": "error", "message": str(exc)}

    def get_registrants(self, rml_id: str) -> Dict[str, Any]:
        """Get companies that registered a substance under REACH."""
        self._clear_error()
        if not rml_id:
            return {"status": "error", "message": "Missing rml_id"}

        params = {"rmlId": rml_id, "pageIndex": 1, "pageSize": 100}

        try:
            resp = self._get(_REGISTRANTS, params)
            resp.raise_for_status()
            payload = resp.json()
            items = payload.get("items", [])
            logger.info("ECHA registrants for %s: %d entries", rml_id, len(items))
            return {"status": "success", "data": items, "total": len(items)}

        except requests.Timeout:
            self._set_error("Request timeout")
            return {"status": "error", "message": "ECHA registrant request timeout"}
        except requests.ConnectionError as exc:
            self._set_error(f"Connection error: {exc}")
            return {"status": "error", "message": f"ECHA connection error: {exc}"}
        except Exception as exc:
            self._set_error(f"Unexpected error: {exc}")
            logger.exception("ECHA registrants failed for %s", rml_id)
            return {"status": "error", "message": str(exc)}

    def get_clp_classification(self, rml_id: str) -> Dict[str, Any]:
        """Look up harmonised CLP classification for a substance.

        Args:
            rml_id: ECHA substance index (e.g. ``"100.000.685"``).
        """
        self._clear_error()
        if not rml_id:
            return {"status": "error", "message": "Missing rml_id"}

        url = f"{_CLP_HARMONIZED}/{rml_id}/classifications"

        try:
            resp = self._get(url)
            resp.raise_for_status()
            payload = resp.json()

            classifications = payload if isinstance(payload, list) else payload.get("items", [])
            logger.info("ECHA CLP for %s: %d classifications", rml_id, len(classifications))
            return {"status": "success", "data": classifications, "total": len(classifications)}

        except requests.Timeout:
            self._set_error("Request timeout")
            return {"status": "error", "message": "ECHA CLP request timeout"}
        except requests.ConnectionError as exc:
            self._set_error(f"Connection error: {exc}")
            return {"status": "error", "message": f"ECHA connection error: {exc}"}
        except Exception as exc:
            self._set_error(f"Unexpected error: {exc}")
            logger.exception("ECHA CLP lookup failed for %s", rml_id)
            return {"status": "error", "message": str(exc)}

    def get_clp_labelling(self, classification_id: str) -> Dict[str, Any]:
        """Get hazard statements and signal word for a classification entry."""
        self._clear_error()
        if not classification_id:
            return {"status": "error", "message": "Missing classification_id"}

        url = f"{_CLP_HARMONIZED}/labelling/{classification_id}"

        try:
            resp = self._get(url)
            resp.raise_for_status()
            data = resp.json()
            return {"status": "success", "data": data}

        except Exception as exc:
            self._set_error(f"Unexpected error: {exc}")
            return {"status": "error", "message": str(exc)}

    def get_clp_pictograms(self, classification_id: str) -> Dict[str, Any]:
        """Get GHS pictogram codes for a classification entry."""
        self._clear_error()
        if not classification_id:
            return {"status": "error", "message": "Missing classification_id"}

        url = f"{_CLP_HARMONIZED}/pictograms/{classification_id}"

        try:
            resp = self._get(url)
            resp.raise_for_status()
            data = resp.json()
            return {"status": "success", "data": data}

        except Exception as exc:
            self._set_error(f"Unexpected error: {exc}")
            return {"status": "error", "message": str(exc)}

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _first(value: Any) -> str:
        """Return the first meaningful string from a list or scalar."""
        if isinstance(value, list):
            for v in value:
                s = str(v).strip()
                if s and s != "-":
                    return s
            return ""
        return str(value).strip() if value else ""

    @staticmethod
    def _normalize_search_results(payload: Any) -> list[dict[str, Any]]:
        """Extract a flat list from ECHA's substance search response."""
        raw = []
        if isinstance(payload, dict):
            raw = payload.get("items", payload.get("results", []))
        elif isinstance(payload, list):
            raw = payload

        if isinstance(raw, dict):
            raw = [raw]

        first = EchaAdapter._first

        out: list[dict[str, Any]] = []
        for item in raw:
            if not isinstance(item, dict):
                continue

            idx = item.get("substanceIndex", {})
            rml_id = idx.get("rmlId", "")
            name = idx.get("rmlName", "") or first(idx.get("ecName", []))
            cas = idx.get("rmlCas", "") or first(idx.get("casNumber", []))
            ec = idx.get("rmlEc", "") or first(idx.get("ecNumber", []))
            iupac = idx.get("rmlIupac", "") or first(idx.get("iupacName", []))
            formula = idx.get("rmlMolFormula", "") or first(idx.get("molFormula", []))
            index_no = first(idx.get("indexNumber", []))
            smiles = idx.get("rmlSmiles", "") or first(idx.get("smiles", []))

            # Regulatory processes
            processes = item.get("regulatoryProcesses", [])
            process_names = [p.get("name", "") for p in processes] if isinstance(processes, list) else []

            out.append({
                "rml_id": rml_id,
                "name": name,
                "iupac_name": iupac,
                "cas_number": cas,
                "ec_number": ec,
                "molecular_formula": formula,
                "index_number": index_no,
                "smiles": smiles,
                "tonnage_band": item.get("tonnageBand", ""),
                "regulatory_processes": process_names,
                "source": "ECHA",
            })
        return out
