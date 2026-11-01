# ChemIP API Worker (Cloudflare)

This Worker serves the dynamic `/api/*` endpoints that have to keep working while the home PC is off. Request and response shapes match the FastAPI backend (`backend/api/routes/*`), so `frontend/public/chemip/api.jsx` works without changes. Any `/api/*` route the Worker does not implement is proxied to `ORIGIN`, the home PC tunnel. If the origin cannot be reached, the Worker returns `503 {"error":"offline","message":"지금 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."}`.

- Test deployment: `https://chemip-api-test.yule-pics.workers.dev` (workers.dev only; no routes, custom domain or DNS)
- D1 database: `chemip`, id `a78b9864-2b16-429f-8cef-57916ad71b62`, binding `DB`
- R2 bucket: `chemip-data`, binding `STATIC_DATA` (static per-substance `v1/p/`, shared `v1/g/` and patent-mapping `v1/pat/<CAS>/` files)
- No npm dependencies and no build step. Wrangler bundles `src/index.js`.

## Files and their roles

| File | Role |
|---|---|
| `wrangler.toml` | Worker name, D1 binding, non-secret `[vars]` |
| `src/index.js` | Entry point. Handles CORS preflight, looks up the route table, falls back to the ORIGIN proxy, and maps errors to 422/500. Contains no route logic |
| `src/config.js` | Every constant: defaults for vars, secret names, upstream URLs, NAVER labels, the offline message |
| `src/routes/registry.js` | List of route groups. To add a group, add one line here |
| `src/routes/feedback.js` | `/api/feedback` (meta, list, detail, create, admin list/PATCH/DELETE) |
| `src/routes/usage.js` | `/api/usage/summary` (same as backend), plus the Worker-only `POST /api/usage/hit` |
| `src/routes/ai.js` | `/api/ai/analyze`, `/api/ai/summarize`, `/api/ai/llm-status` |
| `src/routes/drugs.js` | `/api/drugs/{search,approval,easy,openfda,pubmed,unified}` |
| `src/routes/trade.js` | `/api/trade/{news,naver-news,import-regulations,overseas-market-news,national-info,enterprise-success,strategy,prices,fraud}` |
| `src/routes/regulations_kotra.js` | `/api/regulations/kotra/reach` |
| `src/routes/reach.js` | `GET /api/reach/<CAS>` — EU REACH registration status of one substance, looked up on ECHA CHEM when a user opens it (individual lookup, never bulk; ECHA legal notice 5.1.1) and cached. Answer `{cas, status: registered\|not_registered\|unknown, registered: true\|false\|null, reason, entry, echa_url, checked, attribution, cached}`; `entry` = an `EU_REACH_REGISTERED.json` entry. PC twin: `backend/api/routes/reach.py` |
| `src/reach/summary.js` · `src/reach/lookup.js` | Pure port of `scripts/trade_controls/intl/parse_echa_reach.py` (hit choice, dossier summary, detail text) / one CAS → answer, `reachTtl` |
| `src/reach/cache.js` · `src/reach/limits.js` | Cache API (colo) + D1 `reach_cache` (30 d registered, 7 d not registered, failures not stored) / polite limits on misses: 60 per client per hour, 20 per minute in total (D1 `rate_events`, fail-open) |
| `src/upstreams/echa.js` · `src/lib/cas.js` | ECHA CHEM client (user agent names ChemIP, 12 s timeout) / CAS check digit |
| `src/routes/static_data.js` | `GET`/`HEAD /data/<v>/{p,g}/<file>.json` from R2 binding `STATIC_DATA` (bucket `chemip-data`, key `<v>/<area>/<decoded file>`), and `GET`/`HEAD /data/<v>/pat/<CAS>/{index,<JUR>}.json` (key `<v>/pat/<CAS>/<file>`; CAS and file name are validated, anything else → 404; format `scripts/patent_export/README.md`; `index.json` is plain JSON, `<JUR>.json` gzip). Stored gzip bytes pass through with `Content-Encoding: gzip` (`encodeBody: "manual"`), ETag + `If-None-Match` → 304, miss → 404 JSON. Settings: `STATIC_DATA` in `src/config.js`. Used by the Pages site (`deploy/cloudflare/README.md`) |
| `src/routes/diag.js` | `GET /diag`: upstream reachability check. Answers only when `DIAG_ENABLED="true"` |
| `src/routes/proxy.js` | Fallback proxy to ORIGIN, the offline 503, and usage counting for proxied 200 responses |
| `src/feedback/schema.js` | Board values, limits and validation (port of `backend/feedback/schema.py`) |
| `src/feedback/store.js` | Board D1 queries. The public view leaves out `contact` |
| `src/feedback/guard.js` | Post rate limit (5 posts per 10 min per salted client hash) and the admin token check |
| `src/usage/matcher.js` | Path → (metric, subject) mapping and bot filter (port of `backend/usage/matcher.py`) |
| `src/usage/store.js` | `usage_daily` increment and summary (port of `backend/usage/store.py`) |
| `src/usage/counter.js` | Count hook that runs in `ctx.waitUntil` |
| `src/ai/evidence.js` | Loads the substance record (request `evidence` or static file), parses MSDS points, builds the bundle, sources and confidence, and assembles the full context |
| `src/ai/report.js` | Backend prompts copied verbatim, the rule-based report, output sanitising, the summary fallback |
| `src/ai/anthropic.js` | Messages API call (`claude-haiku-5-5`). Never throws |
| `src/ai/cache.js` | `ai_cache` reads and writes (keys `<chemId>`, `summary:<chemId>`) |
| `src/ai/limits.js` | Per-client daily limit and global daily cap |
| `src/upstreams/{kotra,naver,mfds,openfda,pubmed}.js` | Upstream clients (ports of `backend/api/*_adapter.py` / `*_client.py`) |
| `src/lib/http.js` | JSON responses and the backend error shapes (`{code,message,errors}`, `{detail}`, 422) |
| `src/lib/query.js` | FastAPI-style query and path validation (ge/le/max_length/required → 422) |
| `src/lib/router.js` | Path-pattern router |
| `src/lib/cors.js` | CORS (origins come from `CORS_ORIGINS`) |
| `src/lib/adapter.js` | `{status}` adapter result → 503/502 `{detail}` (same as `handle_adapter_result`) |
| `src/lib/upstream.js` | `fetch` with timeout, URL params, safe JSON parse |
| `src/lib/client_hash.js` | `SHA-256(daily random salt + CF-Connecting-IP)`. The salt changes every KST day and old salts are deleted |
| `src/lib/ratelimit.js` | D1 sliding-window and daily counters |
| `src/lib/text.js` | `normalize_text`, `html_to_text` ports |
| `src/lib/time.js` | UTC ISO timestamps in the backend format, KST day |
| `migrations/000{1,2,3,4}_*.sql` | D1 schema (`0004_reach_cache.sql`: REACH answer cache). `feedback` and `usage_daily` mirror the local SQLite files; the rest are Worker-only tables |
| `scripts/export_local_db.py` | One-time copy of `data/feedback.db` and `data/usage.db` into D1 (opens them read-only) |
| `src/cron_feed.js` | Incident feed refresh for a Cron Trigger (`runFeedCron`, `scheduledFeed`): CSB RSS → merge into R2 `v1/feed/latest.json`. **Wired 2026-10-31**: `scheduled()` in `src/index.js`, `[env.production.triggers] crons = ["17 */6 * * *"]` (production only) — details: `docs/portal/INCIDENT_FEED_v1.md` 5 |
| `src/feed/csb_rss.js` · `src/feed/feed_merge.js` · `src/feed/gzip_json.js` | RSS → feed items (pure) / merge rules (pure) / JSON ⇄ gzip (Compression Streams). Settings: `FEED` in `src/config.js` |
| `scripts/reach_check.mjs` | Tests of `/api/reach` with a mocked ECHA (`node scripts/reach_check.mjs`); `--live CAS…` asks the real ECHA CHEM for those CAS through the same code (no cache, no D1) |
| `scripts/cron_feed_check.mjs` | Tests of the feed cron with an in-memory bucket and fake fetch; `--dry-run` merges the live CSB RSS into a local `latest.json` (no R2 writes) |

## Secrets (owner sets these; values never go into code or `wrangler.toml`)

Run each command from `cloudflare/worker/` and paste the value when prompted:

```
npx wrangler secret put CHEMIP_ADMIN_TOKEN     # board admin. If missing, admin routes return 503 ADMIN_DISABLED
npx wrangler secret put ANTHROPIC_API_KEY      # AI. If missing, AI returns the rule-based report, llm_used:false
npx wrangler secret put KOTRA_API_KEY_DECODED  # KOTRA (data.go.kr). If missing: 502 "KOTRA API key is not configured"
npx wrangler secret put DRUG_API_KEY_DECODED   # MFDS drugs (data.go.kr)
npx wrangler secret put NAVER_CLIENT_ID        # NAVER news. If either NAVER secret is missing: 503 "NAVER API key is not configured"
npx wrangler secret put NAVER_CLIENT_SECRET
npx wrangler secret put PUBMED_API_KEY         # optional. Without a key, NCBI rate-limits shared egress IPs and some calls get 502
```

Use the same values as the backend `.env` keys with the same names. Use the *decoded* data.go.kr keys.

## Vars (`wrangler.toml` `[vars]`; defaults are in `src/config.js`)

| Var | Meaning |
|---|---|
| `ORIGIN` | Fallback proxy target, for example `https://chemip.yule.pics`. **It must be a different host from the one the Worker is routed on.** Once the Worker takes `chemip.yule.pics/api/*`, point this at a separate tunnel hostname. A loop header also blocks self-proxying |
| `ORIGIN_TIMEOUT_MS` | Proxy timeout (8000 ms) |
| `STATIC_BASE`, `STATIC_SUBSTANCE_PATH` | Where AI evidence is read from: `STATIC_BASE + STATIC_SUBSTANCE_PATH` with `{id}` → chemId (default `/substances/{id}.json`). Fill these in once the static per-substance files are published |
| `AI_MODEL` | `claude-haiku-5-5` |
| `AI_CLIENT_DAILY_LIMIT` / `AI_GLOBAL_DAILY_CAP` | New model calls per client per day (5) and in total per day (300). Cache hits do not count |
| `AI_CACHE_TTL_HOURS` | How long an AI result stays cached per substance (720 h). The backend uses 24 h |
| `KIPRIS_IN_AI` | `false`: KIPRIS rows are never used as AI evidence, and cached results that cite KIPRIS are ignored |
| `CORS_ORIGINS` | Allowed browser origins, comma-separated |
| `DIAG_ENABLED` | `true` turns on `/diag`. Set it to `false` for production |

## Static per-substance file contract (AI evidence)

The AI routes take the substance record from the request body `evidence` if it is present. Otherwise they fetch `STATIC_BASE + STATIC_SUBSTANCE_PATH`. The record has the same shape as the backend `GET /api/chemicals/{id}` response:

```json
{ "chem_id": "...", "name": "...", "name_en": "...", "cas_no": "...",
  "sections": [{"section_seq": 2, "section_name": "...", "content": [{"msdsItemNameKor": "...", "itemDetail": "..."}]}],
  "english_safety": {"hazard_statements": ["H225 ..."], "signal_word": "...", "name_en": "..."},
  "guide_recommendations": [ ...optional, backend guide rows... ],
  "patent_highlights":     [ ...optional, KIPRIS rows are dropped when KIPRIS_IN_AI=false... ],
  "drugs": {"mfds": [], "openfda": [], "pubmed": []}   // optional, used by /summarize
}
```

`content` may also be the raw KOSHA XML string. If no record is found, the report is built from the name alone, which is the backend's "evidence limited" case.

## Deploy steps

```
cd G:\MSDS\cloudflare\worker
npx wrangler d1 migrations apply chemip --remote     # schema (already applied)
python scripts\export_local_db.py --out %TEMP%\d1_dump.sql
npx wrangler d1 execute chemip --remote --file %TEMP%\d1_dump.sql   # one-time data copy (already done; re-running is idempotent)
npx wrangler deploy                                  # -> https://chemip-api-test.yule-pics.workers.dev
```

The npm cache must stay on E: (`npm config get cache` → `E:\dev-cache\npm`).

## How the Worker differs from the backend

- **Board post limit:** kept in D1, keyed by a salted hash (backend keeps it in process memory). Same limit: 5 posts per 600 s.
- **AI analyze/summarize:** when a limit blocks a new model call, the response is the backend's LLM-unavailable fallback plus `rate_limited` and `llm_note`.
- **`/api/ai/recommend`, `/drug-analysis`, `/ask`:** need backend search and DB data, so they go to ORIGIN. The frontend calls only `/ai/analyze`.
- **`/api/ai/llm-status`:** `ready` means "an Anthropic key is set". `base_url` is `https://api.anthropic.com`.
- **Usage counting:** happens for proxied 200 responses of `/api/chemicals/{id}` and `/api/regulations/trade-controls/{cas}`. Static pages never reach the Worker, so `POST /api/usage/hit {"path": "/api/chemicals/<id>"}` exists for the static frontend. It applies the same matcher and bot filter.
- **NAVER:** responses are never cached or stored (the backend kept a 10-minute in-memory cache). Items stay labelled `source:"naver"`, and the AI modules never import the NAVER client.
- **KOTRA:** JSON responses only. A non-JSON body (the data.go.kr XML error envelope) becomes success with 0 items, which is what the backend's XML path does.
