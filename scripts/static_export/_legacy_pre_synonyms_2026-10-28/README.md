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
| `search_aliases.py` | chemical_aliases → hashed alias buckets with doc refs |
| `search_precompute.py` | backend `search_chemicals` for all alias keys in a process pool |
| `search_index.py` | writes `search/` (docs, docmeta, tokens, aliases + precomputed, manifest) |
| `static_search.py` | reference **client** search that reads only `search/` (for the browser port and for verification) |
| `universe.py` | which `p/` files exist (kosha / cas / msds chem_ids) |
| `facts.py` | per-CAS trade facts (inputs to `build_trade_controls`) |
| `page_build.py` | one `p/` object from the backend route functions |
| `substances.py` | writes all `p/` files in a process pool, plus `reports/pages_index.csv` |
| `rulebook.py` | `g/` shared files (rulebook, trade_common, permit_common, trade_catalog) |
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
