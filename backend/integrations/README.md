# integrations — 형제 프로젝트 연동 (CAS 기준)

ChemIP 를 허브로 두고, 같은 PC 의 다른 프로젝트 자료를 CAS 로 읽어 물질 상세 화면에 붙인다. 모두 읽기 전용이다.
라우트는 `backend/api/routes/integrations.py` (`/api/integrations/*`), 화면은 `frontend/public/chemip/product_{incidents,enforcement,provisions,thresholds}.jsx` 와 `trade_controls_sections/kr_permit_context*.jsx`.

| 파일 | 책임 | 원천 |
|---|---|---|
| `sources.py` | 형제 프로젝트 경로·URL (여기서만 정의, 환경변수로 변경) | - |
| `equipment_disciplines.py` | 사고 설비 이름 → EPC 설계 검증 분야·기준, Chem_Eng 경험 그래프 설비 키 (데이터 표) | - |
| `incident_store.py` | CAS → 사고 사례·설비별 분야 집계 | Chem_Eng `data/incidents.db` (CSB·eMARS·KOSHA·NICS·EPA RMP) |
| `epc_regulation_text.py` | 나라 + CAS → 법령 본문 조문 검색 | EPC engineering 질의 서비스 127.0.0.1:15412 |
| `echo_enforcement_store.py` | CAS → 미국 EPA 집행 사건 | `data/echo_cas_index.db` (`scripts/build_echo_cas_index.py` 가 Environment 의 ECHO 원본에서 만듦) |
| `kr_permit_context_store.py` | CAS → 한국 통합허가 실제 사례(배출기준 분포·업종·처리기간·CleanSYS 배출량), 물질군은 family_parent·related 로 함께 | `data/kr_permit_context.db` (`scripts/build_kr_permit_context.py` 가 Environment `data/processed/intl/kr/` CSV 에서 만듦. 이름 → CAS 검토표 `scripts/kr_permit_context_names.json`) |

나라별 임계량 kg 환산은 연동이 아니라 ChemIP 자체 데이터라 `backend/core/intl_quantity.py` 에 있다.

- eMARS 사례는 CC BY 4.0 이라 화면에 출처 문구를 붙인다(`incident_store.ATTRIBUTION`).
- EPC 질의 서비스가 꺼져 있으면 조문 패널만 "연결하지 못했습니다"로 바뀌고 나머지는 정상이다.
- ECHO 원본이 갱신되면 `python scripts/build_echo_cas_index.py` 를 다시 돌린다.
- 한국 인허가 가공본이 갱신되면 `python scripts/build_kr_permit_context.py` 를 다시 돌린다. 출력의 `unmapped` 이름은 검토 후 `scripts/kr_permit_context_names.json` 에 넣는다(추측해서 잇지 않는다).
