# ChemIP-Platform 프로젝트 현황

## 프로젝트 목표

**화학물질 안전 · 특허 · 의약품 · 시장 통합 리서치 플랫폼**

| 핵심 기능 | 설명 | 상태 |
|-----------|------|:----:|
| **MSDS 검색** | KOSHA API 연동, 16개 섹션 상세 + 영문 GHS 안전정보 | 완료 |
| **글로벌 특허 검색** | USPTO, EPO, WIPO, JPO, KIPRIS, CNIPA 6개 특허청 통합 | 완료 |
| **의약품 통합** | MFDS + OpenFDA + PubMed 병렬 검색, DB 캐싱 | 완료 |
| **시장 인텔리전스** | KOTRA 7개 API + Naver 뉴스 폴백 | 완료 |
| **KOSHA 가이드** | 안전보건 가이드 추천 · 매칭 | 완료 |
| **AI 분석** | Ollama(qwen3:8b) 로컬 LLM — 검색추천, 요약, 의약품분석, Q&A | 완료 |

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| **Backend** | Python 3.13 + FastAPI + Uvicorn |
| **Frontend** | Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 |
| **Database** | SQLite (terminology.db + 140GB 특허 인덱스) |
| **LLM** | Ollama (qwen3:8b) — 로컬 실행 |
| **Indexing** | Aho-Corasick + FTS5 + Multiprocessing |
| **Hardware** | Ryzen 5900X (12C/24T) + 64GB RAM |

---

## API 엔드포인트 현황

| 라우트 | 엔드포인트 수 | 주요 기능 |
|--------|:-----------:|-----------|
| `/api/chemicals` | 4 | 검색, 자동완성, 상세, 의약품 연동 |
| `/api/patents` | 4 | KIPRIS, USPTO, Global, 상세 |
| `/api/trade` | 8 | 뉴스, 전략, 가격, 사기, 국가정보 등 |
| `/api/drugs` | 5 | MFDS, OpenFDA, PubMed, 통합검색 |
| `/api/guides` | 4 | 상태, 검색, 상세, 추천 |
| `/api/ai` | 6 | 분석, 추천, 요약, 의약품분석, Q&A, LLM상태 |
| `/api/docs` | 2 | 문서 목록, 문서 조회 |

---

## 프론트엔드 페이지 구성

| 페이지 | 경로 | 탭 수 |
|--------|------|:-----:|
| 홈 (통합 검색) | `/` | 2 (화학물질 · 의약품) |
| 화학물질 상세 | `/chemical/[id]` | 7 (MSDS · 한영비교 · 특허 · 시장 · 가이드 · 의약품 · AI) |
| 특허 검색 | `/patents` | 1 |
| 시장 인텔리전스 | `/trade` | 4 (상품 · 전략 · 물가 · 사기) |
| 의약품 검색 | `/drugs` | 1 |
| 문서 뷰어 | `/docs` | 1 |

추가 UI: **AI 어시스턴트 플로팅 패널** (화학물질 상세 페이지 우측 하단)

---

## 데이터 소스 연결 현황

| 소스 | 유형 | 상태 |
|------|------|:----:|
| KOSHA MSDS API | 실시간 | 정상 |
| KIPRIS 특허 API | 실시간 | 정상 |
| KOTRA 시장 API (7종) | 실시간 | 정상 |
| MFDS 식약처 API | 실시간 | 정상 |
| OpenFDA API | 실시간 | 정상 |
| PubMed E-Utilities | 실시간 | 정상 |
| Naver Search API | 실시간 (폴백) | 정상 |
| 글로벌 특허 인덱스 | 로컬 DB (140GB) | 정상 |
| USPTO 인덱스 | 로컬 DB (5.8GB) | 정상 |
| KOSHA 가이드 데이터셋 | 로컬 파일 | 정상 |
| Ollama LLM (qwen3:8b) | 로컬 | 정상 |

---

## 접속 정보

| 서비스 | URL |
|--------|-----|
| Frontend | http://localhost:7000 |
| Backend API | http://localhost:7010 |
| API Docs (Swagger) | http://localhost:7010/docs |
| Dashboard | http://localhost:9000 |

---

## 최근 변경 이력

### 2026-03-15
- 의약품 통합 (A+B+C): 화학물질 상세 의약품 탭, 홈 통합검색, drug_mappings DB 캐싱
- AI 어시스턴트 4개 기능: 검색추천, MSDS 요약, 의약품 분석, 자연어 Q&A
- LLM 모델 전환: gemma3:4b → qwen3:8b
- 검색 결과 확대: FDA 전량(최대100건), PubMed 50건, MFDS 20건
- AI 컨텍스트 통합: /ask, /summarize에 MSDS+의약품+가이드 전체 주입
- Trade 페이지 한글 인코딩 수정
- 문서 업데이트 (README.md, PROJECT_STATUS.md)
