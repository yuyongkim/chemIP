"""방식 F 의 WSL 안 프로세스: 실행 파일 내려받기, 흉내 버킷(SeaweedFS)·계수 프록시·Quickwit 띄우기/끄기.
자기가 띄운 프로세스만 그 PID 로 끈다(광역 kill 금지). 띄운 PID 는 PID_LOG 에 남긴다."""
from __future__ import annotations

import io
import json
import os
import secrets
import signal
import subprocess
import sys
import tarfile
import time
import urllib.error
import urllib.request
from pathlib import Path

from config import (QUICKWIT_DIR, QUICKWIT_REST_PORT, QUICKWIT_URL, S3_BACKEND_PORT, S3_BUCKET, S3_KEY, S3_PROXY_PORT,
                    S3_SECRET, SEAWEED_FILER_PORT, SEAWEED_MASTER_PORT, SEAWEED_VOLUME_PORT, SEAWEEDFS_URL)
from quickwit_config import BUCKET_ROOT, NODE_CONFIG, s3_env

BIN_DIR = QUICKWIT_DIR / "bin"
LOG_DIR = QUICKWIT_DIR / "logs"
PID_LOG = QUICKWIT_DIR / "pids.jsonl"
QUICKWIT_BIN = BIN_DIR / "quickwit"
WEED_BIN = BIN_DIR / "weed"
FILER = f"http://127.0.0.1:{SEAWEED_FILER_PORT}"
PROXY_PY = Path(__file__).with_name("s3_count_proxy.py")


def fetch_tar_member(url: str, name: str, dest: Path) -> None:
    with tarfile.open(fileobj=io.BytesIO(urllib.request.urlopen(url).read())) as tar:
        member = next(m for m in tar.getmembers() if m.isfile() and m.name.rsplit("/", 1)[-1] == name)
        dest.write_bytes(tar.extractfile(member).read())
    dest.chmod(0o755)


def install() -> None:
    BIN_DIR.mkdir(parents=True, exist_ok=True)
    if not QUICKWIT_BIN.exists():
        fetch_tar_member(QUICKWIT_URL, "quickwit", QUICKWIT_BIN)
    if not WEED_BIN.exists():
        fetch_tar_member(SEAWEEDFS_URL, "weed", WEED_BIN)


def versions() -> dict[str, str]:
    run = lambda *a: subprocess.run([str(x) for x in a], capture_output=True, text=True).stdout.strip().splitlines()[0]  # noqa: E731
    return {"quickwit": run(QUICKWIT_BIN, "--version"), "bucket": "SeaweedFS " + run(WEED_BIN, "version")}


def spawn(name: str, argv: list[str], env: dict | None = None, cwd: Path | None = None) -> subprocess.Popen:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    log = (LOG_DIR / f"{name}.log").open("ab")
    proc = subprocess.Popen(argv, stdout=log, stderr=subprocess.STDOUT, env={**os.environ, **(env or {})},
                            cwd=cwd, start_new_session=True)
    with PID_LOG.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps({"name": name, "pid": proc.pid, "event": "start", "at": time.strftime("%H:%M:%S")}) + "\n")
    return proc


def stop(name: str, proc: subprocess.Popen) -> None:
    """정확한 PID 하나에만 SIGTERM, 안 끝나면 같은 PID 에 SIGKILL."""
    if proc.poll() is None:
        os.kill(proc.pid, signal.SIGTERM)
        try:
            proc.wait(timeout=30)
        except subprocess.TimeoutExpired:
            os.kill(proc.pid, signal.SIGKILL)
            proc.wait()
    with PID_LOG.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps({"name": name, "pid": proc.pid, "event": "stop", "returncode": proc.returncode}) + "\n")


def wait_http(url: str, timeout: float = 120, need_ok: bool = False) -> None:
    t0 = time.monotonic()  # WSL 시계는 Windows 와 맞추며 건너뛸 수 있다
    while time.monotonic() - t0 < timeout:
        try:
            urllib.request.urlopen(url, timeout=5)
            return
        except urllib.error.HTTPError:
            if not need_ok:
                return  # 응답이 오면 떠 있는 것(인증 없는 요청은 403 등)
            time.sleep(0.5)
        except OSError:
            time.sleep(0.5)
    raise TimeoutError(url)


def start_bucket() -> subprocess.Popen:
    """weed server 하나로 master·volume·filer·S3 를 띄우고 버킷을 만든다. 데이터는 BUCKET_ROOT(S:) 아래.
    4.48 은 S3 계정(-s3.config)을 읽을 때 STS 서명 키를 요구해서 작업 폴더의 security.toml 에 filer 서명 키를 둔다."""
    BUCKET_ROOT.mkdir(parents=True, exist_ok=True)
    (BUCKET_ROOT / "security.toml").write_text(f'[jwt.filer_signing]\nkey = "{secrets.token_hex(16)}"\n', encoding="utf-8")
    s3_conf = BUCKET_ROOT / "s3_identities.json"
    s3_conf.write_text(json.dumps({"identities": [{"name": "bench", "credentials": [{"accessKey": S3_KEY, "secretKey": S3_SECRET}],
                                                   "actions": ["Admin", "Read", "Write", "List", "Tagging"]}]}), encoding="utf-8")
    proc = spawn("seaweedfs", [str(WEED_BIN), "server", f"-dir={BUCKET_ROOT}", "-ip=127.0.0.1", "-ip.bind=127.0.0.1",
                               f"-master.port={SEAWEED_MASTER_PORT}", "-master.volumeSizeLimitMB=1024", "-master.telemetry=false",
                               "-volume.max=200", f"-volume.port={SEAWEED_VOLUME_PORT}", "-filer", f"-filer.port={SEAWEED_FILER_PORT}",
                               "-s3", f"-s3.port={S3_BACKEND_PORT}", f"-s3.config={s3_conf}", "-s3.port.iceberg=0", "-s3.port.lance=0"],
                 cwd=BUCKET_ROOT)
    try:
        wait_http(f"{FILER}/", timeout=120)
        wait_http(f"http://127.0.0.1:{S3_BACKEND_PORT}/", timeout=120)
        subprocess.run([str(WEED_BIN), "shell", f"-master=127.0.0.1:{SEAWEED_MASTER_PORT}"],
                       input=f"s3.bucket.create -name {S3_BUCKET}\n", capture_output=True, text=True, timeout=120, check=True)
    except Exception:
        stop("seaweedfs", proc)
        raise
    return proc


def bucket_objects(prefix: str = "") -> list[tuple[str, int]]:
    """filer 목록 API 로 버킷 안 객체(경로, 크기)를 모은다. S3 를 거치지 않으므로 요청 집계에 섞이지 않는다."""
    url = f"{FILER}/buckets/{S3_BUCKET}/{prefix}"
    req = urllib.request.Request(url + "?limit=100000", headers={"Accept": "application/json"})
    out = []
    for e in json.loads(urllib.request.urlopen(req).read()).get("Entries") or []:
        name = e["FullPath"].rsplit("/", 1)[-1]
        if e.get("Mode", 0) & (1 << 31):
            out += bucket_objects(f"{prefix}{name}/")
        else:
            out.append((f"{prefix}{name}", int(e.get("FileSize", 0))))
    return out


def start_proxy() -> subprocess.Popen:
    proc = spawn("s3_count_proxy", [sys.executable, str(PROXY_PY), str(S3_PROXY_PORT), str(S3_BACKEND_PORT)])
    wait_http(f"http://127.0.0.1:{S3_PROXY_PORT}/__bench/stats")
    return proc


def start_quickwit() -> subprocess.Popen:
    proc = spawn("quickwit", [str(QUICKWIT_BIN), "run", "--config", str(NODE_CONFIG)], s3_env())
    try:
        wait_http(f"http://127.0.0.1:{QUICKWIT_REST_PORT}/health/readyz", timeout=180, need_ok=True)
    except TimeoutError:
        stop("quickwit", proc)
        raise
    return proc


def local_ingest(index_id: str, ndjson: Path) -> subprocess.CompletedProcess:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    with (LOG_DIR / "local_ingest.log").open("ab") as log:
        return subprocess.run([str(QUICKWIT_BIN), "tool", "local-ingest", "--index", index_id, "--input-path", str(ndjson),
                               "--config", str(NODE_CONFIG)], stdout=log, stderr=subprocess.STDOUT,
                              env={**os.environ, **s3_env()}, check=True)


def bench_stats(reset: bool = False) -> dict:
    path = "reset" if reset else "stats"
    return json.loads(urllib.request.urlopen(f"http://127.0.0.1:{S3_PROXY_PORT}/__bench/{path}").read())
