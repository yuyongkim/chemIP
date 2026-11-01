// All constants for the ChemIP API Worker live here. Other modules import from this file only.
// Values that operators may tune per deployment are read from env vars (wrangler.toml [vars])
// through `setting(env, name)`, with the default below.

export const DEFAULTS = {
  // Fallback proxy (any /api/* not implemented here goes to ORIGIN).
  ORIGIN: "",
  ORIGIN_TIMEOUT_MS: 8000,
  // Production host only: non-/api paths are fetched from this Pages project (routes/site_proxy.js). "" = off.
  SITE_ORIGIN: "",
  // true: the site HTML points scripts, CSS, static data and /api at SITE_ORIGIN (Seoul edge), routes/site_assets.js.
  SITE_ASSETS_DIRECT: "false",
  // Static per-substance files (AI evidence). `{id}` is replaced with the encoded chemId.
  STATIC_BASE: "",
  STATIC_SUBSTANCE_PATH: "/substances/{id}.json",
  // AI limits
  AI_MODEL: "claude-haiku-5-5",
  AI_MAX_TOKENS: 4000,
  AI_EFFORT: "low",
  AI_TIMEOUT_MS: 60000,
  AI_CLIENT_DAILY_LIMIT: 5,
  AI_GLOBAL_DAILY_CAP: 300,
  AI_CACHE_TTL_HOURS: 24 * 30,
  // Backend policy switch: false → KIPRIS rows never used as AI evidence (KIPRIS Plus 약관 제19조).
  KIPRIS_IN_AI: "false",
  // Upstream HTTP timeout (backend HTTP_TIMEOUT_SECONDS=10).
  UPSTREAM_TIMEOUT_MS: 10000,
  // CORS: comma-separated allowed origins ("*" allows all, no credentials are used).
  CORS_ORIGINS: "https://chemip.yule.pics,http://localhost:7000,http://127.0.0.1:7000",
};

export function setting(env, name) {
  const v = env && env[name];
  return v === undefined || v === null || v === "" ? DEFAULTS[name] : v;
}

export function intSetting(env, name) {
  const n = parseInt(setting(env, name), 10);
  return Number.isFinite(n) ? n : DEFAULTS[name];
}

export function boolSetting(env, name) {
  return String(setting(env, name)).trim().toLowerCase() === "true";
}

// Secrets (set with `npx wrangler secret put NAME`). Names only — values never live in code.
export const SECRETS = {
  ADMIN_TOKEN: "CHEMIP_ADMIN_TOKEN",
  ANTHROPIC: "ANTHROPIC_API_KEY",
  KOTRA: "KOTRA_API_KEY_DECODED",
  DRUG: "DRUG_API_KEY_DECODED",
  NAVER_ID: "NAVER_CLIENT_ID",
  NAVER_SECRET: "NAVER_CLIENT_SECRET",
  PUBMED: "PUBMED_API_KEY",
};

export const ANTHROPIC = {
  URL: "https://api.anthropic.com/v1/messages",
  VERSION: "2023-06-01",
  STATUS_BASE_URL: "https://api.anthropic.com",
};

// Static data from R2 (routes/static_data.js). Layout: scripts/static_export/CONTRACT.md (v1/p, v1/g, v1/tx, v1/pv; gzip bytes)
// and scripts/patent_export/README.md (v1/pat).
export const STATIC_DATA = {
  BINDING: "STATIC_DATA", // wrangler.toml [[r2_buckets]] binding → bucket chemip-data
  // tx = Texas TCEQ emission events by CAS (<v>/tx/<CAS>.json, gzip; CONTRACT.md "tx/<CAS>.json")
  // pv = statutory provisions by CAS, all countries in one file (<v>/pv/<CAS>.json, gzip; CONTRACT.md "pv/<CAS>.json")
  // gs = KOSHA guide full-text index (<v>/gs/{manifest,t_<n>,d_<guide_no>}.json, gzip; CONTRACT.md "gs/")
  // f = portal facts by CAS + identifier lookup shards (<v>/f/<CAS>.json, <v>/f/id_<n>.json, gzip; CONTRACT.md "f/<CAS>.json")
  // feed = incident feed (<v>/feed/latest.json and <v>/feed/by-cas/<CAS>.json, gzip; CONTRACT.md "feed/"); "feed/by-cas" is its own area
  // reg = regulation lists + change alerts (<v>/reg/{lists,changes}.json, changes.xml = RSS, <v>/reg/list/<id>[.<k>].json; CONTRACT.md "reg/")
  // oel = exposure-limit comparison by CAS (<v>/oel/<CAS>.json, gzip; CONTRACT.md "oel/<CAS>.json"); summary is g/oel_summary.json
  // prtr = PRTR facility map (<v>/prtr/index.json, <v>/prtr/<CAS>.json, gzip; CONTRACT.md "prtr/")
  // el = emergency exposure guidelines by CAS (<v>/el/<CAS>.json + <v>/el/index.json, gzip; CONTRACT.md "el/"); a 404 means "none"
  // rel = related substances by CAS (<v>/rel/<CAS>.json, gzip; CONTRACT.md "rel/<CAS>.json"); a 404 means "none"
  // tp = temperature-dependent property correlations by CAS (<v>/tp/<CAS>.json, index.json, licenses.json, gzip; CONTRACT.md "tp/"); a 404 means "none"
  // law = Korean law corpus (<v>/law/{index,toc,lists}.json, <v>/law/<doc id>.json, <v>/law/cas_<n>.json, gzip; CONTRACT.md "law/")
  AREAS: ["p", "g", "tx", "pv", "gs", "f", "feed", "feed/by-cas", "reg", "reg/list", "oel", "prtr", "rel", "tp", "el", "law"],
  // Areas whose files change between exports (the feed cron rewrites feed/latest.json): shorter cache than HIT_CACHE_CONTROL.
  AREA_CACHE_CONTROL: { feed: "public, max-age=900, stale-while-revalidate=3600", "feed/by-cas": "public, max-age=3600",
    reg: "public, max-age=3600, stale-while-revalidate=86400", "reg/list": "public, max-age=86400" },
  // File names served from an area. .xml = RSS (reg/changes.xml; its content-type comes from the R2 upload metadata).
  FILE_RE: /^[^/]+\.(json|xml)$/,
  // Substance → patent mapping (scripts/patent_export/README.md): <v>/pat/<CAS>/{index,<JUR>}.json.
  // index.json is plain JSON; <JUR>.json is gzip bytes with contentEncoding "gzip" (passed through as-is).
  PATENT_AREA: "pat",
  PATENT_CAS_RE: /^\d{2,7}-\d{2}-\d$/,
  PATENT_FILE_RE: /^(index|[A-Z]{2})\.json$/,
  VERSION_RE: /^v\d+$/,
  CONTENT_TYPE: "application/json",
  // Long cache (7 days). Files under one format root are replaced in place when data is re-exported,
  // so not "immutable"; a data refresh is visible within max-age (or bump the format root, v2/).
  HIT_CACHE_CONTROL: "public, max-age=604800, stale-while-revalidate=86400",
  MISS_CACHE_CONTROL: "public, max-age=60",
};

// Incident feed cron (src/cron_feed.js; production Cron Trigger "17 */6 * * *" in wrangler.toml — docs/portal/INCIDENT_FEED_v1.md).
// Same RSS address and csb_rss cap as scripts/portal_build/feed_config.py (CSB_RSS_URL, CSB_RSS_KEEP); change together.
export const FEED = {
  RSS_URL: "https://www.csb.gov/rss/news.aspx",
  SOURCE_ID: "csb_rss",
  LATEST_KEY: "v1/feed/latest.json", // R2 key (STATIC_DATA bucket)
  KEEP: 60, // newest csb_rss items kept in latest.json
  SUMMARY_CHARS: 280,
  MAX_BYTES: 2_000_000, // RSS body cap
  TIMEOUT_MS: 15000,
  USER_AGENT: "ChemIP incident feed (+https://chemip.yule.pics/chemip; free chemical-safety portal)",
};

// On-demand EU REACH registration status (routes/reach.js, src/reach/). One CAS per user request, answered from cache
// when possible; never a bulk or pre-crawl (ECHA legal notice 5.1.1: no systematic automated collection of the database).
// Same ECHA CHEM endpoints and summary rules as scripts/trade_controls/intl/parse_echa_reach.py and
// backend/core/reach_registration.py; change together.
export const REACH = {
  LIST_ID: "EU_REACH_REGISTERED",
  BASE: "https://chem.echa.europa.eu",
  SEARCH: "/api-substance/v1/substance", // ?searchText=<CAS>&pageIndex=1&pageSize=20
  SUBSTANCE: "/api-substance/v1/substance/", // + rmlId
  DOSSIERS: "/api-dossier-list/v1/dossier", // ?rmlId=&legislation=REACH&registrationStatuses=Active&pageIndex=&pageSize=
  SEARCH_PAGE_SIZE: 20,
  DOSSIER_PAGE_SIZE: 1000, // ethanol has ~720 active dossiers: one page
  DOSSIER_MAX_PAGES: 5,
  TIMEOUT_MS: 12000,
  USER_AGENT: "ChemIP REACH lookup (+https://chemip.yule.pics/chemip; free chemical-safety portal; one CAS per user request, cached)",
  ATTRIBUTION: "Source: European Chemicals Agency, https://echa.europa.eu/",
  // Cache: registered answers 30 days, "not registered" / ambiguous 7 days, upstream failures not cached.
  TTL_FOUND_S: 30 * 86400,
  TTL_NONE_S: 7 * 86400,
  CACHE_KEY_BASE: "https://chemip.yule.pics/__cache/reach/v1/", // Cache API key (never fetched)
  BROWSER_CACHE: { registered: "public, max-age=86400", not_registered: "public, max-age=3600", unknown: "no-store" },
  // Polite limits on cache misses only (D1 rate_events): all users together, and one anonymous client.
  UPSTREAM_MAX: 20, UPSTREAM_WINDOW_S: 60,
  CLIENT_MAX: 60, CLIENT_WINDOW_S: 3600,
  SCHEMA: 1,
};

export const KST_OFFSET_MS = 9 * 3600 * 1000; // days are counted in Korea time (backend usage/store.py)

export const OFFLINE_BODY = {
  error: "offline",
  message: "지금 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
};

// Upstream endpoints (copied from backend/config/settings.py and backend/api/*_client.py).
export const UPSTREAMS = {
  KOTRA_MARKET_NEWS: "https://apis.data.go.kr/B410001/kotra_overseasMarketNews/ovseaMrktNews/ovseaMrktNews",
  KOTRA_ENTRY_STRATEGY: "https://apis.data.go.kr/B410001/entryStrategy/entryStrategy",
  KOTRA_PRICE_INFO: "https://apis.data.go.kr/B410001/priceInfoByNatn/priceInfoByNatn",
  KOTRA_FRAUD_CASE: "https://apis.data.go.kr/B410001/cmmrcFraudCase/cmmrcFraudCase",
  KOTRA_NATIONAL_INFO: "https://apis.data.go.kr/B410001/kotra_nationalInformation/natnInfo/natnInfo",
  KOTRA_ENTERPRISE_SUCCESS: "https://apis.data.go.kr/B410001/compSucsCase/compSucsCase",
  KOTRA_IMPORT_RESTRICTION: "https://apis.data.go.kr/B410001/DS00000128/getDS00000128",
  MFDS_APPROVAL: [
    "https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnInq08",
    "https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnDtlInq08",
    "https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnInq07",
  ],
  MFDS_EASY_INFO: "https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList",
  OPENFDA_LABEL: "https://api.fda.gov/drug/label.json",
  PUBMED_ESEARCH: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
  PUBMED_ESUMMARY: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi",
  NAVER_NEWS: "https://openapi.naver.com/v1/search/news.json",
};

export const NAVER = {
  SOURCE: "naver",
  SOURCE_LABEL: "네이버 검색결과",
  PROVIDER_URL: "https://developers.naver.com/products/service-api/search/search.md",
  PASS_THROUGH_FIELDS: ["title", "originallink", "link", "description", "pubDate"],
};
