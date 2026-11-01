"""Handling-site and facility signals for chemical detail pages.

The official PRTR OpenAPI currently redirects to the new MCEE host and returns
404 for the documented paths, so this adapter combines the live sources that do
work with any locally cached PRTR summary exports.

HandlingSiteAdapter is assembled from backend/api/handling_sites/ (one source per file); this module keeps the
import path ``from backend.api.handlers_adapter import HandlingSiteAdapter`` and the old module-level names.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from backend.api.handling_sites.accidents import CHEMICAL_ACCIDENT_URL, ChemicalAccidentsMixin
from backend.api.handling_sites.gyeonggi import GYEONGGI_RISK_MANAGE_URL, GyeonggiFacilitiesMixin
from backend.api.handling_sites.prtr_cache import PrtrCacheMixin
from backend.api.handling_sites.prtr_live import PRTR_BASE_URL, PrtrLiveMixin
from backend.api.handling_sites.text import (  # noqa: F401  (re-exported for old imports)
    TermMatchingMixin,
    _compact,
    _digits,
    _normalize_cas,
    _normalize_term,
    _pick,
    _reported_total_kg,
    _to_number,
    _tokenize_materials,
)
from backend.config.settings import PROJECT_ROOT, settings

__all__ = ["HandlingSiteAdapter", "PRTR_BASE_URL", "GYEONGGI_RISK_MANAGE_URL", "CHEMICAL_ACCIDENT_URL"]


class HandlingSiteAdapter(TermMatchingMixin, PrtrCacheMixin, PrtrLiveMixin, GyeonggiFacilitiesMixin, ChemicalAccidentsMixin):
    def __init__(self) -> None:
        self.gyeonggi_key = settings.HAZMAT_FACILITY_API_KEY
        self.data_dir = Path(PROJECT_ROOT) / "data" / "prtr"
        self.prtr_db_path = self.data_dir / "prtr_facilities.sqlite"

    def build_profile(
        self,
        *,
        cas_no: str = "",
        name: str = "",
        name_en: str = "",
        aliases: list[str] | None = None,
        year: int = 2024,
        accident_years: int = 5,
        facility_limit: int = 10,
    ) -> dict[str, Any]:
        terms = self._build_terms(name=name, name_en=name_en, aliases=aliases or [])
        return {
            "query": {
                "cas_no": cas_no,
                "name": name,
                "name_en": name_en,
                "terms": terms,
                "year": year,
                "facility_limit": facility_limit,
            },
            "sources": {
                "prtr_summary": self.get_prtr_summary(cas_no=cas_no, terms=terms, year=year),
                "prtr_facilities": self.get_prtr_facilities(cas_no=cas_no, terms=terms, year=year, limit=facility_limit),
                "prtr_aggregates": self.get_prtr_aggregates(cas_no=cas_no, terms=terms, year=year),
                "gyeonggi_facilities": self.get_gyeonggi_facilities(terms=terms),
                "chemical_accidents": self.get_chemical_accidents(terms=terms, years=accident_years),
            },
        }
