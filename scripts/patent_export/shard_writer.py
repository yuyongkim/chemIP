"""Write one substance's files: <CAS>/<JUR>.json.gz per jurisdiction + <CAS>/index.json (atomic replace)."""
import gzip
import json
import os

import config


def _dump(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def _write_atomic(path, data):
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_bytes(data)
    os.replace(tmp, path)


def write_substance(cas, groups, index, out_dir=config.OUT_DIR):
    """groups = {JUR: [records]}. Returns (files_written, raw_bytes, gzip_bytes)."""
    d = out_dir / cas
    d.mkdir(parents=True, exist_ok=True)
    files = raw = gz = 0
    for jur, recs in sorted(groups.items()):
        data = _dump(recs)
        z = gzip.compress(data, compresslevel=9, mtime=0)
        _write_atomic(d / f"{jur}.json.gz", z)
        total = index["by_jurisdiction"].get(jur, len(recs))
        index["files"][jur] = {"file": f"{jur}.json.gz", "records": len(recs), "bytes": len(z),
                               "truncated": len(recs) < total}
        files += 1; raw += len(data); gz += len(z)
    idx = _dump(index)
    _write_atomic(d / "index.json", idx)
    return files + 1, raw + len(idx), gz + len(idx)
