"""Chemical accident cases (data.go.kr 1480802 iciscsc) for the last N years, filtered by material terms."""
from __future__ import annotations

import logging
from typing import Any

from backend.api.http_client import safe_get
from backend.api.text_utils import xml_item_fields
from backend.config.settings import settings

logger = logging.getLogger("backend.api.handlers_adapter")  # same logger name as before the split

CHEMICAL_ACCIDENT_URL = "http://apis.data.go.kr/1480802/iciscsc/csclist"
# XML tag → output field, in output order.
ACCIDENT_FIELDS = {
    "dataNo": "data_no",
    "cscDe": "date",
    "cscTy": "type",
    "area": "area",
    "addr": "address",
    "cause": "cause",
    "chem": "chemical",
    "place": "place",
    "summary": "summary",
}


class ChemicalAccidentsMixin:
    """Expects ``self._matches_text``."""

    def get_chemical_accidents(self, *, terms: list[str], years: int = 5) -> dict[str, Any]:
        if not settings.KOSHA_SERVICE_KEY_DECODED:
            return {
                "available": False,
                "source": "Chemical Accident API",
                "total": 0,
                "data": [],
                "message": "KOSHA/data.go.kr service key is not configured",
            }

        from datetime import datetime

        current_year = datetime.now().year
        rows: list[dict[str, str]] = []
        try:
            for year in range(current_year, current_year - max(1, years), -1):
                params = {
                    "ServiceKey": settings.KOSHA_SERVICE_KEY_DECODED,
                    "pageNo": 1,
                    "numOfRows": 200,
                    "yyyy": year,
                }
                response = safe_get(CHEMICAL_ACCIDENT_URL, params=params, timeout=15, cache_ttl=3600)
                response.raise_for_status()
                rows.extend(self._parse_accident_xml(response.text))

            matches = [
                row
                for row in rows
                if self._matches_text(row.get("chemical", ""), terms) or self._matches_text(row.get("summary", ""), terms)
            ]
            return {
                "available": True,
                "source": "Chemical Accident API",
                "total": len(matches),
                "data": matches[:20],
            }
        except Exception as exc:
            logger.exception("Chemical accident lookup failed")
            return {
                "available": False,
                "source": "Chemical Accident API",
                "total": 0,
                "data": [],
                "message": str(exc),
            }

    @staticmethod
    def _parse_accident_xml(xml_text: str) -> list[dict[str, str]]:
        return [
            {out_key: record.get(tag, "") for tag, out_key in ACCIDENT_FIELDS.items()}
            for record in xml_item_fields(xml_text, ACCIDENT_FIELDS)
        ]
