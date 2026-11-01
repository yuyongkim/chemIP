# integrations — 형제 프로젝트 연동 (CAS 기준)

ChemIP 를 허브로 두고, 같은 PC 의 다른 프로젝트 자료를 CAS 로 읽어 물질 상세 화면에 붙인다. 모두 읽기 전용이다.
라우트는 `backend/api/routes/integrations.py` (`/api/integrations/*`), 화면은 `frontend/public/chemip/product_{incidents,enforcement,tceq_events,provisions,thresholds}.jsx` 와 `trade_controls_sections/kr_permit_context*.jsx`.

| 파일 | 책임 | 원천 |
|---|---|---|
| `sources.py` | 형제 프로젝트 경로·URL (여기서만 정의, 환경변수로 변경) | - |
| `equipment_disciplines.py` | 사고 설비 이름 → EPC 설계 검증 분야·기준, Chem_Eng 경험 그래프 설비 키 (데이터 표) | - |
| `incident_store.py` | CAS → 사고 사례·설비별 분야 집계 | Chem_Eng `data/incidents.db` (CSB·eMARS·KOSHA·NICS·EPA RMP) |
| `epc_regulation_text.py` | 나라 + CAS → 법령 본문 조문 검색 | EPC engineering 질의 서비스 127.0.0.1:15412 |
| `echo_enforcement_store.py` | CAS → 미국 EPA 집행 사건 | `data/echo_cas_index.db` (`scripts/build_echo_cas_index.py` 가 Environment 의 ECHO 원본에서 만듦) |
| `tceq_point_kinds.py` | TCEQ 배출점 이름 → 종류(플레어·탱크·안전밸브·누출·기타) → `equipment_disciplines` 설비 키 (데이터 표, 원인 아님) | - |
| `tceq_event_store.py` | CAS → 텍사스 TCEQ 배출사고 보고(건수·연도·파운드 신고값 합계·배출점 종류 분포·EPC 분야·카운티·최근 보고) | `data/tceq_event_cas_index.db` (`scripts/build_tceq_event_index.py` 가 Environment `data/processed/track_11_events`·`p1p/cache` CSV 에서 만듦. 이름 → CAS 는 `scripts/tceq_event_mapping.py`) |
| `kr_permit_context_store.py` | CAS → 한국 통합허가 실제 사례(배출기준 분포·업종·처리기간·CleanSYS 배출량), 물질군은 family_parent·related 로 함께 | `data/kr_permit_context.db` (`scripts/build_kr_permit_context.py` 가 Environment `data/processed/intl/kr/` CSV 에서 만듦. 이름 → CAS 검토표 `scripts/kr_permit_context_names.json`) |

나라별 임계량 kg 환산은 연동이 아니라 ChemIP 자체 데이터라 `backend/core/intl_quantity.py` 에 있다.

- eMARS 사례는 CC BY 4.0 이라 화면에 출처 문구를 붙인다(`incident_store.ATTRIBUTION`).
- EPC 질의 서비스가 꺼져 있으면 조문 패널만 "연결하지 못했습니다"로 바뀌고 나머지는 정상이다. 정해 둔 물질(SEO 1단계 ∪ 검색 벤치마크 목록)은 정적 배포용 `pv/<CAS>.json` 에 미리 받아 두므로 PC 가 꺼져도 보인다("미리 받아 둔 조문, <날짜> 기준"). 다시 받을 때는 `run_all.py --steps provisions`(EPC 서비스가 켜져 있어야 한다).
- 다른 사이트가 ChemIP 로 들어오는 링크 형식·`anchor` 키, ChemIP 가 내보내는 링크: `docs/integration/LINK_CONTRACT_v5.md`.
- ECHO 원본이 갱신되면 `python scripts/build_echo_cas_index.py` 를 다시 돌린다.
- 한국 인허가 가공본이 갱신되면 `python scripts/build_kr_permit_context.py` 를 다시 돌린다. 출력의 `unmapped` 이름은 검토 후 `scripts/kr_permit_context_names.json` 에 넣는다(추측해서 잇지 않는다).
- TCEQ 배출사고 가공본이 갱신되면 `python -B scripts/build_tceq_event_index.py` 를 다시 돌리고, 정적 배포용 `tx/<CAS>.json` 은 `run_all.py --steps tceq` 로 다시 쓴다. 이름 매핑 status 가 `cas` 인 줄만 색인에 들어간다(물질군·애매·미연결은 개수만 출력).
- TCEQ 화면·API 문구는 "무허가"·"위반"을 쓰지 않고, 신고서 허가 칸(authorization)으로 허가 여부를 판단하지 않는다. 플레어 기준값 0 은 운영자 신고 관행이다. 시설별 확률은 내지 않는다.

## 새 연동 추가 순서

복잡도를 묶어 두기 위해 새 연동은 아래 칸을 하나씩 채운다. 한 칸이 커지면 파일을 나눈다.

1. **경로·주소** — 원천 경로·URL 은 `sources.py` 에 한 줄(환경변수로 바꿀 수 있게). 다른 파일에 경로를 쓰지 않는다.
2. **store 모듈** — `backend/integrations/<이름>_store.py`: CAS → 화면에 그대로 쓸 dict. 원본이 크면 `scripts/build_<이름>_index.py` 가 `data/<이름>.db` 를 만들고 store 는 읽기 전용으로 연다. 이름 → CAS 매핑은 검토표(json)로 두고 추측해서 잇지 않는다.
3. **라우트** — `backend/api/routes/integrations.py` 에 `@router.get("/<이름>/{cas_no}")` 한 개, `_cas()` 로 검증만 하고 store 를 부른다.
4. **정적 배포** — `scripts/static_export/<이름>.py` 가 같은 store 함수로 파일을 쓰고 `run_all.py` STEPS 에 한 줄. `CONTRACT.md` 에 절 하나, 새 폴더면 Worker `STATIC_DATA.AREAS` 와 Pages `site_rules.mjs` `FUNCTION_ROUTES` 에 한 줄씩.
5. **API 훅** — `api_integrations.jsx` 에 `use<이름>` (`staticFirst(정적, originGet(...))`), 정적 읽기는 `api_static_extras.jsx`, 파일 이름은 `static_config.jsx` `STATIC_LAYOUT`.
6. **패널** — `frontend/public/chemip/product_<이름>.jsx` 한 파일, 문구는 `product_labels.jsx`, 색·간격은 `tokens.css`. `product_detail.jsx` 에 등록 한 줄, `index.html` 에 script 한 줄. 링크로 바로 가야 하면 `section_anchor.jsx` 에 키 한 줄 + 링크 규약 새 버전.
7. **문서** — 맨 위 표에 파일 한 줄, 갱신 방법을 그 아래 목록에 한 줄.
