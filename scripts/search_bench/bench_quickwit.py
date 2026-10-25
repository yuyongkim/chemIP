"""방식 F — Quickwit: Tantivy 색인을 버킷(S3 호환)에 두고 질의 때 필요한 조각만 Range GET 으로 읽는다.
WSL 안에서 실행한다(먼저 Windows .venv 로 export_ndjson.py). 버킷은 로컬 흉내(SeaweedFS S3)라 네트워크 지연은 없다.

    SEARCH_BENCH_ROOT=/mnt/s/chemip_search_bench python3 bench_quickwit.py
"""
from __future__ import annotations

import json
import shutil
import time
import urllib.error
import urllib.request

import quickwit_services as svc
from config import QUERY_TERMS, QUICKWIT_INDEX, QUICKWIT_MAX_HITS, QUICKWIT_NDJSON, QUICKWIT_REST_PORT
from quickwit_config import BUCKET_ROOT, DATA_DIR, INDEX_CONFIG, METASTORE_DIR, NODE_CONFIG, index_config, node_config
from results import Timer, load_all, save, size_bytes

API = f"http://127.0.0.1:{QUICKWIT_REST_PORT}/api/v1"
MB = 1024 ** 2
METHOD_NOTE = ("Quickwit 와 흉내 버킷 사이에 계수 프록시(s3_count_proxy.py)를 두고 모든 S3 요청을 센다. "
               "질의 직전에 집계를 0 으로 돌리고 질의 응답 직후 읽는다. GET 은 객체 Range GET(object_gets)과 "
               "목록 조회(list_requests, ?list-type)로 나눴다. 바이트는 프록시가 Quickwit 에 돌려준 응답 본문 크기. "
               "cold 는 질의마다 Quickwit 프로세스를 새로 띄워 메모리 캐시가 빈 상태(분할 캐시는 설정하지 않음), "
               "warm 은 같은 프로세스에서 같은 질의를 한 번 더, running 은 한 프로세스에서 질의어를 차례로 처음 던진 값.")


def post_json(url: str, body: dict | bytes) -> dict:
    data = body if isinstance(body, bytes) else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        return json.loads(urllib.request.urlopen(req, timeout=600).read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{url}: {e.code} {e.read().decode()}") from e


def reset_state() -> None:
    for d in (BUCKET_ROOT, METASTORE_DIR, DATA_DIR):
        shutil.rmtree(d, ignore_errors=True)
    METASTORE_DIR.mkdir(parents=True)
    DATA_DIR.mkdir(parents=True)
    NODE_CONFIG.write_text(json.dumps(node_config(), indent=2), encoding="utf-8")
    INDEX_CONFIG.write_text(json.dumps(index_config(), indent=2), encoding="utf-8")


def summarize(stats: dict) -> dict:
    gets = stats["get_log"]
    objs = [g for g in gets if "list-type" not in g["path"]]
    other = {m: v["requests"] for m, v in stats["by_method"].items() if m != "GET"}
    return {"object_gets": len(objs), "list_requests": len(gets) - len(objs),
            "get_mb": round(sum(g["bytes"] for g in objs) / MB, 3), "other_requests": other}


def search(term: str) -> tuple[dict, float]:
    """막 띄운 노드는 검색 노드 목록에 몇 초 뒤 오른다. 그 전 실패는 버킷을 읽기 전 단계라 다시 시도하고 마지막 시도만 잰다."""
    for _ in range(100):
        svc.bench_stats(reset=True)
        try:
            with Timer() as t:
                res = post_json(f"{API}/{QUICKWIT_INDEX}/search", {"query": f'"{term}"', "max_hits": QUICKWIT_MAX_HITS})
            return res, t.s
        except RuntimeError as e:
            if "no available searcher" not in str(e):
                raise
            time.sleep(0.2)
    raise TimeoutError("searcher not available")


def query(term: str) -> dict:
    res, secs = search(term)
    return {"seconds": round(secs, 3), "docs": res["num_hits"], "first_page": len(res["hits"]),
            "engine_ms": round(res["elapsed_time_micros"] / 1000, 1), **summarize(svc.bench_stats())}


def create_index() -> None:
    qw = svc.start_quickwit()
    try:
        post_json(f"{API}/indexes", INDEX_CONFIG.read_bytes())
    finally:
        svc.stop("quickwit", qw)


def ingest() -> dict:
    svc.bench_stats(reset=True)
    with Timer() as t:
        svc.local_ingest(QUICKWIT_INDEX, QUICKWIT_NDJSON)
    stats = svc.bench_stats()
    objs = svc.bucket_objects()
    return {"ingest_seconds": round(t.s, 1), "index_bytes": sum(n for _, n in objs),
            "bucket_objects": len(objs), "splits": sum(k.endswith(".split") for k, _ in objs),
            "bucket_disk_bytes": size_bytes(BUCKET_ROOT),
            "ingest_requests": {m: v["requests"] for m, v in stats["by_method"].items()},
            "ingest_upload_mb": round(sum(v["request_bytes"] for v in stats["by_method"].values()) / MB, 1)}


def cold_warm() -> list[dict]:
    out = []
    for term in QUERY_TERMS:
        qw = svc.start_quickwit()
        try:
            out.append({"term": term, "cold": query(term), "warm": query(term)})
        finally:
            svc.stop("quickwit", qw)
    return out


def running() -> list[dict]:
    qw = svc.start_quickwit()
    try:
        return [{"term": term, **query(term)} for term in QUERY_TERMS]
    finally:
        svc.stop("quickwit", qw)


def compare_tantivy(queries: list[dict]) -> list[dict]:
    ref = {q["term"]: q["docs"] for q in load_all().get("tantivy", {}).get("queries", [])}
    return [{"term": q["term"], "quickwit": q["cold"]["docs"], "tantivy": ref.get(q["term"]),
             "same": q["cold"]["docs"] == ref.get(q["term"])} for q in queries]


def median(xs: list[float]) -> float:
    return sorted(xs)[len(xs) // 2]


def main() -> None:
    svc.install()
    reset_state()
    bucket, proxy = svc.start_bucket(), svc.start_proxy()
    try:
        create_index()
        built = ingest()
        queries = cold_warm()
        run = running()
    finally:
        svc.stop("s3_count_proxy", proxy)
        svc.stop("seaweedfs", bucket)
    save("quickwit", {
        "method": "Quickwit 전문 색인 (버킷 흉내 저장, 본문 미저장)",
        "versions": svc.versions(),
        "bucket_note": "로컬 흉내 버킷(같은 PC, 디스크 S:) — 네트워크 지연·대역폭 제한 없음",
        "measure_method": METHOD_NOTE,
        "docs": sum(1 for _ in QUICKWIT_NDJSON.open("rb")),
        **built,
        "build_seconds": built["ingest_seconds"],
        "median_seconds": median([q["cold"]["seconds"] for q in queries]),
        "median_warm_seconds": median([q["warm"]["seconds"] for q in queries]),
        "median_cold_gets": median([q["cold"]["object_gets"] for q in queries]),
        "median_cold_mb": median([q["cold"]["get_mb"] for q in queries]),
        "data_dir_bytes_after": size_bytes(DATA_DIR) if DATA_DIR.exists() else 0,
        "queries": [{"term": q["term"], "docs": q["cold"]["docs"], "seconds": q["cold"]["seconds"], **q} for q in queries],
        "running_searcher": run,
        "hits_vs_tantivy": compare_tantivy(queries),
        "finished_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    })


if __name__ == "__main__":
    main()
