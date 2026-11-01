"""Every path, URL, threshold, weight and switch of the SEO page generator, defined once.

Other modules import from here. Nothing else hard-codes a path, tier size, URL or score weight.
"""
from __future__ import annotations

import os

# ---- source (read-only) ----
PROJECT = r"G:\MSDS"
TERM_DB = os.path.join(PROJECT, "data", "terminology.db")
# country names: the SPA's single source (parsed read-only, never imported as code)
INTL_REGIONS_JSX = os.path.join(PROJECT, "frontend", "public", "chemip", "intl_regions.jsx")
# live SEO seed list (Next route /chemip/cas/[cas] + live sitemap). Parsed at build time (seeds.py), never copied.
SEED_TS = os.path.join(PROJECT, "frontend", "lib", "chemip-seed.ts")
# search-console verification file that must ship at the site root on Pages
GOOGLE_VERIFY_FILE = os.path.join(PROJECT, "frontend", "public", "google5299d3d91ba2dbe2.html")
# site-root favicon the pages link to (/beaker-favicon.svg); copied so links resolve inside the output
FAVICON_FILE = os.path.join(PROJECT, "frontend", "public", "beaker-favicon.svg")

# ---- output (never under G:\MSDS) ----
OUT_BASE = r"E:\dev-cache\chemip-seo"
OUT = os.path.join(OUT_BASE, "out")              # publish root (maps to the Pages site root)
REPORTS = os.path.join(OUT_BASE, "reports")      # selection / validation reports, never published
SHOTS = os.path.join(OUT, "_screenshots")        # Playwright screenshots (exclude from deploy)

# ---- site ----
SITE = "https://chemip.yule.pics"
APP_PATH = "/chemip"                             # SPA entry = canonical (/chemip/ 는 Pages 가 /chemip 으로 308)
CAS_BASE = "/chemip/cas/"                        # page /chemip/cas/<CAS> (no slash) = file chemip/cas/<CAS>.html
LIST_BASE = "/chemip/cas/list/"                  # /chemip/cas/list/<list_id>/index.html
EN_CAS_BASE = "/chemip/en/cas/"                  # optional English pages
SITE_NAME = "ChemIP"

# SPA deep link that actually opens a substance (app.jsx readDeepLink + product.jsx ?chem=).
# ?cas= alone is only read by the request board, so it is NOT used here.
def app_link(chem_id: str) -> str:
    return f"{APP_PATH}?view=product&pv=chemical&chem={chem_id}"


# Substances without a KOSHA chem_id (some live seeds) open the SPA search for their CAS instead (?q= -> product view).
def app_search_link(cas: str) -> str:
    return f"{APP_PATH}?q={cas}"


# ---- selection (quality bar against scaled-content abuse) ----
# A page is eligible only if it has a KOSHA MSDS (section 2 present) AND at least one of:
QUALITY_BAR = {"kr_lists_min": 3, "permits_min": 1, "foreign_lists_min": 2}
# Tier sizes are totals. Live seeds (SEED_TIER) fill their tier first, regardless of the quality bar; the rest of each
# tier is the next best eligible substances by score. tier1 400 = 216 seeds + 184 top scorers (see README).
TIER_SIZES = {"tier1": 400, "tier2": 3000}
SEED_TIER = "tier1"                              # every live seed URL stays indexable
# Seeds whose seed-list name names a different or ambiguous substance; their page uses the generated (KOSHA/NCIS) name.
# 68424-85-1 is benzalkonium chloride, not benzyl chloride (100-44-7); 1308-04-9 is cobalt(III) oxide, not cobalt
# (7440-48-4); 16065-83-1 is the Cr(III) ion, and "크롬" is already 7440-47-3. Fix chemip-seed.ts, then drop them here.
SEED_NAME_USE_GENERATED = frozenset()  # 2026-10-28: 잘못된 시드 이름 3건을 chemip-seed.ts 에서 바로잡음
TIER_MIN_SCORE = {"tier1": 0.0, "tier2": 0.0}    # optional score floor per tier (see reports/selection.json score_floors)
SCORE_FLOORS_REPORTED = (2.5, 4, 6, 8, 10, 15, 20)
GENERATE_TIERS = ("tier1", "tier2")              # tiers that get a page file
INDEX_TIERS = ("tier1",)                         # tiers that are indexable + in sitemap; others get noindex,follow
# score = sum(weight * component); documented in README
SCORE_WEIGHTS = {
    "kr_lists": 1.0,          # Korean statutory list memberships (kr_lists/*.json)
    "ncis_reg": 1.0,          # NCIS hazard categories excluding pure inventory categories
    "permits": 2.0,           # permits / notifications triggered
    "foreign_lists": 1.0,     # foreign regulatory lists (intl_lists/, inventories excluded)
    "foreign_juris": 0.5,     # distinct foreign jurisdictions among those lists
    "controlled": 3.0,        # CWC / Australia Group / drug precursor lists
    "h_statements": 0.25,     # KOSHA MSDS H-statements (hazard depth)
}
# threshold grid reported so the owner can pick a different bar
THRESHOLD_GRID = {
    "kr_lists_min": (1, 2, 3, 5, 8),
    "permits_min": (1, 2, 3),
    "foreign_lists_min": (1, 2, 3, 5),
}

# Inventory-style lists say "this substance exists in commerce", not "this substance is regulated".
# They are shown on the page but never counted toward the quality bar or score.
INVENTORY_LIST_IDS = frozenset({"US_TSCA_INVENTORY", "CA_DSL", "CA_NDSL", "AU_AIIC_INVENTORY"})
INVENTORY_NCIS_CATEGORIES = frozenset({"기존화학물질"})
# kr_lists files that are not statutory lists (summaries / unverified bundles)
def is_real_kr_list(list_id: str) -> bool:
    return bool(list_id) and "unverified" not in list_id.lower() and not list_id.startswith("_")


# ---- SPA language alternates + glossary section of the sitemap (added 2026-10-31) ----
# The SPA (/chemip) renders English with ?lang=en (frontend/public/chemip/lang.jsx); index.html carries the same hreflang
# links and app_meta.jsx switches canonical to the ?lang=en URL in English. hreflang -> query appended to APP_PATH.
APP_LANG_QUERY = {"ko": "", "en": "?lang=en"}
APP_X_DEFAULT = "ko"
# Glossary term pages /chemip?view=glossary&term=<key> (glossary_terms.py reads the keys from the SPA data files).
CHEMIP_UI = os.path.join(PROJECT, "frontend", "public", "chemip")
GLOSSARY_VIEW = "glossary"
GLOSSARY_IN_SITEMAP = True   # still empty until app.jsx registers the glossary screen

# ---- page content limits ----
RELATED_COUNT = 5
LIST_PAGE_MIN = 3            # a per-list hub page is generated only if it would list >= this many pages
TITLE_MAX = 60
DESC_MAX = 155
ALT_NAMES_MAX = 6

# ---- optional English pages (generator support; default off) ----
ENABLE_EN = False

# ---- live API (validation only; production backend, be gentle) ----
API = "http://127.0.0.1:7011/api"
API_GAP_SECONDS = 0.55       # <= 2 req/s
API_TIMEOUT = 90
API_USER_AGENT = "chemip-seo-verify-bot/1"   # "bot" => not counted as usage
LIVE_SAMPLE = 20
# public sitemap currently served by Next (read-only fetch; compared with the static sitemap in live_sitemap.py)
LIVE_SITEMAP_URL = SITE + "/sitemap.xml"
SAMPLE_SEED = 20261027

# ---- screenshots ----
NODE_PATH = os.path.join(PROJECT, "frontend", "node_modules")
SHOT_WIDTHS = (390, 1440)
SHOT_COUNT = 3
