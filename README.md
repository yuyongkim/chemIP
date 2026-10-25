# ChemIP — 중소기업 화학물질 규제·인허가 통합 조회

물질 이름이나 CAS 번호 하나를 넣으면 MSDS, 국내 법령별 지정 목록, 인허가·신고, 수출입 의무, 상대국 규제, HS 품목번호를
한 화면에 모아 보여 주고 체크리스트(인쇄·PDF·CSV)로 뽑아 주는 무료 오픈소스 서비스입니다.
규제 담당 인력이 따로 없는 중소기업 실무자를 위해 만들었습니다.

- 서비스: https://chemip.yule.pics/chemip/ (무료, 회원가입 없음)
- 라이선스: AGPL-3.0 (`LICENSE`)
- 의견·자료 오류 신고: 서비스 안 **요청 게시판**
- 법적 자문이 아닙니다. 모든 항목에 근거 조문·원문 링크를 붙였으니 최종 판단은 원문과 관할 기관에서 확인하십시오.

> 문서 기준: 2026-10-25. 이전 README는 `docs/_legacy_README_2026-03-15.md`.

## 무엇을 알려 주나요

| 항목 | 내용 | 근거 자료 |
|---|---|---|
| MSDS 16개 항목 | 유해성, 응급조치, 취급·저장, 보호구, 법적 규제 현황 | 안전보건공단 MSDS OpenAPI(공공데이터포털) |
| 국내 법령별 지정 목록 | 23개 법령 52개 목록(10,094항목): 화학물질관리법·화평법·산업안전보건법·대기·수질·토양·폐기물·악취·PRTR·위험물·고압가스·중대재해·생활화학제품·화장품·농약·RoHS·어린이제품·선박 위험물 등 | law.go.kr 현행 법령·고시 원문 |
| 인허가·신고 56건 | 배출시설 설치허가, 유해화학물질 영업허가, 공정안전보고서, 작업환경측정 등 — 조건·담당 기관·조문 원문 발췌 | 같은 법령 원문 |
| 실제 통합허가 사례 | 이 물질 배출기준이 설정된 사업장 수·기준 분포, 통합허가 처리기간(중앙값 46일) | 통합환경허가 검토결과서(IEPS), CleanSYS |
| 수출입 의무 19건 | 수입신고·허가, 수출승인, 세관장확인 대상 여부 | 화학물질관리법·화평법·잔류성오염물질법·오존층보호법, 관세청 고시 |
| 통제 목록 | 화학무기금지협약(CWC) 1~3종, 호주그룹 전략물자(1C350), 마약류 원료물질 | OPCW, 전략물자수출입고시, INCB·마약류관리법 |
| 상대국 규제 51개 목록 | EU·미국·중국·일본·캐나다·영국·스위스·호주·대만·튀르키예·사우디·싱가포르 | 각국 공식 목록(ECHA CHEM, EPA, MEE, METI, ECCC, HSE 등) |
| HS 품목번호 | CAS 104,087개 → HS6, 관세청 HSK10 후보 | EU ECICS, 관세청 |
| 그 밖 | 국내 취급 사업장(PRTR), 국내외 사고 사례, 미국 EPA 집행 사건, 특허(KIPRIS 링크), 안전 가이드 | 각 연동 자료 |

수량 조건(연간 몇 톤 이상 등)은 판정하지 않고 문구로 보여 줍니다. 목록 등재 여부와 근거를 확인하는 도구입니다.

## 화면

| 화면 | 내용 |
|---|---|
| 처음 화면 | 무엇을 해 주는지, 사용 방법, 무료·오픈소스 안내, 면책 |
| 물질 검색 → 물질 상세 | MSDS 탭 바로 옆 **규제·인허가 / 수출입** 탭: 요약 카드, 법령별 목록, 인허가 이름 목록(펼치면 조문·원문), 수입/수출·상대국 선택, 체크리스트 |
| 요청 게시판 | 기능 요청·자료 오류·물질 추가. 운영자 관리자 모드(토큰)로 상태·답변 처리 |
| 자료 출처 | 출처별 이용 조건과 표시 문구 |
| 연구·개발 | 논문·벤치마크 등 개발자용 화면 |

실제 화면 코드는 빌드 없는 React(`frontend/public/chemip/*.jsx`)이고, 파일별 역할은 `frontend/public/chemip/README.md` 에 있습니다.

## 구조

```
브라우저 → Cloudflare Tunnel → Next(127.0.0.1:7000, /chemip 정적 화면 + /api 중계) → FastAPI(127.0.0.1:7011)
```

| 위치 | 맡는 일 | 문서 |
|---|---|---|
| `backend/api/routes/` | API 라우트(`/api/chemicals`, `/api/regulations`, `/api/integrations`, `/api/feedback`, `/api/usage` …) | — |
| `backend/core/trade_controls/` | 물질별 규제·인허가·수출입 조립 | `README.md` |
| `backend/integrations/` | 형제 프로젝트 자료 연동(사고 사례·법령 조문·EPA 집행·통합허가 사례) | `README.md` |
| `backend/feedback/`, `backend/usage/` | 요청 게시판, 익명 이용 집계(IP·브라우저 정보 미저장) | 각 `__init__.py` |
| `scripts/trade_controls/` | 법령·목록 수집기(국내 환경·안전·제품, 통제 목록, HS, 상대국) | 하위 폴더 `README.md` |
| `frontend/public/chemip/` | 실제 화면 | `README.md` |
| `deploy/linux/` | 클라우드 VM 이전 키트(설치·업로드·systemd·터널·점검) | `README.md` |
| `scripts/search_bench/` | 특허 전문 검색 방식 비교 실험 | `README.md` |
| `docs/public_release/` | 이용 조건 점검, 공개 절차 초안 | — |

수집 자료(`backend/data/trade_controls/`, `data/*.db`)는 용량·이용 조건 때문에 저장소에 넣지 않습니다. 수집기로 다시 만듭니다.

## 실행

### 1) 설치

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt   # Linux: .venv/bin/pip
cd frontend && npm ci
```

### 2) 환경변수

`.env.example` 을 `.env` 로 복사하고 키를 채웁니다. 주요 항목:

| 변수 | 용도 |
|---|---|
| `KOSHA_SERVICE_KEY_DECODED` | 공공데이터포털 MSDS·NCIS 등 |
| `KOSHA_MSDS_ROUTES` | MSDS 호출 경로 순서(`datagokr` 만 두면 이용 조건이 확인된 경로만 사용) |
| `KIPRIS_API_KEY`, `KIPRIS_PUBLIC_DISPLAY`, `KIPRIS_IN_AI` | KIPRIS. 한국특허정보원 서면 허락 전에는 `KIPRIS_PUBLIC_DISPLAY=false`(링크만 표시) |
| `KOTRA_API_KEY_DECODED`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | 무역 동향(네이버 결과는 따로 표시, AI 입력 제외) |
| `CHEMIP_ADMIN_TOKEN` | 요청 게시판 관리자 모드 |
| `RATE_LIMIT_*` | 접속 주소별 요청 제한(Cloudflare 경유 시 `CF-Connecting-IP` 기준) |
| `BACKEND_ORIGIN` | 프론트가 /api 를 넘길 백엔드(기본 `http://127.0.0.1:7011`) |

### 3) 실행

```bash
uvicorn backend.main:app --host 127.0.0.1 --port 7011
cd frontend && npm run dev          # http://localhost:7000/chemip/
```

PM2 통합 실행(운영 방식): `start_all.bat` / `bash start_all.sh`. 시작 뒤 `scripts/check_runtime_health.py` 가
로컬과 공개 도메인을 함께 점검합니다(`python scripts/check_runtime_health.py --wait-seconds 60`).

### 4) 수집 자료 만들기

```bash
python -I scripts/trade_controls/kr_env/run_all.py              # 국내 환경 법령
python -I scripts/trade_controls/kr_safety/run.py build          # 국내 안전 법령(fetch 먼저)
python -I scripts/trade_controls/kr_product/build_all.py         # 국내 제품·운송 법령
python -m scripts.trade_controls.build_kr_rules                  # 수출입 의무 규칙
python -I scripts/trade_controls/collect_controlled_lists.py     # CWC·호주그룹·마약류 원료물질
python -I scripts/trade_controls/collect_hs_codes.py             # HS 코드
python -I scripts/trade_controls/collect_intl_lists.py           # 상대국 목록
python scripts/build_kr_permit_context.py                        # 통합허가 사례(Environment 자료 필요)
```

각 수집기는 원문 건수와 대조하고 CAS 체크디지트를 검사합니다. 확정하지 못한 항목은 따로 분리합니다.

### 5) 클라우드로 옮기기

`deploy/linux/README.md` 순서대로 하면 Ubuntu VM(ARM64·x86_64)에 약 40분이면 옮겨집니다. 서버에는 약 2.6 GB가 올라가고,
대용량 특허 색인(140 GB)은 제외됩니다(특허 탭은 KIPRIS 링크로 동작).

## 검증

```bash
.venv/Scripts/python -m pytest tests -q     # 119건
```

화면 QA는 Playwright로 물질 11종 × 1440/390px × 밝게/어둡게를 돌려 콘솔 오류·글자 깨짐·가로 넘침을 확인합니다.

## 자료 이용 조건

출처별 이용 조건은 서비스의 **자료 출처** 화면과 `docs/public_release/compliance_v1.md` 에 정리했습니다. 요약:

- 공공데이터포털 MSDS·NCIS·KISChem: 이용허락범위 제한 없음 → 출처 표시
- KOTRA 해외시장뉴스·수입규제: 공공누리 4유형 → 원문 그대로만, 요약·번역 금지
- KIPRIS Plus: 검색 결과 제3자 제공·가공에 서면 허락 필요 → 허락 전 링크만 표시
- 네이버 검색: "네이버 검색결과"로 따로 표시, 저장·AI 입력 금지
- ECHA: 데이터베이스 대량 복제에 사전 허락 필요 → 대안 검토 중

## 기여

요청은 서비스의 요청 게시판이나 GitHub 이슈로 받습니다. 코드 규칙은 `CLAUDE.md`(한 파일 한 책임, 값은 한 곳에서만 정의, 문구는 데이터 파일로)와 `CONTRIBUTING.md` 를 따릅니다.

## 관련 문서

- `docs/RUNBOOK.md` — 운영
- `PORT_REGISTRY.md` — 포트
- `deploy/linux/README.md` — 클라우드 이전
- `docs/public_release/` — 공개 절차·이용 조건
- `README.en.md` — English
