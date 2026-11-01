"""Upload v1/ to the R2 test bucket with wrangler (one object per call, R2_CONCURRENCY in parallel).

Key = "<VERSION>/<path under v1>". search/ is plain JSON; g/ and p/ are gzip bytes and get Content-Encoding: gzip.
wrangler is run as `node <npx cache>/wrangler/bin/wrangler.js` (no cmd.exe, so keys with "&" or spaces are safe).
Resumable: keys already uploaded are listed in reports/r2_uploaded.txt and skipped.
No tokens are created and no bucket settings (public access, domains) are touched.
"""
from __future__ import annotations

import glob
import json
import os
import random
import subprocess
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import config

DONE_FILE = os.path.join(config.REPORTS, "r2_uploaded.txt")


def wrangler_cmd() -> list[str]:
    found = []
    for pkg in glob.glob(os.path.join(config.NPM_CACHE, "_npx", "*", "node_modules", "wrangler", "package.json")):
        with open(pkg, encoding="utf-8") as fh:
            ver = tuple(int(x) for x in json.load(fh)["version"].split(".")[:3])
        found.append((ver, os.path.join(os.path.dirname(pkg), "bin", "wrangler.js")))
    if not found:
        raise SystemExit("wrangler not in the npx cache; run `npx --yes wrangler --version` once first")
    return ["node", max(found)[1]]


def _env() -> dict:
    return {**os.environ, "npm_config_cache": config.NPM_CACHE, "WRANGLER_SEND_METRICS": "false",
            "WRANGLER_LOG_PATH": os.path.abspath(config.WRANGLER_LOGS)}


def create_bucket() -> str:
    r = subprocess.run([*wrangler_cmd(), "r2", "bucket", "create", config.R2_BUCKET], capture_output=True, text=True,
                       encoding="utf-8", errors="replace", env=_env())
    out = (r.stdout + r.stderr).strip()
    if r.returncode != 0 and "already exists" not in out.lower():
        raise SystemExit(f"bucket create failed: {out[-500:]}")
    return out[-300:]


def plan(sample_pages: int = config.R2_SAMPLE_PAGES) -> list[tuple[str, str, bool]]:
    """(key, local path, gzip?) for search/ + g/ + a seeded random sample of p/."""
    out = []
    for sub, gz in (("search", False), ("g", True)):
        root = os.path.join(config.OUT, sub)
        for dirpath, _, files in os.walk(root):
            for f in sorted(files):
                path = os.path.join(dirpath, f)
                out.append((f"{config.VERSION}/" + os.path.relpath(path, config.OUT).replace(os.sep, "/"), path, gz))
    pages = sorted(os.listdir(config.PAGES_DIR))
    for f in random.Random(config.VERIFY_SEED).sample(pages, min(sample_pages, len(pages))):
        out.append((f"{config.VERSION}/p/{f}", os.path.join(config.PAGES_DIR, f), True))
    return out


def _put(cmd: list[str], key: str, path: str, gz: bool) -> tuple[bool, str]:
    args = [*cmd, "r2", "object", "put", f"{config.R2_BUCKET}/{key}", "--file", path, "--remote",
            "--content-type", "application/json"]
    if gz:
        args += ["--content-encoding", "gzip"]
    last = ""
    for attempt in range(3):
        r = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace", env=_env())
        if r.returncode == 0:
            return True, ""
        last = (r.stdout + r.stderr).strip()[-300:]
        time.sleep(2 * (attempt + 1))
    return False, last


def upload(objects: list[tuple[str, str, bool]], log=print) -> dict:
    os.makedirs(config.REPORTS, exist_ok=True)
    done = set(open(DONE_FILE, encoding="utf-8").read().split("\n")) if os.path.exists(DONE_FILE) else set()
    todo = [o for o in objects if o[0] not in done]
    cmd, lock, failed, t0 = wrangler_cmd(), threading.Lock(), [], time.time()
    count = [0]

    def one(obj):
        ok, err = _put(cmd, *obj)
        with lock:
            count[0] += 1
            if ok:
                with open(DONE_FILE, "a", encoding="utf-8") as fh:
                    fh.write(obj[0] + "\n")
            else:
                failed.append({"key": obj[0], "error": err})
            if count[0] % 200 == 0:
                log(f"r2 {count[0]}/{len(todo)} ({time.time() - t0:.0f}s, failed {len(failed)})")

    log(f"r2: {len(objects)} planned, {len(objects) - len(todo)} already uploaded, {len(todo)} to go")
    with ThreadPoolExecutor(config.R2_CONCURRENCY) as pool:
        list(pool.map(one, todo))
    return {"planned": len(objects), "skipped_already_uploaded": len(objects) - len(todo), "attempted": len(todo),
            "failed": len(failed), "failures": failed[:20], "bytes": sum(os.path.getsize(p) for _, p, _ in objects),
            "secs": round(time.time() - t0, 1)}
