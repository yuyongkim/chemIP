# ChemIP DB 확대 계획

> 기준 버전: `v1.0-paper` (커밋 8834d65, 2026-03-22)
> 상태: 미착수 — 논문 제출 후 진행 예정

## 현재 상태 (v1.0-paper)

| 테이블 | 건수 | 소스 | 비고 |
|---|---|---|---|
| `chemical_terms` | 13,462종 | KOSHA | 마스터 물질목록 |
| `msds_details` | 6,764종 캐시 | KOSHA API | 16섹션 MSDS |
| `msds_english` | 11,941건 (CID 7,415) | PubChem | GHS/위험문구 |
| `drug_mappings` | 75건 | OpenFDA, PubMed | 거의 비어있음 |
| ECHA/CompTox/NIOSH | 캐시 없음 | 실시간 API | — |

## Step 0: 스키마 마이그레이션 (`scripts/migrate_schema_v2.py`)
- `chemical_terms`에 `source` (TEXT, default 'KOSHA'), `external_id` (TEXT) 컬럼 추가
- 기존 행 backfill: `source='KOSHA'`, `external_id=substr(description,10)`
- CAS 기준 중복방지 인덱스: `CREATE UNIQUE INDEX idx_cas_source ON chemical_terms(cas_no, source) WHERE cas_no IS NOT NULL AND cas_no != ''`
- 새 테이블: `niosh_cache` (cas_no PK, data JSON), `regulatory_cache` (cas_no+source PK, data JSON)
- FTS 리빌드

## Step 1: NIOSH 캐시 (`scripts/cache_niosh_data.py`)
- 로컬 JSON → `niosh_cache` 테이블로 일괄 삽입
- API 호출 없음, 즉시 완료
- **~60줄, 수 초**

## Step 2: PubChem 갭 채우기
- 기존 `scripts/fetch_pubchem_safety_batch.py` 재실행
- 1,521건 잔여분 수집
- **~1시간 (6 workers)**

## Step 3: Drug 매핑 일괄 수집 (`scripts/populate_drug_mappings_batch.py`)
- 13,462종 × 3소스 (MFDS, OpenFDA, PubMed)
- ThreadPoolExecutor (4 workers), 배치 커밋 (50건)
- 기존 `MFDSClient`, `OpenFDAClient`, `PubMedClient` 재사용
- 스마트 큐잉: 이미 캐시된 (chem_id, source) 건너뛰기
- **~250줄, ~6시간 런타임**

## Step 4: ECHA 물질 발견 (`scripts/discover_echa_chemicals.py`)
- A-Z 시드 검색 → 페이지네이션 (100/page)
- CAS 기준 중복 체크 후 신규만 INSERT (`source='ECHA'`, `external_id=rml_id`)
- `EchaAdapter.search_substance()` 사용
- API 키 불필요
- **~200줄, ~1시간 런타임, 예상 ~10K-15K 신규**

## Step 5: CompTox 물질 발견 (`scripts/discover_comptox_chemicals.py`)
- Phase 1: 기존 13K CAS → batch_search (100개/요청)로 DTXSID 매핑
- Phase 2: contains 검색으로 신규 물질 발견
- `source='COMPTOX'`, `external_id=dtxsid`
- COMPTOX_API_KEY 필요
- **~250줄, ~30분 런타임**

## Step 6: 규제 데이터 캐시 (`scripts/cache_regulatory_data.py`)
- ECHA CLP 분류 + CompTox 위험성 데이터 → `regulatory_cache` 테이블
- CompTox: batch_detail (200개/요청)로 빠르게 처리
- ECHA: 물질별 순차 호출 (느림)
- **~200줄, ~1.5시간**

## Step 7: 신규 물질에 대해 Step 2, 3 재실행
- Step 4-5에서 추가된 물질에 PubChem GHS + Drug 매핑 수집

## 실행 순서 및 병렬화

```
Step 0 (필수 선행)
  ↓
Step 1 (즉시) + Step 2 (PubChem) + Step 3 (Drug) ← 병렬 가능
  ↓
Step 4 (ECHA) + Step 5 (CompTox) ← 병렬 가능
  ↓
Step 6 (캐시)
  ↓
Step 7 (신규분 보충)
```

## 핵심 파일
- `backend/core/terminology_db.py` — 스키마, upsert 메서드 수정
- `backend/core/mapping_store.py` — drug_mappings, niosh_cache CRUD
- `scripts/fetch_pubchem_safety_batch.py` — 참조 패턴 (ThreadPoolExecutor, retry, batched commit)
- `backend/api/echa_adapter.py` — ECHA search/CLP
- `backend/api/comptox_adapter.py` — CompTox batch endpoints
- `backend/api/niosh_adapter.py` — NIOSH 로컬 데이터

## chem_id 규칙
- KOSHA: 기존 `"001008"` 형태 유지
- ECHA: `"ECHA:100.000.685"` 형태
- CompTox: `"COMPTOX:DTXSID7020182"` 형태

## 검증 방법
1. `migrate_schema_v2.py` 후: `SELECT source, COUNT(*) FROM chemical_terms GROUP BY source`
2. 각 스크립트 후: 테이블 건수 확인 쿼리
3. API 엔드포인트 테스트: `/api/regulations/search?q=benzene` → ECHA + CompTox + NIOSH 모두 결과
4. 프론트엔드에서 신규 물질 검색 → 상세 페이지 정상 표시
