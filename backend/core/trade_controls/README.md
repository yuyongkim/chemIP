# trade_controls — 물질별 수출입 규제

물질 상세 화면의 "규제·인허가 / 수출입" 탭이 쓴다. 방향과 무관한 국내 법령별 등재 목록·인허가·신고와,
방향(수입/수출)·상대국에 따른 한국 의무, 통제 목록, HS 코드, 상대국 목록을 한 번에 돌려준다. 모두 읽기 전용이다.

- 라우트: `GET /api/regulations/trade-controls/{cas}?direction=import|export&country=XX` (`backend/api/routes/regulations.py`)
- 화면: `frontend/public/chemip/product_trade_controls.jsx`
- 자료: `backend/data/trade_controls/` (다른 수집 작업이 채운다. 여기서는 읽기만 한다)

| 파일 | 책임 | 원천 |
|---|---|---|
| `paths.py` | 자료 파일 위치·목록 정의(여기서만), 파일 존재 여부 | `TRADE_CONTROLS_DIR` 환경변수 또는 `backend/data/trade_controls/` |
| `lists.py` | 목록 JSON 읽기(mtime 기준 캐시), CAS 등재 조회(큰 목록은 CAS 색인), 법령별 묶음, 미등재 안내(`absence_note`) | 통제 목록 `cwc_schedules.json` · `australia_group.json` · `drug_precursors.json`, 국내 법령 `kr_lists/*.json` 전부, 상대국 법령 `intl_lists/*.json` 전부 |
| `permits.py` | 인허가·신고 항목을 등재 목록·NCIS 분류에 맞춰 선택(방향 무관) | `kr_permits_env.json` · `kr_permits_safety.json` |
| `hs_codes.py` | CAS → HS6 / CN8 / HSK10 조회 | `hs_codes.sqlite` (`cas_hs`, `hs6_heading`, `meta`) |
| `substance.py` | 물질 사실: NCIS 분류, 국가별 목록 등재 코드 | `data/terminology.db` `ncis_substance`, `intl_regulatory_store` |
| `rules.py` | `kr_rules.json` 규칙을 방향·분류·등재에 맞춰 선택, 근거 첨부 | `kr_rules.json` |
| `assemble.py` | cas + 방향 + 상대국 → 응답 조립(`destination.intl_lists`, 상대국 없으면 `intl_lists`), 방향 무관 통제 목록 요약 `controlled_lists_any`, `sources_status` | 위 모듈 + KOTRA 수입규제(라우트가 함수로 전달) |

- 자료 파일이 없으면 그 칸만 비고 `sources_status` 에 `missing` 으로 나온다. 화면은 "자료 준비 중"을 보인다.
- 파일을 새로 넣거나 고치면 다음 요청부터 반영된다(코드 수정·서버 재시작 불필요). 깨진 JSON 은 `invalid`.
- 국내 법령 목록은 `kr_lists/` 에 json 을 넣기만 하면 된다(코드 수정 없음). 그 `list_id` 는 규칙 `when.list` 와 인허가 `trigger.list_id` 에서 쓸 수 있다.
- 인허가 `trigger.condition`(수량 기준 등)은 평가하지 않고 그대로 보여 준다.
- 새 통제 목록 파일은 `paths.LIST_FILES` 에 파일명 한 줄만 추가한다. 규칙의 `when.list` 에 그 `list_id` 를 쓰면 연결된다.
- NCIS 분류 "OO 세분류" 는 "OO" 로 본다(`substance.base_category`).
- 상대국 법령 목록은 `intl_lists/` 에 json 을 넣기만 하면 된다(코드 수정 없음, 수집기 `scripts/trade_controls/intl/`).
  `directions` 는 그 나라 기준이다: 한국이 수출하면 상대국 `import` 목록을, 한국이 수입하면 상대국 `export` 목록을 보인다.
  상대국을 고르면 `destination.intl_lists`(블록 포함, 예: NL→EU), 고르지 않으면 최상위 `intl_lists`(모든 나라)에 담긴다.
  `absence_note` 가 있는 목록(TSCA Inventory)은 상대국을 골랐을 때 미등재도 `absent: true` 로 알린다.
