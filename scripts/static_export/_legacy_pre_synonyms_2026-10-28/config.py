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
ALIAS_TYPES = ["name", "derived", "name_en", "derived_en", "cas", "ncis_synonym"]

# ---- per-substance files ----
PAGE_FORMAT = 1             # "v" field inside every p/ object
GZIP_LEVEL = 9
CAS_PATTERN = r"^\d{2,7}-\d{2}-\d$"
DIRECTIONS = ("import", "export")
# chem_ids become file names / R2 keys; anything outside this set is skipped and reported
SAFE_KEY_PATTERN = r"^[0-9A-Za-z][0-9A-Za-z ,&\-]*[0-9A-Za-z,\-]$"

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
