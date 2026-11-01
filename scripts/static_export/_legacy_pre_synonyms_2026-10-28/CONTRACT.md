# ChemIP static data contract — format v1

This is what the browser reads instead of the backend API. Every file sits under one versioned root, `v1/`.
If any file format changes, the root changes too (`v2/`), so each root can be cached for a long time.
The exporter (`run_all.py`) writes the files to `E:\dev-cache\chemip-static\out\v1\`.

| Prefix | Host | Bytes on disk / in R2 | HTTP headers |
|---|---|---|---|
| `v1/search/` | Cloudflare Pages | plain JSON | Pages compresses it itself |
| `v1/p/` | R2 | **gzip bytes**, name still ends in `.json` | `Content-Type: application/json`, `Content-Encoding: gzip` |
| `v1/g/` | R2 | **gzip bytes**, name still ends in `.json` | `Content-Type: application/json`, `Content-Encoding: gzip` |

When R2 serves an object with `Content-Encoding: gzip`, browsers decompress it on their own, so `fetch(...).json()` works unchanged.
A tool that reads the files straight from disk has to gunzip p/ and g/ first. The first two bytes are `1f 8b`.

All JSON is compact UTF-8 with no ASCII escaping (`ensure_ascii=False`).

## Changes from the pilot (read this if you coded against the pilot)

1. **Per-substance data: one file per page, and the name changed.** The pilot had `substances/full/d/<chem_id>.json` (detail), `full/c/<cas>.json` (trade + intl + permit), and `facts/c/<cas>.json`. All three are now **one** object at `p/<chem_id>.json`, keyed by the search result's `chem_id`, not by CAS. The pilot "facts" keys (`cas, ncis, controlled, kr_law, intl_lists, hs, hsk10_candidates, intl, permit_context`) are still **top-level keys with the same names and the same meaning**, so a pilot facts reader can be given the p/ object as it is.
   - `permit_context` holds the **full** API body, including `durations` and `attribution`. The pilot facts file had a slimmed copy. `g/permit_common.json` still exists, and its values are identical to these fields.
2. **The shared files moved** from `substances/global/*.json` to `g/*.json`. They are gzip on disk (see the table above), and the content is the pilot's. There is one new file, `g/trade_catalog.json`.
3. **`search/manifest.json` has two extra keys**, `format` (`"v1"`) and `search_limit` (`20`). Every other key is unchanged.
4. **`search/a/<n>.json` "q"** now holds a precomputed answer for every alias, every `alias_norm`, and every `chemical_terms` name / name_en / cas_no. That is 749,597 keys. The pilot held about 3,000. Because the normalized forms are included, queries such as 과산화수소 are now answered from "q".
5. **Precomputed answers are only used when the query key is casefold-stable** (see "Search keys"). This guard was added because JS has no `casefold()`.

## search/ (Pages)

The format is the pilot's, built from `terminology.db` in read-only mode. N_DOCS is 117,744 `chemical_terms` rows.

| Path | Content |
|---|---|
| `search/manifest.json` | `{format, n_row, n_token, bucket, alias_buckets, alias_types, search_limit, shards, one_char_df}` |
| `search/docmeta.json` | array indexed by `chemical_terms.id`: `ntok*2 + is_kosha` (0 = no row). `ntok` is the FTS doc length for bm25, and `is_kosha` drives KOSHA-first ordering |
| `search/t/<n>.json` | token postings `{token: [docDelta, n, pos.., docDelta, n, pos..]}`, with `pos = offset*4 + column` (0 name, 1 cas_no, 2 description, 3 name_en) |
| `search/d/<id // bucket>.json` | doc records `{id: [name, cas_no, description, name_en, source]}` (missing values are `""`) |
| `search/a/<h>.json` | `{"a": {alias_norm: [[alias, type, confidence, ref], ...]}, "q": {query_key: [total, id1, ..., id20]}}` |

- `manifest.shards` maps a token prefix to a list of shard numbers. An exact token `x` lives in every shard whose key is a prefix of `x`. A prefix query `x*` must also read the shards whose key starts with `x`. See `static_search.StaticIndex._shards_for`.
- `a` rows are sorted by `(confidence desc, alias)`. `type` is an index into `manifest.alias_types`, or a raw string when the type is not in that list. `ref` is a doc id (int) when the alias row's `(canonical_id, chem_name, name_en, cas_no, source)` matches that doc. Otherwise it is the inline list `[canonical_id, chem_name, name_en, cas_no, source]`. The current data has 0 inline refs.
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
2. Otherwise, if some candidate has alias rows, run the full replica of `search_chemicals` (`search_chemicals` in `static_search.py`). It does alias hits, then FTS sub-searches, then the score merge.
3. Otherwise run the lean FTS path (`_lean`). It needs only `docmeta` plus the d/ records of the result page.

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

**Not included.** These still need the live API, or the UI hides them: `destination.kotra` (live KOTRA call), handlers, incidents, enforcement, provisions, guides, regulatory intelligence, drugs, patents, AI.

## g/ (R2, gzip)

| Path | Top-level keys | Content |
|---|---|---|
| `g/rulebook.json` | `kr_rules, permits, intl_lists, kr_lists, controlled_lists, hs_meta, parent_blocs` | global rulebook (pilot). `*_lists` entries are list metadata + `file` (intl also has `absence_note`) |
| `g/trade_common.json` | `sources_status, hs_meta` | identical in every trade-controls response |
| `g/permit_common.json` | `durations, attribution` | identical in every kr-permit-context response |
| `g/trade_catalog.json` | `kr_lists, kr_laws, intl_lists, intl_jurisdictions, controlled_lists, permits` | exact body of `GET /api/regulations/trade-controls-catalog` |

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
