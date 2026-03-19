# Scripts 디렉토리

이 디렉토리에는 다양한 유틸리티 스크립트가 포함되어 있습니다.

## 📁 스크립트 분류

### 🔨 인덱싱 (Indexing)

특허 데이터를 인덱싱하는 스크립트들입니다.

| 파일 | 설명 |
|------|------|
| `build_global_index.py` | 글로벌 특허 인덱스 생성 (140GB+) |
| `build_uspto_index.py` | USPTO 특허 인덱스 생성 |
| `rebuild_fts.py` | Full-Text Search 인덱스 재구축 |
| `verify_global_index.py` | 글로벌 인덱스 검증 |

### 📥 데이터 수집 (Fetching)

외부 API에서 데이터를 가져오는 스크립트들입니다.

| 파일 | 설명 |
|------|------|
| `fetch_all_chemicals.py` | 모든 화학물질 데이터 수집 |
| `fetch_msds_details.py` | MSDS 상세 정보 수집 |
| `download_ghs.py` | GHS 이미지 다운로드 |
| `seed_essentials.py` | 필수 데이터 시딩 |

### 🔍 디버깅 (Debugging)

API 및 데이터 디버깅용 스크립트들입니다.

| 파일 | 설명 |
|------|------|
| `debug_kotra_api.py` | KOTRA API 디버깅 |
| `debug_query.py` | 쿼리 디버깅 |
| `debug_search.py` | 검색 디버깅 |
| `probe_kosha_fields.py` | KOSHA 필드 탐색 |
| `probe_kotra_apis.py` | KOTRA API 탐색 |
| `verify_kotra_product.py` | KOTRA 상품 검증 |

### 📊 벤치마크 (Benchmark)

성능 테스트용 스크립트들입니다.

| 파일 | 설명 |
|------|------|
| `benchmark_ahocorasick.py` | Aho-Corasick 성능 테스트 |
| `benchmark_regex.py` | 정규식 성능 테스트 |
| `benchmark_uspto.py` | USPTO 검색 성능 테스트 |

### 🛠️ 유틸리티 (Utils)

기타 유틸리티 스크립트들입니다.

| 파일 | 설명 |
|------|------|
| `analyze_hwp.py` | HWP 파일 분석 |
| `check_keywords.py` | 키워드 체크 |
| `export_sample_index.py` | 샘플 인덱스 내보내기 |
| `inspect_data_dbs.py` | 데이터 DB 검사 |
| `inspect_db.py` | DB 검사 |
| `monitor_indexing.py` | 인덱싱 모니터링 |

### 🧪 테스트 (Testing)

테스트 관련 스크립트들입니다.

| 파일 | 설명 |
|------|------|
| `test_api_batch.py` | API 배치 테스트 |
| `test_jurisdiction_extraction.py` | 관할권 추출 테스트 |

## 💡 사용법

```bash
# 글로벌 인덱스 생성 (24-48시간 소요)
python scripts/build_global_index.py

# 인덱스 검증
python scripts/verify_global_index.py

# 화학물질 데이터 수집
python scripts/fetch_all_chemicals.py
```
