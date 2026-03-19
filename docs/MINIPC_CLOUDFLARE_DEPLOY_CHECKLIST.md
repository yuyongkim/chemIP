# Mini PC + Cloudflare 배포 체크리스트 (2026-03-02)

## 1) 가능 여부

가능합니다.  
현재 구조(FastAPI + Next.js + SQLite + 로컬 데이터셋)는 Mini PC에서 구동 후 Cloudflare Tunnel로 외부 공개하는 방식에 적합합니다.

## 2) 현재 코드 기준 점검 결과

### 통과 항목
- 서비스 실행 스크립트 존재
  - `start_all.bat`, `start_all.sh`, `stop_all.bat`, `stop_all.sh`
  - `ecosystem.config.js` (PM2 기반)
- 품질 점검 통과
  - `submit_check.bat` 실행 기준:
    - `pytest` 17 passed
    - `scripts/test_kipris_live.py` PASS
    - `frontend npm run lint` PASS
    - `frontend npm run build` PASS
- 필수 환경변수 존재(`.env` 기준)
  - `KOSHA_SERVICE_KEY_DECODED`
  - `KIPRIS_API_KEY`
  - `KOTRA_API_KEY_DECODED`
  - `DRUG_API_KEY_DECODED`
  - `BACKEND_ORIGIN`
  - `KOSHA_GUIDE_DATA_DIR`
- 데이터 파일 확인
  - `data/terminology.db` 약 0.05 GB
  - `data/uspto_index.db` 약 5.84 GB
  - `data/global_patent_index.db` 약 134.52 GB
  - 총 핵심 DB 약 140.41 GB
- KOSHA Guide 데이터셋 확인
  - `.env`의 `KOSHA_GUIDE_DATA_DIR` 경로에서 `guides.json`, `normalized/guide_documents_text.json` 확인됨

### 보완 필요 항목
- `cloudflared` 미설치
- 전역 `pm2` 미설치(현재는 `npx pm2` 폴백으로 동작)
- Mini PC 저장공간은 최소 250 GB 이상 권장 (DB + 로그 + 여유)

## 3) 권장 진행 순서 (질문하신 3~4번 반영)

1. 모듈화
2. 테스트/빌드 통과
3. 배포 패키지 준비(코드 + DB + 가이드 데이터 + .env)
4. Mini PC 복사/실행
5. Cloudflare Tunnel 연결

## 4) 모듈화 우선 대상 (현재 긴 파일)

### Backend
- `backend/core/terminology_db.py` (509 lines)
- `backend/api/kotra_adapter.py` (373 lines)

### Frontend
- `frontend/components/PatentDetailModal.tsx` (310 lines)
- `frontend/components/PatentViewer.tsx` (282 lines)
- `frontend/components/MarketNewsSection.tsx` (274 lines)
- `frontend/app/trade/page.tsx` (272 lines)

## 5) Mini PC 사전 준비물

- OS: Windows 11 / Ubuntu 중 1개
- Python 3.11+ (현재 로컬은 3.13.7)
- Node.js 20+ (현재 로컬은 22.14.0)
- npm
- Git
- `cloudflared`
- (선택) `pm2` 전역 설치 또는 `npx pm2` 사용

## 6) 배포 패키지 구성

필수 복사 대상:
- `backend/`
- `frontend/`
- `scripts/`
- `data/terminology.db`
- `data/uspto_index.db`
- `data/global_patent_index.db`
- KOSHA Guide 데이터 디렉토리 전체(`guides.json`, `normalized/` 포함)
- `.env` (키 포함, 외부 유출 금지)
- `requirements.txt`
- `start_all.bat`, `start_all.sh`, `ecosystem.config.js`

## 7) Mini PC에서 실행

### Backend/Frontend 설치
```bash
pip install -r requirements.txt
cd frontend
npm install
```

### 서비스 시작
```bash
# Windows
start_all.bat

# Linux/macOS
bash start_all.sh
```

## 8) Cloudflare 연결 (간단 공개)

### 임시 공개(빠른 테스트)
```bash
cloudflared tunnel --url http://127.0.0.1:7000
```

### 운영 공개(고정 도메인)
1. `cloudflared login`
2. `cloudflared tunnel create chemip-mini`
3. DNS route 연결
4. `cloudflared tunnel run chemip-mini`

## 9) 운영 체크 포인트

- `http://127.0.0.1:7010/health` 정상
- `http://127.0.0.1:7000` 정상
- `http://127.0.0.1:7000/chemical/001008`에서 KOSHA Guides 탭 노출/조회 정상
- 외부 URL(Cloudflare)에서 홈/검색/API rewrite 정상
- 로그 디렉토리 용량 모니터링(`./logs`)

