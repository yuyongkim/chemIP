"""Print progress of every stage (safe to run at any time; read-only)."""
import json

import config
import source_files


def run():
    files = source_files.list_source_files()
    done = [(f, p, s) for f, p, s in files if source_files.match_paths(f, p)[1].exists()]
    rows = recs = 0
    for f, p, _s in done:
        st = json.loads(source_files.match_paths(f, p)[1].read_text(encoding="utf-8"))
        rows += st["rows"]; recs += st["records"]
    gb_done, gb_all = sum(s for *_x, s in done) / 1e9, sum(s for *_x, s in files) / 1e9
    print(f"scan: {len(done)}/{len(files)} files, {gb_done:.1f}/{gb_all:.1f} GB, "
          f"{recs} records read, {rows} match rows")
    marker = config.BUCKET_DIR / "_done.json"
    print("partition:", marker.read_text() if marker.exists() else "not done")
    man = config.OUT_DIR / "_manifest.json"
    print("shard:", man.read_text() if man.exists() else "not done")
