# ChemIP backend (FastAPI)

Entry: `uvicorn backend.main:app` (production: pm2 `T3-ChemIP-Backend`, port 7011).
Dependency direction: `main` → `server` / `api/routes` → `core`, `api/*_adapter` → `config`.
`core` never imports `api/routes`; adapters and the open `TerminologyDB` are passed into core functions.

## Entry and server plumbing

| File | Role |
|---|---|
| `main.py` | builds `app`: CORS, middleware in fixed order, error handler, router table, usage counter, health routes |
| `server/security.py` | localhost check, CSRF origin check, API-key auth, security headers |
| `server/rate_limit.py` | per-IP sliding-window rate limit (`_rate_limit_buckets` also importable from `backend.main`) |
| `server/request_log.py` | `x-request-id`, request summary log, audit log `logs/audit.log` |
| `server/errors.py` | global 500 handler (exception type only) |
| `server/health.py` | `/`, `/health`, `/ready` |
| `server/routers.py` | API router table `(module, prefix, tag)` — new area = one row |
| `config/settings.py` | all env/config values (`settings`, `PROJECT_ROOT`) |
| `config/prompts.py` | legacy document prompts (unused by routes) |

## Routes (`api/routes/`)

| File | Prefix / role |
|---|---|
| `chemicals.py` | `/api/chemicals` search, autocomplete, detail, linked drugs (logic: `core/msds_detail.py`, `core/drug_links.py`) |
| `regulations.py` | `/api/regulations` aggregator: international, trade-controls, kotra/reach, search, intelligence, handlers; includes the three below |
| `regulations_echa.py` | `/api/regulations/echa/*` |
| `regulations_comptox.py` | `/api/regulations/comptox/*` |
| `regulations_exposure.py` | `/api/regulations/niosh/*`, `/kischem/*`, `/ncis/*` |
| `regulation_sources.py` | the single adapter instances used by all regulation routes |
| `ai.py` | `/api/ai/analyze`, `/api/ai/llm-status`; includes `ai_assist.py` |
| `ai_assist.py` | `/api/ai/recommend`, `/summarize`, `/drug-analysis`, `/ask` |
| `patents.py` | `/api/patents` KIPRIS search/detail/policy; legacy `/global/{chem_id}`, `/uspto/{chem_id}` → 410 Gone unless `LEGACY_PATENT_INDEX_ROUTES=true` (never return local paths) |
| `patent_mapping.py` | `GET/HEAD /data/v1/pat/<CAS>/{index,<JUR>}.json` (not `/api`): substance → patent mapping files from `PATENT_MAPPING_DIR`, same URLs as the Cloudflare Worker; Next rewrites `/data/v1/pat/*` here |
| `trade.py`, `drugs.py`, `guides.py`, `handlers.py`, `integrations.py`, `feedback.py`, `usage.py`, `docs.py` | one API area each (prefix = file name) |
| `utils.py` | `handle_adapter_result` (adapter status → HTTP error) |

## External sources (`api/`)

| File | Role |
|---|---|
| `http_client.py` | shared `requests` session, retries, SSRF allow-list, in-memory response cache (`safe_get`) |
| `adapter_support.py` | shared `last_error` tracking, guarded call (Timeout/ConnectionError/Exception → error dict), `as_list` |
| `text_utils.py` | shared text/XML helpers (`normalize_text`, `xml_item_fields`, ...) |
| `echa_adapter.py` / `echa_parsing.py` | ECHA CHEM client / search-result parsing |
| `comptox_adapter.py` | EPA CompTox client |
| `kotra_adapter.py` / `kotra_parsing.py` / `kotra_mappers.py` | KOTRA client / payload parsing / item mapping |
| `handlers_adapter.py` + `handling_sites/` | `HandlingSiteAdapter` = PRTR cache, PRTR live portal, Gyeonggi facilities, chemical accidents (one file each) |
| `kosha_msds_adapter.py`, `kosha_msds_routes.py` | KOSHA MSDS client and its route profiles |
| `kischem_adapter.py`, `ncis_adapter.py`, `niosh_adapter.py` | Korean / NIOSH safety sources |
| `kipris_adapter.py`, `kipris_policy.py`, `patent_fetcher.py`, `uspto_adapter.py`, `global_patent_adapter.py`, `patent_index_base.py` | patents |
| `mfds_client.py`, `fda_client.py`, `pubmed_client.py`, `drug_adapter.py` | drug sources |
| `naver_adapter.py` | NAVER news (never used by AI paths) |

## Core (`core/`)

| File | Role |
|---|---|
| `terminology_db.py` + `terminology/` | `TerminologyDB` (data/terminology.db) assembled from mixins: schema, aliases, chemicals, msds, search |
| `mapping_store.py` | drug/guide mappings, English MSDS, AI cache (mixin of `TerminologyDB`) |
| `chemical_aliases.py` | alias normalisation and search candidates (pure) |
| `msds_detail.py` | chemical detail payload (MSDS sections, KOSHA fetch fallback) |
| `drug_links.py` | MFDS/OpenFDA/PubMed links for a chemical (cached) |
| `regulatory_intelligence.py` | multi-source regulatory lookup, aggregate search, handling profile payload |
| `evidence_collector.py` | MSDS/patent/drug/guide evidence for AI routes (patents: KIPRIS if allowed + patent mapping titles) |
| `patent_mapping.py` | read-only access to the substance → patent mapping (`PATENT_MAPPING_DIR/<CAS>/index.json`, `<JUR>.json.gz`; format `scripts/patent_export/README.md`) |
| `report_builder.py` / `llm_report.py` | rule-based report / LLM report (falls back to rule-based) |
| `ai_prompts.py` / `ai_context.py` | assistant prompts and fixed texts / context assembly and output parsing |
| `llm_client.py` | local Ollama client |
| `guide_linker.py`, `kosha_guide_store.py` | KOSHA guide data and chemical→guide matching |
| `trade_controls/` | import/export controls (see its modules) |
| `intl_regulatory_store.py`, `intl_quantity.py`, `client_ip.py` | country listings, quantities, client IP |

Other packages: `feedback/` (request board), `usage/` (anonymous counters), `integrations/` (sibling projects), `services/`.

`_legacy_pre_split_2026-10-27/` holds the files as they were before the 2026-10-27 split (not imported; reference only).

## Verifying a refactor

`tests/snapshots/run_snapshots.py` starts a separate uvicorn of the working tree on port 7091 against frozen DB copies,
calls ~150 endpoints with outbound HTTP replayed from a cassette, and diffs the responses byte for byte.
See `tests/snapshots/README.md`. Unit tests: `python -B -m pytest tests -q`.
