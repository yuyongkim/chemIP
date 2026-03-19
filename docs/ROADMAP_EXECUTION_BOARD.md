# ChemIP Roadmap Execution Board

`docs/PRODUCT_ROADMAP.md`를 실제 실행 단위로 쪼갠 운영 문서입니다.

## 운영 원칙

- 우선순위는 `P0 -> P1 -> P2` 순서로 처리
- 모든 작업은 `완료조건(DoD)`를 만족해야 `완료`로 표시
- 백엔드/프론트/데이터/운영 작업은 병렬 진행 가능하되, 배포 게이트는 단일 파이프라인으로 통합
- 매 스프린트 종료 시 `submit_check.*` 결과를 기준으로 릴리즈 후보 판단

## 상태 정의

- `todo`: 아직 시작하지 않음
- `in_progress`: 진행 중
- `blocked`: 외부 의존(키/인프라/권한) 등으로 중단
- `done`: 완료조건 충족 및 검증 완료

## Sprint 1 (다음 2주) 권장 실행 백로그

| ID | 우선순위 | 영역 | 작업 | 담당(예시) | 공수 | 완료조건(DoD) | 상태 |
|---|---|---|---|---|---|---|---|
| RB-001 | P0 | Backend/AI | `/api/ai/analyze` mock 제거, 실LLM 호출 어댑터 추가 | BE | 3d | 스테이징에서 비-mock 응답, 타임아웃/에러 코드 표준화 | todo |
| RB-002 | P0 | Backend/AI | AI 응답 스키마에 `sources`, `confidence` 추가 | BE | 1d | 응답 스키마 문서/타입/테스트 반영 | todo |
| RB-003 | P0 | Backend | 외부 API 공통 캐시 계층 도입(KOTRA/KIPRIS/OpenFDA) | BE/Platform | 3d | 동일 요청 캐시 hit 확인, 캐시 미스/히트 로그 포함 | todo |
| RB-004 | P0 | Backend | 외부 API 에러 매핑 표준화(코드/메시지/원인) | BE | 2d | trade/patents/drugs 라우트에서 일관된 에러 형식 반환 | todo |
| RB-005 | P0 | QA | 어댑터 fallback/실패 시나리오 테스트 보강 | QA/BE | 2d | 주요 라우트 fallback 케이스 테스트 추가 및 통과 | todo |
| RB-006 | P1 | Observability | 구조화 로그 필드 표준 적용(request_id, route, latency, upstream) | Platform | 2d | 로그 샘플 검증 + 문서화 | todo |
| RB-007 | P1 | Observability | 장애/폴백 지표 대시보드 카드 정의 | Platform | 2d | 최소 3개 지표(P95, timeout rate, fallback rate) 표시 | todo |
| RB-008 | P1 | Frontend | AI 결과 화면에 출처/신뢰도 렌더링 | FE | 1d | UI에서 sources/confidence 표시 및 빈값 처리 | todo |
| RB-009 | P1 | Frontend | 에러 UX 통일(네트워크/업스트림/빈결과 메시지) | FE | 2d | home/patents/trade/drugs/chemical 공통 규칙 적용 | todo |
| RB-010 | P1 | Docs/Ops | 운영 문서 업데이트(README/RUNBOOK/릴리즈 체크리스트) | PM/Platform | 1d | 문서 링크/절차 최신화 및 리뷰 완료 | todo |

## Sprint 2 (차기 2주) 후보 백로그

| ID | 우선순위 | 영역 | 작업 | 담당(예시) | 공수 | 완료조건(DoD) | 상태 |
|---|---|---|---|---|---|---|---|
| RB-011 | P0 | Search/Data | 화학명 동의어/별칭 정규화 사전 1차 구축 | Data/BE | 3d | 샘플 질의 셋에서 검색 성공률 개선 확인 | todo |
| RB-012 | P0 | Search/Data | 검색 전처리(normalization) 파이프라인 적용 | BE | 2d | 기존 API 호환성 유지 + 회귀 테스트 통과 | todo |
| RB-013 | P1 | Data | 글로벌 특허 인덱스 증분 업데이트 잡 설계 | Data | 3d | 재실행 가능한 잡 + 실패 복구 절차 문서화 | todo |
| RB-014 | P1 | Data/QA | 인덱스 무결성 점검(중복/누락/스니펫 유효성) | Data/QA | 2d | 점검 스크립트와 리포트 산출 | todo |
| RB-015 | P1 | Trade | 시장 데이터 품질 점수(출처/최신성/메타완결성) 모델 정의 | BE/FE | 3d | API와 UI에서 품질 점수 노출 | todo |

## 이슈 템플릿 (복붙용)

```md
### [ID] 제목

- Priority: P0/P1/P2
- Area: Backend/Frontend/Data/Platform/QA/Docs
- Owner:
- Estimate:
- Dependencies:

#### Background

#### Tasks
- [ ]
- [ ]

#### Definition of Done
- [ ]
- [ ]

#### Validation
- [ ] submit_check.* 통과
- [ ] 관련 테스트/로그/스크린샷 첨부
```

## 주간 운영 루틴

1. 월요일: `todo` 중 P0 재정렬 및 `in_progress` 확정
2. 수요일: `blocked` 해소 미팅(외부 키/인프라 의존 포함)
3. 금요일: `done` 검증 + 다음 스프린트로 carry-over 정리
4. 매주: `docs/EXECUTION_PROGRESS.md`와 동기화

