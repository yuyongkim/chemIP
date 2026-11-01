"""Every path, version and tuning value of the static exporter, defined once.

Other modules import from here; nothing else hard-codes a path, bucket count or URL.
"""
from __future__ import annotations

import os

# ---- source (read-only) ----
PROJECT = r"G:\MSDS"
TERM_DB = os.path.join(PROJECT, "data", "terminology.db")

# ---- output ----
VERSION = "v1"  # bump when any file format changes; the root path is the cache key
OUT_BASE = r"E:\dev-cache\chemip-static\out"
OUT = os.path.join(OUT_BASE, VERSION)          # everything under here is published
SEARCH_DIR = os.path.join(OUT, "search")       # -> Cloudflare Pages (plain JSON)
PAGES_DIR = os.path.join(OUT, "p")             # -> R2 (gzip bytes, .json name)
GLOBAL_DIR = os.path.join(OUT, "g")            # -> R2 (gzip bytes, .json name)
REPORTS = os.path.join(OUT_BASE, "reports")    # build/verify reports, never published

# ---- live API (verification only; production backend, be gentle) ----
API = "http://127.0.0.1:7011/api"
API_GAP_SECONDS = 0.5
API_TIMEOUT = 90
# matcher.is_bot() matches "bot", so verification calls are not counted as usage
API_USER_AGENT = "chemip-static-export-verify-bot/1"

# ---- parallelism ----
WORKERS = max(1, (os.cpu_count() or 4) - 2)
PRECOMPUTE_CHUNK = 400      # query keys per task (sorted, so neighbours share FTS terms)
PRECOMPUTE_MEMO = 4000      # per-process LRU of FTS row fetches
PAGES_CHUNK = 200           # substances per task

# ---- search index format (pilot values; also written to manifest.json) ----
DOC_BUCKET = 64             # d/<id // DOC_BUCKET>.json
ALIAS_BUCKETS = 1024        # a/<fnv1a32(normalize_alias(text)) % ALIAS_BUCKETS>.json
SHARD_LIMIT = 120_000       # raw bytes per token shard before splitting on a longer prefix
SEARCH_LIMIT = 20           # what the frontend requests (api.jsx useChemicalSearch)
FTS_COLS = {"name": 0, "cas_no": 1, "description": 2, "name_en": 3}
ALIAS_TYPES = ["name", "derived", "name_en", "derived_en", "cas", "ncis_synonym", "syn_registry", "syn_synonym"]
SYNONYM_TYPE_PREFIX = "syn_"  # alias rows from backend/data/search/synonyms.jsonl: "syn_" + tier, ref = one doc id per row

# ---- per-substance files ----
PAGE_FORMAT = 1             # "v" field inside every p/ object
GZIP_LEVEL = 9
CAS_PATTERN = r"^\d{2,7}-\d{2}-\d$"
DIRECTIONS = ("import", "export")
# chem_ids become file names / R2 keys; anything outside this set is skipped and reported
SAFE_KEY_PATTERN = r"^[0-9A-Za-z][0-9A-Za-z ,&\-]*[0-9A-Za-z,\-]$"

# ---- per-substance extras p/<chem_id>.x.json (extras_build.py; added 2026-10-28) ----
EXTRAS_FORMAT = 1           # "v" field inside every extras object
EXTRAS_SUFFIX = ".x.json"   # chem_ids never contain ".", so this cannot collide with p/<chem_id>.json
EXTRAS_CHUNK = 200          # items per pool task
# The exact query the UI sends (frontend/public/chemip/api_integrations.jsx / api_content.jsx). Change both together.
EXTRAS_PARAMS = {
    "guides": {"limit": 8},                                                  # route default
    "handlers": {"facility_limit": 50, "year": 2024, "accident_years": 5},   # year / accident_years = route defaults
    "incidents": {"limit": 8},
    "enforcement": {"limit": 6},
}
GUIDE_STATUS_NAME = "guides_status"  # g/guides_status.json = GET /api/guides/status
GUIDE_INDEX_NAME = "guide_index"      # g/guide_index.json = KOSHA guide list for the unified search (guide_index.py; added 2026-10-30)
GUIDE_INDEX_FORMAT = 1               # "v" field inside g/guide_index.json
# KOSHA guide full-text index gs/ (guide_text.py; added 2026-10-31). Bigram postings sharded by fnv1a32 % GUIDE_TEXT_SHARDS
# + one page-text file per guide. Format: CONTRACT.md "gs/ — KOSHA guide full text"; client guide_text_core.jsx.
GUIDE_TEXT_DIR = os.path.join(OUT, "gs")       # -> R2 (gzip bytes, .json name)
GUIDE_TEXT_FORMAT = 1                          # "v" field inside gs/ objects
GUIDE_TEXT_SHARDS = 512                        # also written to gs/manifest.json; the client reads it from there

# ---- per-CAS Texas emission events tx/<CAS>.json (tceq.py; added 2026-10-30) ----
TCEQ_DIR = os.path.join(OUT, "tx")             # -> R2 (gzip bytes, .json name)
# The exact query the UI sends (frontend/public/chemip/api_integrations.jsx useTceqEvents). Change both together.
TCEQ_PARAMS = {"limit": 6}

# ---- per-CAS statutory provisions pv/<CAS>.json (provisions.py; added 2026-10-30) ----
# Body per country = GET /api/integrations/provisions/{cas}?country=<CC>&name=<name_en> (EPC engineering query service,
# 127.0.0.1:15412). The only area that calls a live service: it is a shared PC service, so few threads.
PROVISIONS_DIR = os.path.join(OUT, "pv")       # -> R2 (gzip bytes, .json name)
PROVISIONS_FORMAT = 1                          # "v" field inside every pv/ object
PROVISIONS_CONCURRENCY = 4                     # parallel requests to the EPC query service
# Bounded CAS set: SEO tier 1 (indexable rows of the SEO build's facts report) ∪ the substance search benchmark list.
SEO_FACTS = r"E:\dev-cache\chemip-seo\reports\facts.jsonl"
BENCHMARK_SUBSTANCES = os.path.join(PROJECT, "scripts", "substance_search_benchmark", "data", "common_substances.json")

# ---- regulation lists + change alerts v1/reg/ (reg_export.py; service 6, added 2026-10-31) ----
REG_DIR = os.path.join(OUT, "reg")             # -> R2 (gzip bytes; .json names, changes.xml = RSS)
REG_FORMAT = 1                                 # "v" field inside every reg/ object
REG_PART_ROWS = 2500                           # rows per list file part (list/<id>.json, then list/<id>.<k>.json)
REG_CHANGES_SCAN = 20000                       # newest reg_changes rows read before folding into changes.json
# ---- named-list memberships newer than the p/ export: g/intl_add.json + g/intl_add_<n>.json (intl_add.py; added 2026-11-01) ----
INTL_ADD_NAME = "intl_add"                     # g/intl_add.json (head) + g/intl_add_<n>.json (n = fnv1a32(CAS) % buckets)
INTL_ADD_FORMAT = 1                            # "v" field inside those files
INTL_ADD_BUCKETS = 32                          # also written to the head; the client reads it from there
INTL_ADD_LISTS = ("EU_REACH_REGISTERED", "EU_DWD_ANNEX_I_PART_B")  # intl_lists/ ids not yet in p/ intl_lists
# ---- intl_regulatory codes newer than the p/ export: g/intl_reg_add.json + g/intl_reg_add_<n>.json (intl_reg_add.py; added 2026-11-01) ----
INTL_REG_ADD_NAME = "intl_reg_add"             # head + shards, n = fnv1a32(CAS) % buckets (same hash as intl_add)
INTL_REG_ADD_FORMAT = 1
INTL_REG_ADD_BUCKETS = 64
INTL_REG_ADD_CODES = ("US_DOT_HMT", "US_DOT_HMT_RQ", "JP_PRTR_CLASS1", "JP_PRTR_CLASS2", "JP_ISHL_LABEL_SDS", "JP_ISHL_TOKKA",
                      "JP_ISHL_ORGANIC", "JP_CSCL_PRIORITY", "CA_NPRI")  # scripts/load_country_lists_official.py
PORTAL_DB = os.path.join(PROJECT, "data", "portal_facts.db")  # read-only here (scripts/portal_build writes it)

# ---- PRTR facility map v1/prtr/ (prtr.py; service 13, added 2026-10-31) ----
PRTR_DIR = os.path.join(OUT, "prtr")           # -> R2 (gzip bytes, .json names): index.json + <CAS>.json
PRTR_DB = os.path.join(PROJECT, "data", "prtr", "prtr_facilities.sqlite")  # read-only (same cache as /api/handlers)
PRTR_INDEX_NAME = "index"                      # prtr/index.json = substances that have facility rows

# ---- portal facts v1/f/ + g/un_index.json (portal_facts.py; services 2-4, added 2026-10-31) ----
FACTS_DIR = os.path.join(OUT, "f")             # -> R2 (gzip bytes, .json names): <CAS>.json + id_<n>.json
FACTS_FORMAT = 1                               # "v" field inside every f/ object and g/un_index.json
FACTS_ID_BUCKETS = 128                         # f/id_<fnv1a32(key) % 128>.json = EC / KE / InChIKey → CAS lookup
UN_INDEX_NAME = "un_index"                     # g/un_index.json = UN number → transport summary + CAS list

# ---- per-CAS related substances rel/<CAS>.json (related.py; added 2026-10-31) ----
# Top REL_TOP substances sharing Korean statutory lists, GHS hazard classes (KOSHA MSDS section 2 H-statements) or a
# curated family, with the reason. Format: CONTRACT.md "rel/<CAS>.json"; client api_discovery.jsx fetchRelatedSubstances.
REL_DIR = os.path.join(OUT, "rel")             # -> R2 (gzip bytes, .json name)
REL_FORMAT = 1                                 # "v" field inside every rel/ object
REL_TOP = 8
REL_FAMILIES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "related_families.json")
REL_HAZARDS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "related_hazards.json")
SEED_TS = os.path.join(PROJECT, "frontend", "lib", "chemip-seed.ts")   # well-known substances (small ranking bonus)
# score = sim * cosine(law + ghs vectors, each feature weighted law|ghs * idf) + fam * shared families + prior (seed
# target). idf = ln(1 + N / df). Cosine, not a sum, so heavily regulated substances are not related to everything.
REL_WEIGHTS = {"sim": 10.0, "fam": 3.0, "law": 1.0, "ghs": 0.7}
REL_PRIOR = 0.3                 # added when the target is a well-known (seed) substance
REL_MIN_SCORE = 3.0             # weaker pairs are dropped (cosine 0.3, or one shared family)
REL_MAX_DF = 0.12               # features held by more than this share of targets are ignored (too common to mean much)
REL_REASONS_SHOWN = 2           # law / ghs names kept per item (the counts keep the rest)

# ---- per-CAS exposure limits oel/<CAS>.json + g/oel_summary.json (oel.py; service 5, added 2026-10-31) ----
OEL_DIR = os.path.join(OUT, "oel")             # -> R2 (gzip bytes, .json name)
OEL_FORMAT = 1                                 # "v" field inside every oel/ object and g/oel_summary.json
OEL_SUMMARY_NAME = "oel_summary"               # g/oel_summary.json = CAS list + counts (unified search, coverage)
OEL_LINK_ONLY = ("acgih_tlv", "gestis_ilv")    # sources rows shown as links only (no values are stored)

# ---- safety tools g/reactive_class.json + g/clp_annex6.json (safety_tools.py; services 7-8, added 2026-10-31) ----
SAFETY_FORMAT = 1                              # "v" field inside both files
REACTIVE_CLASS_NAME = "reactive_class"         # g/reactive_class.json = CAS -> reactive classes (portal_facts.db reactive_class)
CLP_ANNEX6_NAME = "clp_annex6"                 # g/clp_annex6.json = CAS -> CLP Annex VI entries (scripts/portal_build/annex6.py)

# ---- verification ----
VERIFY_SEED = 20261027
VERIFY_PAGES = 200
ASSEMBLY_COUNTRIES = ["", "US", "EU", "NL", "CN", "JP", "VN", "KR", "MX", "IN", "PK", "INTL"]
ASSEMBLY_SAMPLE = 150
TEST_QUERIES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_queries.json")

# ---- R2 ----
R2_BUCKET = "chemip-data"
R2_CONCURRENCY = 8
R2_SAMPLE_PAGES = 1000
NPM_CACHE = r"E:\dev-cache\npm"
WRANGLER_LOGS = r"E:\dev-cache\chemip-static\wrangler-logs"  # keep wrangler debug logs off C:
