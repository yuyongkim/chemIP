# DATA_STRUCTURE.md

이 문서는 ChemIP(MSDS) 프로젝트의 데이터를 **Git 포함 / 로컬 전용 / 외장하드 필수**로 분리하여, 6개월 후에도 5분 내 재실행 가능하도록 정리한 기준입니다.

기준일: 2026-02-21 (정적 스캔)

## 1) 3단계 데이터 분류

| 분류 | 기준 | 현재 파일/경로 | 용도 | Git 포함 여부 |
| --- | --- | --- | --- | --- |
| Git 포함 데이터 | < 10MB, 재생성 가능 샘플/문서 | `data/uspto_index_sample.csv` (~0.02MB), `docs/`, `scripts/` | 샘플 검증, 문서화 | 포함 가능 |
| 로컬 전용 데이터 | 10MB ~ 1GB, 개발/복구용 | `data/terminology.db` (~52.62MB), `data/terminology.db.corrupted` (~303.07MB), `data/terminology_bak.db` (~3.97MB), `data/terminology_backup.db` (~3.97MB), `data/terminology_backup_matched.db` (~2.74MB) | 검색 캐시, 복구 작업 | 기본 제외 권장 |
| 외장하드 필수 데이터 | > 1GB, 재다운로드/재생성 비용 큼 | `data/global_patent_index.db` (~134.52GB), `data/uspto_index.db` (~5.84GB), 원본 특허 코퍼스 `S:\특허 논문 DB\downloaded_patents` (문서 기준 약 1.6TB, 추정) | 글로벌/USPTO 특허 검색 | Git 제외 필수 |

## 2) 현재 데이터 요약

- `data/` 전체: 약 **140.72GB**
- 100MB 이상 대용량 파일:
  - `data/global_patent_index.db`
  - `data/uspto_index.db`
  - `data/terminology.db.corrupted`

## 3) 경로 표준화 (상대경로 우선)

### 권장 상대경로

- 애플리케이션 기본 DB 경로
  - `./data/terminology.db`
  - `./data/global_patent_index.db`
  - `./data/uspto_index.db`
- 로그 경로
  - `./logs/`

### 외장/절대경로 예시 (참고)

- 원본 특허 데이터: `S:\특허 논문 DB\downloaded_patents`
- 로컬 작업 루트: `G:\MSDS`

> 절대경로는 문서 예시로만 유지하고, 실행 코드는 환경 변수 우선으로 참조해야 합니다.

## 4) 환경 변수로 경로 관리

`.env` 또는 시스템 환경 변수에 아래를 정의합니다.

```bash
# 데이터 경로
TERMINOLOGY_DB_PATH=./data/terminology.db
GLOBAL_PATENT_INDEX_DB_PATH=./data/global_patent_index.db
USPTO_INDEX_DB_PATH=./data/uspto_index.db

# 원본 대용량 코퍼스(외장/네트워크 드라이브)
PATENT_SOURCE_DIR=S:\특허 논문 DB\downloaded_patents

# 로그
LOG_DIR=./logs
```

### 하드코딩 경로 탐지 결과 (수정 대상)

- `scripts/build_global_index.py`: `S:\특허 논문 DB\downloaded_patents`
- `scripts/build_uspto_index.py`: `S:\특허 논문 DB\downloaded_patents`
- `scripts/recover_db.py`: `G:\MSDS\data\...`
- `frontend/app/guide/page.tsx`: `C:\Users\USER\Desktop\MSDS` (문서용 문자열)

## 5) 다른 PC로 이전 시 체크리스트

- [ ] 프로젝트 코드 클론 후 `pip install -r requirements.txt`, `npm install` 완료
- [ ] `data/` 최소 파일 존재 확인: `terminology.db`
- [ ] 대용량 검색 필요 시 `global_patent_index.db`, `uspto_index.db`를 외장/백업에서 복원
- [ ] `PATENT_SOURCE_DIR`를 새 PC의 실제 드라이브 경로로 재설정
- [ ] `.env`에 API 키 + 경로 변수 설정
- [ ] `logs/` 폴더 생성 확인
- [ ] `uvicorn backend.main:app --reload` + `cd frontend && npm run dev` 정상 실행 확인

## 6) 운영 권고

- 외장하드 미연결 상태에서도 앱이 기동되도록, 대용량 DB 미존재 시 명확한 에러 메시지 반환
- `scripts/`의 절대경로를 단계적으로 환경변수 기반으로 전환
- 대용량 인덱스 재생성 전, 원본 코퍼스 경로 접근권한/여유 디스크를 사전 점검
