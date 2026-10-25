import os
from dotenv import load_dotenv
from typing import List

load_dotenv()

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _resolve_path(env_value: str | None, fallback_relative_path: str) -> str:
    raw = env_value or fallback_relative_path
    if os.path.isabs(raw):
        return raw
    return os.path.normpath(os.path.join(PROJECT_ROOT, raw))


def _int_env(name: str, default: int) -> int:
    """Parse an int env var, falling back to ``default`` on missing/invalid.

    A malformed numeric env var (e.g. ``HTTP_TIMEOUT_SECONDS=``) must never
    raise at import time — that would crash startup and, under PM2's
    max_restarts limit, take the backend permanently offline.
    """
    raw = os.getenv(name)
    if raw is None or str(raw).strip() == "":
        return default
    try:
        return int(str(raw).strip())
    except (TypeError, ValueError):
        import logging
        logging.getLogger(__name__).warning(
            "Invalid int for env %s=%r; using default %s", name, raw, default
        )
        return default


def _bool_env(name: str, default: bool) -> bool:
    """Parse a true/false env var; anything unrecognised keeps ``default``."""
    raw = os.getenv(name)
    if raw is None or str(raw).strip() == "":
        return default
    value = str(raw).strip().lower()
    if value in ("1", "true", "yes", "on"):
        return True
    if value in ("0", "false", "no", "off"):
        return False
    return default


def _list_env(name: str, default: list[str]) -> list[str]:
    """Parse a comma-separated env var into a list of non-empty tokens."""
    raw = os.getenv(name)
    if raw is None or str(raw).strip() == "":
        return list(default)
    return [part.strip() for part in str(raw).split(",") if part.strip()]


def _float_env(name: str, default: float) -> float:
    """Parse a float env var, falling back to ``default`` on missing/invalid."""
    raw = os.getenv(name)
    if raw is None or str(raw).strip() == "":
        return default
    try:
        return float(str(raw).strip())
    except (TypeError, ValueError):
        import logging
        logging.getLogger(__name__).warning(
            "Invalid float for env %s=%r; using default %s", name, raw, default
        )
        return default


class Settings:
    # API Keys
    KOSHA_SERVICE_KEY_ENCODED = os.getenv("KOSHA_SERVICE_KEY_ENCODED", "")
    KOSHA_SERVICE_KEY_DECODED = os.getenv("KOSHA_SERVICE_KEY_DECODED", "")
    KOSHA_API_KEY = KOSHA_SERVICE_KEY_DECODED

    # Default to decoded key for requests
    KOSHA_SERVICE_KEY = KOSHA_SERVICE_KEY_DECODED

    # Legacy base URLs (kept for scripts/*). The backend adapter now picks routes
    # from KOSHA_MSDS_ROUTES — profiles live in backend/api/kosha_msds_routes.py.
    KOSHA_API_URL = "https://msds.kosha.or.kr/openapi/service/msdschem"
    KOSHA_FALLBACK_API_URL = "https://apis.data.go.kr/B552468/msdschem"
    # Ordered route list. First = licensed data.go.kr 15157612 (msdschem1);
    # the rest are the pre-2026-10 routes, tried only when the first fails.
    KOSHA_MSDS_ROUTES = _list_env("KOSHA_MSDS_ROUTES", ["datagokr", "datagokr_legacy", "kosha_direct"])

    # KIPRIS API
    KIPRIS_API_KEY = os.getenv("KIPRIS_API_KEY", "")
    KIPRIS_API_URL = "http://plus.kipris.or.kr/kipo-api/kipi/patUtiModInfoSearchSevice/getWordSearch"
    # KIPRIS Plus 이용약관 제19조 — 공개 화면 노출·AI 근거 사용 스위치 (기본: 현행 유지)
    KIPRIS_PUBLIC_DISPLAY = _bool_env("KIPRIS_PUBLIC_DISPLAY", True)
    KIPRIS_IN_AI = _bool_env("KIPRIS_IN_AI", True)

    # KOTRA API
    KOTRA_API_KEY_DECODED = os.getenv("KOTRA_API_KEY_DECODED", "")
    KOTRA_API_KEY_ENCODED = os.getenv("KOTRA_API_KEY_ENCODED", "")
    KOTRA_SERVICE_KEY = KOTRA_API_KEY_DECODED

    KOTRA_MARKET_NEWS_URL = os.getenv(
        "KOTRA_MARKET_NEWS_URL",
        "https://apis.data.go.kr/B410001/kotra_overseasMarketNews/ovseaMrktNews/ovseaMrktNews",
    )
    KOTRA_ENTRY_STRATEGY_URL = os.getenv(
        "KOTRA_ENTRY_STRATEGY_URL",
        "https://apis.data.go.kr/B410001/entryStrategy/entryStrategy",
    )
    KOTRA_PRICE_INFO_URL = os.getenv(
        "KOTRA_PRICE_INFO_URL",
        "https://apis.data.go.kr/B410001/priceInfoByNatn/priceInfoByNatn",
    )
    KOTRA_FRAUD_CASE_URL = os.getenv(
        "KOTRA_FRAUD_CASE_URL",
        "https://apis.data.go.kr/B410001/cmmrcFraudCase/cmmrcFraudCase",
    )
    KOTRA_NATIONAL_INFO_URL = os.getenv(
        "KOTRA_NATIONAL_INFO_URL",
        "https://apis.data.go.kr/B410001/kotra_nationalInformation/natnInfo/natnInfo",
    )
    KOTRA_ENTERPRISE_SUCCESS_URL = os.getenv(
        "KOTRA_ENTERPRISE_SUCCESS_URL",
        "https://apis.data.go.kr/B410001/compSucsCase/compSucsCase",
    )
    KOTRA_IMPORT_RESTRICTION_URL = os.getenv(
        "KOTRA_IMPORT_RESTRICTION_URL",
        "https://apis.data.go.kr/B410001/DS00000128/getDS00000128",
    )

    # Tourism API (Korea Tour API)
    TOURISM_API_KEY_DECODED = os.getenv("TOURISM_API_KEY_DECODED", "")
    TOURISM_KOREAN_URL = os.getenv(
        "TOURISM_KOREAN_URL",
        "https://apis.data.go.kr/B551011/KorPetTourService2/areaBasedList2",
    )
    TOURISM_ENGLISH_URL = os.getenv(
        "TOURISM_ENGLISH_URL",
        "https://apis.data.go.kr/B551011/EngService2/searchFestival2",
    )

    # Drug API
    DRUG_API_KEY_DECODED = os.getenv("DRUG_API_KEY_DECODED", "")
    DRUG_API_KEY_ENCODED = os.getenv("DRUG_API_KEY_ENCODED", "")
    DRUG_SERVICE_KEY = DRUG_API_KEY_DECODED
    # MFDS 의약품 제품 허가정보 (data.go.kr 15095677). Tried in order; the next
    # one is used when a route errors or returns no rows.
    MFDS_APPROVAL_URLS = _list_env("MFDS_APPROVAL_URLS", [
        "https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnInq08",
        "https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnDtlInq08",
        "https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnInq07",
    ])

    # Naver Search API
    NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID", "")
    NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET", "")

    # PRTR / facility data
    PRTR_ACCESS_KEY = os.getenv("PRTR_ACCESS_KEY", "") or os.getenv("PRTR_API", "")
    HAZMAT_FACILITY_API_KEY = os.getenv("HAZMAT_FACILITY_API_KEY", "") or os.getenv("유해화학시설_API", "")

    # EPA CompTox (US toxicity/exposure data)
    COMPTOX_API_KEY = os.getenv("COMPTOX_API_KEY", "")

    # Local LLM (Ollama)
    LLM_ENABLED = os.getenv("LLM_ENABLED", "true").lower() == "true"
    LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://localhost:11434")
    LLM_MODEL = os.getenv("LLM_MODEL", "qwen3:8b")
    LLM_TIMEOUT_SECONDS = _int_env("LLM_TIMEOUT_SECONDS", 60)
    LLM_MAX_TOKENS = _int_env("LLM_MAX_TOKENS", 1024)
    LLM_TEMPERATURE = _float_env("LLM_TEMPERATURE", 0.3)

    # Runtime defaults
    HTTP_TIMEOUT_SECONDS = _int_env("HTTP_TIMEOUT_SECONDS", 10)
    HTTP_MAX_RETRIES = _int_env("HTTP_MAX_RETRIES", 3)
    HTTP_BACKOFF_FACTOR = _float_env("HTTP_BACKOFF_FACTOR", 0.5)
    HTTP_CACHE_ENABLED = os.getenv("HTTP_CACHE_ENABLED", "true").lower() == "true"
    HTTP_CACHE_TTL_SECONDS = _int_env("HTTP_CACHE_TTL_SECONDS", 300)
    RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "false").lower() == "true"
    RATE_LIMIT_WINDOW_SECONDS = _int_env("RATE_LIMIT_WINDOW_SECONDS", 60)
    RATE_LIMIT_MAX_REQUESTS = _int_env("RATE_LIMIT_MAX_REQUESTS", 120)

    # Data paths
    TERMINOLOGY_DB_PATH = _resolve_path(os.getenv("TERMINOLOGY_DB_PATH"), "./data/terminology.db")
    GLOBAL_PATENT_INDEX_DB_PATH = _resolve_path(
        os.getenv("GLOBAL_PATENT_INDEX_DB_PATH"),
        "./data/global_patent_index.db",
    )
    USPTO_INDEX_DB_PATH = _resolve_path(os.getenv("USPTO_INDEX_DB_PATH"), "./data/uspto_index.db")
    KOSHA_GUIDE_DATA_DIR = _resolve_path(
        os.getenv("KOSHA_GUIDE_DATA_DIR"),
        "./data/kosha_guide",
    )

    # External access API key (required when accessed from outside localhost)
    CHEMIP_API_KEY: str = os.getenv("CHEMIP_API_KEY", "")

    # CORS settings (comma-separated)
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

    @property
    def cors_origins_list(self) -> List[str]:
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def cors_allow_credentials(self) -> bool:
        return self.CORS_ORIGINS != "*"


settings = Settings()
