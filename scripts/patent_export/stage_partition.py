"""Stage 3: route every match row into one of config.BUCKETS files by CAS hash (rebuilt from scratch each run)."""
import gzip
import json
import shutil
import zlib

import config
import source_files
from logutil import log


def bucket_of(cas):
    return zlib.crc32(cas.encode()) % config.BUCKETS


def bucket_path(i):
    return config.BUCKET_DIR / f"b{i:03d}.jsonl"


def finished_match_files():
    """Match files whose stats sidecar exists (= fully written)."""
    out = []
    for folder, path, _size in source_files.list_source_files():
        m, s = source_files.match_paths(folder, path)
        if s.exists():
            out.append(m)
    return out


def run():
    files = finished_match_files()
    total_files = len(source_files.list_source_files())
    if len(files) < total_files:
        log("partition", f"WARNING: only {len(files)}/{total_files} source files scanned")
    shutil.rmtree(config.BUCKET_DIR, ignore_errors=True)
    config.BUCKET_DIR.mkdir(parents=True)
    outs = [open(bucket_path(i), "w", encoding="utf-8", newline="\n") for i in range(config.BUCKETS)]
    n = 0
    try:
        for k, m in enumerate(files, 1):
            with gzip.open(m, "rt", encoding="utf-8") as f:
                for line in f:
                    cas = line[line.index('"cas":"') + 7:].split('"', 1)[0]
                    outs[bucket_of(cas)].write(line)
                    n += 1
            if k % 100 == 0:
                log("partition", f"{k}/{len(files)} files, {n} rows")
    finally:
        for o in outs:
            o.close()
    marker = {"match_files": len(files), "source_files": total_files, "rows": n}
    (config.BUCKET_DIR / "_done.json").write_text(json.dumps(marker), encoding="utf-8")
    log("partition", f"done: {marker}")
