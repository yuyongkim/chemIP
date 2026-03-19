# ChemIP Platform
# MSDS OpenAPI 활용사례 제출서

## 문서 정보

| 항목 | 내용 |
| --- | --- |
| 문서명 | ChemIP Platform MSDS OpenAPI 활용사례 제출서 |
| 제출처 | MSDS OpenAPI 운영기관(담당 부서) |
| 작성일 | 2026-02-22 |
| 버전 | v1.2 (working draft) |
| 제출자 | [기관/팀/이름 입력] |

## 1. 제출 목적 및 개발 배경

본 문서는 MSDS OpenAPI를 실제 업무형 서비스에 연계한 활용사례 제출용 문서임.  
단순 API 호출 데모가 아니라, 왜 개발했는지/무엇이 개선됐는지/현재 동작 수준이 어떤지 같이 제시하는 목적임.

### 1.1 개발 착수 배경

화학물질 문의 처리 시 안전정보(MSDS), 특허, 시장, 의약품 정보를 각각 다른 시스템에서 조회해야 했음.  
실무에서 아래 비효율이 반복됐음.

1. 동일 물질을 여러 사이트에서 중복 검색함
2. 조회 결과를 수기로 재정리함
3. 담당자별 조사 범위 편차로 누락 위험 생김

### 1.2 기존 업무 한계(문제 인식)

1. 조회 채널 분산: 안전/특허/시장 정보를 각각 따로 접속해야 했음
2. 처리 지연: 건별 조사 시간이 길고 반복 업무 비중이 컸음
3. 결과 일관성 부족: 담당자 숙련도에 따라 품질 편차 발생했음
4. 후속 검토 단절: MSDS 확인 후 특허/시장 검토가 끊겨 수행됐음

### 1.3 왜 이 서비스를 개발했는가

ChemIP Platform 개발 목적은 아래 3가지였음.

1. MSDS 중심 통합 조회 창구 제공
2. 초기 조사 시간을 줄여 담당자가 판단/검토 업무에 집중하도록 전환
3. 안전정보 확인 이후 특허/시장 검토까지 한 흐름으로 연결

### 1.4 기존에 제시했던 활용 요구사항 반영 여부

이 문서는 사전에 정리된 실제 활용 맥락 기준으로 작성했음.

1. 신규 원료 도입 전 사전 안전성 검토
2. 수출 대상국 진입 전 규제 + 특허 동시 검토
3. 의약품 성분 기반 교차 조사

### 1.5 주요 용어 해설(비전문가용)

| 용어 | 쉬운 설명 | 본 서비스에서의 의미 |
| --- | --- | --- |
| API | 다른 시스템 데이터를 프로그램으로 조회하는 방식 | KOSHA/KIPRIS/KOTRA/식약처 데이터 자동 조회 |
| MSDS | 화학물질 안전정보 문서 | 안전성 검토의 기준 데이터 |
| KIPRIS | 국내 특허 정보 서비스 | 특허 검색/상세 조회 데이터 소스 |
| 통합 조회 | 여러 출처를 한 화면에서 확인 | 검색 1회로 연관 정보 탐색 시작 |
| 검증 스크립트 | 제출 전 동작 점검 자동화 도구 | 테스트/실연동/빌드 상태 일괄 확인 |

## 2. 서비스 개요

ChemIP Platform은 화학물질 안전보건(MSDS)을 중심으로 아래 정보를 통합 조회하는 웹 서비스임.

1. 화학물질/MSDS
2. 특허(KIPRIS)
3. 무역/시장 정보
4. 의약품 정보

사용자는 화학물질 검색 후 MSDS 상세 확인하고, 같은 맥락에서 특허/시장/의약품 정보를 추가 탐색 가능함.

## 3. 업무 프로세스 변화(As-Is vs To-Be)

### 3.1 기존 방식(As-Is)

1. 문의 접수 후 안전정보/특허/시장 사이트 개별 접속
2. 결과를 수동 정리
3. 누락 항목 재조사 후 보고서 작성

### 3.2 ChemIP 활용 방식(To-Be)

1. 물질명 또는 CAS 1회 검색
2. MSDS 확인 후 특허/시장/의약품 연계 조회
3. 추가 검토 필요 항목만 심화 조사

### 3.3 기대 개선 효과(정성)

1. 반복 조회 작업 감소
2. 정보 누락 가능성 감소
3. 담당자 간 조사 절차 표준화

### 3.4 처리시간 단축 추정치(파일럿 전)

아래 수치는 운영기관 공식 통계가 아니라 현재 워크플로우 기반 **사전 추정치**임.  
정식 수치는 파일럿 기간(예: 2~4주) 로그 기준으로 확정 예정임.

| 구분 | 기존 방식(추정) | ChemIP 활용(추정) | 비고 |
| --- | --- | --- | --- |
| 건당 기본 조회 시간 | 약 120분 | 약 30분 | 안전/특허/시장 분산 조회를 통합 조회로 전환 |
| 반복 입력/복사 정리 | 약 30분 | 약 5분 | 탭 기반 조회 + 화면 일원화 가정 |
| 총 소요시간(1건) | 약 150분 | 약 35분 | 약 76% 단축 추정 |
| 일 10건 처리 시 | 약 25시간 | 약 5.8시간 | 단순 환산 추정 |

추정 근거:

1. 동일 물질에 대한 다중 사이트 수동 조회 절차 제거
2. MSDS 확인 이후 특허/시장 연계 조회 단일 흐름화
3. 결과 정리 단계의 중복 입력 축소

검증 계획:

1. 파일럿 기간 중 검색 시작/종료 시각 로그 수집
2. 기존 방식 대비 건당 평균 처리시간 비교
3. 2주 단위 중간 리포트 작성 후 최종 확정치 반영

## 4. MSDS OpenAPI 활용 상세

### 4.1 핵심 활용 방식

1. 물질명/CAS 번호 기반 검색
2. 화학물질 상세 진입 후 MSDS 섹션 조회
3. 조회 결과를 안전성 검토 흐름에 바로 반영 가능한 UI 제공

### 4.2 API 활용 가치

1. 분산된 안전정보 접근 경로 단일화
2. 현장 검토 시 정보 탐색 시간 단축
3. 후속 의사결정(특허/시장 검토)으로 자연스럽게 연결

## 5. 실제 활용 시나리오

### 5.1 신규 원료 도입 전 사전 검토

1. 물질 검색 후 MSDS 주요 섹션 확인
2. 취급/보관/보호구 관련 항목 점검
3. 작업 절차(SOP) 업데이트 근거로 활용

### 5.2 해외 진출 사전 검토

1. MSDS 기반 위험/분류 확인
2. 무역/시장 정보 조회로 국가별 이슈 확인
3. 특허 검색으로 분쟁 가능성 사전 점검

### 5.3 의약품 성분 교차 확인

1. 의약품 검색 후 허가/e약은요 확인
2. 연관 특허/시장 데이터 추가 조회
3. 성분 중심 종합 검토에 활용

## 6. 연계 기능(확장 활용)

| 기능 영역 | 연계 내용 | 사용자 효익 |
| --- | --- | --- |
| 특허 | KIPRIS 검색/상세 | 기술/권리 이슈 사전 파악 |
| 무역/시장 | 국가/시장 정보 | 시장 진입 검토 속도 향상 |
| 의약품 | 허가 + e약은요 | 성분 관련 정보 교차 검토 |

## 7. 동작 검증 결과

### 7.1 필수 검증 명령

```bash
.\.venv\Scripts\python.exe scripts\verify_submission.py
```

대체 실행:

1. Windows: `submit_check.bat`
2. Linux/macOS: `bash submit_check.sh`

### 7.2 검증 항목

1. `pytest` (백엔드 API 스모크 테스트)
2. `scripts/test_kipris_live.py` (KIPRIS 실연동 테스트)
3. `npm run lint`
4. `npm run build`

### 7.3 최신 결과 (2026-02-22)

| 항목 | 결과 |
| --- | --- |
| Backend tests (`pytest`) | PASS (9 passed) |
| KIPRIS live integration | PASS |
| Frontend lint | PASS |
| Frontend build | PASS |

KIPRIS 실연동 확인 응답(예시):

1. 검색: `query=benzene`, `total=10`, `returned=5`
2. 상세: `applicationNumber=10-2015-0140961`

## 8. 화면 증빙

### 8.1 증빙 목록

| 구분 | 파일 | 확인 포인트 |
| --- | --- | --- |
| 홈 검색 | `docs/screenshots/01_home_search.png` | MSDS 중심 통합 검색 진입 |
| 화학물질 상세 | `docs/screenshots/02_chemical_detail_msds.png` | MSDS 상세 조회 화면 |
| 특허 검색 | `docs/screenshots/03_patents_search.png` | KIPRIS 연동 결과 화면 |
| 무역/시장 | `docs/screenshots/04_trade_search.png` | 시장/무역 정보 조회 화면 |
| 의약품 | `docs/screenshots/05_drugs_search.png` | 허가/e약은요 통합 조회 화면 |
| API 문서 | `docs/screenshots/06_api_docs.png` | API 문서 접근 확인 |

### 8.2 이미지 본문

#### 8.2.1 홈 검색
![홈 검색](screenshots/01_home_search.png)

#### 8.2.2 화학물질 상세
![화학물질 상세](screenshots/02_chemical_detail_msds.png)

#### 8.2.3 특허 검색
![특허 검색](screenshots/03_patents_search.png)

#### 8.2.4 무역/시장
![무역/시장](screenshots/04_trade_search.png)

#### 8.2.5 의약품 검색
![의약품 검색](screenshots/05_drugs_search.png)

#### 8.2.6 API 문서
![API 문서](screenshots/06_api_docs.png)

## 9. 운영기관 관점 기대효과

1. OpenAPI 활용 사례의 구체성 확보 가능함
2. MSDS 중심 타 공공정보 연계 가능성 입증됨
3. 자동 검증/캡처 스크립트로 재현성 확보됨
4. 민원/문의 대응 효율 개선 참고 사례로 활용 가능함

## 10. 제출 파일 정리 기준(중요)

문서가 많아 보이는 이유는 작업본/리비전/변환본이 같이 있기 때문임.  
실제 제출은 아래처럼 최소 세트만 내면 됨.

### 10.1 외부 제출용(권장)

1. `docs/submission_reports/SUBMISSION_REPORT_revN_YYYY-MM-DD.docx` 1개
2. `docs/screenshots/` 폴더(별첨 요청 시만)

### 10.2 내부 보관용(제출 제외 가능)

1. `docs/SUBMISSION_REPORT.md` (작업본)
2. `docs/submission_reports/*.md` (리비전 이력)
3. `docs/submission_reports/*.txt`, `*.rtf` (변환본)

### 10.3 이번 제출 권장 파일명 예시

1. 본문: `docs/submission_reports/SUBMISSION_REPORT_rev3_2026-02-22.docx`
2. 증빙: `docs/screenshots/`

## 11. 부록: 재현 절차

1. 필수 검증 실행

```bash
.\.venv\Scripts\python.exe scripts\verify_submission.py
```

2. 스크린샷 재생성

```bash
.\.venv\Scripts\python.exe scripts\capture_submission_screenshots.py
```

3. 리비전 생성

```bash
.\.venv\Scripts\python.exe scripts\create_submission_revision.py --note "변경 요약"
```

4. 문서 변환(TXT/RTF/DOCX)

```bash
.\.venv\Scripts\python.exe scripts\export_submission_report.py --input docs/submission_reports/SUBMISSION_REPORT_revN_YYYY-MM-DD.md
```
