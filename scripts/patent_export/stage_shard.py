"""Stage 4: per bucket, group rows by CAS, drop generic terms, dedupe, write files; then a global manifest."""
import collections
import json
import time

import config
import shard_records
import shard_writer
import stage_partition
import suppress
import terms
from logutil import log

META_DIR = config.OUT_DIR / "_meta"


def _bucket_done(i):
    return META_DIR / "buckets" / f"b{i:03d}.done.json"


def load_rows(path, suppressed):
    by_cas, dropped = collections.defaultdict(list), 0
    with open(path, encoding="utf-8") as f:
        for line in f:
            row = json.loads(line)
            if suppress.keep_row(row, suppressed) and shard_records.context_ok(row):
                by_cas[row["cas"]].append(row)
            else:
                dropped += 1
    return by_cas, dropped


def shard_bucket(i, suppressed, suppressed_by_cas, substances):
    by_cas, dropped = load_rows(stage_partition.bucket_path(i), suppressed)
    st = collections.Counter(rows_dropped_restricted=dropped)
    jur_totals = collections.Counter()
    for cas, rows in by_cas.items():
        records = shard_records.dedupe(rows)
        index = shard_records.index_summary(cas, substances.get(cas, {}), records,
                                            suppressed_by_cas.get(cas, {}))
        files, raw, gz = shard_writer.write_substance(cas, shard_records.by_jurisdiction(records), index)
        st.update(substances=1, records=len(records), rows=len(rows), files=files, raw_bytes=raw, gzip_bytes=gz)
        jur_totals.update(index["by_jurisdiction"])
    out = dict(st, by_jurisdiction=dict(jur_totals))
    _bucket_done(i).write_text(json.dumps(out), encoding="utf-8")
    return out


def run():
    marker = config.BUCKET_DIR / "_done.json"
    if not marker.exists():
        raise SystemExit("partition stage has not finished")
    META_DIR.joinpath("buckets").mkdir(parents=True, exist_ok=True)
    df, scanned_records = suppress.corpus_df()
    suppressed = suppress.suppressed_terms(df)
    term_to_cas, substances = terms.load()
    suppressed_by_cas = collections.defaultdict(dict)        # {cas: {term: 'stoplist' | 'title_only'}}
    for t in sorted(suppressed, key=lambda t: -df[t]):
        if t in term_to_cas:
            suppressed_by_cas[term_to_cas[t]][t] = suppressed[t]
    (META_DIR / "suppressed_terms.json").write_text(json.dumps(
        {t: {"df": df[t], "reason": r, "cas": term_to_cas.get(t)} for t, r in
         sorted(suppressed.items(), key=lambda kv: -df[kv[0]])}, ensure_ascii=False, indent=0), encoding="utf-8")
    (META_DIR / "term_df_top.json").write_text(json.dumps(df.most_common(2000), ensure_ascii=False),
                                               encoding="utf-8")
    log("shard", f"{len(suppressed)} terms restricted: "
                 f"{sum(1 for r in suppressed.values() if r == suppress.STOPLIST)} stoplisted, "
                 f"{sum(1 for r in suppressed.values() if r == suppress.TITLE_ONLY)} title-only (df>{config.MAX_TERM_DF})")
    t0 = time.time()
    totals, jur = collections.Counter(), collections.Counter()
    for i in range(config.BUCKETS):
        done = _bucket_done(i)
        st = json.loads(done.read_text()) if done.exists() else shard_bucket(i, suppressed, suppressed_by_cas,
                                                                              substances)
        jur.update(st.pop("by_jurisdiction"))
        totals.update(st)
        if i % 16 == 15:
            log("shard", f"bucket {i+1}/{config.BUCKETS} {dict(totals)} {time.time()-t0:.0f}s")
    manifest = dict(totals, version=config.OUT_VERSION, generated=time.strftime("%Y-%m-%d %H:%M:%S"),
                    source_records_scanned=scanned_records, by_jurisdiction=dict(jur.most_common()),
                    max_term_df=config.MAX_TERM_DF, suppressed_terms=len(suppressed))
    (config.OUT_DIR / "_manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    log("shard", f"done: {manifest}")
