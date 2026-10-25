"""방식 F 의 Quickwit 노드 설정과 색인 설정(문서 매핑). 값은 config.py 에서 읽는다."""
from __future__ import annotations

from config import (QUICKWIT_DIR, QUICKWIT_INDEX, QUICKWIT_REST_PORT, S3_BUCKET, S3_KEY, S3_PROXY_PORT,
                    S3_SECRET, TEXT_FIELDS)

NODE_CONFIG = QUICKWIT_DIR / "node.json"
INDEX_CONFIG = QUICKWIT_DIR / "index.json"
DATA_DIR = QUICKWIT_DIR / "qwdata"          # 노드 작업 폴더(수집 임시 파일). 분할 캐시는 쓰지 않는다
METASTORE_DIR = QUICKWIT_DIR / "metastore"  # 메타스토어는 로컬 파일 → 버킷 요청 집계에 섞이지 않는다
BUCKET_ROOT = QUICKWIT_DIR / "bucket"       # SeaweedFS 데이터 폴더(volume·filer 메타). 객체 크기는 filer 목록으로 잰다


def s3_env() -> dict[str, str]:
    return {"AWS_ACCESS_KEY_ID": S3_KEY, "AWS_SECRET_ACCESS_KEY": S3_SECRET, "AWS_REGION": "us-east-1",
            # 새 AWS SDK 의 기본 체크섬 트레일러(aws-chunked)를 흉내 버킷이 못 풀어서 필요할 때만 쓰게 한다
            "AWS_REQUEST_CHECKSUM_CALCULATION": "when_required", "AWS_RESPONSE_CHECKSUM_VALIDATION": "when_required",
            "QW_DISABLE_TELEMETRY": "1", "QW_ENABLE_OTLP_ENDPOINT": "false", "QW_ENABLE_JAEGER_ENDPOINT": "false"}


def node_config() -> dict:
    return {
        "version": "0.8",
        "node_id": "bench",
        "listen_address": "127.0.0.1",
        # 수집은 tool local-ingest 가 따로 하므로 indexer 는 끈다. janitor(버킷 목록 조회 GC)도 꺼서 집계에 섞이지 않게 한다.
        "enabled_services": ["metastore", "control_plane", "searcher"],
        "rest": {"listen_port": QUICKWIT_REST_PORT},
        "grpc_listen_port": QUICKWIT_REST_PORT + 1,
        "data_dir": DATA_DIR.as_posix(),
        "metastore_uri": f"file://{METASTORE_DIR.as_posix()}",
        "default_index_root_uri": f"s3://{S3_BUCKET}/indexes",
        "storage": {"s3": {"endpoint": f"http://127.0.0.1:{S3_PROXY_PORT}", "force_path_style_access": True,
                           "region": "us-east-1"}},
    }


def index_config() -> dict:
    """본문 필드는 위치(position)까지 색인해 구 질의가 되게 하고 저장하지 않는다. doc_key 는 저장만 한다."""
    text = [{"name": f, "type": "text", "tokenizer": "default", "record": "position", "stored": False}
            for f in TEXT_FIELDS]
    return {
        "version": "0.8",
        "index_id": QUICKWIT_INDEX,
        "doc_mapping": {
            "mode": "strict",
            "field_mappings": [{"name": "doc_key", "type": "text", "indexed": False, "stored": True},
                               *text],
        },
        "search_settings": {"default_search_fields": list(TEXT_FIELDS)},
        "indexing_settings": {"commit_timeout_secs": 3600, "split_num_docs_target": 10_000_000,
                              "resources": {"heap_size": "4GB"}},
    }
