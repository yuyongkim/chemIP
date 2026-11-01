"""Gyeonggi-do risk-management facilities (openapi.gg.go.kr RiskManageTargetBizplc) filtered by material terms."""
from __future__ import annotations

import logging
from typing import Any

from backend.api.handling_sites.text import _pick, _to_number, _tokenize_materials
from backend.api.http_client import safe_get

logger = logging.getLogger("backend.api.handlers_adapter")  # same logger name as before the split

GYEONGGI_RISK_MANAGE_URL = "https://openapi.gg.go.kr/RiskManageTargetBizplc"


class GyeonggiFacilitiesMixin:
    """Expects ``self.gyeonggi_key`` and ``self._matches_text``."""

    def get_gyeonggi_facilities(self, *, terms: list[str]) -> dict[str, Any]:
        params: dict[str, Any] = {"Type": "json", "pIndex": 1, "pSize": 1000}
        if self.gyeonggi_key:
            params["KEY"] = self.gyeonggi_key

        try:
            response = safe_get(GYEONGGI_RISK_MANAGE_URL, params=params, timeout=15, cache_ttl=3600)
            response.raise_for_status()
            document = response.json()
            blocks = document.get("RiskManageTargetBizplc", [])
            rows = next((block.get("row", []) for block in blocks if isinstance(block, dict) and "row" in block), [])
            matches = []
            for row in rows:
                materials = _pick(row, "TRTMNT_ACDNT_PROVS_MTTR_DTLS")
                if terms and not self._matches_text(materials, terms):
                    continue
                matches.append(
                    {
                        "company_name": _pick(row, "BIZPLC_NM"),
                        "materials": _tokenize_materials(materials),
                        "materials_text": materials,
                        "sido": "경기도",
                        "sigun": _pick(row, "SIGUN_NM"),
                        "road_address": _pick(row, "REFINE_ROADNM_ADDR"),
                        "lot_address": _pick(row, "REFINE_LOTNO_ADDR"),
                        "latitude": _pick(row, "REFINE_WGS84_LAT"),
                        "longitude": _pick(row, "REFINE_WGS84_LOGT"),
                        "evacuation_facility": _pick(row, "RESEVC_FACLT_NM"),
                        "evacuation_distance_m": _to_number(row.get("RESEVC_FACLT_DSTN", 0)),
                    }
                )

            return {
                "available": True,
                "source": "Gyeonggi RiskManageTargetBizplc",
                "total": len(matches),
                "data": matches,
            }
        except Exception as exc:
            logger.exception("Gyeonggi facility lookup failed")
            return {
                "available": False,
                "source": "Gyeonggi RiskManageTargetBizplc",
                "total": 0,
                "data": [],
                "message": str(exc),
            }
