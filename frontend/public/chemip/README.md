# chemip — 실제 화면 (빌드 없는 React)

`index.html` 이 아래 `.jsx` 를 `<script type="text/babel" src="...?v=YYYYMMDDx">` 로 순서대로 읽는다.
파일을 고치면 그 파일의 `?v=` 를 올린다. 새 파일을 추가하면 Next 프런트 프로세스(`T3-ChemIP-Frontend`)를 한 번
재시작해야 정적 파일로 잡힌다(기존 파일 수정은 재시작 불필요).

각 파일은 맨 끝 `Object.assign(window, {...})` 로 다른 파일이 쓸 이름을 내보낸다. 최상위 `const` 이름은
스크립트끼리 겹치면 오류가 나므로 파일마다 접두어(예: `TRADE_`, `tc`)를 쓴다.

## 파일 → 역할

| 파일 | 역할 |
|---|---|
| `index.html` | 스크립트·스타일 로드 순서, 캐시 무효화 `?v=` |
| `tokens.css` | 디자인 토큰(색·글꼴·모서리·`--unit` 간격) |
| `app.css` | 공통 레이아웃·컴포넌트 클래스(`.panel`, `.chip`, `.seg`, `.tabs` …) |
| `paper.css` | Research 화면 스타일 |
| `trade_controls.css` | 공용 UI(`.ui-*`)와 규제·인허가 / 수출입 탭(`.tc-*`) 스타일 |
| `data.jsx` | 정적 데이터(시제품) |
| `primitives.jsx` | 작은 공용 UI 조각(Icon 등), React 훅 별칭 |
| `ui_common.jsx` | 공용 UI: `EmptyState`("자료 준비 중"), `ErrorState`, `Badge`, `SourceLink`, `SectionPanel`, `Collapsible`(접고 펼치기), `ExpandAllToggle` |
| `api.jsx` | API 훅 전부(`useApi` 기반). 화면 컴포넌트는 fetch 하지 않고 여기 훅만 쓴다 |
| `app.jsx` | 최상위 셸, 화면 등록 목록(`APP_SCREENS`)과 상단 바 |
| `app_labels.jsx` | 상단 바·화면 이름·화면 설정 패널 문구(`APP_LABELS`) |
| `landing.jsx` | 처음 화면(중소기업용) — 절 순서(`LANDING_SECTIONS`)만 |
| `landing_labels.jsx` | 처음 화면 문구(`LANDING_LABELS`), 숫자 자리표시 채우기(`landingFill`, 값은 `useTradeCatalog`), 예시 물질(`FEATURED_CHEMICALS`) |
| `landing_hero.jsx` · `landing_outputs.jsx` · `landing_steps.jsx` · `landing_disclaimer.jsx` · `landing_footer.jsx` | 처음 화면 절: 머리·검색창 / 알려 주는 8가지 / 사용 방법 / 면책 안내 / 바닥글 |
| `landing.css` | 처음 화면(`.ld-*`)·연구·개발 화면(`.dev-*`)·공용 제목(`.title-en`, `.sec-heading`) 스타일 |
| `dev_hub.jsx` · `dev_labels.jsx` | "연구·개발" 화면: 논문 연구·벤치마크·모바일 시안 입구와 접어 둔 개발자 소개 |
| `dev_overview.jsx` | 개발자용 영문 소개 절(예전 랜딩의 데이터 출처·API·설치·로드맵·한계) |
| `product_labels.jsx` | 제품 화면(검색·물질 상세·보조 화면·상세 패널) 문구(`PRODUCT_LABELS`) |
| `panel_title.jsx` | `PanelTitle` — 패널 머리 한 줄(한국어 제목 + 작은 영문) |
| `section_heading.jsx` | `SectionHeading` — 상세 화면 절 머리(한국어 제목 + 작은 영문 + 상태 글) |
| `product.jsx` | 제품 화면 셸(검색 레일·화면 전환) |
| `product_search.jsx` | 물질 검색 화면 |
| `product_detail.jsx` | 물질 상세: 머리, 탭 목록 데이터(`tabs`), 하단 패널 배치 |
| `product_tabs.jsx` | 상세 탭: MSDS·특허·시장·가이드·규제·AI |
| `naver_results.jsx` | 시장 탭의 "네이버 검색결과" 별도 블록(NAVER 원문·원문 링크 그대로, KOTRA 와 분리) |
| `kipris_link_only.jsx` | 특허 탭 링크 전용 표시 — 백엔드 `display_mode="link_only"`(`KIPRIS_PUBLIC_DISPLAY=false`)일 때 "KIPRIS에서 보기"만 |
| `product_trade_controls.jsx` | 상세 탭 "규제·인허가 / 수출입" 셸(상태·훅·배치만) |
| `trade_controls_labels.jsx` | 위 탭의 모든 한국어 문구(`TRADE_LABELS`), 섹션별 자료 파일 묶음 |
| `trade_controls_helpers.jsx` | 위 탭의 순수 함수(응답 → 표시 형태) |
| `trade_controls_sections/summary.jsx` | 탭 맨 위 "한눈에 보기"(국내 법령 수·인허가 건수·수입/수출 의무·통제 목록·HS), 카드 → 섹션 이동 |
| `trade_controls_sections/rule_card.jsx` | 의무·인허가 한 건 카드(근거 링크·원문 발췌·세관장확인) |
| `trade_controls_sections/kr_law.jsx` | 국내 법령별 규제(법령별 접는 묶음, 방향 무관) |
| `trade_controls_sections/kr_permits.jsx` | 인허가·신고(법령별 접는 묶음·종류 배지, 방향 무관) |
| `trade_controls_sections/kr_permit_context.jsx` | 실제 통합허가 사례 섹션 셸(사업장 수·배출기준 분포·처리기간·출처), `useKrPermitContext` |
| `trade_controls_sections/kr_permit_context_entry.jsx` | 위 섹션의 물질(군) 한 건 카드(분포·업종·IEPS 허가 사례 링크) |
| `trade_controls_sections/kr_permit_context_emissions.jsx` | 위 섹션의 CleanSYS TMS 연간 배출량 줄 |
| `trade_controls_sections/kr_permit_duration_hint.jsx` | 통합허가 인허가 카드 아래 "실제 처리기간" 한 줄(`durationHintPermitIds`) |
| `trade_controls_permit_context_labels.jsx` | 실제 통합허가 사례 문구(`KR_PERMIT_CONTEXT_LABELS`) |
| `trade_controls_permit_context_helpers.jsx` | 실제 통합허가 사례 순수 함수(`kpc*`, 응답 → 표시 값) |
| `trade_controls_sections/kr_obligations.jsx` | 한국 수출입 의무 + 확인 중 항목 |
| `trade_controls_sections/controlled_lists.jsx` | 통제 목록 등재(CWC·호주그룹·마약류 원료물질) |
| `trade_controls_sections/hs_codes.jsx` | HS 품목번호 |
| `trade_controls_sections/destination.jsx` | 상대국 목록 + 국제협약 + KOTRA 수입규제 |
| `trade_controls_sections/controls_bar.jsx` | 수입/수출 전환, 상대국 선택 |
| `trade_controls_sections/sources_footer.jsx` | 자료 파일 상태(있음·준비 중·형식 오류) |
| `trade_controls_sections/checklist_export.jsx` | 중소기업 체크리스트 버튼(인쇄/PDF · CSV)과 인쇄 전용 배치 |
| `trade_controls_checklist_labels.jsx` | 체크리스트 문구(`TC_CHECKLIST_LABELS`) |
| `trade_controls_checklist_helpers.jsx` | 체크리스트 순수 함수(응답 → 묶음·행, CSV 문자열) |
| `checklist_print.css` | 체크리스트 버튼 줄·인쇄 레이아웃(`@media print`, `body.tc-printing`) |
| `feedback_board.jsx` | 요청 게시판 화면 셸(목록/글 보기/글쓰기/관리자 로그인 전환, 딥링크). 관리자 토큰이 있으면 목록 대신 관리자 목록 |
| `feedback_list.jsx` · `feedback_detail.jsx` · `feedback_form.jsx` | 게시판 목록 · 글 한 건 · 글쓰기(허니팟 포함) |
| `feedback_admin_session.jsx` | 관리자 토큰 보관(`fbAdminToken*`) — sessionStorage 에만, localStorage·URL 금지 |
| `feedback_admin_footer.jsx` | 게시판 바닥글의 작은 "관리자" 링크 / 관리자 모드 표시·로그아웃 |
| `feedback_admin_login.jsx` | 관리자 토큰 입력(서버 `/api/feedback/admin/list` 로 확인 후 로그인) |
| `feedback_admin_list.jsx` · `feedback_admin_item.jsx` | 관리자 모드 전체 글 목록(연락처 포함) · 한 건의 처리 상태·답변 저장, 삭제(확인) |
| `feedback_report_link.jsx` | 물질 상세의 "이 물질 자료가 틀렸나요?" 링크(CAS 채운 글쓰기로 이동) |
| `feedback_labels.jsx` · `feedback_helpers.jsx` | 게시판 문구(`FEEDBACK_LABELS`, 관리자 문구는 `.admin`) · 순수 함수(날짜·딥링크·오류 문구) |
| `feedback.css` | 게시판 스타일(`.fb-*`) |
| `about_labels.jsx` | 소개 안내 띠·자료 출처 화면·이용 집계 안내 문구(`ABOUT_LABELS`) |
| `sources_data.jsx` | 자료 출처·라이선스 목록 데이터(`DATA_SOURCES`) — 출처 추가는 여기 한 건 |
| `sources_view.jsx` | "자료 출처·라이선스" 화면 |
| `landing_sme.jsx` | 랜딩의 "무료·오픈소스·중소기업 누구나" 안내 띠 |
| `usage_notice.jsx` | 익명 이용 집계 안내 + 최근 30일 숫자 |
| `about.css` | 위 세 파일 스타일(`.about-*`) |
| `product_handlers.jsx` | 취급 사업장(PRTR) 패널 |
| `intl_regions.jsx` | 나라·기구 이름과 지도 ISO 코드(`INTL_JURISDICTIONS`) |
| `product_thresholds.jsx` | 나라별 임계량 비교 |
| `product_provisions.jsx` | 나라별 근거 조문 검색 결과 |
| `product_intl.jsx` | 국가별 규제 지도·목록 패널 |
| `product_incidents.jsx` | 사고 사례 × 설계 검증 패널 |
| `product_enforcement.jsx` | 미국 EPA 집행 사건 패널 |
| `product_views.jsx` | 링크형 보조 화면(특허·무역·의약품·가이드·빈 화면) |
| `mobile.jsx` | 모바일 화면 시안 |
| `tweaks.jsx` | 화면 설정 패널(문구는 `APP_LABELS.tweakPanel`) |
| `research.jsx` | 논문 연구 화면 |
| `benchmark.jsx` | 벤치마크 화면 |
| `label.html` | 벤치마크 라벨링 단독 페이지 |

## 상세 탭 추가 방법

1. `product_<탭이름>.jsx` 에 `({ selected }) => ...` 컴포넌트를 만들고 `window` 로 내보낸다.
2. `product_detail.jsx` 의 `tabs` 배열에 `{ k, label, n, Component }` 한 줄을 추가한다.
3. `index.html` 에 스크립트 한 줄을 추가하고, API 가 필요하면 훅은 `api.jsx` 에 둔다.

## 최상위 화면 추가 방법

`app.jsx` 의 `APP_SCREENS` 배열에 `{ k, icon, nav: true, Component }` 한 줄을 더하고, 이름을 `app_labels.jsx` 의
`APP_LABELS.screens[k]`(`{ ko, en }`)에 적는다. `nav: true` 면 상단 버튼이 생기고, 버튼 없이 다른 화면 아래에 두려면
`parent: "<상위 화면 키>"` 를 준다(예: 논문 연구·벤치마크·모바일 시안은 `parent: "dev"`). `?view=<k>` 딥링크도 함께 열린다.
컴포넌트는 `({ link, setView })` 를 받는다.

## 문구 원칙

화면에 보이는 문구는 한국어가 주 표기이고, 영문은 작은 보조 글씨(`.title-en`)로만 붙인다. 문구는 `*_labels.jsx` 에 두고
화면 파일에는 쓰지 않는다. 연구·개발 화면 아래(`dev_overview.jsx`, `research.jsx`, `benchmark.jsx`, `mobile.jsx`)는
심사자·개발자 대상이라 영문을 유지한다.
