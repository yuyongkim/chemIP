# country_lists_official — official-source country lists into `intl_regulatory`

Entry point: `scripts/load_country_lists_official.py` (download → parse → `--apply` writes `terminology.db` `intl_regulatory`,
only its own regulation codes). Raw files and `manifest.json` (url, date, sha256): `data/portal_raw/intl_reg/<source>/`.
Per-row match method: every `detail` ends with `match: …`; the full audit is `data/country_lists_official_audit.csv`,
counts in `data/portal_raw/intl_reg/load_report.json`.

```
python -B scripts/load_country_lists_official.py --apply                 # all sources (J-CHECK: ~3 min, 0.4 s between pages)
python -B scripts/load_country_lists_official.py --offline --apply       # re-parse what is on disk
python -I -B scripts/static_export/run_all.py --steps reg,intl_reg_add   # -> v1/reg/ and g/intl_reg_add*.json
```

| file | job | regulation codes |
|---|---|---|
| `sources.json` | one place for URLs, landing pages and licence text per source | – |
| `raw.py` | registry, download (eCFR date from the titles API), manifest, offline reads | – |
| `xlsx_rows.py` | stdlib .xlsx reader (furigana `<rPh>` skipped) | – |
| `substance_index.py` | CAS → UN numbers (KOSHA MSDS §14, Wikidata P695) and English name → CAS (portal_facts.db, read-only) | – |
| `us_dot_hmt.py` | 49 CFR 172.101 HMT (PSN, class, UN/NA, PG, labels, special provisions) and Appendix A Table 1 RQ | `US_DOT_HMT`, `US_DOT_HMT_RQ` |
| `jp_prtr.py` | 化管法 第一種(特定第一種 included)・第二種指定化学物質, 2021 Cabinet Order (515 + 134 items checked) | `JP_PRTR_CLASS1`, `JP_PRTR_CLASS2` |
| `jp_ishl.py` | 安衛法 label/SDS list (MHLW Excel, 2025-04-01 + 2026-04-01 sheets); 特化則 (令別表第三) and 有機則 (令別表第六の二) from e-Gov law XML, matched by name to the MHLW list | `JP_ISHL_LABEL_SDS`, `JP_ISHL_TOKKA`, `JP_ISHL_ORGANIC` |
| `jp_cscl_priority.py` | 化審法 優先評価化学物質 (J-CHECK category 230, reuses `scripts/trade_controls/intl/jp_jcheck.py`) | `JP_CSCL_PRIORITY` |
| `ca_npri.py` | Canada NPRI substance list 2025-2027 (ECCC Excel) | `CA_NPRI` |

How a row reaches a CAS (the `match:` text):

| list | method |
|---|---|
| DOT HMT | `UN number (KOSHA MSDS §14 / Wikidata P695)`: the CAS's own UN number = HMT ID; `name`: PSN = an English name of exactly one CAS; `name+state (X)`: PSN minus ", refrigerated liquid / anhydrous / solution …" = X; `…, disambiguated by the UN match of the same PSN` when the name is shared by several CAS |
| DOT RQ (App. A) | `exact name = 40 CFR 302.4 (CASRN)` — 49 CFR prints names only |
| 化管法 | `NITE confirmed CAS (reference)` |
| 安衛法 label/SDS | `MHLW reference CAS` (`representative; others exist` when MHLW writes 「他」) |
| 特化則 / 有機則 | `name = MHLW label/SDS list (normalized), its reference CAS` |
| 優先評価 | `NITE J-CHECK CAS (MITI番号-CAS link not finally confirmed)` |
| NPRI | `CAS RN printed by ECCC` |

New list: one module with `OWNED` + a parse function, one entry in `sources.json` and in the loader's `LOADERS`/`OWNED`,
one line in `backend/core/intl_regulatory_store.py` `REGULATION_LABELS` and in `product_labels_en.jsx` `intl.listNames`,
and the code in `scripts/static_export/config.py` `INTL_REG_ADD_CODES` until the next full p/ export.
`import_intl_regulatory.py` empties the whole table: run this loader (and `load_country_lists_from_epc.py`) after it.
Tests: `python -B -m pytest -q tests/test_country_lists_official.py`, `node frontend/scripts/tests/test_intl_reg_add.cjs`.

## Not ingested (checked 2026-11-01)

| list | reason | URL checked |
|---|---|---|
| Japan ENCS (化審法 既存化学物質名簿) / ISHL 既存化学物質 | no free bulk file: NITE-CHRIP and J-CHECK are search-only; J-CHECK and NITE pages are "All Rights Reserved" | https://www.nite.go.jp/chem/chrip/chrip_search/systemTop |
| China IECSC | only the MEE query system plus the 2013 PDF and many later supplement notices (no single current machine-readable list) — a partial set would make "not listed" claims wrong | https://www.mee.gov.cn |
| California Proposition 65 | oehha.ca.gov answers with an Incapsula bot challenge; not bypassed. data.ca.gov has no copy | https://oehha.ca.gov/proposition-65/proposition-65-list |
| Taiwan TCSI | login-only search, no bulk download (already noted in scripts/trade_controls/intl/README.md) | https://csnn.moenv.gov.tw |
| METI 化管法 Excel / English list | the links on the METI SDS page (211015reflist.xlsx, class1/2 PDF) return the 404 page; NITE's CAS list used instead | https://www.meti.go.jp/policy/chemical_management/law/msds/2.html |
| 特化則 / 有機則 names without a CAS in the MHLW list | 24 + 21 statute items (groups such as カドミウム及びその化合物, old names such as クロルベンゼン, mixtures) have no MHLW reference CAS — listed in load_report.json `unmatched`, not guessed | e-Gov 347CO0000000318 |
