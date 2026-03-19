# PORT_REGISTRY.md

기준일: 2026-02-21
관리 루트: `g:/MSDS` (감지 대상: `g:/MSDS`, `g:/food`)

## 1. 포트 할당 표준

| 트랙 | 범위 | Frontend 규칙 | Backend 규칙 | 비고 |
| --- | --- | --- | --- | --- |
| 트랙1 (데이터) | 5000-5099 | 5000-5009 | 5010-5019 | Streamlit/FastAPI 등 데이터 앱 |
| 트랙2 (법규) | 6000-6099 | 6000-6009 | 6010-6019 | 법규/컴플라이언스 |
| 트랙3 (B2B SaaS) | 7000-7099 | 7000-7009 | 7010-7019 | Chem/Drug/B2B |
| 트랙4 (B2C) | 8000-8099 | 8000-8009 | 8010-8019 | Consumer 앱 |
| 시스템 관리 | 9000-9099 | 9000 | - | 대시보드/운영 도구 |

## 2. 감지된 프로젝트 및 할당 결과

| 프로젝트 | 경로 | 트랙 | Frontend | Backend | Docs | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| ChemIP Platform | `g:/MSDS` | 트랙3 | `7000` | `7010` | `7010/docs` | 적용 완료 |
| Soul's Kitchen (`food`) | `g:/food` | 트랙4 | `8002` | `8010` | `8010/docs` | 적용 완료 |
| Localhost Hub | `g:/MSDS` | 시스템 | `9000` | - | - | 적용 완료 |

## 3. 예약 슬롯 (미감지 프로젝트)

| 프로젝트(예정) | 트랙 | 권장 포트 |
| --- | --- | --- |
| Economic Indicator | 트랙1 | FE/대시보드 `5000`, BE `5010` |
| Qwen-soul(법규) | 트랙2 | FE `6000`, BE `6010` |
| Drug Aggregator | 트랙3 | FE `7001`, BE `7011` |
| IndieArchive | 트랙4 | FE `8000`, BE `8010`(중복 시 `8012`) |
| Soul Yule Art | 트랙4 | FE `8001`, BE `8011` |

## 4. 런타임 충돌 점검 메모

2026-02-21 스캔 시 5000-9099 범위에서 다음 비관리 포트가 LISTEN 상태였습니다.

- `5033`, `5040`, `5055`, `5056`, `5057`, `5357`, `5543`, `5624`, `5625`, `5626`, `7679`, `9012`, `9013`

이 목록은 `dashboard.html`에서 실시간 경고로도 확인할 수 있습니다.

## 5. 크래시 3대 패턴 진단 요약

### ChemIP (`g:/MSDS`)

- 메모리 폭발: `pandas.read_csv` 패턴 미검출
- API 타임아웃: 대부분 `timeout` 적용, `scripts/download_ghs.py`는 개선 필요
- 무한 루프: `while True` 탈출 조건 확인됨, React `useEffect` 주요 루프 미검출

### Soul's Kitchen (`g:/food`)

- 메모리 폭발: `read_csv` 패턴 미검출
- API 타임아웃: 일부 스크립트(`scripts/test_endpoints.py`, `scripts/verify_new_key.py`)에서 `timeout` 미지정
- 무한 루프: 주요 `useEffect` 존재, 직접 자기 증폭 루프는 정적 스캔에서 미확인

## 6. 외장/대용량 데이터 의존성

### ChemIP

- 대용량 DB: `data/global_patent_index.db` (~134.5GB), `data/uspto_index.db` (~5.8GB)
- 외부 코퍼스 경로(문서 기준): `S:\특허 논문 DB\downloaded_patents`

### Soul's Kitchen

- `g:/food/data` 내 대용량 업스케일 이미지 다수(100MB+)
- 예시: `g:/food/data/images_upscale/.../*.png` (최대 약 476MB/파일)

## 7. 운영 명령어

```bash
# 전체 시작
pm2 start ecosystem.config.js

# 전체 상태
pm2 status
python dashboard_server.py  # 단독 대시보드 실행

# 전체 중지
pm2 stop all
```

## 8. 생성/갱신 파일

- `ecosystem.config.js`
- `dashboard_server.py`
- `dashboard.html`
- `start_all.bat`, `stop_all.bat`, `status.bat`
- `start_all.sh`, `stop_all.sh`, `status.sh`
- `README.md` (MSDS 포트 정보 반영)
- `frontend/package.json`, `frontend/next.config.ts`, `.env.example`
