"""검색 방식 비교 실험의 경로·표본·질의어 (값은 여기서만 정의한다)."""
from __future__ import annotations

import os
from pathlib import Path

BENCH_ROOT = Path(os.environ.get("SEARCH_BENCH_ROOT", "S:/chemip_search_bench"))
PATENT_RAW_ROOT = Path(os.environ.get("PATENT_RAW_ROOT", "S:/특허 논문 DB/downloaded_patents"))
GLOBAL_INDEX_DB = Path(os.environ.get("GLOBAL_PATENT_INDEX_DB_PATH", "G:/MSDS/data/global_patent_index.db"))

# 원본 표본: USPTO 210개 파일 중 하나(약 1.2 GB gz). 전체 추정은 이 파일의 비율로 한다.
SAMPLE_FILES = ["USPTO/USPTO-patent-records-00150.jsonl.gz"]
RAW_TOTALS_GB = {"USPTO": 238.2, "전체 원본": 640.0}  # 2026-10-17 측정 (KIPRIS 2.8 GB 포함)

TERMS_TSV = BENCH_ROOT / "terms.tsv"            # chem_id \t 검색어 (export_terms.py 가 만든다)
SAMPLE_PARQUET = BENCH_ROOT / "sample" / "docs.parquet"
FTS5_DB = BENCH_ROOT / "fts5" / "docs_fts.sqlite3"
TANTIVY_DIR = BENCH_ROOT / "tantivy"
LOOKUP_PARQUET = BENCH_ROOT / "lookup" / "patent_index_sorted.parquet"
RESULTS_DIR = BENCH_ROOT / "results"
REPORT_MD = BENCH_ROOT / "report.md"

TEXT_FIELDS = ("title", "abstract", "claims", "description")

# 전문 검색 질의어: 물질명(단어·구)과 CAS 번호를 섞는다.
QUERY_TERMS = [
    "ammonia", "benzene", "toluene", "phosgene", "acetonitrile",
    "hydrogen fluoride", "methyl isocyanate", "ethylene oxide",
    "7664-41-7", "71-43-2",
]

# 서비스 조회(물질 → 특허) 경로 실험: 원 색인의 앞 구간 행을 물질별로 정렬해 Parquet 로 옮긴다.
LOOKUP_ROW_LIMIT = 20_000_000
LOOKUP_PAGE = 100
SECTION_PRIORITY = {"Claims": 0, "Abstract": 1, "Title": 2, "Description": 3, "Metadata": 9}

# 방식 F — Quickwit(Tantivy 색인을 버킷에 두는 검색 엔진). Windows 빌드가 없어 WSL 안에서 돌린다.
# 실행 파일·데이터는 전부 S: 아래(WSL 가상 디스크는 C: 에 있다). WSL 에서는 SEARCH_BENCH_ROOT=/mnt/s/chemip_search_bench.
WSL_DISTRO = "Ubuntu-24.04"
QUICKWIT_DIR = BENCH_ROOT / "quickwit"
QUICKWIT_NDJSON = QUICKWIT_DIR / "docs.ndjson"
QUICKWIT_VERSION = "v0.9.3"
QUICKWIT_URL = f"https://github.com/quickwit-oss/quickwit/releases/download/{QUICKWIT_VERSION}/quickwit-{QUICKWIT_VERSION}-x86_64-unknown-linux-gnu.tar.gz"
# MinIO 커뮤니티판 바이너리는 배포가 끊겼다(dl.min.io 410). rclone serve s3 는 서명 청크 업로드(aws-chunked)를
# 풀지 못해 분할 파일이 깨졌다. 버킷 흉내는 SeaweedFS(weed server -s3) 로 한다.
SEAWEEDFS_VERSION = "4.48"
SEAWEEDFS_URL = f"https://github.com/seaweedfs/seaweedfs/releases/download/{SEAWEEDFS_VERSION}/linux_amd64.tar.gz"
# 포트(127.0.0.1 전용): 버킷 원본 → 계수 프록시 → Quickwit 순으로 붙는다. gRPC 는 각 포트 +10000, Quickwit gRPC 는 REST+1.
S3_BACKEND_PORT, S3_PROXY_PORT, QUICKWIT_REST_PORT = 19100, 19000, 17280
SEAWEED_MASTER_PORT, SEAWEED_VOLUME_PORT, SEAWEED_FILER_PORT = 19333, 19080, 19888
S3_BUCKET, S3_KEY, S3_SECRET = "qwbench", "benchkey", "benchsecret"  # 로컬 흉내 버킷 전용 값
QUICKWIT_INDEX = "patents"
QUICKWIT_MAX_HITS = 100
