"""Publish v1/reg/ to R2 after a refresh: upload only files whose bytes changed, with the right content type.

    E:/dev-cache/r2-venv/Scripts/python -B G:\\MSDS\\scripts\\portal_build\\reg_publish.py [--all] [--dry-run]

Why not only upload_r2_s3.py: that uploader is resumable by key (a key uploaded once is never sent again), so a
re-exported changes.json / lists.json would be skipped, and it stores every object as application/json. Here the
record is a content hash per key (reports/r2_publish_v1_reg.json): a file is sent when its hash differs, `.xml` goes out
as application/rss+xml. Credentials and client come from scripts/static_export/upload_r2_s3.py (never printed).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys

sys.dont_write_bytecode = True
STATIC_EXPORT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static_export")
sys.path.insert(0, STATIC_EXPORT)

import config  # noqa: E402  (static_export/config.py: REG_DIR, REPORTS, R2_BUCKET)

PREFIX = "v1/reg"
TYPES = {".json": "application/json", ".xml": "application/rss+xml; charset=utf-8"}
RECORD = os.path.join(config.REPORTS, "r2_publish_v1_reg.json")


def plan(src: str = config.REG_DIR) -> dict[str, str]:
    """{key: local path} for every file under v1/reg."""
    out = {}
    for dirpath, _, files in os.walk(src):
        for f in files:
            path = os.path.join(dirpath, f)
            out[f"{PREFIX}/{os.path.relpath(path, src).replace(os.sep, '/')}"] = path
    return dict(sorted(out.items()))


def sha(path: str) -> str:
    with open(path, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def changed(files: dict[str, str], record: dict[str, str]) -> list[str]:
    return [k for k, p in files.items() if record.get(k) != sha(p)]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="send every file (ignore the record)")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    files = plan()
    record = {} if a.all or not os.path.exists(RECORD) else json.load(open(RECORD, encoding="utf-8"))
    todo = list(files) if a.all else changed(files, record)
    stale = sorted(set(record) - set(files))
    print(f"reg publish: {len(files)} files, {len(todo)} to send, {len(stale)} recorded keys no longer exported", flush=True)
    if a.dry_run or not todo:
        print(json.dumps({"send": todo[:20], "stale": stale[:20]}, ensure_ascii=False))
        return
    from upload_r2_s3 import client

    s3, failed = client(8), []
    for key in todo:
        path = files[key]
        with open(path, "rb") as fh:
            body = fh.read()
        extra = {"ContentType": TYPES.get(os.path.splitext(key)[1], "application/json")}
        if body[:2] == b"\x1f\x8b":
            extra["ContentEncoding"] = "gzip"
        try:
            s3.put_object(Bucket=config.R2_BUCKET, Key=key, Body=body, **extra)
            record[key] = hashlib.sha256(body).hexdigest()
        except Exception as exc:  # botocore error text never contains the secret
            failed.append({"key": key, "error": str(exc)[-200:]})
    os.makedirs(os.path.dirname(RECORD), exist_ok=True)
    with open(RECORD, "w", encoding="utf-8") as fh:
        json.dump(record, fh, indent=0, sort_keys=True)
    print(json.dumps({"sent": len(todo) - len(failed), "failed": failed[:10], "stale": stale[:20]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
