# 📋 ChemIP-Platform 프로젝트 현황

## 🎯 프로젝트 목표

**화학물질 안전 & 지식재산권 통합 플랫폼**

화학물질 검색 시 **MSDS(물질안전보건자료)**와 **글로벌 특허 정보**를 한 번에 조회할 수 있는 플랫폼 구축

| 핵심 기능 | 설명 |
|-----------|------|
| **MSDS 검색** | KOSHA API 연동, 16개 섹션 상세 정보 제공 |
| **글로벌 특허 검색** | USPTO, EPO, WIPO, JPO, KIPRIS, CNIPA 6개 특허청 통합 검색 |
| **화학물질 DB** | 용어 사전 및 자동완성 기능 |

---

## 🛠️ 기술 스택

| 구분 | 기술 |
|------|------|
| **Backend** | Python 3.11 + FastAPI |
| **Frontend** | Next.js 16 + TypeScript + Tailwind CSS |
| **Database** | SQLite (140GB 특허 인덱스) |
| **Indexing** | Aho-Corasick 알고리즘 + Multiprocessing |
| **Hardware** | Ryzen 5900X (12C/24T) + 64GB RAM |

---

## 📊 현재 진행 상황

### ✅ 완료된 작업

- [x] **Backend API 개발**
  - `/api/chemicals` - 화학물질 검색
  - `/api/chemicals/{chem_id}` - MSDS 상세 조회
  - `/api/global/patents/{chem_id}` - 글로벌 특허 검색
  
- [x] **글로벌 특허 인덱스 구축**
  - 6개 특허청 데이터 통합 (1.6TB → 140GB 인덱스)
  - Aho-Corasick 다중 패턴 검색 적용
  
- [x] **Frontend 기본 구현**
  - 화학물질 검색 UI
  - MSDS 상세 페이지
  - 특허 결과 표시

- [x] **문서화**
  - DATABASE_SETUP.md (DB 구조 설명)
  - OPERATIONS_GUIDE.md (운영/배포 가이드)
  - PRD_HIGH_PERFORMANCE_PROCESSING.md (고성능 처리 표준)

---

## 📝 TODO List

### 🔴 High Priority

- [ ] **서버 배포**
  - 미니PC 또는 NAS에 백엔드 상시 운영 설정
  - 포트포워딩 + DDNS 설정 (외부 접속용)
  
- [ ] **140GB DB 공유 체계**
  - Google Drive (5TB)에 업로드
  - 다운로드 링크 및 설치 가이드 작성

- [ ] **requirements.txt 보완**
  - 누락된 패키지 추가 (ahocorasick 등)

### 🟡 Medium Priority

- [ ] **검색 성능 최적화**
  - FTS5 (Full-Text Search) 적용 검토
  - 캐싱 레이어 추가

- [ ] **UI/UX 개선**
  - 검색 결과 페이지네이션
  - 특허 상세 보기 모달
  - 모바일 반응형 개선

- [ ] **API 문서화**
  - Swagger 자동 생성 활용 (/docs)
  - 사용 예시 추가

### 🟢 Low Priority

- [ ] **클라우드 DB 마이그레이션 검토**
  - SQLite → PostgreSQL 전환 가능성 검토
  - 비용 대비 효과 분석

- [ ] **모니터링 시스템**
  - API 응답 시간 로깅
  - 에러 알림 설정

---

## 📁 프로젝트 구조

```
MSDS/
├── backend/                    # FastAPI 백엔드
│   ├── api/                    # API 어댑터들
│   │   ├── kosha_msds_adapter.py
│   │   ├── global_patent_adapter.py
│   │   ├── uspto_adapter.py
│   │   └── kipris_adapter.py
│   ├── core/                   # 핵심 로직
│   └── main.py                 # FastAPI 앱
│
├── frontend/                   # Next.js 프론트엔드
│   ├── app/                    # 페이지
│   └── components/             # 컴포넌트
│
├── scripts/                    # 유틸리티 스크립트
│   ├── build_global_index.py   # 140GB 인덱스 생성
│   └── verify_global_index.py  # 인덱스 검증
│
├── data/                       # 데이터 (Git 제외)
│   └── global_patent_index.db  # 140GB
│
└── docs/                       # 문서
    ├── DATABASE_SETUP.md
    ├── OPERATIONS_GUIDE.md
    └── PRD_HIGH_PERFORMANCE_PROCESSING.md
```

---

## 🔗 접속 정보 (로컬 개발)

| 서비스 | URL |
|--------|-----|
| Frontend | <http://localhost:3000> |
| Backend API | <http://localhost:8000> |
| API Docs | <http://localhost:8000/docs> |

---

## 📌 참고 사항

- **140GB DB 파일**은 Git에 포함되지 않음 (`.gitignore` 설정)
- 새 환경에서는 DB 파일을 별도로 다운로드하거나 `build_global_index.py`로 생성 필요 (24-48시간 소요)
- API 키 (`.env`)는 별도 공유 필요
