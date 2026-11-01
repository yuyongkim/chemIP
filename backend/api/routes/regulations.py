"""International regulatory data routes.

Aggregates data from overseas regulatory agencies (ECHA, EPA CompTox, etc.)

| File | Endpoints under /api/regulations |
|---|---|
| `regulations_echa.py` | /echa/* |
| `regulations_comptox.py` | /comptox/* |
| `regulations_exposure.py` | /niosh/*, /kischem/*, /ncis/* |
| this file | /international/{cas}, /trade-controls-catalog, /trade-controls/{cas}, /kotra/reach (between the ECHA and
CompTox routes, as before), /search, /intelligence/{chem_id}, /handlers/{chem_id} (logic in
backend/core/regulatory_intelligence.py) |

Sub-routers are included in the original route order, so matching and /openapi.json are unchanged.
"""

import logging

from fastapi import APIRouter, Query

from backend.api.routes import regulation_sources as _sources
from backend.api.routes import regulations_comptox, regulations_echa, regulations_exposure
from backend.api.routes.utils import handle_adapter_result
from backend.core import regulatory_intelligence as intel
from backend.core.regulatory_intelligence import (  # noqa: F401  (old private helpers, kept importable)
    _merge_unique_items,
    _search_first_success,
    _source_payload_from_result,
)
from backend.core.intl_regulatory_store import get_by_cas as get_international_by_cas
from backend.core.intl_named_lists import named_lists
from backend.core.terminology_db import TerminologyDB
from backend.core.trade_controls import build_trade_controls
from backend.core.trade_controls.catalog import catalog as trade_catalog

router = APIRouter()
logger = logging.getLogger(__name__)

# Same instances as regulation_sources; re-bound here so tests can monkeypatch regulations._echa etc.
_echa = _sources.echa
_comptox = _sources.comptox
_niosh = _sources.niosh
_kischem = _sources.kischem
_ncis = _sources.ncis
_handlers = _sources.handlers
_kotra = _sources.kotra

router.include_router(regulations_echa.router)


# ------------------------------------------------------------------
# Country listings and import/export controls (kept here: tests patch _kotra_import_restrictions)
# ------------------------------------------------------------------

@router.get("/international/{cas_no}")
def international_listings(cas_no: str):
    """국가별 물질 규제 목록 등재 내역(미국·EU·베트남·국제협약)을 CAS 로 조회한다.

    named_lists: 같은 CAS 의 상대국 법령 목록(intl_lists/) 등재. 화면이 국가별 목록에 함께 보인다(intl_named_lists.py).
    """
    out = get_international_by_cas(cas_no)
    if not out.get("error"):
        out["named_lists"] = named_lists(cas_no)
    return out


def _kotra_import_restrictions(country_code: str, keyword: str) -> dict:
    """수출 상대국의 KOTRA 수입규제 품목(/api/trade/import-regulations 와 같은 조회)."""
    return _kotra.search_import_restriction_items(keyword=keyword, country_code=country_code, page_no=1, num_of_rows=10)


@router.get("/trade-controls-catalog")
def trade_controls_catalog():
    """자료 규모 요약: 국내 법령 목록 수·법령 수, 상대국 목록 수, 인허가 건수."""
    return trade_catalog()


@router.get("/trade-controls/{cas_no}")
def trade_controls(
    cas_no: str,
    direction: str = Query("import", pattern="^(import|export)$", description="import(한국으로 수입) | export(한국에서 수출)"),
    country: str = Query("", max_length=8, description="상대국 코드(US, VN, EU, INTL 등). 비우면 한국 의무만"),
):
    """물질별 수출입 규제: 한국 수입·수출 의무, 통제 목록, HS 코드, 상대국 목록·KOTRA 수입규제."""
    return build_trade_controls(cas_no, direction, country, kotra_fetch=_kotra_import_restrictions)


@router.get("/kotra/reach")
def kotra_reach_qna(
    q: str = Query("", description="추가 검색어(물질명 등). 비우면 REACH 전반"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    """KOTRA 해외시장뉴스에서 REACH 관련 자료·상담 내용 검색.

    사장님이 언급한 'KOTRA 사이트의 REACH Q&A' 를 ChemIP 안에서 검색한다.
    결과는 KOTRA 원문(dream.kotra.or.kr) 링크를 포함한다.
    """
    term = f"REACH {q}".strip() if q.strip() else "REACH"
    result = _kotra.search_market_news(keyword=term, page_no=page, num_of_rows=limit)
    return handle_adapter_result(result)


router.include_router(regulations_comptox.router)
router.include_router(regulations_exposure.router)


def _load_chemical_context(chem_id: str) -> tuple[dict, list[dict]]:
    with TerminologyDB() as db:
        meta = db.get_chemical_meta_by_chem_id(chem_id) or db.get_chemical_meta_by_cas(chem_id)
        aliases = db.get_aliases_for_chemical(chem_id, limit=24) if meta else []
    return meta or {}, aliases


# ------------------------------------------------------------------
# Aggregated search across all regulatory sources
# ------------------------------------------------------------------

@router.get("/search")
def search_all_regulations(
    q: str = Query(..., min_length=1, description="Substance name, CAS, or EC number"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    """Search across all configured international regulatory sources."""
    return intel.build_aggregate_search(q, page, limit, echa=_echa, comptox=_comptox, niosh=_niosh, kischem=_kischem, ncis=_ncis)


@router.get("/intelligence/{chem_id}")
def regulatory_intelligence(chem_id: str, limit: int = Query(8, ge=1, le=20)):
    with TerminologyDB() as db:
        return intel.build_intelligence(db, chem_id, limit, ncis=_ncis, kischem=_kischem, niosh=_niosh, echa=_echa, comptox=_comptox)


@router.get("/handlers/{chem_id}")
def handling_site_profile(
    chem_id: str,
    year: int = Query(2024, ge=2000, le=2100),
    accident_years: int = Query(5, ge=1, le=10),
    facility_limit: int = Query(10, ge=1, le=50),
):
    """Return Korean handling-site, PRTR summary, and accident signals."""
    meta, aliases = _load_chemical_context(chem_id)
    return intel.handling_profile(meta, aliases, chem_id, _handlers, year=year, accident_years=accident_years, facility_limit=facility_limit)
