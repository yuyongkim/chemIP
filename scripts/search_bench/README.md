# search_bench — 특허 전문 검색 방식 비교 실험

PC가 꺼져도 도는 특허 검색을 어떤 구조로 둘지 정하려고, 같은 USPTO 표본으로 방식별 크기·시간·비용을 잰다.
결과물은 `S:\chemip_search_bench`(C:·G: 여유가 적어서), 파이썬은 그 안의 `.venv`(duckdb·pyarrow·tantivy·pyahocorasick).
운영 DB(`data/global_patent_index.db`)는 읽기 전용으로만 연다.

```
python export_terms.py                                  # 프로젝트 파이썬: 색인 생성기와 같은 검색어 목록
S:\chemip_search_bench\.venv\Scripts\python.exe -X utf8 build_sample.py
...                                         bench_raw_scan.py | bench_parquet_scan.py | bench_fts5.py | bench_tantivy.py | bench_lookup.py
...                                         export_ndjson.py    # F 준비: 표본 → NDJSON
wsl -d Ubuntu-24.04 -- bash -lc "SEARCH_BENCH_ROOT=/mnt/s/chemip_search_bench python3 /mnt/g/MSDS/scripts/search_bench/bench_quickwit.py"
...                                         report.py           # → S:\chemip_search_bench\report.md
```

방식 F(Quickwit)는 Windows 빌드가 없어 WSL 안에서 WSL 시스템 python3(표준 라이브러리만)로 돈다. 실행 파일·버킷 데이터·로그는 전부
`S:\chemip_search_bench\quickwit` 아래(WSL 가상 디스크는 C: 에 있어 쓰지 않는다). 포트는 127.0.0.1 전용으로 19000(계수 프록시)·19100(S3)·
19333/19080/19888(SeaweedFS master/volume/filer)·17280/17281(Quickwit)과 각 gRPC(+10000). 띄운 프로세스는 그 PID 로만 끄고 `quickwit\pids.jsonl` 에 남긴다.
MinIO 커뮤니티판은 바이너리 배포가 끊겨(dl.min.io 410), rclone serve s3 는 서명 청크 업로드를 못 풀어 분할 파일이 깨져서 SeaweedFS 를 쓴다.

| 파일 | 책임 |
|---|---|
| `config.py` | 경로·표본 파일·질의어·전체 원본 크기 (값은 여기서만) |
| `records.py` | Lens 형식 원본 한 줄 → 제목·초록·청구항·본문 |
| `results.py` | 결과 JSON 저장·읽기, 크기, 타이머 |
| `range_server.py` | 버킷 흉내 HTTP Range 서버 (요청 수·바이트 집계) |
| `export_terms.py` | 검색어 목록 내보내기 (`TerminologyDB.get_indexing_keywords`) |
| `build_sample.py` | 표본 원본 → Parquet |
| `bench_raw_scan.py` | A: 원본 전체 스캔 (지금 색인 생성 방식, Aho-Corasick) |
| `bench_parquet_scan.py` | B: Parquet + SQL 스캔 (버킷 + 스캔 과금 SQL 구조) |
| `bench_fts5.py` | C: SQLite FTS5 전문 색인 |
| `bench_tantivy.py` | D: Tantivy 전문 색인 |
| `bench_lookup.py` | E: 물질 → 특허 조회, 지금 SQLite vs 물질별 정렬 Parquet (로컬·버킷 흉내) |
| `export_ndjson.py` | F 준비: 표본 Parquet → Quickwit 수집용 NDJSON (Windows .venv) |
| `quickwit_config.py` | F: Quickwit 노드 설정·색인 설정(구 질의용 위치 색인, 본문 미저장) |
| `quickwit_services.py` | F: WSL 안 실행 파일 받기, 흉내 버킷(SeaweedFS)·계수 프록시·Quickwit 띄우기/PID 로 끄기, 버킷 객체 목록 |
| `s3_count_proxy.py` | F: Quickwit ↔ 버킷 사이 S3 프록시 (방법별 요청 수·바이트, GET 목록 집계) |
| `bench_quickwit.py` | F: Quickwit 수집·질의(cold/warm/띄워 둔 노드) 시간과 질의당 GET 수·읽은 양 (WSL python3) |
| `report.py` | 결과 표와 전체 규모 추정 |
