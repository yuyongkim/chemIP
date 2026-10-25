# hs_codes: CAS to HS code collector

Entry point: `python -I G:\MSDS\scripts\trade_controls\collect_hs_codes.py`
Output: `G:\MSDS\backend\data\trade_controls\hs_codes.sqlite` and `hs_codes_meta.json`
Raw downloads: `S:\chemip_trade_controls_raw\hs\<source>\<date>\` (untrusted; parsed only, never executed)

| File | Role |
|---|---|
| `config.py` | Paths, URLs, licence strings, size and retry limits |
| `http_fetch.py` | Cookie session (GET/POST, retries, size cap); saves raw files |
| `xlsx_reader.py` | Standard-library .xlsx reader (cells keyed by column letter) |
| `cas.py` | CAS normalisation and check-digit validation |
| `src_ecics.py` | EU ECICS full extract: CAS to CN code (main mapping) |
| `src_cn_nomenclature.py` | EU CN official texts: HS4, HS6 and CN8 English titles |
| `src_kcs.py` | Korea Customs Service (data.go.kr): HSK10 list and Korean HS4/HS6 titles |
| `build_db.py` | SQLite schema, annotation flags, atomic write, meta JSON |
| `report.py` | Counts, duplicates, NCIS coverage, sample lookups |
| `pipeline.py` | Runs the sources in order and assembles the output |

## Tables

- `cas_hs`: one row per (ECICS entry, CAS). `hsk10` stays NULL because no official CAS-to-HSK source exists.
- `hs6_heading`: EU CN and KCS titles for every HS6.
- `hsk10_code`: KCS HSK 10-digit leaves that are active on the retrieval date.
- `v_cas_hsk10_candidates`: the HSK10 lines under each CAS's HS6. These are candidates only, not a classification.
- `rejected`: ECICS entries left out, with the reason.
- `meta`: sources, versions, licences, retrieval date and counts.
