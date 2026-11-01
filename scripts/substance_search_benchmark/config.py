"""Every path, URL and tuning value of the substance-search benchmark, defined once."""
from __future__ import annotations

import os

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.dirname(os.path.dirname(HERE))

# ---- inputs ----
SEED_TS = os.path.join(PROJECT, "frontend", "lib", "chemip-seed.ts")   # parsed, never copied
SOURCES = os.path.join(HERE, "data", "sources")
KCIA_RAW = os.path.join(SOURCES, "kcia_products_raw.json")             # fetched by fetch_kcia.py
KCIA_EXPANSION = os.path.join(SOURCES, "kcia_label_expansion.json")    # KCIA label -> English lookup names
KR_LISTS = os.path.join(PROJECT, "backend", "data", "trade_controls", "kr_lists")  # law.go.kr-derived lists
COMMON = os.path.join(HERE, "data", "common_substances.json")           # built by build_list.py
COMMON_MISSING = os.path.join(HERE, "data", "common_substances_unresolved.json")
PUBCHEM_NAMES = os.path.join(HERE, "data", "pubchem_names.json")        # fetched once by fetch_pubchem.py
CASES = os.path.join(HERE, "data", "benchmark_cases.json")              # built by build_cases.py
TERM_DB = os.path.join(PROJECT, "data", "terminology.db")               # read-only (fallback English names)

# ---- outputs ----
REPORTS = os.path.join(HERE, "reports")

# ---- targets ----
TARGETS = {
    "backend": "http://127.0.0.1:7011/api",
    "public": "https://chemip.yule.pics/api",
}
STATIC_SEARCH_DIR = r"E:\dev-cache\chemip-static\out\v1\search"
STATIC_EXPORT_DIR = os.path.join(PROJECT, "scripts", "static_export")
SEARCH_LIMIT = 20            # what the frontend requests
TOP_K = 3
API_GAP_SECONDS = {"backend": 0.15, "public": 0.5}
API_TIMEOUT = 60
# contains "bot" so backend usage counting skips it (matcher.is_bot)
USER_AGENT = "chemip-search-benchmark-bot/1"

# ---- source lists (owner decision 2026-10-28: authoritative lists only, each entry tagged) ----
KCIA_PAGES = {  # 한국화학산업협회(KCIA, 옛 한국석유화학협회 KPIA; www.kpia.or.kr 는 DNS 없음)
    "product_info": "https://kcia.kr/petrochemical-industry/product-info",
    "statistics": "https://kcia.kr/petrochemical-industry/statistics",
}
OSH_LISTS = ["KR_OSH_SPECIAL_MANAGED", "KR_OSH_PERMIT_REQUIRED"]   # 산안법 특별관리물질·허가대상물질
NCIS_SOURCE_URL = "https://apis.data.go.kr/B552584/kecoapi/ncissbstn/chemSbstnList"  # ncis_substance.classifications
SEED_SOURCE_URL = "frontend/lib/chemip-seed.ts (Wikimedia Pageviews ko + KR law lists, scripts/rank_pageviews.py)"
CATEGORY_ORDER = ["petrochem_KPIA", "accident_prep_97", "osha_kr_special", "seed_wiki"]  # name priority on merge

# ---- PubChem (benchmark inputs only) ----
PUBCHEM_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{cas}/property/IUPACName,Title/JSON"
PUBCHEM_GAP_SECONDS = 0.3

QUERY_TYPES = ["ko", "en", "iupac", "cas", "alias"]
