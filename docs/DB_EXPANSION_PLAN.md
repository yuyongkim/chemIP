# ChemIP DB 확대 계획

> 기준 버전: `v1.0-paper` (커밋 8834d65, 2026-03-22)
> 확장 시작: 2026-03-22

## v1.0 상태 (확장 전)

| 테이블 | 건수 | 소스 | 비고 |
|---|---|---|---|
| `chemical_terms` | 13,462종 | KOSHA | 마스터 물질목록 |
| `msds_details` | 6,764종 캐시 | KOSHA API | 16섹션 MSDS |
| `msds_english` | 11,941건 (CID 7,415) | PubChem | GHS/위험문구 |
| `drug_mappings` | 75건 | OpenFDA, PubMed | 거의 비어있음 |
| ECHA/CompTox/NIOSH | 캐시 없음 | 실시간 API | — |

---

## 스키마 변경 (v2)

`scripts/migrate_schema_v2.py`로 적용 완료.

**chemical_terms 신규 컬럼:**
- `source` TEXT DEFAULT 'KOSHA' — 물질 출처 (KOSHA, ECHA, COMPTOX)
- `external_id` TEXT — 출처별 고유 ID (KOSHA ID, rml_id, DTXSID)

**신규 테이블:**
- `niosh_cache` (cas_no PK, data JSON) — NIOSH OEL 데이터 로컬 캐시
- `regulatory_cache` (cas_no+source PK, data JSON) — ECHA CLP / CompTox 규제 데이터 캐시

**인덱스:**
- `idx_chemical_terms_cas` — CAS 번호 조회용
- `idx_chemical_terms_cas_source` — CAS+소스 복합 인덱스
- `idx_chemical_terms_source` — 소스별 필터용

**chem_id 규칙:**
- KOSHA: `"001008"` (기존 유지)
- ECHA: description = `"ECHA_ID:{rml_id}"`
- CompTox: description = `"COMPTOX_ID:{dtxsid}"`

---

## 실행 스크립트

### Step 0: 스키마 마이그레이션 ✅ 완료
```bash
python scripts/migrate_schema_v2.py
```

### Step 1: NIOSH 캐시 ✅ 완료 (73건)
```bash
python scripts/cache_niosh_data.py
```
- 로컬 `backend/data/niosh_npg.json` → `niosh_cache` 테이블
- API 호출 없음, 즉시 완료

### Step 2: PubChem 갭 채우기 🔄 실행 중
```bash
python scripts/fetch_pubchem_safety_batch.py --workers 6
```
- `msds_english` 1,519건 잔여분 수집
- ~1시간 (6 workers)

### Step 3: Drug 매핑 일괄 수집 🔄 실행 중
```bash
python scripts/populate_drug_mappings_batch.py --workers 4
# 단일 소스만: --source mfds / --source openfda / --source pubmed
```
- 13,462종 × 3소스 (MFDS, OpenFDA, PubMed)
- 스마트 큐잉: 이미 캐시된 건 건너뛰기
- Ctrl+C로 안전 중단 후 재실행 가능
- ~6시간 (4 workers)

### Step 4: ECHA 물질 발견 🔄 실행 중
```bash
python scripts/discover_echa_chemicals.py --reset
# 특정 시드만: --seeds acet,benz,chlor
# 제한: --limit 500
```
- 화학물질 접두사 시드 (~80개) × 페이지네이션 (100/page)
- CAS 중복 체크 후 신규만 INSERT (source='ECHA')
- 진행 상황 `data/echa_discover_progress.json`에 저장 (재시작 가능)
- ~1시간, 예상 ~10K-15K 신규

### Step 5: CompTox 물질 발견 ⏳ 대기 (API 키 필요)
```bash
# .env에 COMPTOX_API_KEY 설정 후:
python scripts/discover_comptox_chemicals.py
# Phase 1만 (CAS→DTXSID 매핑): --phase 1
# Phase 2만 (신규 발견): --phase 2
```
- Phase 1: 기존 13K CAS → batch_search (100개/요청)로 DTXSID 매핑
- Phase 2: 화학물질명 시드로 신규 물질 발견
- COMPTOX_API_KEY 필요 (무료, ccte_api@epa.gov에 신청)
- ~30분

### Step 6: 규제 데이터 캐시 ⏳ 대기
```bash
python scripts/cache_regulatory_data.py --workers 3
# ECHA만: --source echa
# CompTox만: --source comptox (API 키 필요)
```
- ECHA CLP 분류 + CompTox 위험성 데이터 → `regulatory_cache`
- Step 4-5 완료 후 실행 권장 (신규 물질 포함)
- ~1.5시간

### Step 7: 신규 물질 보충 ⏳ 대기
Step 4-5 완료 후 Step 2, 3 재실행하여 신규 물질에도 PubChem GHS + Drug 매핑 수집.

---

## 실행 순서 및 병렬화

```
Step 0 (스키마) ✅
  ↓
Step 1 (NIOSH) ✅ + Step 2 (PubChem) 🔄 + Step 3 (Drug) 🔄 ← 병렬
                 + Step 4 (ECHA) 🔄                         ← 병렬
  ↓
Step 5 (CompTox) ⏳ ← API 키 설정 후
  ↓
Step 6 (규제 캐시) ⏳
  ↓
Step 7 (신규분 보충) ⏳
```

---

## 핵심 파일

**스키마 & 코어:**
- `backend/core/terminology_db.py` — 스키마, `add_chemical_from_source()` 메서드
- `backend/core/mapping_store.py` — drug_mappings, msds_english CRUD
- `scripts/migrate_schema_v2.py` — 마이그레이션 (idempotent)

**데이터 수집 스크립트:**
- `scripts/cache_niosh_data.py` — NIOSH 로컬 캐시
- `scripts/fetch_pubchem_safety_batch.py` — PubChem GHS 일괄 수집
- `scripts/populate_drug_mappings_batch.py` — Drug 매핑 3소스 일괄
- `scripts/discover_echa_chemicals.py` — ECHA 신규 물질 발견
- `scripts/discover_comptox_chemicals.py` — CompTox 신규 물질 발견
- `scripts/cache_regulatory_data.py` — ECHA/CompTox 규제 캐시

**API 어댑터:**
- `backend/api/echa_adapter.py` — ECHA REST (키 불필요)
- `backend/api/comptox_adapter.py` — CompTox batch (키 필요)
- `backend/api/niosh_adapter.py` — NIOSH 로컬 JSON

---

## 검증

```bash
# 소스별 물질 수
python -c "
import sqlite3; c=sqlite3.connect('data/terminology.db').cursor()
c.execute('SELECT source, COUNT(*) FROM chemical_terms GROUP BY source')
for r in c.fetchall(): print(f'  {r[0]}: {r[1]}')
"

# 캐시 커버리지
python -c "
import sqlite3; c=sqlite3.connect('data/terminology.db').cursor()
for t in ['msds_english','drug_mappings','niosh_cache','regulatory_cache']:
    c.execute(f'SELECT COUNT(*) FROM {t}')
    print(f'  {t}: {c.fetchone()[0]}')
"

# API 테스트
curl http://localhost:8000/api/regulations/search?q=benzene
```
