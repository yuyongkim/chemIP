# ChemIP Platform
# MSDS OpenAPI 활용사례 제출서

## 문서 정보

| 항목 | 내용 |
| --- | --- |
| 문서명 | ChemIP Platform MSDS OpenAPI 활용사례 제출서 |
| 제출처 | MSDS OpenAPI 운영기관(담당 부서) |
| 작성일 | 2026-02-22 |
| 버전 | v1.1 |
| 제출자 | [기관/팀/이름 입력] |

## 1. 제출 목적 및 개발 배경

본 문서는 MSDS OpenAPI를 실제 업무형 서비스에 연계한 활용사례를 제출하기 위한 자료다.  
단순 API 호출 데모가 아니라, 실제 사용 흐름에서 어떤 문제를 해결하려고 개발했는지와 현재 동작 수준을 함께 제시한다.

### 1.1 개발 착수 배경

화학물질 관련 문의를 처리할 때 안전정보(MSDS), 특허, 시장, 의약품 정보를 각각 다른 시스템에서 확인해야 하는 문제가 있었다.  
이 과정에서 다음과 같은 비효율이 반복되었다.

1. 동일 물질을 여러 사이트에서 중복 검색
2. 조회 결과를 수기로 재정리
3. 담당자별 조사 범위 편차로 인한 누락 위험

### 1.2 기존 업무 한계(문제 인식)

1. 조회 채널 분산: 안전, 특허, 시장 정보를 각각 별도 접근
2. 처리 지연: 건별 조사 시간이 길고 반복 업무 비중이 큼
3. 결과 일관성 부족: 담당자 숙련도에 따라 품질 편차 발생
4. 후속 검토 지연: MSDS 확인 후 특허/시장 검토가 끊겨 수행됨

### 1.3 왜 이 서비스를 개발했는가

ChemIP Platform은 위 한계를 해결하기 위해 개발했다. 핵심 의도는 다음과 같다.

1. MSDS를 중심으로 한 통합 조회 창구 제공
2. 초기 검토 시간을 줄여 담당자의 본질 업무(판단/검토)에 집중
3. 안전정보 확인 이후 특허/시장 검토까지 같은 흐름으로 연결

### 1.4 이전에 정의된 활용 요구사항(반영 내용)

이 문서의 활용 시나리오는 사전에 정리된 실제 사용 맥락을 기반으로 작성했다.

1. 신규 원료 도입 전 사전 안전성 검토
2. 수출 대상국 진입 전 규제 + 특허 동시 검토
3. 의약품 성분 기반 교차 조사

### 1.5 주요 용어 해설(비전문가용)

| 용어 | 쉬운 설명 | 본 서비스에서의 의미 |
| --- | --- | --- |
| API | 다른 시스템의 데이터를 프로그램으로 조회하는 방식 | KOSHA/KIPRIS/KOTRA/식약처 데이터를 자동 조회 |
| MSDS | 화학물질 안전정보 문서 | 안전성 검토의 기준 데이터 |
| KIPRIS | 국내 특허 정보 서비스 | 특허 검색/상세 조회 데이터 소스 |
| 통합 조회 | 여러 출처를 한 화면에서 확인 | 검색 1회로 연관 정보 탐색 시작 |
| 검증 스크립트 | 제출 전 동작 점검 자동화 도구 | 테스트/실연동/빌드 상태를 일괄 확인 |

## 2. 서비스 개요

ChemIP Platform은 화학물질 안전보건(MSDS) 정보를 중심으로 다음 정보를 통합 조회하는 웹 서비스다.

1. 화학물질/MSDS
2. 특허(KIPRIS)
3. 무역/시장 정보
4. 의약품 정보

사용자는 화학물질 검색 후 MSDS 상세를 확인하고, 같은 맥락에서 관련 특허/시장/의약품 정보를 추가 탐색할 수 있다.

## 3. 업무 프로세스 변화(As-Is vs To-Be)

### 3.1 기존 방식(As-Is)

1. 문의 접수 후 안전정보/특허/시장 사이트를 개별 접속
2. 각 결과를 수동 정리
3. 누락 항목 재조사 후 보고서 작성

### 3.2 ChemIP 활용 방식(To-Be)

1. 물질명 또는 CAS 1회 검색
2. MSDS 확인 후 특허/시장/의약품 연계 조회
3. 추가 검토가 필요한 항목만 심화 조사

### 3.3 기대 개선 효과(정성)

1. 반복 조회 작업 감소
2. 정보 누락 가능성 감소
3. 담당자 간 조사 절차 표준화

## 4. MSDS OpenAPI 활용 상세

### 4.1 핵심 활용 방식

1. 물질명/CAS 번호 기반 검색
2. 화학물질 상세 진입 후 MSDS 섹션 조회
3. 조회 결과를 안전성 검토 흐름에 바로 반영 가능하도록 UI 구성

### 4.2 API 활용 가치

1. 분산된 안전정보 접근 경로 단일화
2. 현장 검토 시 필요한 정보 탐색 시간 단축
3. 후속 의사결정(특허/시장 검토)으로 자연스럽게 연결

## 5. 실제 활용 시나리오

### 5.1 신규 원료 도입 전 사전 검토

1. 담당자가 물질 검색 후 MSDS 주요 섹션 확인
2. 취급/보관/보호구 관련 항목 점검
3. 작업 절차(SOP) 업데이트 근거로 활용

### 5.2 해외 진출 사전 검토

1. MSDS 기반 위험/분류 확인
2. 무역/시장 정보 조회로 국가별 이슈 확인
3. 특허 검색으로 분쟁 가능성 사전 점검

### 5.3 의약품 성분 교차 확인

1. 의약품 검색 후 허가/e약은요 확인
2. 연관 특허/시장 데이터 추가 조회
3. 성분 중심의 종합 검토에 활용

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
| 의약품 | `docs/screenshots/05_drugs_search.png` | 허가/e약은요 통합 조회 |
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

1. OpenAPI 활용 사례의 구체성 확보: 실제 서비스 흐름과 결과 화면 제시
2. 확장성 확인: MSDS 데이터를 중심으로 타 공공정보와 연계 가능성 입증
3. 재현성 확보: 자동 검증 스크립트와 캡처 스크립트 제공
4. 민원/문의 대응 효율 개선을 위한 참고 사례 제공

## 10. 부록: 재현 절차

1. 필수 검증 실행

```bash
.\.venv\Scripts\python.exe scripts\verify_submission.py
```

2. 증빙 스크린샷 재생성

```bash
.\.venv\Scripts\python.exe scripts\capture_submission_screenshots.py
```

3. 문서 변환(TXT/RTF/DOCX)

```bash
.\.venv\Scripts\python.exe scripts\export_submission_report.py
```

4. 결과 확인

- `docs/SUBMISSION_REPORT.md`
- `docs/SUBMISSION_REPORT.txt`
- `docs/SUBMISSION_REPORT.rtf`
- `docs/SUBMISSION_REPORT.docx`
- `docs/screenshots/`
