from fastapi import APIRouter, Query

from backend.api.kotra_adapter import KotraAdapter
from backend.api.naver_adapter import NaverAdapter
from backend.api.routes.utils import handle_adapter_result as _handle_result

router = APIRouter()
adapter = KotraAdapter()
naver_adapter = NaverAdapter()


@router.get("/news")
def get_market_news(
    q: str = Query(..., description="Search keyword"),
    country: str = Query("", description="Country filter"),
    page: int = 1,
    limit: int = Query(10, ge=1, le=50),
):
    result = adapter.search_market_news(keyword=q, country=country or "", page_no=page, num_of_rows=limit)
    return _handle_result(result)


@router.get("/overseas-market-news")
def get_overseas_market_news(
    q: str = Query("", description="Search keyword"),
    country: str = Query("", description="Country filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    result = adapter.search_overseas_market_news(
        keyword=q,
        country=country,
        page_no=page,
        num_of_rows=limit,
    )
    return _handle_result(result)


@router.get("/national-info")
def get_national_info(
    country_code: str = Query(..., description="ISO-3166 alpha-2 country code (e.g., KR, US, VN)"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    result = adapter.search_national_information(
        iso_country_code=country_code,
        page_no=page,
        num_of_rows=limit,
    )
    return _handle_result(result)


@router.get("/import-regulations")
def get_import_regulations(
    country_code: str = Query("", description="ISO-3166 alpha-2 country code"),
    keyword: str = Query("", description="Product keyword (optional)"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    result = adapter.search_import_restriction_items(
        keyword=keyword,
        country_code=country_code,
        page_no=page,
        num_of_rows=limit,
    )
    return _handle_result(result)


@router.get("/enterprise-success")
def get_enterprise_success(
    keyword: str = Query("", description="Keyword (optional)"),
    country: str = Query("", description="Country name (optional)"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    result = adapter.search_enterprise_success_cases(
        keyword=keyword,
        country=country,
        page_no=page,
        num_of_rows=limit,
    )
    return _handle_result(result)


@router.get("/tourism-kr")
def get_tourism_korean(
    keyword: str = Query("", description="Search keyword"),
    area_code: str = Query("", description="Area code (optional)"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    result = adapter.search_tourism_korean(
        keyword=keyword,
        area_code=area_code,
        page_no=page,
        num_of_rows=limit,
    )
    return _handle_result(result)


@router.get("/tourism-en")
def get_tourism_english(
    keyword: str = Query("", description="Search keyword"),
    area_code: str = Query("", description="Area code (optional)"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    result = adapter.search_tourism_english(
        keyword=keyword,
        area_code=area_code,
        page_no=page,
        num_of_rows=limit,
    )
    return _handle_result(result)


@router.get("/strategy")
def get_entry_strategy(
    country: str = Query("", description="Country filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    result = adapter.search_entry_strategy(country=country, page_no=page, num_of_rows=limit)
    return _handle_result(result)


@router.get("/prices")
def get_price_info(
    country: str = Query("", description="Country filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    result = adapter.search_price_info(country=country, page_no=page, num_of_rows=limit)
    return _handle_result(result)


@router.get("/fraud")
def get_fraud_cases(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    result = adapter.search_fraud_cases(page_no=page, num_of_rows=limit)
    return _handle_result(result)


@router.get("/naver-news")
def get_naver_news(
    q: str = Query(..., description="Search keyword"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=30),
):
    start = ((page - 1) * limit) + 1
    result = naver_adapter.search_news(keyword=q, start=start, display=limit, sort="date")
    return _handle_result(result)
