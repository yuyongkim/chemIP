# ChemIP Platform

ChemIP는 화학 안전, 특허, 무역, 의약품 정보를 한 곳에서 탐색하고 연결해주는 통합 리서치 플랫폼입니다.

- `MSDS`: KOSHA 기반 물질안전보건자료 검색/상세 조회
- `Patents`: KIPRIS 실시간 검색 + 로컬 특허 인덱스(USPTO/Global)
- `Trade`: KOTRA 데이터 기반 시장/진출/가격/사기 정보 + Naver 보조 검색
- `Drugs`: MFDS + OpenFDA + PubMed 통합 검색
- `AI`: 로컬 LLM(Ollama qwen3:8b) 기반 — 검색추천, MSDS 요약, 의약품 분석, 자연어 Q&A
- `AI Assistant`: 화학물질 상세 페이지 플로팅 패널 (MSDS + 의약품 + 가이드 전체 컨텍스트 활용)

> 문서 기준: 코드 반영(2026-03-15)

## Product Overview

### 어떤 제품인가?
- 화학 관련 의사결정을 위한 `통합 정보 탐색 허브`입니다.
- 단일 검색 흐름에서 안전(MSDS), 특허, 시장, 의약품 근거를 함께 확인할 수 있습니다.
- 한국 공공 API와 로컬 대용량 인덱스를 결합해 `속도`와 `탐색 범위`를 동시에 확보합니다.

### 주요 사용자
- 화학/소재 R&D 팀
- 규제/안전 대응팀
- 해외영업/시장조사팀
- 기술사업화/특허 분석팀

## Current Capabilities (Code-Verified)

### Backend
- `FastAPI` 기반 API 서버 (`backend/main.py`)
- 공통 미들웨어
  - `x-request-id` 자동 부여
  - 보안 헤더 적용
  - 선택적 요청 제한(`RATE_LIMIT_*`, 메모리 버킷)
  - 요청 로그 요약
- 라우터
  - `/api/chemicals`
    - 로컬 `terminology.db` FTS 검색
    - 상세 조회 시 DB 미존재 섹션은 KOSHA 1~16번 항목을 즉시 fetch 후 upsert
  - `/api/patents`
    - KIPRIS 키워드 검색
    - `/kipris/{application_number}` 상세 조회
    - `/uspto/{chem_id}`, `/global/{chem_id}` 로컬 인덱스 조회
  - `/api/trade`
    - 시장 뉴스, 진출 전략, 가격, 사기 사례
    - 추가 국가/규제/성공사례/관광 API 엔드포인트 포함
    - 프론트에서 KOTRA 결과 부족 시 Naver 폴백 활용
  - `/api/drugs`
    - MFDS 허가/복약정보 통합 검색
    - OpenFDA 라벨 검색(substance_name + generic_name + brand_name 합산, 중복제거)
    - PubMed 논문 요약 조회 (다중 검색어: 기본 + toxicology + safety + pharmacology)
    - `/unified` — MFDS + OpenFDA + PubMed 병렬 통합 검색
  - `/api/chemicals/{chem_id}/drugs`
    - 화학물질별 의약품 데이터 조회 (MFDS/OpenFDA/PubMed 병렬, DB 캐싱)
  - `/api/guides`
    - KOSHA Guide 데이터셋 상태/검색/상세/화학물질별 추천
  - `/api/ai`
    - `/analyze` — MSDS + KOSHA Guide + 특허 근거 기반 분석 리포트
    - `/recommend` — LLM 기반 관련 화학물질/검색어 추천
    - `/summarize` — 전체 데이터 소스 기반 종합 위험도 요약
    - `/drug-analysis` — 화학물질-의약품 관계 분석 (MFDS/FDA/PubMed)
    - `/ask` — 자연어 Q&A (MSDS + 의약품 + 가이드 전체 컨텍스트)
    - `/llm-status` — Ollama 연결 상태 확인

### Frontend
- `Next.js 16` App Router + React 19 + TypeScript + Tailwind CSS 4
- `/api/*` 요청은 `frontend/next.config.ts`에서 백엔드(`BACKEND_ORIGIN`)로 rewrite
- 페이지 구성(컴포지션 중심)
  - `frontend/app/page.tsx`: 통합 홈(화학/의약품 탭)
  - `frontend/app/patents/page.tsx`: 특허 검색 및 페이징
  - `frontend/app/trade/page.tsx`: 상품/전략/가격/사기 탭
  - `frontend/app/drugs/page.tsx`: MFDS/OpenFDA/PubMed 패널
  - `frontend/app/chemical/[id]/page.tsx`: MSDS 상세 + 특허/시장/가이드/의약품/AI 탭 + AI 어시스턴트 플로팅 패널

### Data
- 기본 DB 경로 (`backend/config/settings.py`)
  - `./data/terminology.db`
  - `./data/uspto_index.db`
  - `./data/global_patent_index.db`

## How To Use

### 1) 설치

```bash
pip install -r requirements.txt
cd frontend
npm install
```

### 2) 환경변수 설정

`.env.example`를 복사해 `.env` 생성 후 값 입력:

- 필수
  - `KOSHA_SERVICE_KEY_DECODED`
  - `KIPRIS_API_KEY`
  - `KOTRA_API_KEY_DECODED`
  - `DRUG_API_KEY_DECODED`
- 선택
  - `PUBMED_API_KEY`
  - `NAVER_CLIENT_ID`
  - `NAVER_CLIENT_SECRET`
  - `BACKEND_ORIGIN` (프론트 리라이트 대상, 기본 `http://127.0.0.1:7010`)
  - `KOSHA_GUIDE_DATA_DIR` (로컬 KOSHA 가이드 데이터셋 경로)

### 3) 실행

백엔드:

```bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 7010
```

프론트엔드:

```bash
cd frontend
npm run dev
```

접속:
- Frontend: `http://localhost:7000`
- Backend: `http://localhost:7010`
- API Docs: `http://localhost:7010/docs`
- Health: `http://localhost:7010/health`
- Readiness: `http://localhost:7010/ready`

### 4) PM2 통합 실행 (권장 운영 방식)

```bash
# Windows
start_all.bat

# Linux/macOS
bash start_all.sh
```

- 전역 `pm2` 미설치 시 `npx pm2`로 자동 폴백
- T3 서비스(`Dashboard`, `ChemIP Backend`, `ChemIP Frontend`)만 시작

## Typical Workflows

### 화학물질 중심 조사
1. 홈에서 물질명/CAS 검색
2. `/chemical/{id}` 상세로 이동
3. MSDS 섹션(1~16), 영문 안전요약, 규제 상태 확인
4. `KOSHA Guides` 탭에서 관련 가이드 문서 추천 확인
5. `AI` 탭에서 근거 출처(`sources`) 포함 분석 결과 확인
6. 동일 화면에서 특허/시장 탭으로 확장 조사

### 특허 중심 조사
1. `/patents`에서 키워드 검색
2. KIPRIS 결과 확인
3. 화학물질 상세 페이지에서는 Global/USPTO 로컬 인덱스 결과까지 함께 확인

### 시장/진출 조사
1. `/trade`에서 국가/키워드 기반 조회
2. KOTRA 데이터 우선 사용
3. 부족 시 Naver 뉴스, 이후 데모 데이터로 단계적 폴백

### 의약품 조사
1. `/drugs`에서 약품명 검색 → MFDS + OpenFDA + PubMed 통합 결과
2. 화학물질 상세 → 의약품(Drugs) 탭에서 해당 물질의 약물 정보 확인
3. AI 어시스턴트에서 "이 물질이 어떤 약에 쓰이나?" 등 자연어 질의

## Verification & Quality Gate

제출 전 필수 점검:

```bash
# Windows
submit_check.bat

# Linux/macOS
bash submit_check.sh
```

내부 실행 (`scripts/verify_submission.py`):
- `pytest`
- `scripts/test_kipris_live.py`
- `frontend npm run lint`
- `frontend npm run build`

## Current Gaps (As-Is)

- 요청 제한이 인메모리 기반이라 멀티 인스턴스 환경에서 일관성 보장이 약함
- 테스트는 스모크/핵심 API 중심으로, 대규모 통합/회귀 시나리오 보강 여지 존재
- 외부 API 의존 구간은 네트워크/할당량/키 상태에 따라 품질 변동 가능
- MFDS(식약처) 검색은 한글 약품명 기준이므로 영문 화학물질명 매핑 한계 존재

## Roadmap Suggestions

### Phase 1: Product Reliability
- 캐시 계층(예: Redis) 도입으로 외부 API 호출량/지연 감소
- 관측성 강화(구조화 로그, 에러 코드 표준화, 대시보드 지표)

### Phase 2: Data Quality & Search Depth
- 화학명 동의어/오탈자 정규화 사전 강화
- 글로벌 특허 인덱스 업데이트 자동화 파이프라인 고도화
- 시장/무역 데이터 신뢰도 스코어링 및 근거 링크 품질 관리

### Phase 3: Enterprise Readiness
- 권한/감사 로그/조직 단위 설정(멀티테넌시) 추가
- 배치 분석 및 보고서 내보내기(PDF/슬라이드) 기능
- 배포 표준화(Docker/K8s)와 무중단 운영 체계 확립

## Contribution

- Contributor guide: `CONTRIBUTING.md`
- Branch/commit guide: `docs/BRANCH_COMMIT_GUIDELINES.md`
- PR template: `.github/PULL_REQUEST_TEMPLATE.md`

옵션 로컬 훅:

```bash
pip install pre-commit
pre-commit install
```

## Related Docs

- `DATA_STRUCTURE.md`
- `PORT_REGISTRY.md`
- `docs/QUICKSTART_3MIN.md`
- `docs/RUNBOOK.md`
- `docs/RELEASE_PROCESS.md`
- `docs/DEPENDENCY_UPDATE_POLICY.md`
- `docs/SUBMISSION_REPORT.md`
- `docs/PRIORITY_MATRIX_100.md`
- `docs/PRODUCT_ROADMAP.md`
- `docs/ROADMAP_EXECUTION_BOARD.md`
- `docs/WEEKLY_TOP15_EXECUTION.md`
- `docs/EXECUTION_PROGRESS.md`
- `docs/FRONTEND_RUNTIME_CHECK_2026-03-01.md`
- `docs/MINIPC_CLOUDFLARE_DEPLOY_CHECKLIST.md`
- `docs/CHEMIP_PROJECT_INTRO_AND_SCREENSHOT_GUIDE_2026-03-02.md`
- `docs/CHEMIP_PROJECT_INTRO_AND_SCREENSHOT_GUIDE_2026-03-02.docx`
- `scripts/README.md`
