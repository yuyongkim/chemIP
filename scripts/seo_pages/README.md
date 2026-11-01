# seo_pages: static per-substance SEO pages for ChemIP (Cloudflare Pages)

This builds plain HTML pages, one per substance, at `/chemip/cas/<CAS>` (no trailing slash, the exact URL the live Next route serves). The pages need no backend, no JavaScript and no request-time rendering, so they keep working when the home PC is off. They replace the request-time Next.js pages (`frontend/app/chemip/cas/[cas]/page.tsx`, seed list `frontend/lib/chemip-seed.ts`, `no-store`) and keep every one of their URLs.

All page facts come from the backend's own `build_trade_controls()` (import and export), imported read-only, plus the KOSHA MSDS section 2 stored in `terminology.db`. The page therefore shows what `GET /api/regulations/trade-controls/{cas}` returns. `live_check.py` confirms this against the production API.

## Run

```
python -I -B -X utf8 G:\MSDS\scripts\seo_pages\run.py                          # build, validate, sitemap_live, live, shots
python -I -B -X utf8 G:\MSDS\scripts\seo_pages\run.py --steps build,validate,sitemap_live   # no live API sample, no screenshots
```

- Run with `-I -B`. Nothing is written under G:\MSDS (no `__pycache__`), and every sqlite connection uses `mode=ro`.
- Output goes to `E:\dev-cache\chemip-seo\out\` (the Pages site root). Reports go to `E:\dev-cache\chemip-seo\reports\` (`summary.json`, `selection.json`, `selection.csv`, `facts.jsonl`, `run.log`).
- The `sitemap_live` step GETs `https://chemip.yule.pics/sitemap.xml` once (read-only) and checks that every live URL is in the static sitemap, has a page file, is indexable and has itself as canonical. Extra static URLs are counted, not failed.
- The `live` step calls `http://127.0.0.1:7011/api` with one request at a time, at least 0.55 s apart, using a `bot` user agent. It sends 3 requests for each of the 20 sampled pages.
- Screenshots go to `out\_screenshots\`. **Do not deploy that folder.**

## Selection (seeds + quality bar)

**Live seeds first.** `seeds.py` parses `SEED_CHEMICALS` out of `frontend/lib/chemip-seed.ts` at build time (the list is never copied here). Every seed CAS is put in tier 1 (`config.SEED_TIER`) whatever its score, because those URLs are live and submitted to Search Console. Seeds keep their seed-list Korean name (what the live title uses); the generated KOSHA/NCIS name becomes an alternate name. `config.SEED_NAME_USE_GENERATED` lists seeds whose seed name is wrong or ambiguous; those use the generated name. Seeds with no KOSHA record (29 of 216 today) still get a page from the trade-controls data; their MSDS section says there is no KOSHA MSDS, the title says "규제 요약" (not "규제·MSDS"), and the button opens the SPA search `/chemip?q=<CAS>` (there is no KOSHA `chem_id` to open).

**Then the rest by score.** `TIER_SIZES` are totals: tier 1 = 216 seeds + the 184 best-scoring eligible substances = 400.

A non-seed substance gets a page only if it has a **KOSHA MSDS** (section 2 present) **and** meets at least one of: 3 or more Korean statutory lists, 1 or more permits/notifications, or 2 or more foreign regulatory lists (`config.QUALITY_BAR`). Eligible substances are ranked by `config.SCORE_WEIGHTS`. Tier 1 is the seeds plus the top scorers up to 400 and is indexable now. Tier 2 is the next 3,000 eligible substances (2,769 today). Its pages are generated with `noindex,follow`, are left out of the sitemap, and get no links from tier 1. To promote it, add `"tier2"` to `config.INDEX_TIERS`, optionally set `config.TIER_MIN_SCORE["tier2"]`, and re-run. `reports/selection.json` gives counts for each threshold and score floor.

Counting choices (all set in `config.py`):
- **Foreign jurisdiction count**: only the trade-controls `intl_lists/` collection (51 lists), taken as the union of both directions. The old page used `/api/regulations/international` (`intl_regulatory` codes: EPCRA, CERCLA, NL Bal, …). That is a different list set, and its counts disagree with what the trade tab shows. Here those codes are used only for what the backend uses them for: permit and rule triggers.
- Inventory lists (`US_TSCA_INVENTORY`, `CA_DSL`, `CA_NDSL`, `AU_AIIC_INVENTORY`) and the NCIS category `기존화학물질` say that a substance is in commerce, not that it is regulated. They appear on the page as inventory listings but do not count toward any total.
- `kr_lists/*_unverified.json` and `_index*.json` are not statutory lists and are skipped.
- Obligation rules that apply to every substance (`any_substance`) or to every existing chemical are folded into one "공통" line. They are not counted as substance-specific obligations.

## File → role

| File | Role |
|---|---|
| `config.py` | every path, URL, threshold, weight, tier size and switch (defined once) |
| `seeds.py` | parses the live seed list `frontend/lib/chemip-seed.ts` (read-only); rows for seeds without a KOSHA record |
| `backend_ro.py` | puts G:\MSDS on sys.path, patches TerminologyDB to read-only, re-exports trade_controls |
| `sources.py` | bulk read-only loaders: KOSHA rows, MSDS section 2 XML, NCIS, intl_regulatory codes, country names from `intl_regions.jsx` |
| `msds.py` | KOSHA section 2 XML → signal word, pictograms, H-statements, hazard classes (pure) |
| `names.py` | display names (KOSHA → Korean, English, alternates), group-name dedupe, seed-name preference, Hangul initials (pure) |
| `selection.py` | CAS indexes over the trade_controls list files, score components, quality bar, seeds-first tiers, threshold + seed report |
| `facts.py` | per-page facts from `build_trade_controls` (import + export) + MSDS, reshaped for HTML |
| `related.py` | ~5 related pages per page by shared Korean lists (idf-weighted), linking only to indexable pages |
| `labels.py` | every visible string (Korean, optional English), GHS pictogram names, fixed source list |
| `urls.py` | URL paths of generated pages and their output files (and the inverse, file → path) |
| `layout.py` | escaping, CSS design tokens, `<head>` (title, meta, canonical, OG, hreflang, JSON-LD), breadcrumbs, length fitting |
| `render.py` | substance page template |
| `hub.py` | hub `/chemip/cas/` (by law list and by initial) and per-list pages `/chemip/cas/list/<list>/` |
| `sitemap.py` | `sitemap.xml` (indexable pages, real `lastmod`, no changefreq/priority; SPA `/chemip` + `/chemip?lang=en` with hreflang `xhtml:link` pairs, glossary section) and `robots.txt` |
| `glossary_terms.py` | glossary term keys for the sitemap section `/chemip?view=glossary&term=<key>` (ko + `&lang=en`), read from the SPA data files (`data.jsx`, `term_glossary.jsx`, `glossary_registry.jsx` → `glossary_<k>.jsx`); empty until app.jsx registers the glossary screen. Same rule as `frontend/lib/chemip-glossary-terms.ts` (Next sitemap) |
| `build.py` | generation steps: load → select → facts (process pool) → related → write → reports |
| `htmlscan.py` | one-pass HTML scanner shared by the validators |
| `validate.py` | offline checks: HTML structure, title/description length and duplicates, links, JSON-LD, sitemap, numbers |
| `live_check.py` | 20 sampled pages compared with the production API |
| `live_sitemap.py` | live `sitemap.xml` (Next, Search Console) vs the static sitemap and pages: missing / extra / page problems |
| `screenshots.cjs` | Playwright full-page screenshots at 390 px and 1440 px (`NODE_PATH=G:\MSDS\frontend\node_modules`) |
| `run.py` | thin entry point that runs the steps and writes `reports/summary.json` |

Note: the selection module is named `selection.py`, not `select.py`. A local `select.py` would shadow the standard-library `select` module, which `subprocess` and `concurrent.futures` import.

## Output layout (deploy as-is to the Pages root)

```
sitemap.xml  robots.txt  google5299d3d91ba2dbe2.html  beaker-favicon.svg
chemip/cas/index.html                     hub (tier 1, by law list and by initial)
chemip/cas/<CAS>.html                     substance pages, served at /chemip/cas/<CAS> (tier 1 indexable, tier 2 noindex)
chemip/cas/list/<list-id>/index.html      per-list hubs (lists covering >= 3 indexable pages)
chemip/en/cas/<CAS>.html                  only when config.ENABLE_EN = True (adds hreflang ko/en/x-default)
_screenshots/                             review only, do not deploy
```

- `robots.txt` keeps the old rules (`Allow: /`, `Disallow: /api/`, sitemap line). `google5299d3d91ba2dbe2.html` (Search Console verification) is copied from `frontend/public/` and has to stay at the site root.
- The "전체 보기" link uses the SPA deep link that `app.jsx`/`product.jsx` actually read: `/chemip?view=product&pv=chemical&chem=<KOSHA chem_id>`. `?cas=` alone only pre-fills the request board, so it is not used.
- Substance URLs have **no trailing slash** (`/chemip/cas/71-43-2`), identical to the live Next URLs and the live sitemap. Pages serves `x.html` at `/x` with 200 ("pretty URLs", the same rule that serves `chemip.html` at `/chemip`, measured on chemip-test) and answers `/x/` and `/x.html` with 308 to `/x`. No `_redirects` rule is needed. `deploy/cloudflare/verify/cases.mjs` checks both after a deploy.
- Hub and list pages are directories and keep the slash (`/chemip/cas/`, `/chemip/cas/list/<list>/`); they are new URLs, not live today.
- Sitemap: one file (450 URLs: `/chemip`, hub, 48 list pages, 400 substance pages), a superset of the live 217.
