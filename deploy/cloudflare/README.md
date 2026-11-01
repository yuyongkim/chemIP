# ChemIP on Cloudflare (free tier) — deploy pipeline

Moves the public site (`https://chemip.yule.pics/chemip`) off the home PC:

| What | Where it is served from | Notes |
|---|---|---|
| SPA (`/chemip`), css, vendor, `/chemip/data/*` | **Pages** static assets | built from `frontend/public/chemip` with `build_chemip.cjs --out` |
| SEO pages `/chemip/cas/**`, `sitemap.xml` | **Pages** | copied from `E:\dev-cache\chemip-seo\out` when present. Substance pages are `chemip/cas/<CAS>.html`, served at `/chemip/cas/<CAS>` (no slash, same URL as the live Next pages; `/…/` → 308). No rule needed |
| Search index `/data/v1/search/**` | **Pages** (plain JSON; Pages compresses) | from `E:\dev-cache\chemip-static\out\v1\search` |
| Per-substance `/data/v1/p/*`, shared `/data/v1/g/*`, Texas emission events `/data/v1/tx/<CAS>.json`, statutory provisions `/data/v1/pv/<CAS>.json` | **R2** `chemip-data` via the Worker | gzip bytes passed through with `Content-Encoding: gzip`, ETag/304 |
| Patent mapping `/data/v1/pat/<CAS>/{index,<JUR>}.json` | **R2** `chemip-data` via the Worker | `index.json` plain JSON, `<JUR>.json` gzip passthrough; format `scripts/patent_export/README.md`. PC site: Next rewrite → backend `backend/api/routes/patent_mapping.py` (local files, read-only) |
| `/api/*` (board, usage, AI, live proxies) | **Worker** (`cloudflare/worker`) | unimplemented routes fall back to `ORIGIN` (PC) |
| `robots.txt`, `google5299d3d91ba2dbe2.html`, `favicon.ico`, `404.html` | **Pages** root | verification file answers 200 at the exact root URL |

On the **test** site (`*.pages.dev`, which cannot have Worker routes) `/api/*`, `/data/v1/p/*`, `/data/v1/g/*`, `/data/v1/pat/*` and
`/chemical/*` run Pages Functions (`_routes.json` limits Functions to exactly these paths; every other request is a
free static asset). The Functions forward to the Worker over a **service binding** `API` (no public hop, same request
incl. `CF-Connecting-IP`; falls back to env var `API_URL` if no binding). The page sets
`window.CHEMIP_STATIC = {"base":"/data","searchBase":"/data","version":"v1"}`, so all data is same-origin (no CORS).

Nothing in this pipeline writes under `G:\MSDS` except source edits; build output, staging, reports and wrangler logs go
to `E:\dev-cache\chemip-pages\`. The live `frontend/public/chemip/dist/` is never touched.

## Files and their roles

| File | Role |
|---|---|
| `config.mjs` | Every path, project/Worker name, URL, target (`test` default / `prod`) and Pages limit. Defined once |
| `site_rules.mjs` | Data: copy plan, `_headers` rules, `_redirects`, Function routes. Add a rule here, not in code |
| `assemble.mjs` | Entry: clean `out/` → UI build → copies → rules → limits; writes `reports/assemble.json` |
| `assemble/ui.mjs` | Runs `frontend/scripts/build_chemip.cjs --out <stage>/build/dist`, writes `out/chemip.html` with `CHEMIP_STATIC` inlined after `<base>`, and `out/chemip/dist/app.js` |
| `assemble/copies.mjs` | Executes `COPIES` (vendor, css, data, root files, search, SEO). Missing search manifest stops the build unless `--allow-partial` |
| `assemble/rules.mjs` | Renders `_headers`, `_redirects`, `_routes.json`; fallback `sitemap.xml` (only `/chemip`) when SEO has none |
| `assemble/limits.mjs` | Pages free plan: ≤ 20,000 files, each ≤ 25 MiB. Fails the assemble otherwise |
| `deploy_pages.mjs` | Entry: stage the Pages project and `wrangler pages deploy` (creates the project on first run) |
| `deploy/pages_project.mjs` | Writes the staged `wrangler.toml` (name, `pages_build_output_dir = "out"`, service binding) and copies `pages/functions`, `pages/lib` |
| `deploy_worker.mjs` | Entry: `wrangler deploy` of `cloudflare/worker` (test; `--target prod` = `--env production`, cutover only) |
| `pages/lib/forward.js` | Function body: forward to the Worker (service binding `API`, else `API_URL`, else 503 offline JSON) |
| `pages/functions/api/[[path]].js` | `/api/*` → `forward.js` |
| `pages/functions/data/[[path]].js` | `/data/v1/p/*`, `/data/v1/g/*`, `/data/v1/pat/*`, `/data/v1/tx/*`, `/data/v1/pv/*` → `forward.js` (search stays static) |
| `pages/functions/chemical/[[path]].js` | Legacy `/chemical/<id>` → `/chemip?view=product&pv=chemical&chem=<id>` (302) |
| `templates/404.html` | Real 404 page (Pages serves it with status 404; no SPA fallback anywhere) |
| `lib/fsx.mjs` | clean / copy / walk / write helpers |
| `lib/wrangler.mjs` | Runs wrangler from the npx cache with the npm cache and logs on E: |
| `lib/cf_api.mjs` | Read-only Cloudflare REST (R2 object listing) with wrangler's own login; token never printed |
| `verify_site.mjs` | Entry: HTTP checks → Playwright checks → load times vs production; `reports/verify/verify.json` + screenshots |
| `verify/cases.mjs` | Data: HTTP expectations (incl. SEO `/chemip/cas/71-43-2` 200 and its slash form 308), search queries, preferred substances, selectors, TEST post, timing flows |
| `verify/http_checks.mjs` | Status / Location / Content-Type / body / header checks (no browser) |
| `verify/browser_checks.mjs` | Landing, search (벤젠 / toluene / 67-64-1), substance pages from R2, 규제·인허가 tab (import, US, export), board list + TEST post |
| `verify/timing.mjs` | Cold-context median ms until the page is usable, test vs production |
| `verify/pw.mjs` | Loads Playwright from `frontend/node_modules` |
| `verify/r2_list.mjs` | Entry: counts R2 objects per prefix, writes `reports/r2_p_keys.json` (substances the checks may open) |

Related changes outside this folder:

- `frontend/scripts/build_chemip.cjs`: `--out <dir>` option. Without it the behavior is unchanged (`public/chemip/dist`).
- `cloudflare/worker/src/routes/static_data.js` (+ one line in `routes/registry.js`, `STATIC_DATA` in `src/config.js`,
  `[[r2_buckets]] STATIC_DATA → chemip-data` in `wrangler.toml`): `GET|HEAD /data/<v>/{p,g}/<file>.json` and
  `GET|HEAD /data/<v>/pat/<CAS>/<file>.json` from R2.
- `cloudflare/worker/src/lib/cors.js`: sets CORS headers in place, so the R2 gzip body is not re-encoded.

## Step by step (test)

All commands from `G:\MSDS`. npm cache must be `E:\dev-cache\npm` (`npm config get cache`).

```
# 0. inputs: static export finished (search/manifest.json exists) and, optionally, SEO pages built
python -I -B scripts\static_export\run_all.py            # (owned by the exporter pipeline)

# 1. Worker (R2 route + D1 + /api). workers.dev only, no routes.
node deploy\cloudflare\deploy_worker.mjs

# 2. assemble E:\dev-cache\chemip-pages\out  (add --allow-partial to deploy before search is exported)
node deploy\cloudflare\assemble.mjs

# 3. Pages project chemip-test (production branch "main" → https://chemip-test.pages.dev)
node deploy\cloudflare\deploy_pages.mjs

# 4. verify
node deploy\cloudflare\verify\r2_list.mjs
set NODE_PATH=G:\MSDS\frontend\node_modules
node deploy\cloudflare\verify_site.mjs               # --skip-board: no TEST post; --chem 001008,71-43-2: open these ids (UI may use its /api fallback)
```

`wrangler pages deploy` uploads only changed files (content hash), so re-deploys after a data refresh are incremental.

### Caching (set in `site_rules.mjs` and the Worker's `STATIC_DATA`)

| Path | Cache-Control |
|---|---|
| `/chemip/dist/*` (app.js?v=hash), `/chemip/*.css` (?v=) | `public, max-age=31536000, immutable` |
| `/chemip/vendor/*` | `public, max-age=604800` |
| `/data/v1/search/*` (Pages) and `/data/v1/{p,g,pat}/*` (Worker hit) | `public, max-age=604800, stale-while-revalidate=86400` |
| `/data/v1/{p,g,pat}/*` miss (404) | `public, max-age=60` |
| `/chemip` | `public, max-age=0, must-revalidate` |
| `*.pages.dev` | plus `X-Robots-Tag: noindex` (test host never indexed) |

Data files keep their URL across re-exports (format root `v1/`), so they are not `immutable`; a data refresh is
visible within 7 days, or immediately for a format change (new root `v2/`, `CHEMIP_STATIC.version`).

### Pages behavior this relies on (measured on chemip-test)

- `out/chemip.html` is served at `/chemip`; `/chemip/` and `/chemip/?q=…` answer 308 → `/chemip…` (query kept).
  This matches the page's canonical URL `https://chemip.yule.pics/chemip`.
- A root `*.html` file would be 308-redirected to its extensionless path ("pretty URLs"), so the Search Console file
  lives at `site-verification/` and `_redirects` rewrites `/google5299d3d91ba2dbe2.html` to it with status 200.
- `_redirects` cannot substitute a placeholder into a query string, hence the `/chemical/*` Function.
- With a top-level `404.html`, every missing path (including `/data/v1/search/**`) is a real 404.

## Free-tier budget

- Pages static requests: unlimited and free. Pages files: ≤ 20,000 per deployment (checked; search ≈ 4–6k files,
  SEO ≈ 3.2k).
- Functions + Worker: 100,000 requests/day on the free plan, shared. Only `/api/*`, `/data/v1/{p,g,pat}/*` and
  `/chemical/*` reach code. On the test site one data request is a Function call plus a service-bound Worker call;
  in production the Worker routes answer directly (one invocation).
- R2: 10 GB storage, 1M Class A (writes) / 10M Class B (reads) per month free. Egress is free.

## Production cutover (NOT executed — owner runs these by hand)

Current: `chemip.yule.pics` is a proxied CNAME to the home-PC Cloudflare Tunnel; Next.js serves `/chemip` and
proxies `/api/*` to the backend on 127.0.0.1:7011.

Target: `chemip.yule.pics` = Pages custom domain (project `chemip`); Worker `chemip-api` on routes
`chemip.yule.pics/api/*`, `chemip.yule.pics/data/v1/p/*`, `chemip.yule.pics/data/v1/g/*`, `chemip.yule.pics/data/v1/pat/*`;
the PC stays reachable for
the Worker's fallback at a **different** hostname, `chemip-origin.yule.pics`.

### 0. Before (no user impact)

1. Write down the current DNS record (Dashboard → yule.pics → DNS → `chemip`): type `CNAME`, content
   `<TUNNEL_ID>.cfargotunnel.com`, proxied. This is the rollback value.
2. Add the fallback hostname to the **same** tunnel: Zero Trust → Networks → Tunnels → (the tunnel) → Public Hostname →
   Add `chemip-origin.yule.pics` → `http://localhost:7000` (the Next port `chemip.yule.pics` uses today; copy its existing hostname entry). (Remotely managed tunnels
   need no cloudflared restart. If the tunnel uses a local `config.yml`, add the ingress rule there and
   `cloudflared tunnel route dns <tunnel> chemip-origin.yule.pics`; restart only that cloudflared PID — never a broad kill.)
   Check `https://chemip-origin.yule.pics/api/feedback/meta` answers 200.
3. Board data: copy the latest PC board/usage rows to D1 right before the switch (Worker README "Deploy steps":
   `export_local_db.py` + `wrangler d1 execute chemip --remote --file …`; idempotent). Delete TEST posts.
4. Add the production env to `cloudflare/worker/wrangler.toml` (secrets must be set for `--env production` too:
   `npx wrangler secret put <NAME> --env production` for each name in the Worker README):

   ```toml
   [env.production]
   name = "chemip-api"
   workers_dev = false
   routes = [
     { pattern = "chemip.yule.pics/api/*", zone_name = "yule.pics" },
     { pattern = "chemip.yule.pics/data/v1/p/*", zone_name = "yule.pics" },
     { pattern = "chemip.yule.pics/data/v1/g/*", zone_name = "yule.pics" },
     { pattern = "chemip.yule.pics/data/v1/pat/*", zone_name = "yule.pics" },
   ]
   [[env.production.d1_databases]]
   binding = "DB"
   database_name = "chemip"
   database_id = "a78b9864-2b16-429f-8cef-57916ad71b62"
   [[env.production.r2_buckets]]
   binding = "STATIC_DATA"
   bucket_name = "chemip-data"
   [env.production.vars]
   ORIGIN = "https://chemip-origin.yule.pics"
   ORIGIN_TIMEOUT_MS = "8000"
   STATIC_BASE = ""
   STATIC_SUBSTANCE_PATH = "/substances/{id}.json"
   AI_MODEL = "claude-haiku-5-5"
   AI_CLIENT_DAILY_LIMIT = "5"
   AI_GLOBAL_DAILY_CAP = "300"
   AI_CACHE_TTL_HOURS = "720"
   KIPRIS_IN_AI = "false"
   CORS_ORIGINS = "https://chemip.yule.pics"
   DIAG_ENABLED = "false"
   ```
5. Production Pages project on `*.pages.dev` only (no domain yet):
   `node deploy\cloudflare\assemble.mjs` then `node deploy\cloudflare\deploy_pages.mjs --target prod`.
   If `chemip.pages.dev` is taken, wrangler prints the assigned name; put it in `config.mjs` `TARGETS.prod.pages.url`.
   Verify: `node deploy\cloudflare\verify_site.mjs --target prod --skip-board`.

### 1. Worker routes (site still served by the PC)

`node deploy\cloudflare\deploy_worker.mjs --target prod` (= `wrangler deploy --env production`). From now on
`/api/*` on chemip.yule.pics is the Worker; unimplemented routes go to `chemip-origin` (the PC). `/chemip` is still
the PC. Check: `curl -s https://chemip.yule.pics/api/feedback/meta`, board list in the browser,
`curl -sI https://chemip.yule.pics/data/v1/g/trade_catalog.json` (`content-encoding: gzip`),
`curl -sI https://chemip.yule.pics/data/v1/pat/71-43-2/index.json` (200 JSON).

### 2. DNS → Pages custom domain

Dashboard → Workers & Pages → `chemip` → Custom domains → Set up a domain → `chemip.yule.pics` → Activate.
Cloudflare replaces the tunnel CNAME with `CNAME chemip → chemip.pages.dev` (proxied). Wait until the domain shows
Active (SSL issued; usually minutes). Worker routes keep handling `/api/*` and `/data/v1/{p,g,pat}/*` in front of Pages.

### 3. Check

`node deploy\cloudflare\verify_site.mjs --base https://chemip.yule.pics --skip-board` (all HTTP checks except the
noindex one, which is test-host only), then Search Console: URL inspection of `/chemip` and resubmit `sitemap.xml`.

### Rollback (any step; PC services stay running throughout, so this is immediate)

1. DNS: Workers & Pages → `chemip` → Custom domains → remove `chemip.yule.pics`, then DNS → add back the record from
   step 0.1 (`CNAME chemip <TUNNEL_ID>.cfargotunnel.com`, proxied), or
   `cloudflared tunnel route dns --overwrite-dns <tunnel> chemip.yule.pics`.
2. Worker routes: Workers & Pages → `chemip-api` → Settings → Domains & Routes → delete the three routes (or remove
   `routes` from `[env.production]` and redeploy). `/api/*` then goes back through the tunnel to Next → backend.
3. Board posts written to D1 while cut over are not on the PC: export them from D1
   (`wrangler d1 execute chemip --remote --command "SELECT * FROM feedback WHERE created_at > '<cutover time>'" --json`)
   before rolling back if they matter.
