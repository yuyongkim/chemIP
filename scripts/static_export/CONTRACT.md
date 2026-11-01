# ChemIP static data contract — format v1

This is what the browser reads instead of the backend API. Every file sits under one versioned root, `v1/`.
If any file format changes, the root changes too (`v2/`), so each root can be cached for a long time.
The exporter (`run_all.py`) writes the files to `E:\dev-cache\chemip-static\out\v1\`.

| Prefix | Host | Bytes on disk / in R2 | HTTP headers |
|---|---|---|---|
| `v1/search/` | Cloudflare Pages | plain JSON | Pages compresses it itself |
| `v1/p/` | R2 | **gzip bytes**, name still ends in `.json` | `Content-Type: application/json`, `Content-Encoding: gzip` |
| `v1/g/` | R2 | **gzip bytes**, name still ends in `.json` | `Content-Type: application/json`, `Content-Encoding: gzip` |
| `v1/tx/` | R2 | **gzip bytes**, name still ends in `.json` | `Content-Type: application/json`, `Content-Encoding: gzip` |
| `v1/pv/` | R2 | **gzip bytes**, name still ends in `.json` | `Content-Type: application/json`, `Content-Encoding: gzip` |
| `v1/reg/` | R2 | **gzip bytes**; `.json` names and one `.xml` (RSS) | `.json`: `Content-Type: application/json`; `changes.xml`: `application/rss+xml; charset=utf-8`; both `Content-Encoding: gzip` |
| `v1/gs/` | R2 | **gzip bytes**, name still ends in `.json` | `Content-Type: application/json`, `Content-Encoding: gzip` |
| `v1/f/` | R2 | **gzip bytes**, name still ends in `.json` | `Content-Type: application/json`, `Content-Encoding: gzip` |
| `v1/prtr/` | R2 | **gzip bytes**, name still ends in `.json` | `Content-Type: application/json`, `Content-Encoding: gzip` |
| `v1/oel/` | R2 | **gzip bytes**, name still ends in `.json` | `Content-Type: application/json`, `Content-Encoding: gzip` |
| `v1/el/` | R2 | **gzip bytes**, name still ends in `.json` | `Content-Type: application/json`, `Content-Encoding: gzip` |
| `v1/rel/` | R2 | **gzip bytes**, name still ends in `.json` | `Content-Type: application/json`, `Content-Encoding: gzip` |
| `v1/law/` | R2 | **gzip bytes**, name still ends in `.json` | `Content-Type: application/json`, `Content-Encoding: gzip` |

When R2 serves an object with `Content-Encoding: gzip`, browsers decompress it on their own, so `fetch(...).json()` works unchanged.
A tool that reads the files straight from disk has to gunzip p/ and g/ first. The first two bytes are `1f 8b`.

All JSON is compact UTF-8 with no ASCII escaping (`ensure_ascii=False`).

## Changes from the pilot (read this if you coded against the pilot)

1. **Per-substance data: one file per page, and the name changed.** The pilot had `substances/full/d/<chem_id>.json` (detail), `full/c/<cas>.json` (trade + intl + permit), and `facts/c/<cas>.json`. All three are now **one** object at `p/<chem_id>.json`, keyed by the search result's `chem_id`, not by CAS. The pilot "facts" keys (`cas, ncis, controlled, kr_law, intl_lists, hs, hsk10_candidates, intl, permit_context`) are still **top-level keys with the same names and the same meaning**, so a pilot facts reader can be given the p/ object as it is.
   - `permit_context` holds the **full** API body, including `durations` and `attribution`. The pilot facts file had a slimmed copy. `g/permit_common.json` still exists, and its values are identical to these fields.
2. **The shared files moved** from `substances/global/*.json` to `g/*.json`. They are gzip on disk (see the table above), and the content is the pilot's. There is one new file, `g/trade_catalog.json`.
3. **`search/manifest.json` has two extra keys**, `format` (`"v1"`) and `search_limit` (`20`). Every other key is unchanged.
4. **`search/a/<n>.json` "q"** now holds a precomputed answer for every alias, every `alias_norm`, and every `chemical_terms` name / name_en / cas_no. That is 749,597 keys. The pilot held about 3,000. Since 2026-10-28 it also holds each name's base without its "(...)" note (raw and normalized) and every search synonym of `backend/data/search/synonyms.jsonl` (raw and normalized): 835,309 keys. With the second synonym pass (law.go.kr list names, element names, ECHA/EPA names, PubChem names for the benchmark + SEO tier 1; 2026-10-28) it is 877,758 keys. Because the normalized forms are included, queries such as 과산화수소 are now answered from "q".
5. **Precomputed answers are only used when the query key is casefold-stable** (see "Search keys"). This guard was added because JS has no `casefold()`.

## search/ (Pages)

The format is the pilot's, built from `terminology.db` in read-only mode. N_DOCS is 117,744 `chemical_terms` rows.

| Path | Content |
|---|---|
| `search/manifest.json` | `{format, n_row, n_token, bucket, alias_buckets, alias_types, search_limit, shards, one_char_df, ranking}` (`ranking` = `backend/data/search/ranking.json`, added 2026-10-28) |
| `search/docmeta.json` | array indexed by `chemical_terms.id`: `ntok*2 + is_kosha` (0 = no row). `ntok` is the FTS doc length for bm25, and `is_kosha` drives KOSHA-first ordering |
| `search/t/<n>.json` | token postings `{token: [docDelta, n, pos.., docDelta, n, pos..]}`, with `pos = offset*4 + column` (0 name, 1 cas_no, 2 description, 3 name_en) |
| `search/d/<id // bucket>.json` | doc records `{id: [name, cas_no, description, name_en, source]}` (missing values are `""`) |
| `search/a/<h>.json` | `{"a": {alias_norm: [[alias, type, confidence, ref], ...]}, "q": {query_key: [total, id1, ..., id20]}}` |

- `manifest.shards` maps a token prefix to a list of shard numbers. An exact token `x` lives in every shard whose key is a prefix of `x`. A prefix query `x*` must also read the shards whose key starts with `x`. See `static_search.StaticIndex._shards_for`.
- `a` rows are sorted by `(confidence desc, alias)`. `type` is an index into `manifest.alias_types`, or a raw string when the type is not in that list. `ref` is a doc id (int) when the alias row's `(canonical_id, chem_name, name_en, cas_no, source)` matches that doc. Otherwise it is the inline list `[canonical_id, chem_name, name_en, cas_no, source]`. The current data has 0 inline refs.
- Rows whose type starts with `syn_` (`syn_registry`, `syn_synonym`, added 2026-10-28) are search synonyms from `backend/data/search/synonyms.jsonl`, not `chemical_aliases` rows: one row per `chemical_terms` row of the synonym's CAS, `ref` = that doc id, confidence 1.0. Clients keep them apart from alias rows (the alias-row slice of `limit` entries is taken after removing them).
- `q` is the exact output of the backend's `search_chemicals(key, limit=20)`: `total`, then the ids of the 20 items in order. An item is rebuilt from its doc record exactly as `_serialize` does it in `static_search.py`:
  `{id, name: name||null, cas_no: cas||null, chem_id: (desc starts "KOSHA_ID:" ? desc after ":" : cas||null), name_en: name_en||null, source: source||null, has_msds: source=="KOSHA"}`.

### Search keys

- `fnv1a32(s)`: 32-bit FNV-1a over the UTF-8 bytes (offset 0x811C9DC5, prime 0x01000193).
- Alias bucket: `h = fnv1a32(normalize_alias(text)) % manifest.alias_buckets`. The same bucket is used for the `a` lookup of each search candidate and for the `q` lookup of the whole query.
- `query_key(q) = clean_alias_value(q).casefold()`. `clean_alias_value` and `normalize_alias` are in `backend/core/chemical_aliases.py` and must be ported 1:1.
- **Use `q` only when the key is casefold-stable**, meaning `clean_alias_value(q).casefold() == clean_alias_value(q).lower()`. In JS: `key = clean(q).toLowerCase()`, then skip the `q` lookup if the string contains `ß`, a ligature (`ﬀ`–`ﬆ`), `ς`, or any other character where the two differ. Unstable queries take the client path.
- A precomputed answer is valid only for limit 20, page 1 (the frontend's request).

### Client search algorithm

The reference implementation is `static_search.py`, method `StaticIndex.search`. It reads only these files.

1. Look up `q[query_key]` in `a/<bucket(query)>.json`. On a hit (and a stable key), the result is `{items: ids.map(serialize), total}`. That is the backend's answer.
2. Otherwise, if some candidate has alias rows or synonym rows, run the full replica of `search_chemicals` (`search_chemicals` in `static_search.py`). It merges every synonym row's doc (base `ranking.synonym_hit_base`), then alias hits with FTS sub-searches, then candidate FTS searches, scoring each item with `backend/core/terminology/ranking.py` `score()` and `manifest.ranking` (exact CAS, the largest of exact name / synonym tier of the whole query / locant-stripped base name, KOSHA, derivative penalty). Base name and derivative penalty apply only when the query has an alias or synonym hit.
3. Otherwise run the lean FTS path (`_lean`). It needs only `docmeta` plus the d/ records of the result page (scores: `fts_base`/`fts_term_step`/`fts_row_step`/`kosha` from `manifest.ranking`).

FTS5 emulation: unicode61 tokens, the query `"<q>"* OR <q>*`, a syntax-error fallback to the exact phrase, bm25 (k1 1.2, b 0.75) summed over the phrases, and `ORDER BY KOSHA first, rank, rowid`.

## p/<chem_id>.json (R2, gzip)

**Key rule:** `v1/p/${encodeURIComponent(chem_id)}.json`, where `chem_id` is the search item's `chem_id`. That is the same value the UI passes to `GET /api/chemicals/{chem_id}`. The object key itself is the raw chem_id. The client only URL-encodes it, and 25 keys contain `,`, ` ` or `&`.

Files exist for:

| kind | chem_id | count | contents |
|---|---|---|---|
| `kosha` | 6-digit KOSHA id of a chemical_terms row | 13,448 | detail + CAS parts (if the row's CAS is valid) |
| `cas` | every distinct non-empty `chemical_terms.cas_no`, as written in the DB | 117,738 | detail + CAS parts (if it is a valid CAS) |
| `msds` | `msds_details` ids that have no chemical_terms row (MSDS-only records) | 35,516 | detail only |

Search can only return `kosha` and `cas` chem_ids. Any valid CAS that appears in chemical_terms has a `p/<CAS>.json`, even when only KOSHA rows carry it, so **CAS → file always works**.
For a KOSHA page, the CAS parts are computed for that row's `cas_no`. It equals the search item's `cas_no`, the `selected.cas_no` the UI uses for trade, intl and permit.

### Top-level keys (always all present, in this order)

| key | type | equals |
|---|---|---|
| `v` | int | `1` (page format) |
| `chem_id` | string | file key |
| `kind` | `"kosha"` \| `"cas"` \| `"msds"` | see the table above |
| `cas` | string \| null | the valid CAS (`^\d{2,7}-\d{2}-\d$`) the CAS parts were built for. null means no CAS parts |
| `detail_status` | int | HTTP status of `GET /api/chemicals/{chem_id}` (200 for every current file) |
| `detail` | object | exact body of `GET /api/chemicals/{chem_id}`: `{chem_id, sections, english_safety, is_kosha, name, name_en, cas_no, source}` |
| `trade` | `{import, export}` \| null | exact bodies of `GET /api/regulations/trade-controls/{cas}?direction=import&country=` and `...direction=export&country=` (default view, no counterpart country) |
| `intl` | object \| null | exact body of `GET /api/regulations/international/{cas}`: `{cas_no, count, jurisdictions, thresholds}` |
| `permit_context` | object \| null | exact body of `GET /api/integrations/kr-permit-context/{cas}`: `{cas_no, available, entries, emissions, durations, attribution}` |
| `ncis` | object \| null | `{name_ko, name_en, classifications[]}`, the NCIS record `build_trade_controls` reads |
| `controlled` | list \| null | full controlled-list memberships (with list metadata) |
| `kr_law` | list \| null | `[{list_id, entries, family_entries}]`. Metadata is in `g/rulebook.json` `kr_lists` |
| `intl_lists` | list \| null | `[{list_id, entries, family_entries}]`. Metadata is in `g/rulebook.json` `intl_lists` |
| `hs` | list \| null | HS code rows for the CAS |
| `hsk10_candidates` | list \| null | HSK-10 candidates (`[]` when `hs` is empty) |

When `cas` is null (MSDS-only records, the 3 KOSHA rows without a CAS, and the 25 `cas_no` values that are not a single CAS, such as `"105-33-9,127913-44-4"`), every key after `detail` is null. The API would answer those CAS requests with `invalid_cas`, so the UI shows its "no CAS" state.

**Not included in this file.** Guides, handlers, incidents and enforcement are in the separate extras file `p/<chem_id>.x.json` (next section). These still need the live API: `destination.kotra` (live KOTRA call), provisions outside the `pv/` set (see "pv/<CAS>.json"), regulatory intelligence, drugs, patents, AI. On a static deployment the UI sends those through one shared gate (`api_origin.jsx`): one probe per page session, and after the home PC is found unreachable no further request is sent; the panel shows a neutral note (`API_LABELS.liveOnly`).

## p/<chem_id>.x.json (R2, gzip) — extras, added 2026-10-28

Optional, additive (format root stays `v1/`; nothing above changed). Same key rule as the page file, with the suffix `.x.json`:
`v1/p/${encodeURIComponent(chem_id)}.x.json`. chem_ids never contain `.`, so the name cannot collide with a page file.
It lives under `p/` so the deployed Worker route (`/data/:version/p/:file`) and the Pages `_routes.json` serve it with no
Worker or Pages change. One file exists for **every** chem_id of the page universe (166,702), written by `extras.py`
(builder `extras_build.py`). A missing file means "not exported" (the UI then falls back to the API).

| key | type | equals |
|---|---|---|
| `v` | int | `1` (extras format) |
| `chem_id`, `kind`, `cas` | | as in the page file |
| `guides` | object | body of `GET /api/guides/recommend/{chem_id}` (limit 8, the route default; the UI's `search=` is ignored by the route). Fresh computation (`from_cache: false`), or the cached answer for the chem_ids already in `guide_mappings`. The live route writes that cache on first use and later answers from it (`from_cache: true`, adds `updated_at`, may keep only exact-CAS guides) |
| `handlers` | object | body of `GET /api/handlers?chem_id=<chem_id>&facility_limit=50` (year 2024, accident_years 5) with the **local PRTR cache only**: `prtr_summary`, `prtr_aggregates` and `prtr_facilities` (when the cache has the facility rows) equal the live answer. The live sources answer as the backend does when they are unreachable: `gyeonggi_facilities` and `chemical_accidents` are `{available: false, total: 0, data: [], message}`, and `prtr_facilities` without cached rows is the portal-failure shape `{available: false, source: "PRTR portal unitySearchDown", total: 0, data: [], message}` |
| `incidents` | object \| null | exact body of `GET /api/integrations/incidents/{cas}?limit=8`. **Only in kind `"cas"` files** (the UI reads it by CAS, and every valid CAS has a `cas` file). null elsewhere and without a valid CAS |
| `enforcement` | object \| null | exact body of `GET /api/integrations/enforcement/{cas}?limit=6`. Same rule as `incidents` |

Request parameters are the ones the UI sends; they are defined once in `config.EXTRAS_PARAMS` and must change together with `frontend/public/chemip/api_integrations.jsx` / `api_content.jsx`.


## tx/<CAS>.json (R2, gzip) — Texas emission events, added 2026-10-30

Optional, additive (format root stays `v1/`). Key: `v1/tx/<CAS>.json` with the dashed CAS (`^\d{2,7}-\d{2}-\d$`, never needs
URL-encoding). Written by `tceq.py` from `data/tceq_event_cas_index.db` (`scripts/build_tceq_event_index.py`).
Body = exact output of `GET /api/integrations/tceq-events/{cas}?limit=6` (`config.TCEQ_PARAMS`, change together with
`frontend/public/chemip/api_integrations.jsx` `useTceqEvents`):
`{cas_no, available, total, years, qty_total_lbs, units, point_kinds, point_kind_labels, disciplines, counties, top_facilities,
recent, source, info_url, notes}`.

**Files exist only for CAS with at least one event** (a few hundred). Unlike the other areas, a 404 here is an answer:
the client (`api_static_extras.jsx` `staticTceqEvents`) returns the empty body `{available: true, total: 0, ...}` and does
**not** fall through to the home-PC API, so a static deployment shows "no events" while the PC is off. With static data
switched off (`base` empty) the client calls the API as before. Served by the Worker route `/data/:version/tx/:file`
(`STATIC_DATA.AREAS`) and listed in the Pages `_routes.json` include (`deploy/cloudflare/site_rules.mjs`).

## pv/<CAS>.json (R2, gzip) — statutory provisions, added 2026-10-30

Optional, additive (format root stays `v1/`). Key: `v1/pv/<CAS>.json` with the dashed CAS. Written by `provisions.py`,
which calls the backend function of `GET /api/integrations/provisions/{cas}?country=<CC>&name=<name>`
(`backend/integrations/epc_regulation_text.find_provisions` → EPC engineering query service 127.0.0.1:15412). This is the
only area built from a live (home-PC) service; the exporter sends at most `config.PROVISIONS_CONCURRENCY` (4) requests at once.

```
{v: 1, cas, name, exported_at: "YYYY-MM-DD", countries: {"<CC>": <exact API body>, ...}}
```

- **CAS set (bounded):** SEO tier 1 (indexable rows of `E:\dev-cache\chemip-seo\reports\facts.jsonl`, 400) ∪ the search
  benchmark list `scripts/substance_search_benchmark/data/common_substances.json` (329): 474 CAS. A CAS gets a file only
  when the panel can ask for it (413 on 2026-10-30; the other 61 are listed in no EPC index country).
- **countries:** the requests the UI can send. The map's jurisdiction selector offers the jurisdictions the CAS is listed in
  (`p/<CAS>.json` `intl.jurisdictions`), and the panel asks only for EPC index countries (`EPC_JURISDICTION` keys
  KR US EU NL MX IN PK VN, mirrored by `product_provisions.jsx` `EPC_JURISDICTIONS`). So `countries` = those keys ∩ listings.
- **name:** the UI sends `selected.name_en || ""`, and it is part of the search query (`"<name> <cas>"`), so it changes the
  answer. The exporter takes it the way a `?chem=<CAS>` link does (`resolveLinkChemId`: the search item with that CAS,
  has_msds first, then KOSHA; then `detail.name_en` from its `p/` file). A search click sends the item's `name_en`; for every
  CAS of the set it is the same value.
- Only successful answers (`available: true`) are stored. A failed call is left out (reported in `reports/provisions.json`)
  and asked again on the next run; answers already in a file with the same `name` are kept (resumable).
- `exported_at` = the date the file's answers were last changed.

Client (`api_static_extras.jsx` `staticProvisions(cas, country, name)`): returns `countries[country]` with an added
`static_as_of = exported_at` (the panel shows "미리 받아 둔 조문, <date> 기준") when the file exists, has that country and
`file.name === name`. Otherwise null → `staticFirst` asks the home-PC API as before (other CAS/countries still work while
the PC is on; with the PC off they show the live-only note). Served by the Worker route `/data/:version/pv/:file`
(`STATIC_DATA.AREAS`) and listed in the Pages `_routes.json` include (`deploy/cloudflare/site_rules.mjs`).

## g/ (R2, gzip)

| Path | Top-level keys | Content |
|---|---|---|
| `g/rulebook.json` | `kr_rules, permits, intl_lists, kr_lists, controlled_lists, hs_meta, parent_blocs` | global rulebook (pilot). `*_lists` entries are list metadata + `file` (intl also has `absence_note`) |
| `g/trade_common.json` | `sources_status, hs_meta` | identical in every trade-controls response |
| `g/permit_common.json` | `durations, attribution` | identical in every kr-permit-context response |
| `g/trade_catalog.json` | `kr_lists, kr_laws, intl_lists, intl_jurisdictions, controlled_lists, permits` | exact body of `GET /api/regulations/trade-controls-catalog` |
| `g/guides_status.json` | `data_dir, ready_files, loaded, meta_count, doc_count, load_error` | body of `GET /api/guides/status` once the guide store is loaded (added 2026-10-28, `extras.py`) |
| `g/guide_index.json` | `v, exported_at, count, fields, rows` | KOSHA technical guide list for the unified search (added 2026-10-30, `guide_index.py`). See below |
| `g/un_index.json` | `v, exported_at, count, fields, rows` | UN number → transport summary + CAS list (added 2026-10-31, `portal_facts.py`). See "f/<CAS>.json" |

### g/guide_index.json — KOSHA guide list (added 2026-10-30)

Optional, additive (format root stays `v1/`). Written by `guide_index.py` from the guide store's metadata file
(`settings.KOSHA_GUIDE_DATA_DIR/guides.json`, the fields `KoshaGuideStore._load` reads, same trimming, duplicates dropped).

```
{v: 1, exported_at: "YYYY-MM-DD", count, fields: ["guide_no", "title", "ofanc_ymd", "file_download_url"], rows: [[no, title, date, url], ...]}
```

- One row per guide (1,039 on 2026-10-30, about 26 KB gzip). No document text, page counts or local file paths.
- The API has no single route with this body. The closest is `GET /api/guides/search?q=` (title + text match, paged), whose
  items carry the same four values under those names.
- Client: `api_static_extras.jsx` `staticGuideIndex()` → `api_usearch.jsx` `fetchGuideIndexRows()`; the unified search ranks the
  rows itself (`usearch_provider_guides.jsx`). A missing file (or static data switched off) → `GET /api/guides/search` through
  `originGet` (home PC only). Served by the existing Worker route `/data/:version/g/:file`.

## gs/ — KOSHA guide full text (R2, gzip), added 2026-10-31

Optional, additive (format root stays `v1/`). Written by `guide_text.py` (pure builder `guide_text_build.py`) from the guide store's
folder `settings.KOSHA_GUIDE_DATA_DIR`: `guides.json` (metadata, same rows as `g/guide_index.json`) and
`normalized/guide_pages.jsonl.gz` (page text extracted from the KOSHA PDFs). Guides without extracted text are left out
(1,037 of 1,039 on 2026-10-31). Every name is flat (one path segment), so the generic Worker route `/data/:version/gs/:file` serves it.

| Path | Content |
|---|---|
| `gs/manifest.json` | `{v: 1, exported_at, count, shards, norm: "nfkc-lower-alnum-bigram", fields, rows}`; `fields` = `["guide_no", "title", "ofanc_ymd", "file_download_url", "pages", "chars"]`, `rows[i]` = doc i (about 32 KB gzip) |
| `gs/t_<n>.json` | postings shard n, `0 <= n < shards` (512): `{bigram: [docDelta, tf, docDelta, tf, ...]}`, doc indices ascending, first delta from 0 |
| `gs/d_<guide_no>.json` | `{v: 1, no, title, pages: [text, ...]}` page text with whitespace runs collapsed to one space (about 9 KB gzip each) |

- **Normalization** (both sides identical): NFKC → lower case → keep letters and digits only (Python `str.isalnum`, JS `[\p{L}\p{N}]`).
  Bigram = two consecutive characters of the normalized text of one page (no bigram crosses a page). Shard = `fnv1a32(bigram) % shards`
  (same FNV-1a as "Search keys"). Word tokens are not used: the Korean PDF text has almost no reliable spacing.
- **Client** (`guide_text_core.jsx`, `api_guide_text.jsx`): normalize the query; fewer than 2 characters → no text search. Take its distinct
  bigrams (at most 8, spread evenly), read their shards, intersect the doc sets (tf = min over bigrams), order by "title contains the query",
  then tf. Read `d_<no>.json` of the first 12 and keep a guide only if the normalized page text contains the normalized query (exact
  phrase, spacing ignored); that gives the hit count, the first page and the snippet. `unchecked` = candidates not read.
- A missing manifest (404, or static data switched off) means "no full-text index": the unified search falls back to
  `g/guide_index.json` (titles only), then to `GET /api/guides/search` on the home PC (which also returns snippets).
- Size on 2026-10-31: 139,488 bigrams; shards 4.5 MB gzip in total, page text 9.7 MB gzip, manifest 32 KB gzip. Upload:
  `upload_r2_s3.py --src <OUT>/v1/gs --prefix v1/gs --gzip-all`. The uploader resumes from its done-file
  (`reports/r2_s3_uploaded_v1_gs.txt`); delete that file after a re-export so changed files are sent again.

## Assembling a country view (trade-controls with `country`)

The default views (country `""`) are stored as `trade.import` and `trade.export`. For any other country, the client computes `assemble_view(page, rulebook, trade_common, direction, country)`. It is a 1:1 port of `trade_assembly_ref.py`, about 70 lines:

1. `country = country.trim().toUpperCase()`. `memberships` = the regulation codes found in `intl.jurisdictions[*][*].regulation`, ∪ `controlled[*].list_id`, ∪ `kr_law[*].list_id`. `categories` = `ncis.classifications[*].category`.
2. `kr_law_lists` = the `kr_law` entries joined with `rulebook.kr_lists` metadata (by `list_id`, `obligations || []`), then `group_by_law`.
3. `kr_permits` = `permits.evaluate(rulebook.permits, memberships, categories)`. `kr_obligations` and `kr_unverified` = `rules.evaluate(rulebook.kr_rules.rules / .unverified, categories, memberships, direction)`.
4. `controlled_lists` = the `controlled` entries whose `directions` allow `direction`. `controlled_lists_any` = all of them, as `{list_id, title, directions}`.
5. If `country` is set and is not `KR`, build `destination = {country, role: export ? "destination_import" : "origin", listings, kotra, intl_lists}`:
   - `listings` = the `intl.jurisdictions` items for `[country, ...parent_blocs[country], "INTL"]`, each tagged with `country`.
   - `intl_lists` = the rulebook intl lists scoped to the jurisdictions `[country, ...parent_blocs[country]]` whose directions allow the counterpart direction (export→import, import→export). They are joined with the page's `intl_lists` in rulebook order, followed by `absent: true` stubs for scoped lists that have an `absence_note` and no membership.
   - `kotra`: `null` for import. For export it is a live API value, which the reference returns as `"LIVE_ONLY"`.
   - In that case the top-level `intl_lists` is `[]`. Without a destination it is the unscoped (all-jurisdiction) version.
6. `hs`, `hsk10_candidates` come from the page. `hs_meta` = `rulebook.hs_meta` when `hs` is non-empty, else `{}`. `sources_status` = `trade_common.sources_status`.

Verified offline by `verify_assembly.py`, for direction × country {"", US, EU, NL, CN, JP, VN, KR, MX, IN, PK, INTL}. The views are byte-identical to `build_trade_controls` except `kotra`.

## f/<CAS>.json, f/id_<n>.json, g/un_index.json (R2, gzip) — portal facts, added 2026-10-31

Optional, additive (format root stays `v1/`). Written by `portal_facts.py` (run_all step `facts_portal`) from
`data/portal_facts.db` (read-only), which `scripts/portal_build/` builds (`msds_facts.py`: KOSHA MSDS §9 properties,
§14 transport, §8 H0202 Korean limit; `identifiers.py`: names, KOSHA/NCIS/PubChem/Wikidata identifiers; other services
add `oel` rows). Served by the Worker route `/data/:version/f/:file` (`STATIC_DATA.AREAS`) and the Pages `_routes.json`
include (`deploy/cloudflare/site_rules.mjs`). There is no API route with these bodies; with static data switched off the
UI shows nothing for them.

### f/<CAS>.json — facts of one substance

Key: `v1/f/<CAS>.json`, dashed CAS as written in the DB (`^\d{2,7}-\d{2}-\d$`). A file exists for every CAS with at least
one property, transport or oel row (17,685 on 2026-10-31). **A 404 is an answer** ("no facts"), not a reason to ask the API.

```
{v: 1, cas, link, names: {ko: [..], en: [..]}, ids: {<type>: [..]}, props: {<prop>: [row, ..]},
 transport: [..], oel: [..], oel_text: [..], sources: {<source_id>: {name, url, license, retrieved_at}}}
```

| key | content |
|---|---|
| `link` | chem id the UI opens for this CAS (`?view=product&pv=chemical&chem=<link>`): the KOSHA id of the ChemIP list row, else the CAS when the list has it, else an MSDS-only record id (its `p/<id>.json` is kind `msds`) |
| `names` | up to 3 names per language, best first (ChemIP list, NCIS, Wikidata, aliases) |
| `ids` | up to 10 values per type, sorted. Types in order: `ec`, `ke` (NCIS: `KE-12345`, also the other NCIS series as written), `un`, `inchikey`, `pubchem_cid`, `wikidata` (Q id), `kosha_id` (KOSHA MSDS record ids) |
| `props` | property → rows, **best first** (the record of the ChemIP list's KOSHA id, then rows with a number, then rows with an origin). Properties: `flash_point boiling_point melting_point autoignition decomposition lfl ufl vapor_pressure vapor_density relative_density solubility viscosity molar_mass log_kow ph appearance` |
| prop row | `{t, n, u, c, o, id, s}`: `t` original text (MSDS §9 item, "※출처" part and "자료없음" fillers removed), `n` number in SI unit `u` (°C, Pa, g/L, mPa·s or mm²/s, g/mol, %, or null = dimensionless) — **only for one plain value**: no `<`/`>`/range and a known unit; `c` condition (text in brackets after the value, e.g. `20℃`), `o` origin the MSDS cites (ICSC, ECHA, HSDB …), `id` MSDS record id, `s` source id |
| `transport` | `[{un, name, class, pg, mp, ems, erg, id, s}]` from MSDS §14: UN number (4 digits), proper shipping name, class (as written, e.g. `3`, `8(6.1)`), packing group `I`/`II`/`III`, marine pollutant `yes`/`no`/null, IMDG EmS `F-E, S-D`, ERG guide (null for now) |
| `oel` | `[{j, kind, v, u, note, as_of, s}]` all `oel` rows of the CAS: jurisdiction (`INTL_JURISDICTIONS` key, e.g. `KR`), `TWA`/`STEL`/`C`/`IDLH`, value, unit (`ppm`, `mg/m3`, `f/cc`), notation, date. Rows with `s = kosha_msds_s8` are the limit the MSDS quotes (§8 H0202), not the MOEL notice |
| `oel_text` | `[{j, id, t, s}]` the original §8 text each MSDS-quoted limit was read from |
| `sources` | every source id used in the file → name, URL, license, retrieval date (the UI's source badge) |

### f/id_<n>.json — identifier lookup for the unified search

`n = fnv1a32(key) % 128` (`config.FACTS_ID_BUCKETS`; same FNV-1a as "Search keys"), `key` = the identifier in upper case
with every space removed (`KE-02150`, `200-753-7`, `UHOVQNZJYSORNB-UHFFFAOYSA-N`). Names cannot collide with a CAS file.

```
{v: 1, bucket: n, keys: {<key>: [[type, CAS, link, name_ko, name_en], ...]}}
```

Types: `ec`, `ke`, `inchikey` (UN numbers are in `g/un_index.json`). A key missing from its shard means "no substance".

### g/un_index.json — UN number lookup

```
{v: 1, exported_at, count, fields: ["CAS", "link", "name_ko", "name_en"],
 rows: {"<UN 4 digits>": {name, class, pg, mp, ems, n, cas: [[CAS, link, name_ko, name_en], ...]}}}
```

`name`/`class`/`pg`/`mp`/`ems` = the most common value over the MSDS §14 rows of that UN number; `n` = number of CAS;
`cas` = the first 8 CAS (those with a Korean name first, then an English name, then by CAS). About 130 KB gzip.

Clients: `frontend/public/chemip/api_static_facts.jsx` (`staticFacts`, `staticIdShard`, `staticUnIndex`) → `api_facts.jsx`.

## reg/ — regulation lists and change alerts (R2, gzip), added 2026-10-31

Optional, additive (format root stays `v1/`). Written by `reg_export.py` (run_all step `reg`) from every list ChemIP knows
(`scripts/portal_build/reg_lists.py`, read-only) and `data/portal_facts.db` `reg_changes` (appended by
`scripts/portal_build/reg_diff.py`; run it before the step). Served by the Worker areas `reg` and `reg/list`
(`STATIC_DATA.AREAS`, files `*.json` / `*.xml`), listed in the Pages `_routes.json` include (`deploy/cloudflare/site_rules.mjs`
`/data/v1/reg/*`); on the PC site by `backend/api/routes/static_areas.py` (Next rewrite `/data/v1/reg/*`).

| Path | Content |
|---|---|
| `reg/lists.json` | `{v: 1, exported_at, groups, count, lists: [meta], sources: {source_id: {name, url, license, retrieved_at}}}` |
| `reg/list/<id>.json` | `{v, ...meta, license, fields: ["cas","name","name_en","detail"], part: 0, part_rows, rows}` — first part |
| `reg/list/<id>.<k>.json` | `{v, id, part: k, rows}` for k = 1 .. parts-1 (only lists longer than `part_rows` = `config.REG_PART_ROWS`, 2,500) |
| `reg/changes.json` | `{v, exported_at, total, count, items: [change]}` — newest first, at most 300 items |
| `reg/changes.xml` | RSS 2.0 of the newest 60 items (title, link, guid, pubDate, description) |

- `meta` = `{id, g, j, law, title, n, cas, parts, amended_on, version, retrieved, url, src}`: `g` group (`kr_law` |
  `ncis` | `controlled` | `intl` | `intl_reg`), `j` jurisdiction (`INTL_JURISDICTIONS` key), `title` the list's own
  (mostly Korean) name, `n` rows, `cas` distinct CAS, `url` original source, `src` source_id. ids are `[A-Z0-9_]+`:
  the rulebook `list_id` (kr / controlled / intl lists), `NCIS_<category>` (NCIS classification, `reg_config.NCIS_IDS`),
  `IR_<regulation code>` (terminology.db `intl_regulatory`, the p/ `intl.jurisdictions` listings).
- A row is `[cas, name, name_en, detail]`; `cas` is `""` for a family entry (a group without one CAS). `detail` is
  trimmed to 240 characters.
- `change` = `{d, j, list, title, cas, ch, detail, url, src, n}`: `ch` = `added` | `removed` | `modified`; `n` > 1 means
  `n` substance rows of the same (date, list, change, source) folded into one item (`cas` null, `detail` ""). `src`:
  `chemip_export_diff` (export vs stored snapshot; `detail` = substance name), `law_go_kr_listmeta` (a KR list's notice
  amendment date), `law_go_kr_api` (법제처 OPEN API 발령일자; needs an OC key), `federal_register` (EPA / OSHA rules),
  `echa_candidate_list` (Candidate List inclusion dates). Official sources: title, date and link only.
- Clients: `frontend/public/chemip/api_reg.jsx` (root = static pages root, else same-origin `/data/v1`), screen `?view=reg`
  (`&list=<id>`), unified-search provider `usearch_provider_reglists.jsx`.


## prtr/ — PRTR facility map (R2, gzip), added 2026-10-31

Optional, additive (format root stays `v1/`). Portal service 13. Written by `prtr.py` (run_all step `prtr`) with the backend
function `backend/core/prtr_map.build_all`, from the local PRTR cache `data/prtr/prtr_facilities.sqlite` (read-only; the same
cache `/api/handlers` reads). The PC site serves the same bodies at `/api/prtr/index` and `/api/prtr/<CAS>`
(`backend/api/routes/prtr_map.py`). Source: 기후에너지환경부 화학물질안전원 화학물질 배출·이동량 정보(PRTR), data.go.kr 15024756,
이용허락범위 제한 없음. Amounts are the facility-reported annual values (kg/year) as they are; nothing ranks facilities by risk.

**`prtr/index.json`** — the substances that have at least one facility row (199 on 2026-10-31):

```
{v: 1, year: 2024, exported_at: "YYYY-MM-DD", source: {name_ko, name_en, provider_ko, provider_en, url, license_ko, license_en},
 regions: [{iso: "KR-11", ko: "서울특별시", en: "Seoul"}, ...],      // all 17 시도, ISO 3166-2:KR, fixed order (backend/core/prtr_regions.py)
 cols: ["cas", "name_ko", "name_en", "facilities", "reported_total_kg"],
 substances: [["1310-73-2", "수산화 나트륨", "Sodium hydroxide", 1327, 29029416.0], ...]}   // most facilities first
```

**`prtr/<CAS>.json`** — dashed CAS (`^\d{2,7}-\d{2}-\d$`); a file exists exactly for the CAS in the index. A 404 is an answer
("no PRTR facility rows"), the client does **not** fall through to the home-PC API:

```
{v: 1, cas, name_ko, name_en, year, exported_at, source,            // source as in index.json
 reported_facilities: 1328,                                          // company_count of the PRTR material row
 totals:  {facilities, release_kg, transfer_kg, reported_total_kg},  // over the listed facility rows
 regions: [{iso, facilities, release_kg, transfer_kg, reported_total_kg}],          // 시도 with ≥1 facility, region-table order
 sigungu: [{iso, name, facilities, release_kg, transfer_kg, reported_total_kg}],    // 시/군/구 (city level: 수원시 장안구 → 수원시), most facilities first
 unparsed: 0,                                                        // rows whose address gives no 시도 (left out of regions)
 facility_cols: ["name", "iso", "sigungu", "address", "release_kg", "transfer_kg", "reported_total_kg"],
 facilities: [["기아자동차(주)화성공장", "KR-41", "화성시", "경기도 화성시 …", 474782.0, 1157888.0, 1632670.0], ...]}
```

- `release_kg` = reported total release (air + water + soil), `transfer_kg` = reported total transfer (waste + wastewater),
  `reported_total_kg` = release + transfer + on-site landfill (the basis the handlers panel sorts by). Values rounded to 0.1 kg.
- Region = first word of the road address (current and old names: 강원도/강원특별자치도, 전라북도/전북특별자치도, short forms 경기·충남 …);
  시군구 = second word when it ends in 시·군·구 (Sejong has none). No geocoding.
- `facilities` sorted by `reported_total_kg` desc, then release, transfer, name. The largest file (sodium hydroxide, 1,327 rows) is 40 KB gzip.
- Map boundaries are not in this area: they ship inside the UI bundle (`frontend/public/chemip/prtr_map_geo.jsx`, 17 시도,
  geoBoundaries gbOpen KOR ADM1 = Natural Earth, Public Domain; built by `scripts/geo/build_kr_sido_topo.py`). Feature id = `regions[].iso`.
- Clients: `frontend/public/chemip/api_prtr.jsx` (`STATIC_LAYOUT.pages.prtrIndex` / `.prtr(cas)`), screen `?view=prtr&cas=<CAS>`,
  unified-search provider `usearch_provider_prtr.jsx`. Served by the Worker route `/data/:version/prtr/:file` (`STATIC_DATA.AREAS`)
  and listed in the Pages `_routes.json` include (`deploy/cloudflare/site_rules.mjs`).

## oel/<CAS>.json, g/oel_summary.json (R2, gzip) — exposure-limit comparison, added 2026-10-31

Optional, additive (format root stays `v1/`). Service 5 of `docs/portal/PORTAL_SERVICES_v1.md`. Written by `oel.py`
(run_all step `oel`) from `data/portal_facts.db` (read-only): table `oel` (all sources), `sources`, and `properties` molar_mass.
The `oel` rows are built by `scripts/portal_build/oel_build.py` from raw official files kept with their retrieval dates in
`data/portal_raw/oel/<source_id>/manifest.json` (fetchers `oel_fetch.py`, `oel_fetch_browser.cjs`; registry `oel_sources.json`),
plus the KOSHA MSDS §8 rows of `msds_facts.py` (source `kosha_msds_s8`).

Key: `v1/oel/<CAS>.json` with the dashed CAS. A file exists for every CAS with at least one row; a 404 means "no exposure-limit
data collected" (the panel then shows its empty state and the link-only sources from the summary).

```
{v: 1, cas, exported_at: "YYYY-MM-DD", mw: <g/mol or null>,
 rows: [{j, src, kind, value, unit, note, as_of}, ...],
 sources: {<src>: {name, url, license, retrieved_at}},
 links: [{src, name, url, license}]}
```

- `j`: jurisdiction, `INTL_JURISDICTIONS` keys (`KR`, `US`, `EU`). `src`: `sources` id — `kr_moel_notice` (MOEL notice annex 1),
  `kosha_msds_s8` (value quoted in the KOSHA MSDS), `us_osha_z` (29 CFR 1910.1000 Z-1/Z-2/Z-3), `us_osha_specific`
  (1910.1001–1910.1053), `us_niosh_npg` (NIOSH REL and IDLH), `eu_boelv` (2004/37/EC Annex III), `eu_ioelv` (98/24/EC lists).
- `kind`: `TWA` | `STEL` | `C` | `IDLH`. `unit`: `ppm` | `mg/m3` | `f/cc` | `mppcf` (µg/m³ and ppb are scaled). When a source
  gives both ppm and mg/m³ they are two rows. `note`: the source's notation as printed (skin, carcinogen category, "Ca",
  sensitisation, form such as "[Nickel(Metal)]" when one CAS has several entries, a transitional measure still ahead).
- `rows` are ordered KR, US, EU; inside a jurisdiction the official notice/standard first, then MSDS, then advisory values.
- `mw`: the most frequent KOSHA MSDS §9 molar mass for the CAS (`properties.molar_mass`), used by the ppm ↔ mg/m³ toggle
  (25 °C, 1 atm, 24.45 L/mol, same function as the ppm_mgm3 calculator). null when unknown (the UI then reads MSDS §9 itself).
- `links`: link-only sources (`config.OEL_LINK_ONLY`: ACGIH TLV, GESTIS-ILV). **No values from these sources are stored.**
- Values are reference values with their sources. The files carry no compliance judgement.

`g/oel_summary.json`: `{v, exported_at, count, sources: {<src>: {name, cas, rows}}, jurisdictions: {<j>: n_cas}, links, cas: [sorted CAS]}`.
The unified search (`usearch_provider_oel.jsx`) reads `cas` to skip substances without a file.

Clients: `frontend/public/chemip/api_oel.jsx` (`STATIC_LAYOUT.pages.oel(cas)` / `.oelSummary`; without static data the same
path under `/data/v1`, served on the PC site by `backend/api/routes/static_areas.py`), panel `product_oel.jsx` (anchor `oel`).
Served by the Worker route `/data/:version/oel/:file` (`STATIC_DATA.AREAS`) and listed in the Pages `_routes.json` include
(`deploy/cloudflare/site_rules.mjs`). Upload: `upload_r2_s3.py --src <out>/v1/oel --prefix v1/oel --gzip-all`; the summary goes with `v1/g`.

## rel/<CAS>.json (R2, gzip) — related substances, added 2026-10-31

Optional, additive (format root stays `v1/`). Key: `v1/rel/<CAS>.json` with the dashed CAS. Written by `related.py`
(`run_all.py --steps related`, about 15 s; inputs `related_sources.py`, scoring `related_rank.py`, data
`related_families.json` · `related_hazards.json`, tuning `config.REL_*`). Uploaded with
`upload_r2_s3.py --src <out>/v1/rel --prefix v1/rel --gzip-all`.

```
{v: 1, cas, items: [{cas, ko, en, s, why: [{t: "fam", k}, {t: "law", k, ko}, {t: "ghs", k}], nl, ng}, ...]}   (at most 8 items)
```

- **Features.** `law` = Korean statutory list membership (the trade-controls `kr_lists/` files, entries + family entries;
  `_index*` and `*_unverified` skipped). `ghs` = hazard class + category from the KOSHA MSDS section 2 H-statements
  (item `B0406`, mapped by `related_hazards.json`, e.g. H350 → `carc_1`). `fam` = curated family (`related_families.json`,
  e.g. `btex`).
- **Targets** (what can be recommended) = KOSHA substances with at least one feature (9,403 on 2026-10-31), so every link
  opens a page with an MSDS. **Sources** (who gets a file) = targets + every CAS on a statutory list + family members (12,181);
  9,455 have at least one related substance and get a file.
- **Score** = `sim` × cosine of the law + ghs vectors (each feature weighted `law`|`ghs` × idf, idf = ln(1 + N/df) over
  targets; features held by more than `REL_MAX_DF` of targets are ignored) + `fam` × shared families + `REL_PRIOR` when the
  target is in `frontend/lib/chemip-seed.ts`. Pairs below `REL_MIN_SCORE` are dropped; ties break on CAS; two CAS with the
  same Korean name keep the first. `s` is that score (2 decimals), for ordering only.
- **why** lists every shared family, then the `REL_REASONS_SHOWN` (2) rarest shared lists with their Korean rulebook title,
  then the 2 rarest shared hazard classes. `nl` / `ng` = all shared lists / hazard classes (the UI shows "n shared").
  Display names: families and hazard classes `frontend/public/chemip/product_related_labels*.jsx`, English list names
  `reg_list_names_en.jsx`. `tests/test_related_rank.py` checks that every key has a name.
- `ko` / `en` = display names: seed list name, else the KOSHA name with Hangul (notes in brackets cut), else NCIS; English
  from KOSHA `name_en`, then NCIS.

Like `tx/`, a 404 is an answer ("no related substances"): the client (`api_discovery.jsx` `fetchRelatedSubstances`) returns
null and the substance page hides the section; it never asks the home-PC API. With static data switched off (PC site) it
reads the same path at `/data/v1/rel/` (404 there today, so the section stays hidden). Served by the Worker route
`/data/:version/rel/:file` (`STATIC_DATA.AREAS`) and listed in the Pages `_routes.json` include
(`deploy/cloudflare/site_rules.mjs`).

## feed/ — chemical incident feed (R2, gzip), added 2026-10-31

Optional, additive (format root stays `v1/`). Written by `feed_export.py` (run_all step `feed`) from `portal_facts.db`
`feed_items` + `sources`, which `scripts/portal_build/incident_feed.py` fills (schema and sources:
`docs/portal/INCIDENT_FEED_v1.md`). Uploaded with `upload_r2_s3.py --src <out>/v1/feed --prefix v1/feed --gzip-all`.

| Path | Content |
|---|---|
| `feed/latest.json` | the newest items: `LATEST_N` (300) overall with at most `LATEST_PER_SOURCE_MAX` (100) from one source, plus the newest `LATEST_PER_SOURCE` (30) of every source |
| `feed/by-cas/<CAS>.json` | one file per CAS that has at least one item (525 on 2026-10-31): its newest `BY_CAS_MAX` (100) items and the full count |

```
latest:  {v: 1, exported_at, updated_at, total, count, sources: {<source_id>: {name, url, license, retrieved_at, n}},
          disciplines: {<key>: <Korean name>}, countries: {<ISO2>: n}, substances: [[cas, name, n], ...] (top 60),
          items: [item, ...], cron?: {last_run, source, fetched, added}}
by-cas:  {v: 1, cas, name, exported_at, total, by_source: {<source_id>: n}, items: [item, ...]}
item:    {id, date, title, url, source, cas: [], names: [], equipment: [], disciplines: [], country, summary}
```

- `id` = `<source_id>:<id in that source>`; `source` = a `sources` key, whose `license` is the source's own terms, shown with
  every item. `date` is `YYYY-MM-DD`, `YYYY-MM` or `""` (unknown, sorted last); order = date desc, then id desc.
- `cas` / `names` are parallel lists. `disciplines` = EPC design discipline keys of the failed equipment
  (`backend/integrations/equipment_disciplines.py`, names in `disciplines`). `country` = ISO 3166-1 alpha-2 or `""`.
- Press items (`press_gnews`) carry only title, link, date (and CAS tags read from the title); `summary` is always `""`.
- `total` in latest = all rows of `feed_items` at export time (plus what the cron added); `count` = `items.length`.
- **The Worker cron may rewrite `latest.json` in R2** (`cloudflare/worker/src/cron_feed.js`, not enabled by default): it adds
  new CSB RSS items (`source: "csb_rss"`, newest 60 kept), sets `updated_at` and `cron`, and leaves every other item as
  exported. It never touches `by-cas/`. A new export + upload replaces the cron's file (the cron writes only when the object
  is unchanged since it read it).

Client (`frontend/public/chemip/api_feed.jsx`): `fetchFeedLatest()`; `fetchFeedByCas(cas)` turns a 404 into the empty answer
`{cas, total: 0, items: []}` (no home-PC API exists for the feed). With static data switched off (PC site) it reads the same
paths at `/data/v1/feed/` (Next rewrite → `backend/api/routes/static_areas.py`). Served by the Worker routes
`/data/:version/feed/:file` and `/data/:version/feed/by-cas/:file` (`STATIC_DATA.AREAS` "feed", "feed/by-cas", cache
`AREA_CACHE_CONTROL`: 15 min / 1 h) and listed in the Pages `_routes.json` include (`deploy/cloudflare/site_rules.mjs`).

## g/reactive_class.json, g/clp_annex6.json (R2, gzip) — safety tools, added 2026-10-31

Optional, additive (format root stays `v1/`). Written by `safety_tools.py` (run_all step `safety_tools`; run
`scripts/portal_build/reactive_class.py` first). Served by the existing Worker route `/data/:version/g/:file`, so no Worker
or Pages change. The rule tables (pair rules, hazard classes, mixture constants) are not here: the browser carries them in
`frontend/public/chemip/safety_rules_data.jsx`, generated from `scripts/portal_build/safety_rules/*.json`.

`g/reactive_class.json` — storage compatibility matrix (service 7), from `data/portal_facts.db` `reactive_class` + `sources`:

```
{v: 1, exported_at, source_ids: [id, ...], sources: {id: {name, url, license, retrieved_at}},
 fields: ["system", "class", "basis", "source"], count, classes: {"<CAS>": [[system, class, basis, source index], ...]}}
```

- system `kr` (위험물안전관리법 유별 1-6, KOSHA MSDS §15), `un` (UN class incl. subsidiary, §14), `ghs` (reactive group
  EX OX OP SR FL PY SH WR AC BA CO AG WT from §2 or CLP Annex VI). basis: `s15:<text>`, `s14:<text>`, `<hazard entry>`,
  `clp:<hazard entry>`, `ph:<v>`, `name`, `EUH0xx`. 8,822 CAS, about 67 KB gzip.
- A CAS missing from the file has no class; the client then derives classes from the substance's MSDS detail with the
  same rules (`compat_core.jsx` `cmClassesFromDetail`). With static data off the client always derives.

`g/clp_annex6.json` — mixture GHS helper (service 8), from the ECHA Annex VI table (xlsx, `scripts/portal_build/annex6.py`):

```
{v: 1, exported_at, table_date, atp, source: {name, url, legal, license}, count, rows, rows_no_cas,
 entries: {"<CAS>": [{index, name, ec, hazards: ["acute_oral:3*", ...], scl: [[hazard, category, lower limit %]],
                      ate: {oral|dermal|gas|vapour|dust: value}, m: {acute, chronic}, euh: [...], notes, atp}, ...]}}
```

- Hazard entries `<key>:<category>` (`*` = Annex VI minimum classification); keys in `ghs_hazards.json`. One CAS can have
  several entries (e.g. nitric acid ...% [C > 70 %] and [C ≤ 70 %]). Rows without a CAS (group entries) are not exported.
- ATP23, 4,178 CAS, about 175 KB gzip. Attribution: "Source: European Chemicals Agency"; legal text EUR-Lex.

## g/hazchem_quantity.json (R2, gzip) — regulatory applicability checker, added 2026-10-31

Optional, additive (format root stays `v1/`). Written by `scripts/portal_build/hazchem_quantity.py` (not a run_all step; run it
when the notice changes) from the .hwp attachments of 화학물질안전원고시 「유해화학물질의 규정수량에 관한 규정」 제2026-4호
(별표 2: 1,557 rows, 19 deleted; 별표 3: 100 rows), raw files and sha256 in `data/portal_raw/hazchem_quantity/`. Served by the
existing Worker route `/data/:version/g/:file` and the PC route `/data/v1/g/` (`backend/api/routes/static_areas.py`). Read by
`frontend/public/chemip/api_applicability.jsx`; when missing, the screen marks the Chemicals Control Act result "check needed".

```
{v: 1, exported_at, source: {name, name_en, issuer, number, number_en, promulgated, effective, url, legal, license}, unit: "t",
 counts: {annex2, annex2_deleted, annex3},
 accident:  {"<CAS>": [{no, name, name_en, bands: [{kind: "base"|"solution", conc, concAbove?, lowest, lower, upper}]}]},   // 별표 3
 hazardous: {"<CAS>": [{no, id, name, name_en, bands: [{kinds: ["acute"|"chronic"|"eco"|"lowdisp"|"solution"], conc, lowest, lower, upper}]}]}}  // 별표 2
```

- Quantities in tonnes; `null` = "-" in the notice (no such quantity, e.g. chronic rows have no upper). `conc` = 함량기준 (% 이상).
- 별표 3 takes precedence over 별표 2 (별표 2 일반기준 가). `solution` = the * values of 별표 3 items 42–44 / 용액 rows of 별표 2;
  `lowdisp` = 저확산 values (liquid or solid handling). Multi-CAS rows (e.g. xylene) are listed under every CAS. About 70 KB gzip.
- Upload: `E:/dev-cache/r2-venv/Scripts/python -B scripts/static_export/upload_r2_s3.py --src E:/dev-cache/chemip-static/staging_hazchem_quantity --prefix v1/g --gzip-all`.

## tp/ — temperature-dependent property correlations (R2, gzip), added 2026-10-31

Optional, additive (format root stays `v1/`). Written by `tp.py` (run_all step `tp`) from
`data/portal_raw/tp/build/tp_records.json`, which `scripts/portal_build/thermo_props.py` assembles from the allow-listed
sources of `scripts/portal_build/tp_sources.json` only (licence gate `tp_licence.py`, run again at export):
ChemSep LITE v8.50 databank (Artistic-2.0, Modified Version: subset converted to JSON), NASA CEA `thermo.inp`
(Apache-2.0, NASA-9), Wikidata critical points (CC0), CoolProp constants (MIT). No CRC / Perry / Yaws / DIPPR-801 / VDI /
Landolt / JANAF / NIST SRD data.

`v1/tp/<CAS>.json` (dashed CAS; a 404 means "no data"):

```
{v: 1, cas, name, exported_at, smiles,
 const:  [{k, v, unit, src, ref?}],          k: Tc Pc Vc Zc omega Tb Tm Tt Pt MW Hf_ig Hf_l Gf_ig S_ig; SI per mol (Vc m3/mol, H J/mol)
 curves: [{p, form, c: [A..E], Tmin, Tmax, Tc?, unit, f, src, intervals?, species?}],
 sources: {<src>: {name, url, home, license, license_url, citation, retrieved_at, note?, notice?}}}
```

- `p`: psat, psat_antoine, rho_l (mol/m3), cp_ig, cp_l (J/mol/K), hvap (J/mol), mu_l, mu_g (Pa*s), k_l, k_g (W/m/K), sigma (N/m).
- value = `f` × form(T [K], c). `form` "eqN" = ChemSep equation number (10 = ln-Antoine with T + C; 16; 100–116 = DIPPR;
  120, 121), "nasa9" = NASA-9 polynomial with `intervals: [{Tmin, Tmax, a[7], b[2]}]` (Cp, H, S). `Tc` is set for 106/114/116.
  Evaluators: `frontend/public/chemip/tp_forms.jsx` (one function per form); values only inside [Tmin, Tmax] (no extrapolation).
- `v1/tp/index.json`: `{v, exported_at, count, rows: [[cas, name, [props]]]}`. `v1/tp/licenses.json`: allow-listed sources with
  licence name, citation, Modified-Version note and full licence texts (Artistic-2.0, NASA NOTICE + Apache-2.0).

Clients: `api_tp.jsx` (`STATIC_LAYOUT.pages.tp`), panel `product_tp.jsx` (anchor `tp`), and for separation calculators
`tpPsatFn(cas)` / `loadTpPsatFn(cas)` (api_tp.jsx) and the pure `tpPsatFromFile(file)` / `tpPsatInverse` (tp_forms.jsx).
Served by the Worker area `tp` (`STATIC_DATA.AREAS`), Pages `_routes.json` include `/data/v1/tp/*`, PC site `static_areas.py`.
Upload: `upload_r2_s3.py --src <out>/v1/tp --prefix v1/tp --gzip-all`.

## el/<CAS>.json, el/index.json (R2, gzip) — emergency exposure guidelines, added 2026-10-31

Optional, additive (format root stays `v1/`). Written by `scripts/portal_build/emergency_limits.py` (not a run_all step: it reads
raw official files only, no database) from `data/portal_raw/el/<source_id>/` (fetcher `el_fetch.py`, manifest with URL, date, sha256;
parsers `el_aegl.py`, `el_pac.py`, `el_rivm.py`; paths and source texts `el_config.py`). Key: `v1/el/<CAS>.json` with the dashed CAS.
A file exists for every CAS with an AEGL, a PAC or a RIVM probit (3,075 on 2026-10-31); a 404 means "none collected".

```
{v: 1, cas, name, exported_at, mw,                     mw: DOE PAC molar mass (g/mol) or null
 aegl: {status, unit, times: ["10min","30min","60min","4h","8h"], v: {"1": [5], "2": [5], "3": [5]},
        f: {"1": [5 flags], ...}, mg?: {"1": [5], ...}, lel?: {value, unit}, page, tsd} | null,
 pac:  {rev: "29", unit, v: [p1, p2, p3], f: [3 flags], mg: [3], basis, tiers: ["AEGL"|"ERPG"|"TEEL", x3]} | null,
 erpg: {unit, v: [e1|null, e2|null, e3|null], via: "doe_pac_rev29", surrogate} | null,
 probit: {a, b, n, c_unit: "mg/m3", t_unit: "min", status, established, page, doc} | null,
 src: [source ids used]}
```

- `aegl`: EPA AEGL values pages (US government work). `unit` `ppm` | `mg/m3`; `mg` = the bracketed mg/m³ values some pages print.
  `f`: `""`, `NR` (not recommended, insufficient data), `ND` (not determined), `*` / `**` / `***` (EPA: > 10 / 50 / 100 % of the LEL).
  Cells printed only as `**`/`***` take their value from the note under the table. `status` `Final` | `Interim` | `Proposed`.
- `pac`: DOE PAC Rev. 29 (May 2016) Table 2 (original unit + basis) and Table 4 (`mg`, mg/m³). `f`: DOE LEL footnotes
  (`*` 10–50 % LEL, `**` 50–100 %, `***` ≥ 100 %). `tiers`: which family DOE took each tier from (read from `basis`).
  Rev. 29A differs from Rev. 29 in one value (7778-50-9 PAC-2 8.8 → 7.4 mg/m³); the task fixed Rev. 29.
- `erpg`: only the tiers DOE based on an AIHA ERPG, values only, shown as "ERPG via DOE PAC Rev. 29". AIHA documentation is never
  copied. A chemical with an AEGL has no `erpg` here even if AIHA publishes one (DOE then uses the AEGL).
- `probit`: RIVM probitrelaties lethal relation Pr = a + b·ln(Cⁿ·t), C mg/m³, t min, from the current value on the RIVM page.
- Values are reference values for emergency planning with their sources; the files carry no compliance judgement.

`el/index.json`: `{v, exported_at, count, counts: {aegl, pac, erpg, probit}, sources: {<id>: {name, url, license, retrieved_at}}, cas: [sorted]}`.

Clients: `frontend/public/chemip/api_el.jsx` (`STATIC_LAYOUT.pages.el.cas(cas)` / `.index`; without static data the same path under
`/data/v1`, served on the PC site by `backend/api/routes/static_areas.py`), panel `product_el.jsx` (anchor `el`), unified-search answer
`usearch_answer_el.jsx`, off-site screening `calc_rmp_data.jsx` / `kora_sheet_panel.jsx`. Worker area `el` (`STATIC_DATA.AREAS`),
Pages `_routes.json` include (`deploy/cloudflare/site_rules.mjs`). Upload:
`upload_r2_s3.py --src <out>/v1/el --prefix v1/el --gzip-all`.

## law/ — Korean law corpus (R2, gzip), added 2026-10-31

Optional, additive (format root stays `v1/`). Written by `scripts/portal_build/law_export.py` (not a run_all step; it reads
`data/portal_facts.db` `law_*` built by `law_corpus.py`, the Korean lists of `reg_lists.py` and each list's legal basis) into
`<out>/v1/law/`, which then holds only these files (old ones are removed first). Source: 법제처 국가법령정보센터 OPEN API current
texts. Korean statutes and notices are not protected by copyright (저작권법 제7조); every file carries the source. The exporter
refuses to write when the law.go.kr OC key (or an `OC=` parameter) appears in any file.

| Path | Content |
|---|---|
| `law/index.json` | `{v, exported_at, as_of, count, cas_buckets, source, docs: [doc meta]}` — every current doc, 법령 first, by name |
| `law/<id>.json` | one doc: `{v, ...doc meta, url_version, promulgation_no, amend_type, source, items, annex_list, history}` |
| `law/toc.json` | `{v, exported_at, fields: ["doc","t","no","title"], rows}` — headings (`t` "h", title = heading text) and article titles (`t` "a"/"b") |
| `law/lists.json` | `{v, exported_at, as_of, source, lists: {<list id>: {title, group, law, basis, cites: [cite]}}}` — lists with ≥ 1 resolved citation |
| `law/cas_<n>.json` | `{v, n, cas: {<CAS>: {l: [list ids], m?: [[doc id, article no, term, snippet]], mn?: total mentions}}}`, n = FNV-1a 32 (UTF-8) of the CAS % `cas_buckets` (64) |

- `id` = `<kind>_<law_id>` (`law_000162`, `admrul_2075765`); law_id is stable across versions. kind `law` (법령) | `admrul` (행정규칙).
- doc meta = `{id, kind, kind_word, name, law_type, ministry, promulgated_on, effective_on, articles, annexes, url, art_url, as_of, history}`
  (`history` = number of history rows in the index; the doc file has the rows). `url` = law.go.kr current-version link by name,
  `art_url` = article link template with `{art}` = `제N조` / `제N조의M` (`""` for 행정규칙, which have no article links), `as_of` = fetch date.
- `items` (display order): `{t: "h", no, text}` heading (장·절); `{t: "a", no, title, head, paras, eff?}` article with 항/호/목
  (`head` = the article's lead text, `paras: [{no ("①"), text, items: [{no ("1", "2의2"), text, sub: [{no ("가."), text}]}]}]`);
  `{t: "a" | "b", no, title, text, eff?}` article without that structure (행정규칙: one text; `b` = a rule written without 제N조, `no` = `본문`).
  `no` = `"7"` / `"7의2"`. Texts are the official text as stored by `law_parse.py`.
- `annex_list`: `[{no, kind (별표/서식/별지/부록/도식), title, pdf, file}]` — titles and law.go.kr file links only (the annex text is not stored).
- `history`: `[{serial, url, effective_on, promulgated_on, promulgation_no, law_type, amend_type, status (현행/연혁/시행예정), name}]`, newest first.
- `cite` = `{doc, name, t: "art" | "annex" | "doc", no, label, title, snippet, pdf?, file?}`. The list's stated legal basis
  (`backend/data/trade_controls/kr_lists/*.json` `legal_basis`, or `scripts/portal_build/law_basis.json` for NCIS classifications and
  the KR PSM list) is parsed by `law_cite.py`; only docs in the corpus are used, an unknown doc name is never guessed, and an article
  that does not exist in the current text is dropped (report `data/portal_raw/law/export_report.json`). `snippet` = the 호/목/항 the
  label names (e.g. `제2조제6호` → item 6) or the article text, 240 characters. For `law_basis.json` lists an article is kept only when
  its text contains the list's term.
- `m` (literal mentions): article texts where the substance's Korean list name (or the name without "(…)" / "및 그 화합물") or its
  CAS number stands as a whole word (`law_mentions.py`: no Hangul right before, after it a non-Hangul character or one particle).
  Annex tables are not searched. At most 30 rows per CAS; `mn` = all.
- List order in `l`: 화관법·화평법 status lists and PSM first, other lists in reg order, 기존화학물질 last (`law_export_config.py`).

Clients: `frontend/public/chemip/api_law.jsx` (`STATIC_LAYOUT.pages.law`; without static data the same path under `/data/v1`, served on
the PC site by `backend/api/routes/static_areas.py`), screen `?view=law` (`law_view.jsx`), substance panel `product_law_basis.jsx`
(anchor `kr-law`), 적용 법규 판정기 cite links (`law_corpus_link.jsx`). Worker area `law` (`STATIC_DATA.AREAS`), Pages `_routes.json`
include (`deploy/cloudflare/site_rules.mjs`). Upload: `upload_r2_s3.py --src <out>/v1/law --prefix v1/law --gzip-all`.

## g/intl_add.json, g/intl_add_<n>.json (R2, gzip) — named lists newer than the p/ export, added 2026-11-01

`intl_add.py` (`run_all.py --steps intl_add`). A list in `config.INTL_ADD_LISTS` (an `intl_lists/` id that the current
p/ export does not carry yet: `EU_REACH_REGISTERED`, `EU_DWD_ANNEX_I_PART_B`) reaches the product page without re-exporting
the 333k p/ files.

| file | content |
|---|---|
| `g/intl_add.json` | `{v: 1, exported_at, buckets, lists: [meta: INTL_META_FIELDS + absence_note], cas_count}` |
| `g/intl_add_<n>.json` | `{v: 1, n, cas: {CAS: [{list_id, entries, family_entries: []}]}}`, n = fnv1a32(CAS UTF-8) % `buckets`; every n is written |

Memberships have the p/ `intl_lists` shape (family entries stay on reg/ only). Client: `api_intl.jsx` `staticIntlAdded` →
`intl_merge.jsx` `intlWithAdded` (a list the page already has wins) → `intlNamedItems` with the head's `lists` as metadata
(the rulebook's metadata wins when both have it). Served by the existing Worker route `/data/:version/g/:file` and the PC
route `/data/v1/g/`. Upload: copy only these files to a staging folder, then `upload_r2_s3.py --src <staging> --prefix v1/g --gzip-all`.
After the next full p/ + globals export carries the lists, remove them from `INTL_ADD_LISTS`.

## g/intl_reg_add.json, g/intl_reg_add_<n>.json (R2, gzip) — intl_regulatory codes newer than the p/ export, added 2026-11-01

`intl_reg_add.py` (`run_all.py --steps intl_reg_add`). The `terminology.db` `intl_regulatory` codes in
`config.INTL_REG_ADD_CODES` (loaded by `scripts/load_country_lists_official.py`: `US_DOT_HMT`, `US_DOT_HMT_RQ`, `JP_PRTR_CLASS1`,
`JP_PRTR_CLASS2`, `JP_ISHL_LABEL_SDS`, `JP_ISHL_TOKKA`, `JP_ISHL_ORGANIC`, `JP_CSCL_PRIORITY`, `CA_NPRI`) reach the
country-regulation panel without re-exporting p/.

| file | content |
|---|---|
| `g/intl_reg_add.json` | `{v: 1, exported_at, buckets, codes: [{regulation, jurisdiction, list, rows, cas}], cas_count}` |
| `g/intl_reg_add_<n>.json` | `{v: 1, n, cas: {CAS: {jurisdiction: [item]}}}`, n = fnv1a32(CAS UTF-8) % `buckets` (64); every n is written |

`item` = exactly an item of `GET /api/regulations/international/{cas}` `jurisdictions` (`backend/core/intl_dedupe.py` merge,
`REGULATION_LABELS` name): `{regulation, list, detail, source, name, aka?, forms?}`. Each detail ends with `match: <method>`.
Client: `api_intl.jsx` `staticIntlRegAdded` → `intl_reg_add.jsx` `intlWithRegAdded(intl, added)` (a regulation the page's
`intl` already has wins; when neither p/ nor /api answers, the added items alone are shown). Same Worker / PC routes as `g/`.
Upload: staging folder with only these 65 files → `upload_r2_s3.py --src <staging> --prefix v1/g --gzip-all`.
