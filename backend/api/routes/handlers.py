"""Handling-site profile routes."""

from __future__ import annotations

from fastapi import APIRouter, Query

from backend.api.handlers_adapter import HandlingSiteAdapter
from backend.core.terminology_db import TerminologyDB

router = APIRouter()
adapter = HandlingSiteAdapter()


@router.get("")
def get_handlers(
    chem_id: str = Query("", description="ChemIP/KOSHA chemical id"),
    cas: str = Query("", description="CAS number"),
    name: str = Query("", description="Korean or English chemical name"),
    name_en: str = Query("", description="English chemical name"),
    year: int = Query(2024, ge=2000, le=2100),
    accident_years: int = Query(5, ge=1, le=10),
    facility_limit: int = Query(10, ge=1, le=50),
):
    """Query PRTR/facility/accident signals by id, CAS, or name."""
    meta = {}
    aliases: list[str] = []
    if chem_id:
        with TerminologyDB() as db:
            meta = db.get_chemical_meta_by_chem_id(chem_id) or db.get_chemical_meta_by_cas(chem_id) or {}
            aliases = [item["alias"] for item in db.get_aliases_for_chemical(chem_id, limit=24)] if meta else []

    query_cas = meta.get("cas_no") or cas or chem_id
    query_name = meta.get("name") or name
    query_name_en = meta.get("name_en") or name_en

    return {
        "chem_id": chem_id,
        "chemical": meta or None,
        **adapter.build_profile(
            cas_no=query_cas,
            name=query_name,
            name_en=query_name_en,
            aliases=aliases,
            year=year,
            accident_years=accident_years,
            facility_limit=facility_limit,
        ),
    }
