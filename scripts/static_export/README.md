# static_export: ChemIP data → static files (Cloudflare Pages + R2)

This exports search and per-substance data as static files, so these features no longer need the home PC.
It imports the backend's own functions instead of copying them, so the exported bodies equal the API output by construction.
All databases are opened read-only (sqlite `mode=ro`). The exporter never calls external APIs. KOSHA live fetch is disabled.

File formats and the client rules are in **[CONTRACT.md](CONTRACT.md)**.

## Run

```
python -I -B G:\MSDS\scripts\static_export\run_all.py                       # search, globals, pages, verify_*
python -I -B G:\MSDS\scripts\static_export\run_all.py --steps upload        # R2 test bucket (search/ + g/ + 1,000 p/)
python -I -B G:\MSDS\scripts\static_export\run_all.py --steps pages --workers 12
python -I -B G:\MSDS\scripts\static_export\run_all.py --steps extras --workers 18      # p/*.x.json + g/guides_status.json (~25 min)
python -I -B G:\MSDS\scripts\static_export\run_all.py --steps tceq                    # tx/<CAS>.json (Texas TCEQ emission events, seconds)
python -I -B G:\MSDS\scripts\static_export\upload_r2_s3.py --src E:\dev-cache\chemip-static\out\v1\tx --prefix v1/tx --gzip-all
python -I -B G:\MSDS\scripts\static_export\run_all.py --steps prtr                    # prtr/index.json + prtr/<CAS>.json (PRTR facility map, <1 s)
E:\dev-cache\r2-venv\Scripts\python -B G:\MSDS\scripts\static_export\upload_r2_s3.py --src E:\dev-cache\chemip-static\out\v1\prtr --prefix v1/prtr --gzip-all
python -I -B G:\MSDS\scripts\static_export\run_all.py --steps facts_portal           # f/<CAS>.json + f/id_<n>.json + g/un_index.json (portal facts from data/portal_facts.db, ~20 s)
E:\dev-cache\r2-venv\Scripts\python -B G:\MSDS\scripts\static_export\upload_r2_s3.py --src E:\dev-cache\chemip-static\out\v1\f --prefix v1/f --gzip-all   # after a re-export delete reports\r2_s3_uploaded_v1_f.txt first
python -I -B G:\MSDS\scripts\static_export\run_all.py --steps oel                     # oel/<CAS>.json + g/oel_summary.json (exposure-limit comparison, seconds)
E:\dev-cache\r2-venv\Scripts\python -B G:\MSDS\scripts\static_export\upload_r2_s3.py --src E:\dev-cache\chemip-static\out\v1\oel --prefix v1/oel --gzip-all   # summary: upload g/oel_summary.json to v1/g
python -I -B G:\MSDS\scripts\static_export\run_all.py --steps provisions               # pv/<CAS>.json (EPC 근거 조문; needs 127.0.0.1:15412, ~40 s, resumable)
python -I -B G:\MSDS\scripts\static_export\upload_r2_s3.py --src E:\dev-cache\chemip-static\out\v1\pv --prefix v1/pv --gzip-all
python -I -B G:\MSDS\scripts\static_export\run_all.py --steps guide_index              # g/guide_index.json (KOSHA guide list for the unified search, <1 s)
python -I -B G:\MSDS\scripts\static_export\upload_r2_s3.py --src E:\dev-cache\chemip-static\out\v1\g --prefix v1/g --gzip-all   # resumable: uploads only g/ files not yet uploaded
python -I -B G:\MSDS\scripts\static_export\run_all.py --steps guide_text               # gs/ (KOSHA guide full-text index, ~20 s; CONTRACT.md "gs/")
python -I -B G:\MSDS\scripts\static_export\upload_r2_s3.py --src E:\dev-cache\chemip-static\out\v1\gs --prefix v1/gs --gzip-all   # after a re-export delete reports\r2_s3_uploaded_v1_gs.txt first
```

- Always run with `-I -B`. Then nothing is written under G:\MSDS: no `__pycache__`, and `-I` keeps cwd and user site off `sys.path`.
- Output goes to `E:\dev-cache\chemip-static\out\v1\`. Reports go to `E:\dev-cache\chemip-static\out\reports\<step>.json` and `run.log`.
- `verify_search` and `verify_pages` call the **production** API at 127.0.0.1:7011. They send one request at a time, at least 0.5 s apart, with a `bot` user agent so the calls are not counted as usage.

## File → role

| File | Role |
|---|---|
| `config.py` | every path, version, bucket count, worker count and URL (defined once) |
| `db.py` | puts G:\MSDS on sys.path, read-only TerminologyDB patch, disables the KOSHA live fetch |
| `jsonio.py` | compact JSON, plain/gzip writers, gzip-aware reader, size stats |
| `search_keys.py` | FNV-1a bucket hash, precomputed-query key (shared by builder and clients) |
| `search_tokens.py` | FTS5 postings from fts5vocab, delta encoding, prefix sharding, docmeta |
| `search_aliases.py` | chemical_aliases + search synonyms (`backend/data/search/synonyms.jsonl`) → hashed alias buckets with doc refs |
| `search_precompute.py` | backend `search_chemicals` for all alias and synonym keys in a process pool |
| `search_index.py` | writes `search/` (docs, docmeta, tokens, aliases + precomputed, manifest incl. `ranking`) |
| `static_search.py` | reference **client** search that reads only `search/` (for the browser port and for verification); scores with the backend's `ranking.score` and `manifest.ranking` |
| `universe.py` | which `p/` files exist (kosha / cas / msds chem_ids) |
| `facts.py` | per-CAS trade facts (inputs to `build_trade_controls`) |
| `page_build.py` | one `p/` object from the backend route functions |
| `substances.py` | writes all `p/` files in a process pool, plus `reports/pages_index.csv` |
| `rulebook.py` | `g/` shared files (rulebook, trade_common, permit_common, trade_catalog) |
| `extras_build.py` | one `p/<chem_id>.x.json` object (guides, handlers from the local PRTR cache, incidents, enforcement) from the backend route functions, live sources switched off |
| `extras.py` | writes all `p/<chem_id>.x.json` files in a process pool, `g/guides_status.json`, `reports/extras_index.csv` |
| `guide_index.py` | writes `g/guide_index.json` (KOSHA technical guide list: number, title, date, original file URL) for the unified search |
| `guide_text.py` · `guide_text_build.py` | writes `gs/` (KOSHA guide full-text index: manifest, bigram shards, page text) / pure builder (normalization, bigrams, shards; browser port `frontend/public/chemip/guide_text_core.jsx`) |
| `tceq.py` | writes `tx/<CAS>.json` (Texas TCEQ emission events, body = `/api/integrations/tceq-events/{cas}?limit=6`) for every CAS in `data/tceq_event_cas_index.db`, `reports/tceq_index.csv` |
| `related.py` · `related_rank.py` · `related_sources.py` | writes `rel/<CAS>.json` (top 8 related substances with the reason: shared Korean statutory lists, GHS hazard classes from KOSHA section 2 H-statements, curated families; weighted cosine + family bonus) — step `related`, ~15 s; scoring is pure (`related_rank.py`), inputs read-only (`related_sources.py`), data `related_families.json` · `related_hazards.json`, `reports/related_sample.csv`. Tests `tests/test_related_rank.py` |
| `prtr.py` | writes `prtr/index.json` and `prtr/<CAS>.json` (PRTR facility map: per-시도/시군구 facility counts and reported amounts + facility list; body = `backend/core/prtr_map.py`, same as `/api/prtr/*`) from `data/prtr/prtr_facilities.sqlite`, `reports/prtr_index.csv` |
| `portal_facts.py` · `portal_facts_build.py` | writes `f/<CAS>.json` (identifiers, properties, transport, oel of one CAS), `f/id_<n>.json` (EC/KE/InChIKey → CAS) and `g/un_index.json` from `data/portal_facts.db` (built by `scripts/portal_build/`), `reports/portal_facts_index.csv` / pure assembly (best row first, link id, UN summary, id shards) |
| `oel.py` | writes `oel/<CAS>.json` (exposure limits by source: MOEL notice, KOSHA MSDS §8, OSHA, NIOSH, EU; link-only ACGIH/GESTIS) and `g/oel_summary.json` from `data/portal_facts.db` (built by `scripts/portal_build/oel_build.py`) |
| `provisions.py` | writes `pv/<CAS>.json` (EPC statutory provisions per country, body = `/api/integrations/provisions/{cas}?country=&name=`) for SEO tier 1 ∪ the benchmark list, from the EPC query service (4 parallel, resumable), `reports/provisions_index.csv` |
| `trade_assembly_ref.py` | reference **client** assembly of a country trade view from `p/` + `g/` |
| `live_api.py` | gentle GET client for the production API |
| `jsondiff.py` | first differing JSON path |
| `verify_search.py` | 30 test queries vs the live API top-20, plus 300 precomputed keys vs the backend (offline) |
| `verify_pages.py` | random 200 `p/` files vs the live API (detail, trade import/export, intl, permit) |
| `verify_assembly.py` | client assembly vs `build_trade_controls` for 12 countries × 2 directions (offline) |
| `upload_r2.py` | creates bucket `chemip-data`, uploads with wrangler (8 parallel, resumable, gzip metadata) |
| `run_all.py` | entry point: runs the steps and writes the reports |
| `test_queries.json` | the 30 search test queries (from the pilot) |
| `CONTRACT.md` | static file contract for the browser code |
| `_legacy_pre_synonyms_2026-10-28/` | the search files before synonyms/ranking (restore by copying back) |
