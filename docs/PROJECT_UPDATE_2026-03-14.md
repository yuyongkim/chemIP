# ChemIP Platform — 프로젝트 업데이트 (2026-03-14)

> 이전 기준일: 2026-03-01 → 본 문서 기준일: **2026-03-14**

---

## 1. 플랫폼 개요

ChemIP는 화학 안전(MSDS), 특허, 무역, 의약품 정보를 한 곳에서 탐색하는 **통합 리서치 플랫폼**입니다.

| 탭 | 데이터 소스 | 설명 |
|----|-------------|------|
| **MSDS** | KOSHA API + terminology.db | 물질안전보건자료 검색/16개 섹션 상세 |
| **Patents** | KIPRIS + USPTO/Global 로컬 인덱스 | 실시간 검색 + 140GB 인덱스 |
| **Trade** | KOTRA + Naver 폴백 | 시장/진출/가격/사기/국가정보 |
| **Drugs** | MFDS + OpenFDA + PubMed | 허가/복약/라벨/논문 통합 |
| **Guides** | KOSHA Guide 데이터셋 | 안전보건 가이드 검색/추천 |
| **AI** | 로컬 LLM (Ollama) + 규칙 기반 폴백 | MSDS+가이드 근거 분석 리포트 |

---

## 2. 기술 스택

| 구분 | 기술 |
|------|------|
| **Backend** | Python 3.11 + FastAPI 0.122 |
| **Frontend** | Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 |
| **Database** | SQLite FTS5 (WAL 모드) |
| **HTTP** | requests.Session + HTTPAdapter/Retry (공용 커넥션 풀) |
| **LLM** | Ollama + gemma3:4b (4.3B Q4_K_M) |
| **Testing** | pytest 8.3 + pytest-asyncio 0.24 |
| **운영** | PM2 (ecosystem.config.js) |

---

## 3. 2026-03-14 주요 변경사항

### 3.1 안정성 강화

| 항목 | 변경 내용 |
|------|-----------|
| **HTTP 커넥션 풀** | `backend/api/http_client.py` 신규 — 전 어댑터(8개)가 공유 Session + 자동 재시도(3회, 502/503/504) |
| **DB 컨텍스트 매니저** | `TerminologyDB`에 `__enter__`/`__exit__` 추가 → 모든 라우트에서 `with` 패턴 적용 |
| **WAL 모드** | terminology.db, global_patent_index.db, uspto_index.db 모두 WAL + busy_timeout=5000ms |
| **FTS5 인젝션 방지** | `_sanitize_fts_query()` 정적 메서드로 FTS5 연산자 제거 |
| **에러 정보 보호** | 글로벌 예외 핸들러에서 내부 스택 대신 예외 타입명만 반환 |
| **CSP 헤더** | `unsafe-eval` 제거 |
| **KOTRA 한글 정규식** | 깨진 바이트열 `[媛-??` → 유니코드 `[\uAC00-\uD7A3]` 수정 |
| **urllib3 경고 제거** | `disable_warnings()` 핵 제거, 정상 SSL 검증 유지 |

### 3.2 코드 모듈화

| 신규 모듈 | 역할 |
|-----------|------|
| `backend/api/http_client.py` | 공용 HTTP 세션 + `safe_get()` |
| `backend/api/patent_index_base.py` | `PatentIndexBase` 추상 기반 클래스 (Global/USPTO 공통) |
| `backend/core/report_builder.py` | `EvidenceBundle`, `build_sources()`, `build_report_markdown()`, `calculate_confidence()` |
| `backend/core/llm_client.py` | Ollama API 래퍼 + `LLMResponse` 데이터클래스 |
| `backend/api/routes/utils.py` | `handle_adapter_result()` 공유 핸들러 |

| 리팩터링 | 내용 |
|-----------|------|
| `drug_adapter.py` | 105줄 → 12줄 (MFDSClient 상속 래퍼) |
| `global_patent_adapter.py` | PatentIndexBase 상속, `_classify_snippet()` 분리 |
| `uspto_adapter.py` | PatentIndexBase 상속, limit/offset 파라미터화 |
| `ai.py` | 187줄 → 120줄 (리포트 로직 report_builder로 분리) |
| `trade.py` / `drugs.py` | 중복 `_handle_result()` → `routes.utils` 공유 |

### 3.3 로컬 LLM 통합

```
사용자 요청 → EvidenceBundle 수집 → LLM 프롬프트 구성 → Ollama 생성 → 응답
                                                          ↓ (실패 시)
                                                   규칙 기반 리포트 폴백
```

- **모델**: `gemma3:4b` (Ollama, 4.3GB Q4_K_M 양자화)
- **프롬프트**: MSDS 2항/15항 + GHS 유해성 문구 + KOSHA 가이드 근거 → 한국어 안전 분석 리포트
- **설정** (`.env`): `LLM_ENABLED`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_TIMEOUT_SECONDS`, `LLM_MAX_TOKENS`, `LLM_TEMPERATURE`
- **API**: `POST /api/ai/analyze` (`use_llm` 파라미터), `GET /api/ai/llm-status`
- **폴백**: Ollama 미가동 시 기존 규칙 기반 마크다운 리포트 자동 전환

---

## 4. 프로젝트 구조 (업데이트)

```
MSDS/
├── backend/
│   ├── api/
│   │   ├── http_client.py          ← NEW: 공용 HTTP 클라이언트
│   │   ├── patent_index_base.py    ← NEW: 특허 인덱스 기반 클래스
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── chemicals.py
│   │   │   ├── patents.py
│   │   │   ├── trade.py
│   │   │   ├── drugs.py
│   │   │   ├── guides.py
│   │   │   ├── ai.py
│   │   │   └── utils.py            ← NEW: 공유 라우트 유틸
│   │   ├── kosha_msds_adapter.py
│   │   ├── kipris_adapter.py
│   │   ├── kotra_adapter.py
│   │   ├── global_patent_adapter.py
│   │   ├── uspto_adapter.py
│   │   ├── drug_adapter.py          (→ MFDSClient 래퍼)
│   │   ├── mfds_client.py
│   │   ├── fda_client.py
│   │   ├── naver_adapter.py
│   │   ├── pubmed_client.py
│   │   └── patent_fetcher.py
│   ├── core/
│   │   ├── terminology_db.py        (컨텍스트 매니저, WAL, FTS 보안)
│   │   ├── report_builder.py        ← NEW: 리포트 생성 엔진
│   │   ├── llm_client.py            ← NEW: Ollama LLM 래퍼
│   │   ├── guide_linker.py
│   │   └── kosha_guide_store.py
│   ├── config/
│   │   └── settings.py              (+LLM 설정 6개)
│   └── main.py                      (보안/버전/에러 개선)
├── frontend/                         Next.js 16 App Router
├── data/                             SQLite DB (Git 제외)
├── tests/
│   └── test_api_smoke.py            19개 테스트 전체 통과
├── scripts/
├── docs/
├── .env.example                     (+LLM 환경변수)
└── requirements.txt                 (+ollama, httpx)
```

---

## 5. 테스트 현황

```
tests/test_api_smoke.py — 19 passed
```

| 테스트 카테고리 | 수량 | 커버리지 |
|----------------|------|----------|
| 화학물질 API | 3 | 검색, 상세, KOSHA fallback |
| 특허 API | 4 | KIPRIS, Global, USPTO, 상세 |
| 무역 API | 3 | 시장뉴스, 진출전략, 가격정보 |
| 의약품 API | 3 | MFDS, OpenFDA, PubMed |
| 가이드 API | 2 | 상태, 검색 |
| AI API | 3 | 분석, LLM 상태, LLM 폴백 |
| 헬스체크 | 1 | /health |

---

## 6. 접속 정보

| 서비스 | URL |
|--------|-----|
| Frontend | `http://localhost:7000` |
| Backend API | `http://localhost:7010` |
| API Docs (Swagger) | `http://localhost:7010/docs` |
| Health | `http://localhost:7010/health` |
| Readiness | `http://localhost:7010/ready` |
| Dashboard | `http://localhost:7020` |

---

## 7. 실행 방법

```bash
# 환경 설정
cp .env.example .env
# .env 편집: API 키 입력

# 의존성 설치
pip install -r requirements.txt
cd frontend && npm install && cd ..

# 개별 실행
uvicorn backend.main:app --reload --host 127.0.0.1 --port 7010
cd frontend && npm run dev

# PM2 통합 실행 (권장)
start_all.bat          # Windows
bash start_all.sh      # Linux/macOS

# Ollama LLM (선택)
ollama serve           # 별도 터미널
ollama pull gemma3:4b  # 최초 1회
```

---

## 8. 현재 제약사항

- 요청 제한이 인메모리 기반 → 멀티 인스턴스 환경에서 일관성 미보장
- 외부 API(KOSHA/KIPRIS/KOTRA/MFDS) 가용성·할당량에 따른 품질 변동
- LLM 리포트 품질은 모델 크기(4B)에 비례하며 전문적 판단 대체 불가
- 통합/회귀 테스트 시나리오 추가 보강 여지

---

## 9. 향후 확장 방안

### Phase 1: 신뢰성 고도화
- 캐시 계층(Redis) 도입으로 외부 API 호출량/지연 감소
- 구조화 로그 + 에러 코드 표준화 + Grafana 지표 대시보드
- LLM 모델 업그레이드 (8B → 12B) 및 프롬프트 최적화

### Phase 2: 데이터 품질
- 화학명 동의어/오탈자 정규화 사전 강화
- 글로벌 특허 인덱스 자동 업데이트 파이프라인
- 시장/무역 데이터 신뢰도 스코어링

### Phase 3: 엔터프라이즈
- 권한/감사 로그/멀티테넌시
- 배치 분석 및 PDF/슬라이드 보고서 내보내기
- Docker/K8s 배포 표준화

---

*이 문서는 2026-03-14 기준 ChemIP 플랫폼 코드 상태를 반영합니다.*
