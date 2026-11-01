"""Worker: scan ONE source file and write its matches + stats atomically (the resume unit)."""
import collections
import gzip
import json
import os
import time

import config
import matcher
import records
import source_lens
import terms
import throttle

_STATE = {}


def init_worker():
    """Pool initializer: lower priority, load terms, build the automaton once per process."""
    _STATE["priority"] = throttle.lower_priority() if config.BACKGROUND_PRIORITY else "normal"
    term_to_cas, substances = terms.load()
    _STATE["automaton"] = matcher.build_automaton(term_to_cas, terms.load_blockers())
    _STATE["cas_set"] = frozenset(substances)


def _write_json_atomic(path, obj):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, path)


def scan(job):
    """job = (folder, src_path, out_matches, out_stats). Returns the stats dict (without term_df)."""
    folder, src, out_m, out_s = job
    t0 = time.time()
    automaton, cas_set = _STATE["automaton"], _STATE["cas_set"]
    n_rec = n_bad = n_hit_rec = n_rows = 0
    df = collections.Counter()
    out_m.parent.mkdir(parents=True, exist_ok=True)
    tmp = out_m.with_name(out_m.name + ".tmp")
    with open(src, "rb") as raw, gzip.open(tmp, "wt", encoding="utf-8", compresslevel=4) as out:
        reader = throttle.RateLimitedReader(raw, config.READ_MB_PER_S_PER_WORKER * 1_000_000)
        for rec in source_lens.iter_records(reader):
            n_rec += 1
            if rec is None:
                n_bad += 1
                continue
            hits = records.best_hits(rec, automaton, cas_set, matcher.match_text)
            if not hits:
                continue
            n_hit_rec += 1
            for row in records.match_rows(rec, folder, hits):
                df[row["term"]] += 1
                n_rows += 1
                out.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
    os.replace(tmp, out_m)
    stats = {"folder": folder, "file": src.name, "bytes": src.stat().st_size, "records": n_rec,
             "unparsed": n_bad, "records_with_hits": n_hit_rec, "rows": n_rows,
             "seconds": round(time.time() - t0, 1), "priority": _STATE["priority"]}
    _write_json_atomic(out_s, dict(stats, term_df=dict(df)))   # written last = file is done
    return stats
