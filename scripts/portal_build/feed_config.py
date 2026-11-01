"""Incident feed (service 9): sources, licenses, fetch settings and the feed_items schema. Data only, no logic.

One place for every value the collector (incident_feed.py), the exporter (scripts/static_export/feed.py) and the tests
share. The Worker cron (cloudflare/worker/src/config.js FEED) repeats the CSB RSS address and the csb_rss caps; change
both together. Format of the exported files: scripts/static_export/CONTRACT.md "feed/".
"""
from __future__ import annotations

# feed_items: one row per feed entry. JSON-array columns hold lists (cas and chem_names are parallel lists).
# Added to portal_facts.db with IF NOT EXISTS (docs/portal/PORTAL_SERVICES_v1.md 3, service 9; INCIDENT_FEED_v1.md).
SCHEMA = """
CREATE TABLE IF NOT EXISTS feed_items (
  id TEXT PRIMARY KEY,              -- "<source_id>:<id in that source>"
  date TEXT,                        -- YYYY-MM-DD, YYYY-MM or YYYY ("" = unknown)
  title TEXT NOT NULL,
  url TEXT,                         -- original page (always shown as the link)
  source_id TEXT NOT NULL,          -- sources.source_id (license, attribution)
  cas TEXT NOT NULL DEFAULT '[]',   -- JSON array of CAS numbers
  chem_names TEXT NOT NULL DEFAULT '[]', -- JSON array, same order as cas
  equipment TEXT NOT NULL DEFAULT '[]',  -- JSON array of equipment tokens (Chem_Eng incident equipment)
  discipline TEXT NOT NULL DEFAULT '[]', -- JSON array of EPC discipline keys (backend/integrations/equipment_disciplines.py)
  country TEXT NOT NULL DEFAULT '', -- ISO 3166-1 alpha-2, "" = unknown
  summary TEXT NOT NULL DEFAULT '', -- short text; always "" for press items (title and link only)
  lang TEXT NOT NULL DEFAULT '',
  fetched_at TEXT);
CREATE INDEX IF NOT EXISTS feed_items_date ON feed_items (date);
CREATE INDEX IF NOT EXISTS feed_items_source ON feed_items (source_id);
"""

# Chem_Eng incidents.db `incident.source` → feed source_id. Names and licenses come from that DB's `source` table
# (copied as they are, so the per-source license labels stay exact).
CHEMENG_SOURCES = {
    "csb": "chemeng_csb",
    "rmp": "chemeng_rmp",
    "emars": "chemeng_emars",
    "kosha": "chemeng_kosha",
    "nics": "chemeng_nics",
}
CHEMENG_ATTRIBUTION = {"emars": "Source: eMARS, European Commission JRC / EEA"}  # CC BY 4.0 credit line

# Live sources fetched by the collector (and, for csb_rss, by the Worker cron).
CSB_RSS_URL = "https://www.csb.gov/rss/news.aspx"  # "All News" (www.csb.gov/media-room/rss-feeds/)
LIVE_SOURCES = {
    "csb_rss": {
        "name": "U.S. Chemical Safety Board (CSB) news RSS",
        "url": "https://www.csb.gov/media-room/rss-feeds/",
        "license": "Public domain (US Government work, 17 U.S.C. 105)",
    },
    "press_gnews": {
        "name": "Google News RSS search (press headlines)",
        "url": "https://news.google.com/",
        "license": "Headlines and links only; articles belong to each publisher. No text or images are stored",
    },
}

# Press: Google News RSS search. Only title, link, date and outlet name are kept (PORTAL_SERVICES_v1.md 2).
PRESS_QUERIES = [
    {"q": "화학사고", "hl": "ko", "gl": "KR", "ceid": "KR:ko"},
    {"q": "화학물질 누출", "hl": "ko", "gl": "KR", "ceid": "KR:ko"},
    {"q": "chemical plant explosion", "hl": "en-US", "gl": "US", "ceid": "US:en"},
    {"q": "chemical leak", "hl": "en-US", "gl": "US", "ceid": "US:en"},
]
PRESS_RSS_URL = "https://news.google.com/rss/search"
PRESS_KEEP_DAYS = 120      # press rows older than this are dropped on each run
CSB_RSS_KEEP = 60          # newest csb_rss rows kept (the feed has 20; older runs add up)

HTTP_TIMEOUT = 30
HTTP_RETRIES = 3
MAX_DOWNLOAD_BYTES = 5_000_000
USER_AGENT = "ChemIP incident feed (+https://chemip.yule.pics/chemip; free chemical-safety portal)"

SUMMARY_CHARS = 280

# Chemical names used to tag press headlines with a CAS (from the Chem_Eng `chemical` table).
NAME_MATCH_MIN_LATIN = 4
NAME_MATCH_MIN_HANGUL = 2
NAME_MATCH_SKIP = {"폐산", "폐액", "유증기", "미상물질", "혼합물", "가스", "oil", "gas", "acid", "waste", "water", "steam", "air", "물", "증기"}

# Export (scripts/static_export/feed.py)
EXPORT_FORMAT = 1
LATEST_N = 300              # newest items overall
LATEST_PER_SOURCE_MAX = 100 # at most this many of one source among the newest LATEST_N (press would fill the list)
LATEST_PER_SOURCE = 30      # plus the newest items of every source, so a source filter is never empty
BY_CAS_MAX = 100            # items per by-cas file (newest first); `total` keeps the full count
TOP_SUBSTANCES = 60         # substances listed in latest.json for the substance filter
