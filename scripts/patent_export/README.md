# patent_export — clean substance → patent mapping (static files for R2)

Builds `E:\dev-cache\chemip-patents\out\v1\<CAS>\<JUR>.json.gz` + `<CAS>\index.json` by re-scanning the
Lens.org-format source records under `S:\특허 논문 DB\downloaded_patents\` with a quality-filtered term
dictionary. It does **not** use `data/global_patent_index.db` (wrong chem_ids, ~80 % junk terms, no dates).

Run (each stage is resumable / idempotent; inputs are opened read-only, nothing is written under `backend/` or `data/`):

```
E:\dev-cache\chemip-patents\venv\Scripts\python.exe -I -B run.py terms      # 1. term dictionary   (~1 min)
E:\dev-cache\chemip-patents\venv\Scripts\python.exe -I -B run.py scan       # 2. scan sources      (2.2 h measured, low priority)
E:\dev-cache\chemip-patents\venv\Scripts\python.exe -I -B run.py partition  # 3. bucket by CAS     (6 min)
E:\dev-cache\chemip-patents\venv\Scripts\python.exe -I -B run.py shard      # 4. write files       (~15 min)
E:\dev-cache\chemip-patents\venv\Scripts\python.exe -I -B run.py status     # progress, any time
```

The venv lives on E: (needs `pyahocorasick`); no caches are written to C:.

## File → role

| File | Role |
|---|---|
| `run.py` | Thin entry point: dispatches to a stage module |
| `config.py` | Every path, threshold and switch (single source of values) |
| `stoplist_generic.txt` | Data: generic dictionary words / placeholders never used as substance terms |
| `hangul_short_allow.txt` | Data: 2-syllable Korean names allowed despite the 3-syllable minimum |
| `cas.py` | CAS check-digit validation, CAS extraction from text |
| `script_class.py` | Unicode script detection (Latin / Hangul / CJK) and text normalisation |
| `terms.py` | Term quality rules: builds term → CAS dictionary + blockers from terminology.db (read-only) |
| `matcher.py` | Aho-Corasick matching with word-boundary, Korean-particle, motif-word and systematic-name rules |
| `source_lens.py` | Reader for Lens `*.jsonl.gz` records: header by regex, title/abstract arrays by `raw_decode` |
| `source_files.py` | Lists source files (KIPRIS and derived folders excluded) and per-file output paths |
| `links.py` | Viewer link for a publication number (Espacenet; Patentscope for WO) |
| `records.py` | One source record + hits → per-substance match rows (best field, snippet, title) |
| `throttle.py` | Background process priority + compressed-read rate cap |
| `scan_file.py` | Worker: scans one source file → `matches.jsonl.gz` + `stats.json` (atomic; resume unit) |
| `stage_terms.py` | Stage 1 orchestration |
| `stage_scan.py` | Stage 2 orchestration (spawn pool, skips finished files, ETA log) |
| `stage_partition.py` | Stage 3: routes match rows to 128 CAS-hash buckets |
| `suppress.py` | Corpus document frequency + stoplist → terms suppressed at publish time |
| `shard_records.py` | Pure functions: dedupe per patent, record schema, index.json summary |
| `shard_writer.py` | Writes `<CAS>/<JUR>.json.gz` and `<CAS>/index.json` atomically |
| `stage_shard.py` | Stage 4 orchestration + `_manifest.json`, `_meta/suppressed_terms.json`, `_meta/term_df_top.json` |
| `stage_status.py` | Read-only progress report |
| `logutil.py` | Timestamped log lines in `E:\dev-cache\chemip-patents\logs\<stage>.log` |

Dependency direction: `config` / data files ← `cas`, `script_class` ← `terms`, `matcher`, `source_lens`, `links`
← `records`, `shard_records` ← `scan_file`, `shard_writer`, `suppress` ← `stage_*` ← `run`.

## Term quality rules (terms.py, matcher.py)

Rows are keyed by **CAS**, never by chem_id.

1. **Substances**: every `chemical_terms.cas_no` with a valid CAS check digit (117,691).
2. **Name sources**: `chemical_terms.name` / `name_en`; `ncis_substance.name_kor` / `name_eng` / `name2_kor` /
   `name2_eng`; `msds_english.name_en`; `chemical_aliases` of type `ncis_synonym` only.
   `derived` / `derived_en` aliases are **not** used: they are machine-cut fragments of long names
   (e.g. `benzene` cut from `Benzene, 1,2-dimethyl-` and filed under xylene's CAS) and made every common
   name ambiguous.
3. **Variant splitting**: top-level `;` separates synonyms (not for ECHA/KREACH names, where `;` lists the
   constituents of a multi-constituent substance); a trailing `( … )` group preceded by a space or written in
   another script is an alternative name (`벤젠 (Benzene)`, `황산(SULFURIC ACID)`); `( 관용명 : X )` yields `X`;
   inner groups that are `;` lists are skipped; text ending in `,` `;` `(` is a truncated fragment and dropped.
4. **Length**: Latin ≥ 5 characters; Hangul ≥ 3 syllables, except the 2-syllable allowlist
   (`hangul_short_allow.txt`: 벤젠, 황산, 질산, 염산 …) because 2-syllable Hangul words collide with everyday
   words (요소 urea/element, 함유 "containing", 그리스 grease/Greece); ≤ 100 characters.
5. **Rejected forms**: no letters; code-like (`S80455`, EC numbers); CAS-shaped strings (CAS is matched
   separately); single-token substituent fragments ending in -yl / -oxy / -ylidene / -amino / -imino / -oyl
   (`3-methyl`, `chloromethyl`); placeholder strings (`not available`, `해당사항 없음`).
6. **Stoplist** (`stoplist_generic.txt`): generic words that are registered as names (water, oil, resin,
   solution, acid, salt, powder, rubber, alcohol, polymer, …, rayon, branched, natural, human, 알코올, 수지 …).
7. **Ambiguity**: a term claimed by more than one CAS is dropped, unless (a) exactly one claimant carries it
   as a whole registered name (name / name_en / NCIS name) — e.g. `benzene` → 71-43-2, not the KOSHA records
   whose truncated common-name text contained "BENZENE," — or (b) among the whole-name claimants exactly one
   is in the NCIS registry (`ethylene` → 74-85-1, not ECHA 87701-65-3). CAS numbers are never ambiguous.
8. **Blockers**: dropped ambiguous names and stoplisted multi-word names stay in the automaton with no CAS,
   so they still win overlaps (`titanium dioxide` does not produce a `titanium` hit).
9. **Corpus frequency** (applied at shard time, no rescan needed): a non-CAS term that is the best hit in more
   than `MAX_TERM_DF` (250,000) source records (copper, silicon, lithium, …) keeps only its **title** hits —
   an abstract mention of such a word says little about the patent. Stoplisted terms lose all rows. Both are
   listed per substance in `index.json → restricted_terms` and globally in `_meta/suppressed_terms.json`.
   Words added to the stoplist after the scan are re-applied at shard time.
10. **Size cap**: each `<CAS>/<JUR>.json.gz` keeps the newest `MAX_RECORDS_PER_FILE` (20,000) records;
   `index.json` keeps full counts and marks `files[JUR].truncated`.

Matching rules (matcher.py):

- text = NFKC, whitespace-collapsed, lower-cased title(s) and abstract(s); claims/description are not scanned;
  texts in languages no term can match (zh, ja, ru, …) are skipped (CN/JP records carry English abstracts);
- Latin terms need non-alphanumeric characters on both sides; a hit glued to `)` `]` `}` `-` before it, or
  `(` `[` `-<digit>` after it, is part of a longer systematic name and rejected
  (`1,4-di(pyridin-2-yl)benzene`, `benzene-1,4-diol`);
- a Latin hit followed by a motif word (`ring`, `group`, `moiety`, `atom`, `ion`, `salt`, `sulfonate`,
  `derivative`, … see `config.NON_SUBSTANCE_FOLLOWERS`) is rejected (`benzene ring`, `sodium ion`);
- Hangul terms need a non-alphanumeric char before, and after either end-of-word or a Korean particle
  (`벤젠을`, `벤젠으로`), so `황산` does not fire inside `황산나트륨`;
- overlapping hits: the longest wins;
- CAS numbers in text are matched by regex + check digit;
- per record and substance one row is kept: title hit beats abstract hit, then the longer term;
- at shard time the context rules are re-applied to every stored row (`shard_records.context_ok`, using the
  stored snippet/title), so rule fixes made after a scan reach the published files without a rescan.

## Sources and licence provenance

Scanned folders: CNIPA, JPO, EPO, WIPO, USPTO, Other-Agencies (Lens.org exports, all `*-patent-records-*.jsonl.gz`).
Never scanned: `KIPRIS` (no redistribution permission), `output`, `temp`, `cache`, `checkpoints`, `results`,
`processed`, `USPTO_TEST`, `USPTO/uspto_preprocessed.csv` (derived). KR records in the output therefore come
only from Other-Agencies (Lens), never from KIPRIS. Every record carries `src` = source folder(s)
(`+`-joined when the same publication appears in two folders) so a licence filter can be applied later.

## Output schema

`<CAS>/<JUR>.json.gz` — JSON array, newest first:

```
{"patent_id":"CN114108337A","title":"…(≤200)","jurisdiction":"CN","year":2022,"date":"2022-03-01",
 "matched_term":"benzene","field":"abstract","snippet":"…(≤200)",
 "link":"https://worldwide.espacenet.com/patent/search?q=pn%3DCN114108337A","lens_id":"…","src":"CNIPA"}
```

WO links go to WIPO Patentscope, all others to Espacenet.

`<CAS>/index.json` — `cas, name, name_en, version, total, by_jurisdiction, by_year, by_source,
matched_terms, restricted_terms {term: stoplist|title_only}, files {JUR: {file, records, bytes, truncated}},
recent` (20 newest records).

`out/v1/_manifest.json` — totals (substances, records, files, raw/gzip bytes, per jurisdiction).

## Politeness

Workers run at idle CPU priority with low I/O priority (not Windows "background mode", which also trims
the working set and made the scan 5x slower), the parent at BelowNormal, 6 workers,
each capped at 15 MB/s of compressed input (≤ 90 MB/s on S:, which does not serve the live site). Outputs
go to E:. A killed scan resumes from the next unfinished source file.
