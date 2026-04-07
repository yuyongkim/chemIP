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


class Settings:
    # API Keys
    KOSHA_SERVICE_KEY_ENCODED = os.getenv("KOSHA_SERVICE_KEY_ENCODED", "")
    KOSHA_SERVICE_KEY_DECODED = os.getenv("KOSHA_SERVICE_KEY_DECODED", "")
    KOSHA_API_KEY = KOSHA_SERVICE_KEY_DECODED

    # Default to decoded key for requests
    KOSHA_SERVICE_KEY = KOSHA_SERVICE_KEY_DECODED

    KOSHA_API_URL = "https://msds.kosha.or.kr/openapi/service/msdschem"
    KOSHA_FALLBACK_API_URL = "https://apis.data.go.kr/B552468/msdschem"

    # KIPRIS API
    KIPRIS_API_KEY = os.getenv("KIPRIS_API_KEY", "")
    KIPRIS_API_URL = "http://plus.kipris.or.kr/kipo-api/kipi/patUtiModInfoSearchSevice/getWordSearch"

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

    # Naver Search API
    NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID", "")
    NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET", "")

    # EPA CompTox (US toxicity/exposure data)
    COMPTOX_API_KEY = os.getenv("COMPTOX_API_KEY", "")

    # Local LLM (Ollama)
    LLM_ENABLED = os.getenv("LLM_ENABLED", "true").lower() == "true"
    LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://localhost:11434")
    LLM_MODEL = os.getenv("LLM_MODEL", "qwen3:8b")
    LLM_TIMEOUT_SECONDS = int(os.getenv("LLM_TIMEOUT_SECONDS", "60"))
    LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "1024"))
    LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.3"))

    # Runtime defaults
    HTTP_TIMEOUT_SECONDS = int(os.getenv("HTTP_TIMEOUT_SECONDS", "10"))
    HTTP_MAX_RETRIES = int(os.getenv("HTTP_MAX_RETRIES", "3"))
    HTTP_BACKOFF_FACTOR = float(os.getenv("HTTP_BACKOFF_FACTOR", "0.5"))
    RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "false").lower() == "true"
    RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
    RATE_LIMIT_MAX_REQUESTS = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "120"))

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
