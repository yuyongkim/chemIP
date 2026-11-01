"""Bulk upload a local tree to R2 over its S3 API (boto3), many objects in parallel.

Why: upload_r2.py (wrangler, one process per object) is fine for a few thousand files but far too slow for
the ~370k page and patent objects. This keeps the same key layout and headers and is resumable the same way.

Credentials: R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY read from G:\\MSDS\\.env (name match ignores case).
They are never printed or logged. Endpoint = https://<account>.r2.cloudflarestorage.com.

    python upload_r2_s3.py --src E:\\dev-cache\\chemip-static\\out\\v1\\p --prefix v1/p --gzip-all
    python upload_r2_s3.py --src E:\\dev-cache\\chemip-patents\\out\\v1 --prefix v1/pat --gzip-suffix .json.gz
"""
from __future__ import annotations

import argparse
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import boto3
from botocore.config import Config

import config

ENV_FILE = r"G:\MSDS\.env"
ACCOUNT_ID = "be15024b2f5766dabce34ad4ae19c49e"
ENDPOINT = f"https://{ACCOUNT_ID}.r2.cloudflarestorage.com"
KEY_NAMES = ("R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY")


def read_keys(path: str = ENV_FILE) -> tuple[str, str]:
    found = {}
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            name, sep, value = line.partition("=")
            if sep and name.strip().upper() in KEY_NAMES:
                found[name.strip().upper()] = value.strip().strip('"').strip("'")
    missing = [k for k in KEY_NAMES if not found.get(k)]
    if missing:
        raise SystemExit(f"missing in .env: {', '.join(missing)}")
    return found[KEY_NAMES[0]], found[KEY_NAMES[1]]


def client(workers: int):
    key_id, secret = read_keys()
    return boto3.client("s3", endpoint_url=ENDPOINT, aws_access_key_id=key_id, aws_secret_access_key=secret,
                        region_name="auto", config=Config(max_pool_connections=workers + 4,
                                                          retries={"max_attempts": 6, "mode": "adaptive"}))


def plan(src: str, prefix: str, gzip_all: bool, gzip_suffix: str) -> list[tuple[str, str, bool]]:
    """(key, path, gzip?) for every file under src. A `.json.gz` file is stored under its name without `.gz`."""
    out = []
    for dirpath, _, files in os.walk(src):
        for f in files:
            path = os.path.join(dirpath, f)
            rel = os.path.relpath(path, src).replace(os.sep, "/")
            gz = gzip_all or bool(gzip_suffix and rel.endswith(gzip_suffix))
            if rel.endswith(".json.gz"):
                rel = rel[:-3]
            out.append((f"{prefix.strip('/')}/{rel}", path, gz))
    return sorted(out)


def upload(objects, done_file: str, workers: int, log=print) -> dict:
    os.makedirs(os.path.dirname(done_file), exist_ok=True)
    done = set(open(done_file, encoding="utf-8").read().split("\n")) if os.path.exists(done_file) else set()
    todo = [o for o in objects if o[0] not in done]
    s3, lock, failed, count, t0 = client(workers), threading.Lock(), [], [0], time.time()
    log(f"r2-s3: {len(objects)} planned, {len(objects) - len(todo)} already uploaded, {len(todo)} to go")

    def one(obj):
        key, path, gz = obj
        extra = {"ContentType": "application/json"}
        if gz:
            extra["ContentEncoding"] = "gzip"
        try:
            with open(path, "rb") as fh:
                s3.put_object(Bucket=config.R2_BUCKET, Key=key, Body=fh.read(), **extra)
            ok, err = True, ""
        except Exception as exc:  # error text from botocore never contains the secret
            ok, err = False, str(exc)[-300:]
        with lock:
            count[0] += 1
            if ok:
                with open(done_file, "a", encoding="utf-8") as fh:
                    fh.write(key + "\n")
            else:
                failed.append({"key": key, "error": err})
            if count[0] % 5000 == 0:
                rate = count[0] / max(1, time.time() - t0)
                log(f"r2-s3 {count[0]}/{len(todo)} ({rate:.0f}/s, failed {len(failed)})")

    with ThreadPoolExecutor(workers) as pool:
        list(pool.map(one, todo))
    return {"planned": len(objects), "attempted": len(todo), "failed": len(failed), "failures": failed[:20],
            "secs": round(time.time() - t0, 1)}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--prefix", required=True)
    ap.add_argument("--gzip-all", action="store_true", help="every file is gzip bytes (p/, g/)")
    ap.add_argument("--gzip-suffix", default="", help="only files ending with this are gzip bytes")
    ap.add_argument("--workers", type=int, default=32)
    ap.add_argument("--limit", type=int, default=0, help="upload only the first N (smoke test)")
    a = ap.parse_args()
    objects = plan(a.src, a.prefix, a.gzip_all, a.gzip_suffix)
    if a.limit:
        objects = objects[: a.limit]
    done_file = os.path.join(config.REPORTS, f"r2_s3_uploaded_{a.prefix.strip('/').replace('/', '_')}.txt")
    print(upload(objects, done_file, a.workers, log=lambda m: print(m, flush=True)), flush=True)


if __name__ == "__main__":
    main()
