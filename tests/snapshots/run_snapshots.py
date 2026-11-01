"""Endpoint snapshot harness: byte-level before/after comparison of every API response.

  prepare                      freeze consistent copies of terminology.db / feedback.db / usage.db into _work/frozen
  run --label L --mode M       copy frozen DBs to _work/run, start a separate uvicorn (default port 7091) of the
                               working tree with the same .env, call every case in cases.py, store _work/snap_L/
                               M=record: real outbound HTTP, saved to _work/cassette.jsonl
                               M=replay: outbound HTTP served from the cassette (deterministic, no network)
  diff A B                     compare two snapshot sets (status + headers + body bytes)

The production backend (7011) is never touched; the snapshot server is stopped by its own PID only.
"""
from __future__ import annotations

import argparse
import base64
import http.client
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urlencode

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
PROJECT = HERE.parents[1]
WORK = HERE / "_work"
FROZEN = WORK / "frozen"
RUN = WORK / "run"
CASSETTE = WORK / "cassette.jsonl"
PYTHON = r"C:\Program Files\Python313\python.exe"
SITE_PACKAGES = PROJECT / ".venv" / "Lib" / "site-packages"
DBS = {"terminology": PROJECT / "data" / "terminology.db", "feedback": PROJECT / "data" / "feedback.db",
       "usage": PROJECT / "data" / "usage.db"}
DROP_HEADERS = {"date", "server", "x-request-id"}
VOLATILE = {"/health": re.compile(rb'"time":"[^"]*"'), "/ready": re.compile(rb'"time":"[^"]*"')}

sys.path.insert(0, str(HERE))
from cases import build_cases  # noqa: E402


def prepare() -> None:
    FROZEN.mkdir(parents=True, exist_ok=True)
    for name, src in DBS.items():
        dst = FROZEN / f"{name}.db"
        if dst.exists():
            dst.unlink()
        with sqlite3.connect(f"file:{src.as_posix()}?mode=ro", uri=True) as s, sqlite3.connect(dst) as d:
            s.backup(d)
        print(f"frozen {name}: {dst.stat().st_size:,} bytes")


def _server_env(mode: str) -> dict[str, str]:
    env = dict(os.environ)
    env.update({
        "PYTHONPATH": str(SITE_PACKAGES), "PYTHONDONTWRITEBYTECODE": "1", "PORT": "7091", "LOG_DIR": str(WORK / "logs"),
        "LLM_MODEL": "gemma3:4b", "LLM_MAX_TOKENS": "512", "LLM_TIMEOUT_SECONDS": "25",
        "TERMINOLOGY_DB_PATH": str(RUN / "terminology.db"), "CHEMIP_FEEDBACK_DB": str(RUN / "feedback.db"),
        "CHEMIP_USAGE_DB": str(RUN / "usage.db"), "SNAPSHOT_CASSETTE": str(CASSETTE), "SNAPSHOT_MODE": mode,
    })
    return env


def _wait_ready(port: int, proc: subprocess.Popen, timeout: float = 180) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if proc.poll() is not None:
            raise SystemExit(f"snapshot server exited early (code {proc.returncode}); see {WORK / 'server.log'}")
        try:
            conn = http.client.HTTPConnection("127.0.0.1", port, timeout=2)
            conn.request("GET", "/")
            if conn.getresponse().status == 200:
                return
        except OSError:
            time.sleep(1)
    raise SystemExit("snapshot server did not become ready")


def _call(port: int, method: str, path: str, params: dict | None, body: dict | None) -> dict:
    url = path + ("?" + urlencode(params) if params else "")
    headers = {"user-agent": "chemip-snapshot/1"}
    payload = None
    if body is not None:
        payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
        headers["content-type"] = "application/json"
    if method == "OPTIONS":
        headers.update({"origin": "http://localhost:7000", "access-control-request-method": "GET"})
    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=300)
    started = time.time()
    conn.request(method, url, body=payload, headers=headers)
    resp = conn.getresponse()
    raw = resp.read()
    pattern = VOLATILE.get(path)
    if pattern:
        raw = pattern.sub(b'"time":"<volatile>"', raw)
    return {
        "method": method, "url": url, "status": resp.status,
        "headers": sorted((k.lower(), v) for k, v in resp.getheaders() if k.lower() not in DROP_HEADERS),
        "body_b64": base64.b64encode(raw).decode(), "ms": round((time.time() - started) * 1000),
    }


def run(label: str, mode: str, port: int) -> None:
    if not FROZEN.exists():
        raise SystemExit("run `prepare` first")
    if mode == "record" and CASSETTE.exists():
        CASSETTE.unlink()
    shutil.rmtree(RUN, ignore_errors=True)
    RUN.mkdir(parents=True)
    for name in DBS:
        shutil.copyfile(FROZEN / f"{name}.db", RUN / f"{name}.db")
    out_dir = WORK / f"snap_{label}"
    shutil.rmtree(out_dir, ignore_errors=True)
    out_dir.mkdir(parents=True)
    log = (WORK / f"server_{label}.log").open("w", encoding="utf-8")
    proc = subprocess.Popen(
        [PYTHON, "-B", "-m", "uvicorn", "cassette_app:app", "--app-dir", str(HERE), "--host", "127.0.0.1",
         "--port", str(port), "--no-proxy-headers"],
        cwd=str(PROJECT), env=_server_env(mode), stdout=log, stderr=subprocess.STDOUT,
    )
    try:
        _wait_ready(port, proc)
        cases = build_cases()
        for i, (name, method, path, params, body) in enumerate(cases, 1):
            if name == "usage_summary_end":
                time.sleep(2)  # let the counter's background tasks finish
            result = _call(port, method, path, params, body)
            (out_dir / f"{i:03d}_{name}.json").write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"[{i:03d}/{len(cases)}] {result['status']} {result['ms']:>6}ms {name}", flush=True)
    finally:
        proc.terminate()  # this PID only
        proc.wait(timeout=30)
        log.close()
    misses = CASSETTE.with_suffix(".misses.txt")
    if mode == "replay" and misses.exists() and misses.read_text(encoding="utf-8").strip():
        print("CASSETTE MISSES:\n" + misses.read_text(encoding="utf-8"))


def diff(a: str, b: str) -> int:
    da, db = WORK / f"snap_{a}", WORK / f"snap_{b}"
    fa = {p.name: p for p in sorted(da.glob("*.json"))}
    fb = {p.name: p for p in sorted(db.glob("*.json"))}
    same, changed = 0, []
    for name in sorted(set(fa) | set(fb)):
        if name not in fa or name not in fb:
            changed.append((name, "missing in one set"))
            continue
        ra, rb = json.loads(fa[name].read_text(encoding="utf-8")), json.loads(fb[name].read_text(encoding="utf-8"))
        keys = ("status", "headers", "body_b64")
        if all(ra[k] == rb[k] for k in keys):
            same += 1
        else:
            what = [k for k in keys if ra[k] != rb[k]]
            changed.append((name, ",".join(what)))
    print(f"identical: {same}/{len(set(fa) | set(fb))}")
    for name, what in changed:
        print(f"  DIFF {name}: {what}")
    report = {"a": a, "b": b, "identical": same, "total": len(set(fa) | set(fb)), "diffs": changed}
    (WORK / f"diff_{a}_vs_{b}.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    return 1 if changed else 0


def main() -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("prepare")
    r = sub.add_parser("run")
    r.add_argument("--label", required=True)
    r.add_argument("--mode", choices=["record", "replay"], default="replay")
    r.add_argument("--port", type=int, default=7091)
    d = sub.add_parser("diff")
    d.add_argument("a")
    d.add_argument("b")
    args = ap.parse_args()
    if args.cmd == "prepare":
        prepare()
    elif args.cmd == "run":
        run(args.label, args.mode, args.port)
    else:
        return diff(args.a, args.b)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
