# chemip — 실제 화면 (빌드 없는 React)

`index.html` 이 아래 `.jsx` 를 `<script type="text/babel" src="...?v=YYYYMMDDx">` 로 순서대로 읽는다(원본·개발용).
파일을 고치면 그 파일의 `?v=` 를 올린다. 새 파일을 추가하면 Next 프런트 프로세스(`T3-ChemIP-Frontend`)를 한 번
재시작해야 정적 파일로 잡힌다(기존 파일 수정은 재시작 불필요).

**운영 화면은 `dist/index.html` 이다.** `node ../../scripts/build_chemip.cjs`(= `npm run build` 첫 단계)가
`index.html` 의 text/babel 목록을 같은 Babel 설정으로 미리 번역해 `dist/app.js`(주소에 `?v=<내용 해시>`) 하나로 묶고,
React 를 운영용으로 바꾼 `dist/index.html` 을 만든다. `next.config.ts` 가 `/chemip` 을 여기로 보낸다.
jsx·index.html 을 고친 뒤에는 이 빌드를 다시 돌려야 운영 화면에 반영된다. 외부 CDN 은 쓰지 않는다(`vendor/`).

각 파일은 맨 끝 `Object.assign(window, {...})` 로 다른 파일이 쓸 이름을 내보낸다. 최상위 `const` 이름은
스크립트끼리 겹치면 오류가 나므로 파일마다 접두어(예: `TRADE_`, `tc`)를 쓴다.

## 파일 → 역할

| 파일 | 역할 |
|---|---|
| `index.html` | 스크립트·스타일 로드 순서, 캐시 무효화 `?v=` (원본·개발용) |
| `dist/` | 빌드 결과(운영 화면). 손대지 않는다 — `scripts/build_chemip.cjs` 가 만든다 |
| `vendor/` | React 18.3.1·Babel 7.29.0·d3-array·d3-geo·topojson-client 고정 사본(CDN 대신) |
| `tokens.css` | 디자인 토큰(색·글꼴·모서리·`--unit` 간격) |
| `app.css` | 공통 레이아웃·컴포넌트 클래스(`.panel`, `.chip`, `.seg`, `.tabs` …) |
| `paper.css` | Research 화면 스타일 |
| `trade_controls.css` | 공용 UI(`.ui-*`)와 규제·인허가 / 수출입 탭(`.tc-*`) 스타일 |
| `data.jsx` | 정적 데이터(시제품) |
| `data_en.jsx` | `data.jsx` 의 영어 쪽: 약어 설명 `GLOSSARY_EN`(→ 화면용 `GLOSSARY`), MSDS 항목 이름을 화면 언어로 고르는 `msdsSectionName` |
| `primitives.jsx` | 작은 공용 UI 조각(Icon 등), React 훅 별칭 |
| `ui_common_labels.jsx` · `ui_common_labels_en.jsx` | 공용 UI 기본 문구(`UI_COMMON_TEXT_KO` / `_EN` → `UI_COMMON_TEXT`) |
| `ui_common.jsx` | 공용 UI: `EmptyState`("자료 준비 중"), `ErrorState`, `Badge`, `SourceLink`, `SectionPanel`, `Collapsible`(접고 펼치기), `ExpandAllToggle` |
| `api_core.jsx` | API 층 바탕: `apiGet`·`apiGetTimeout`·`apiPost`, `staticFirst`(정적 자료 먼저, 없거나 실패하면 `/api`), 상태 훅 `useApi`. 화면 컴포넌트는 fetch 하지 않고 `api_*.jsx` 훅만 쓴다 |
| `api_chemicals.jsx` | 검색·자동완성·물질 상세(정적 먼저), 고른 물질 기억(`useSelectedChemical`) |
| `api_content.jsx` | 상세 탭·보조 화면 자료: 특허(`usePatents`)·가이드(정적 먼저)·의약품·KOTRA/네이버 뉴스 |
| `api_regulations.jsx` | 해외 규제 정보(`useRegulatoryIntelligence`, 실시간 → `originGet`)·KOTRA REACH·국가별 규제 목록(정적 먼저) |
| `api_integrations.jsx` | 아래 패널: 취급 사업장(PRTR)·사고 사례·EPA 집행·텍사스 배출사고·통합허가 실제 사례(정적 먼저), 근거 조문(실시간 → `originGet`) |
| `api_trade.jsx` | 수출입 통제(`fetchTradeControls`·`useTradeControls`, 정적 조립 먼저)·자료 규모(`useTradeCatalog`) |
| `api_ai.jsx` | AI 요약(`useAIAnalysis`, POST) |
| `api_patents_static.jsx` | 물질 → 특허 매핑 파일(`<뿌리>/pat/<CAS>/index.json`, `<JUR>.json`; 형식 `scripts/patent_export/README.md`) 훅 `usePatentMappingIndex`·`usePatentMappingRecords`. 뿌리 = 정적 pages 뿌리, 꺼져 있으면 같은 주소 `/data/v1`(PC: Next → 백엔드 `routes/patent_mapping.py`, 배포: Worker/R2). 받기는 `staticGetJson` |
| `api_feedback.jsx` | 요청 게시판(관리자 경로 포함)·익명 이용 집계 |
| `api_labels.jsx` · `api_labels_en.jsx` | API 층 문구(`API_LABELS_KO` / `_EN` → `API_LABELS`: `offline` "지금 연결할 수 없습니다…", `liveOnly` 실시간 전용 안내) |
| `api_errors.jsx` | 서버에 닿지 못한 오류 분류(네트워크 끊김·500·502~504·52x·530 → `offline`), 빈 결과로 넘기던 훅용 `apiKeepOffline`, 실시간 전용 안내 `apiLiveOnlyError`·`apiIsNotice`(오류 대신 중립 안내로 그림) |
| `api_static.jsx` | 정적 자료 읽기(fetch·메모리 캐시·gzip 풀기) → `/api` 와 같은 모양으로 돌려줌(`staticChemicalSearch`·`staticChemicalDetail`·`staticTradeControls`·`staticIntl`·`staticPermitContext`·`staticTradeCatalog`) |
| `api_static_extras.jsx` | 정적 자료 · 물질 하나의 아래 패널·안전 가이드 파일(`p/<chem_id>.x.json`: 가이드 추천·취급 사업장·사고 사례·EPA 집행)과 `g/guides_status.json`, 텍사스 배출사고 `tx/<CAS>.json`(파일이 없으면 "사고 없음" 빈 응답 — 집 PC 로 넘기지 않는다), 근거 조문 `pv/<CAS>.json`(미리 받아 둔 나라·이름만, 나머지는 집 PC) → `/api` 모양 |
| `api_origin.jsx` | 집 PC 전용 `/api` 의 공용 관문 `originGet`: 정적 배포에서만 페이지당 확인 요청 한 번, PC 가 꺼졌으면 이후 요청 없이 `API_LABELS.liveOnly` 안내. PC 사이트에서는 `apiGet` 그대로 |
| `static_config.jsx` | 정적 자료 주소·버전·파일 배치(`window.CHEMIP_STATIC`, `STATIC_LAYOUT`) — 한 곳. 형식: `scripts/static_export/CONTRACT.md`. `base` 가 비면 꺼짐(지금 동작 그대로) |
| `static_aliases.jsx` | 검색 문자열 규칙(`backend/core/chemical_aliases.py` 1:1 이식, 순수 함수) |
| `static_search_index.jsx` | 검색 색인 읽기·FTS5 흉내(`StaticSearchIndex`, 파일은 넘겨받은 load 로만 읽음) |
| `static_search.jsx` | 정적 검색(미리 계산한 답 → 가벼운 FTS → 서버와 같은 전체 계산), `/api/chemicals` 모양. 점수는 `manifest.ranking`(서버 `ranking.py` 와 같은 규칙), 동의어 줄(`syn_*`) |
| `static_trade_assembly.jsx` | 물질 파일 + 규칙집으로 수출입 화면 응답 조립(순수 함수, KOTRA 는 `kotra_unavailable: "offline"`) |
| `app.jsx` | 최상위 셸, 화면 등록 목록(`APP_SCREENS`)과 상단 바 |
| `family_sites.jsx` | **패밀리 사이트 목록 데이터**(`FAMILY_SITES`: key·name·url·desc{ko,en}, 지금 사이트는 `self`) — `docs/integration/FAMILY_SITES_v1.md` 그대로, 한 곳. 백엔드용 형제 주소(`backend/integrations/sources.py`)와는 따로 둔다 |
| `family_labels.jsx` · `family_labels_en.jsx` | 패밀리 사이트 문구(`FAMILY_LABELS_KO` / `_EN` → `FAMILY_LABELS`), 설명을 화면 언어로 고르는 `familySiteDesc` |
| `family_footer.jsx` | 모든 화면 맨 아래 "패밀리 사이트" 한 줄(`FamilyFooter`, 자기 자신 뺀 세 곳·새 탭). `app.jsx` 셸이 `<main>` 아래에 둔다. 스타일 `app.css` `.fam-footer*` |
| `family_menu.jsx` | 상단 바 "사이트 이동 / Sites" 메뉴(`FamilySitesMenu`, 네 곳·지금 사이트 표시, Esc·바깥 누르기로 닫음, 위/아래 키). 스타일 `app.css` `.fam-menu*` |
| `lang_switch.jsx` | 상단 바의 화면 언어 전환 "한 / EN"(`LangSwitch` → `setChemipLang`) |
| `app_meta.jsx` | 영어 화면에서만 문서 제목·설명을 `APP_LABELS.meta` 로 바꿈(`index.html` 의 한국어 메타가 검색 노출 기본값). 대표 주소(canonical·og:url·hreflang 짝)는 `?lang=en`·용어사전 `?view=glossary&term=` 일 때만 그 주소로(`appCanonicalSearch`·`appAlternateSearch`, 남길 칸은 `APP_INDEXABLE_VIEWS`) |
| `lang.jsx` | 화면 언어(`CHEMIP_LANG`: `?lang=` → localStorage `chemip-lang` → ko), `langPick`·`tr`·`setChemipLang`. 맨 먼저 읽는다 |
| `app_labels.jsx` · `app_labels_en.jsx` | 상단 바·화면 이름·화면 설정 패널 문구(`APP_LABELS_KO` / `_EN` → `APP_LABELS`, 영어 문서 메타 `meta`), 언어 단추 이름(`APP_LANG_NAMES`) |
| `landing.jsx` | 처음 화면 — 절 순서(`LANDING_SECTIONS`)만 |
| `landing_labels.jsx` · `landing_labels_en.jsx` | 처음 화면 문구(`LANDING_LABELS_KO` / `_EN` → `LANDING_LABELS`), 숫자 자리표시 채우기(`landingFill`, 값은 `useTradeCatalog`), 예시 물질(`FEATURED_CHEMICALS`) |
| `landing_discover_data.jsx` | 처음 화면 둘러보기 자료(문구 없음): 자주 찾는 물질 `LANDING_POPULAR_CAS`(12), 오늘의 물질 `LANDING_TODAY_CAS`(28), 도구 `LANDING_TOOLS`(등록된 화면만 보임) — 고정 목록, 조회 추적 없음 |
| `landing_discover_labels.jsx` · `landing_discover_labels_en.jsx` | 둘러보기 문구(`LANDING_DISCOVER_KO` / `_EN` → `LANDING_DISCOVER`): 물질 이름·오늘의 물질 한 줄 설명(CAS 키), 도구 이름·설명 |
| `landing_discover_helpers.jsx` | 둘러보기 순수 함수: 날짜 → 오늘의 물질(`landingTodayCas`), 물질·화면 주소(`landingSubstanceHref`·`landingViewHref`), 등록된 도구만(`landingAvailableTools`), 사고 소식 최신 n 건(`landingFeedItems`). 시험 `frontend/scripts/tests/test_discovery.cjs` |
| `landing_discover.jsx` · `landing_popular.jsx` · `landing_today.jsx` · `landing_feed_slot.jsx` · `landing_tools.jsx` | 처음 화면 둘러보기 절: 줄 배치(자주 찾는 물질 + 오늘의 물질) / 자주 찾는 물질 / 오늘의 물질 / 최근 사고 소식(`feed/latest.json` 이 있을 때만, `api_feed.jsx` `useFeedLatest`) / 도구 묶음 |
| `api_discovery.jsx` | 관련 물질 `rel/<CAS>.json`(`fetchRelatedSubstances`·`useRelatedSubstances`, 정적 파일만 — 404 면 절을 숨김). 뿌리 규칙은 `api_static.jsx` `staticPagesUrlOrLocal` |
| `product_related.jsx` · `product_related_helpers.jsx` | 물질 상세 아래 "관련 물질" 절(같은 규제 목록·GHS 유해성·계열 상위 8개와 이유, 취급 사업장 위) / 순수 함수(화면 언어 이름·이유 조각, 목록 영어 이름은 `REG_LIST_ENGLISH_NAMES`) |
| `product_related_labels.jsx` · `product_related_labels_en.jsx` | 관련 물질 문구(`RELATED_LABELS_KO` / `_EN` → `RELATED_LABELS`), 계열·GHS 유해성 이름(key 는 `scripts/static_export/related_*.json` 과 같다) |
| `landing_paper.jsx` · `landing_paper_compare.jsx` · `landing_paper_figures.jsx` | 처음 화면 연구 논문 절 / 기존 방식 vs ChemIP 비교 그림 / 논문 그림 1·2(지금은 그리지 않음) |
| `landing_paper_labels.jsx` · `landing_paper_labels_en.jsx` | 위 절 문구(`LANDING_PAPER_LABELS_KO` / `_EN` → `LANDING_PAPER_LABELS`) |
| `landing_faq.jsx` · `landing_faq_labels.jsx` · `landing_faq_labels_en.jsx` | 처음 화면 사례 FAQ / 문구·화면 캡처 경로(`LANDING_FAQ_KO` / `_EN` → `LANDING_FAQ`, 캡처는 한국어 화면) |
| `landing_hero.jsx` · `landing_outputs.jsx` · `landing_steps.jsx` · `landing_disclaimer.jsx` · `landing_footer.jsx` | 처음 화면 절: 머리·검색창 / 알려 주는 8가지 / 사용 방법 / 면책 안내 / 바닥글 |
| `landing.css` | 처음 화면(`.ld-*`)·연구·개발 화면(`.dev-*`)·공용 제목(`.title-en`, `.sec-heading`) 스타일 |
| `dev_hub.jsx` · `dev_labels.jsx` · `dev_labels_en.jsx` | "연구·개발" 화면: 논문 연구·벤치마크·모바일 시안 입구와 접어 둔 개발자 소개 |
| `dev_overview.jsx` | 개발자용 영문 소개 절 배치만(예전 랜딩의 데이터 출처·API·설치·로드맵·한계) |
| `dev_overview_data.jsx` · `dev_overview_data_en.jsx` | 개발자용 소개 문구·자료(`DEV_OVERVIEW_KO`, 대부분 영문) / 영어 화면에서 한국어 부분만 바꾼 `DEV_OVERVIEW_EN` → `DEV_OVERVIEW` |
| `dev_overview_hero.jsx` · `dev_overview_sections.jsx` · `dev_overview_footer.jsx` | 상태 띠·머리·예시 콘솔·숫자 띠 / 본문 절 7개 / 바닥글 |
| `product_labels.jsx` | 제품 화면(검색·물질 상세·보조 화면·상세 패널) 문구(`PRODUCT_LABELS`) |
| `product_labels_en.jsx` | 위 문구의 영어(`PRODUCT_LABELS_EN`) → 화면용 `PRODUCT_LABELS`. 응답이 한국어 이름을 주는 것(국가별 규제 목록·임계량 종류·REACH 상태·EPC 분야)은 키 → 영어 이름 표(`…Names`, `detailPhrases`) |
| `panel_title.jsx` | `PanelTitle` — 패널 머리 한 줄(한국어 제목 + 작은 영문, 영어 화면은 영문 제목만) |
| `section_heading.jsx` | `SectionHeading` — 상세 화면 절 머리(한국어 제목 + 작은 영문 + 상태 글, 영어 화면은 영문 제목만) |
| `product.jsx` | 제품 화면 셸(검색 레일·화면 전환) |
| `product_search.jsx` | 물질 검색 화면 셸(상태·배치) |
| `product_search_hero.jsx` · `product_search_results.jsx` · `product_search_cards.jsx` | 검색 화면: 머리·검색창·예시 / 자료원 거르기·결과 표 / 검색어 없을 때 안내 카드 |
| `product_search_helpers.jsx` | 검색 순수 함수(자료원별 개수·정렬·묶음 머리 줄) |
| `product_search.css` | 검색 화면 스타일(`.ps-*`) |
| `product_detail.jsx` | 물질 상세 셸: 머리·탭 줄·고른 탭 본문·하단 패널 배치만 |
| `product_chem_header.jsx` | 물질 상세 머리(이름·CAS·유해성 표시·작은 통계) |
| `product_tab_list.jsx` | **상세 탭 목록 데이터**(`PRODUCT_DETAIL_TABS`) — 탭 하나 = 한 줄. 탭 파일·`product_trade_controls.jsx` 뒤에 읽는다 |
| `product_msds.jsx` | 탭 "MSDS"(16개 항목 격자·본문·§9·§15) |
| `product_msds_helpers.jsx` | MSDS 순수 함수(`parseSectionRows`·`sectionStatus`·§15 규제 표시 `regChips`·머리 이름/유해성, 화면 언어 이름 `chemDisplayNames`·`chemPrimaryName`·`chemLocalName`, KOSHA 관용명은 `synonym`) |
| `chem_name_core.jsx` | 물질 이름 순수 함수: KOSHA `X ( 관용명 : Y )` 떼기 `chemSplitKoshaName`, f/ names.en 에서 영어 이름 고르기 `chemPickEnName` (시험 `test_chem_name.cjs`) |
| `product_patents.jsx` · `product_market.jsx` · `product_guides.jsx` · `product_ai.jsx` | 탭 "특허"(맨 위 특허 매핑 절 + KIPRIS) · "시장·뉴스" · "안전 가이드" · "AI 요약" |
| `product_patent_mapping.jsx` | 특허 탭 "관련 특허(공개 특허 문헌 매핑)" 절 셸: 열 때 index.json 만, 관할을 고르면 그 파일을 받아 50건씩 |
| `product_patent_mapping_helpers.jsx` | 위 절 순수 함수(`pm*`: 관할 상위 8곳·최근 12년 막대·기록 → 번호/명칭/관할/연도/링크만·쪽 나누기) |
| `patent_mapping_labels.jsx` | 위 절 문구(`PATENT_MAPPING_LABELS`, 출처 안내 줄)·특허청 코드 이름(`PATENT_OFFICE_NAMES`, 나라는 `INTL_JURISDICTIONS` 먼저) |
| `patent_mapping_labels_en.jsx` | 위 절 문구·특허청 이름의 영어(`PATENT_MAPPING_LABELS_EN`·`PATENT_OFFICE_NAMES_EN`) → 화면용 이름 |
| `patent_mapping_filter.jsx` · `patent_mapping_jurisdictions.jsx` · `patent_mapping_years.jsx` · `patent_mapping_list.jsx` · `patent_mapping_pager.jsx` | 위 절 하위: 관할 고르기 / 관할별 막대(누르면 그 관할) / 연도별 막대 / 기록 표(초록·발췌 없음) / 쪽 넘기기 |
| `product_regulation.jsx` | 탭 "해외 규제" 셸(요청·배치) |
| `product_regulation_eu.jsx` · `product_regulation_us.jsx` · `product_regulation_side.jsx` | 해외 규제 패널: REACH 등록 현황(`useReachRegistration`, PC 꺼져도 Worker 가 답함)·ECHA 기록(실시간) / NIOSH·CompTox / KOTRA REACH·국내 분류·검색어 |
| `product_regulation_state.jsx` | 해외 규제 하위 패널 공용 상태(요청 중·실패면 "0건" 대신 불러오는 중 / `ErrorState`) |
| `product_tab_helpers.jsx` | 상세 탭 순수 함수(강조어·특허 통계·가이드 일치도 구간·규제 정보 묶음) |
| `product_detail.css` | 물질 상세·탭·아래 패널 스타일(`.pd-*`) |
| `naver_results.jsx` | 시장 탭의 "네이버 검색결과" 별도 블록(NAVER 원문·원문 링크 그대로, KOTRA 와 분리) |
| `kipris_link_only.jsx` | 특허 탭 링크 전용 표시 — 백엔드 `display_mode="link_only"`(`KIPRIS_PUBLIC_DISPLAY=false`)일 때 "KIPRIS에서 보기"만 |
| `product_trade_controls.jsx` | 상세 탭 "규제·인허가 / 수출입" 셸(상태·훅·배치만) |
| `trade_controls_labels.jsx` | 위 탭의 모든 한국어 문구(`TRADE_LABELS_KO`), 섹션별 자료 파일 묶음 |
| `trade_controls_labels_en.jsx` | 위 탭의 영어 문구(`TRADE_LABELS_EN`)와 화면이 읽는 `TRADE_LABELS = langPick(KO, EN)` |
| `trade_controls_helpers.jsx` | 위 탭의 순수 함수(응답 → 표시 형태) |
| `trade_controls_sections/summary.jsx` | 탭 맨 위 "한눈에 보기"(국내 법령 수·인허가 건수·수입/수출 의무·통제 목록·HS), 카드 → 섹션 이동 |
| `trade_controls_sections/rule_card.jsx` | 의무·인허가 한 건 카드(근거 링크·원문 발췌·세관장확인) |
| `trade_controls_sections/entry_line.jsx` | 목록 항목 한 줄(`TcEntryLine`) — 물질 이름·CAS 하이라이트, 국내·상대국 목록 공용 |
| `trade_controls_sections/kr_law.jsx` | 국내 법령별 규제(법령별 접는 묶음, 방향 무관) |
| `trade_controls_sections/kr_permits.jsx` | 인허가·신고(법령별 접는 묶음·종류 배지, 방향 무관) |
| `trade_controls_sections/kr_permit_context.jsx` | 실제 통합허가 사례 섹션 셸(사업장 수·배출기준 분포·처리기간·출처), `useKrPermitContext` |
| `trade_controls_sections/kr_permit_context_entry.jsx` | 위 섹션의 물질(군) 한 건 카드(분포·업종·IEPS 허가 사례 링크) |
| `trade_controls_sections/kr_permit_context_emissions.jsx` | 위 섹션의 CleanSYS TMS 연간 배출량 줄 |
| `trade_controls_sections/kr_permit_duration_hint.jsx` | 통합허가 인허가 카드 아래 "실제 처리기간" 한 줄(`durationHintPermitIds`) |
| `trade_controls_permit_context_labels.jsx` | 실제 통합허가 사례 문구(`KR_PERMIT_CONTEXT_LABELS_KO`), 자료 값(`KPC_KEYS`: post_type·업종 미상) |
| `trade_controls_permit_context_labels_en.jsx` | 실제 통합허가 사례 영어 문구(`KR_PERMIT_CONTEXT_LABELS_EN`)와 `KR_PERMIT_CONTEXT_LABELS` |
| `trade_controls_permit_context_helpers.jsx` | 실제 통합허가 사례 순수 함수(`kpc*`, 응답 → 표시 값) |
| `trade_controls_sections/kr_obligations.jsx` | 한국 수출입 의무 + 확인 중 항목 |
| `trade_controls_sections/controlled_lists.jsx` | 통제 목록 등재(CWC·호주그룹·마약류 원료물질) |
| `trade_controls_sections/hs_codes.jsx` | HS 품목번호 |
| `trade_controls_sections/destination.jsx` | 상대국 목록 + 국제협약 + KOTRA 수입규제 |
| `trade_controls_sections/controls_bar.jsx` | 수입/수출 전환, 상대국 선택 |
| `trade_controls_sections/sources_footer.jsx` | 자료 파일 상태(있음·준비 중·형식 오류) |
| `trade_controls_sections/checklist_export.jsx` | 체크리스트 버튼(인쇄/PDF · CSV)과 인쇄 전용 배치 |
| `trade_controls_checklist_labels.jsx` | 체크리스트 문구(`TC_CHECKLIST_LABELS_KO`) |
| `trade_controls_checklist_labels_en.jsx` | 체크리스트 영어 문구(`TC_CHECKLIST_LABELS_EN`, CSV 머리 포함)와 `TC_CHECKLIST_LABELS` |
| `trade_controls_checklist_helpers.jsx` | 체크리스트 순수 함수(응답 → 묶음·행, CSV 문자열) |
| `checklist_print.css` | 체크리스트 버튼 줄·인쇄 레이아웃(`@media print`, `body.tc-printing`) |
| `feedback_board.jsx` | 요청 게시판 화면 셸(목록/글 보기/글쓰기/관리자 로그인 전환, 딥링크). 관리자 토큰이 있으면 목록 대신 관리자 목록 |
| `feedback_list.jsx` · `feedback_detail.jsx` · `feedback_form.jsx` | 게시판 목록 · 글 한 건 · 글쓰기(허니팟 포함) |
| `feedback_admin_session.jsx` | 관리자 토큰 보관(`fbAdminToken*`) — sessionStorage 에만, localStorage·URL 금지 |
| `feedback_admin_footer.jsx` | 게시판 바닥글의 작은 "관리자" 링크 / 관리자 모드 표시·로그아웃 |
| `feedback_admin_login.jsx` | 관리자 토큰 입력(서버 `/api/feedback/admin/list` 로 확인 후 로그인) |
| `feedback_admin_list.jsx` · `feedback_admin_item.jsx` | 관리자 모드 전체 글 목록(연락처 포함) · 한 건의 처리 상태·답변 저장, 삭제(확인) |
| `feedback_report_link.jsx` | 물질 상세의 "이 물질 자료가 틀렸나요?" 링크(CAS 채운 글쓰기로 이동) |
| `feedback_labels.jsx` · `feedback_labels_en.jsx` · `feedback_helpers.jsx` | 게시판 문구(`FEEDBACK_LABELS_KO` / `_EN` → `FEEDBACK_LABELS`, 관리자 문구는 `.admin`, 서버 값 표시 이름 `.values`) · 순수 함수(날짜·딥링크·오류 문구) |
| `feedback.css` | 게시판 스타일(`.fb-*`) |
| `about_labels.jsx` · `about_labels_en.jsx` | 소개 안내 띠·자료 출처 화면·이용 집계 안내 문구(`ABOUT_LABELS_KO` / `_EN` → `ABOUT_LABELS`) |
| `sources_data.jsx` | 자료 출처·라이선스 목록 데이터(`DATA_SOURCES_KO`, 항목마다 `id`) — 출처 추가는 여기 한 건 |
| `sources_data_en.jsx` | 위 목록의 영어 문구(같은 `id` 로 글 칸만, 주소·묶음은 `sources_data.jsx` 그대로) → `DATA_SOURCES`·`DATA_SOURCE_GROUPS` |
| `sources_view.jsx` | "자료 출처·라이선스" 화면 |
| `landing_sme.jsx` | 랜딩의 "무료 · 오픈소스(AGPL-3.0) · 누구나" 안내 띠 |
| `usage_notice.jsx` | 익명 이용 집계 안내 + 최근 30일 숫자 |
| `about.css` | 위 세 파일 스타일(`.about-*`) |
| `calc_registry.jsx` | **공학 계산기 등록 목록**(`CALC_REGISTRY`, 묶음 `CALC_GROUPS`)과 정의 객체 형식 설명 — 계산기 하나 = 파일 하나 + 한 줄 |
| `calc_<이름>.jsx` | 계산기 정의 하나(칸·출력·순수 함수 `compute`·식·주의·근거 문헌·용어 `term`, React 없음), 29개. 안전·산업위생 `ppm_mgm3`·`mix_exposure`·`twa8h`·`mix_lfl`·`stoich_air`·`ventilation` / 누출·확산·방출 `evaporation`·`gaussian_plume`·`relief_valve` / 화학·열역학 `ideal_gas`·`compressibility`·`dilution`·`concentration`·`buffer_ph`·`antoine`·`water_sat`·`steam`·`steam_table` / 유체·배관 `reynolds`·`pipe_dp`·`pipe_size`·`pump_power`·`npsha`·`orifice` / 열전달·습공기 `heat_duty`·`lmtd`·`insulation_loss`·`nusselt`·`psychro` / 용기·반응기 `vessel_volume`·`reactor` |
| `calc_units.jsx` | 단위 환산표(`CALC_UNITS`: 압력·온도·질량·길이·면적·부피·유량·몰유량·질량유량·동력·에너지·열유속·열전도도·열전달 계수·속도·밀도·시간·속도 상수·점도·동점도, 변환기 전용 절대·게이지 압력 `pressure_ag`)와 물리 상수 `CALC_CONST`, `calcConvert`. NIST SP 811 부록 B |
| `calc_units_converter.jsx` | 계산기 `units` **공학 단위 변환기** — 값 하나를 그 물리량의 모든 단위로(위 표를 그대로 읽음), 게이지 압력은 현지 대기압 보정, 점도 ↔ 동점도(밀도). 물리량 목록 `CALC_UC_KINDS`(데이터) |
| `calc_units_gas.jsx` | 변환기의 기체 유량(Nm³·Sm³·Am³·SCFM·MMSCFD·kg/h·kmol/h, 기준 조건 `CALC_GAS_REFS`)·기체 농도(ppm·ppb·vol%·mg/m³) 순수 함수 |
| `calc_fluid_props.jsx` | 계산기 `fluid_props` **실유체 물성·냉매 p-h 선도(CoolProp)** — 상태 물성(두 상태량 7쌍)·포화 표(`table()`)·단순 냉동 사이클 COP, 묶음 `thermo`. 정의의 `engine` 으로 CoolProp 을 이 계산기를 열 때만 받는다 |
| `calc_fluid_engine.jsx` | CoolProp 8.0.0 wasm(`vendor/coolprop/`, MIT, sha256 은 `manifest.json`) 불러오기(`CALC_FLUID_ENGINE`)와 상태 계산(AbstractState) |
| `calc_fluid_data.jsx` · `calc_fluid_names.jsx` | 유체 136종 자료(CAS·분류·임계점·범위, `scripts/build_coolprop_data.mjs` 가 만듦) / 보일 이름·고르기 묶음·CAS → 유체(`calcFluidForCas`) |
| `calc_fluid_cycle.jsx` · `calc_fluid_charts.jsx` | 증기 압축 냉동 사이클 풀이 / p-h 돔·상태점·사이클 그래프, 포화 표·사이클 상태점 표 |
| `calc_substance_link_fluid.jsx` | 물질 상세 머리 "실유체 물성·p-h 선도" 링크(CAS 가 CoolProp 유체일 때만) |
| `calc_form_engine.jsx` · `calc_form_engine_status.jsx` | 정의의 `engine`(무거운 계산 엔진)을 그 계산기를 열 때만 불러오는 훅 `useCalcEngine` / 받는 중·실패(다시 시도) 줄 |
| `calc_vle_binary.jsx` | 계산기 `vle_binary` **2성분 기액평형 Txy·Pxy·xy**(Raoult·Margules·van Laar·Wilson·NRTL·원 UNIFAC), 기포점·이슬점·공비점 |
| `calc_vle_solve.jsx` · `calc_vle_models.jsx` · `calc_vle_unifac.jsx` | 기포·이슬점·곡선·공비점·액액 분리 검사 / γ 모델 / 원 UNIFAC |
| `calc_vle_unifac_data.jsx` · `calc_vle_antoine_data.jsx` · `calc_vle_presets.jsx` | UNIFAC R·Q·a_mn(Hansen 1991·Wittig 2003, DDBST 대조, `scripts/build_unifac_data.py`) / 사전 설정 18종 Antoine(CoolProp 맞춤) / 사전 설정 성분(그룹 나눔) |
| `calc_chart_scale.jsx` | 계산기 그래프 순수 계산(`calcChartModel`: 축 범위·눈금·좌표·경로, 가까운 점, 자료 표, 구간 점 `calcChartRange`). 시험 `scripts/tests/test_calc_chart.cjs` |
| `calc_chart.jsx` | **공용 그래프 `CalcChart`**(순수 SVG, ResizeObserver 로 폭 맞춤, 가리키기·누르기·화살표 키 말풍선). 속성 형식은 파일 머리 주석. 계산기 정의의 `chart(values, outputs)` 결과를 `calc_results.jsx` 가 그린다 |
| `calc_chart_axes.jsx` · `calc_chart_legend.jsx` · `calc_chart_tip.jsx` · `calc_chart_table.jsx` | 그래프 축·격자·기준선 / 범례(계열 2개 이상) / 말풍선 / 접는 자료 표(접근성). 계열 색은 `tokens.css` `--chart-1…6`, 스타일 `calc.css` `.calc-chart-*` |
| `calc_physics.jsx` | 둘 이상의 계산기가 쓰는 순수 함수(몰부피·ppm 환산·Reynolds·흐름 구분·물 포화 압력/온도 IAPWS-IF97) |
| `calc_fire_common.jsx` | 화재·폭발 계산기 공용: 복사열 단계(`CALC_FIRE_FLUX_LEVELS` 4·5·12.5·37.5 kW/m²)·과압 단계(`CALC_BLAST_LEVELS` 1·3.5·8 psi), "참고용 스크리닝·KORA" 안내(`CALC_FIRE_NOTES`), 수증기 분압, 거리 풀기(`calcSolveDistance`) |
| `calc_fire_radiation.jsx` | 열복사 순수 함수: Burgess 연소 속도, Thomas 화염 높이, Shokri–Beyler·Mudan 방사 강도, 원통·구 형태계수, 대기 투과율(Pietersen·Cook), 점원 |
| `calc_fire_harm.jsx` | 과압·열복사 probit 상수(Eisenberg 1975)와 probit → % (`calcProbitToPercent`, `calcHarmErf`) |
| `calc_blast_curves.jsx` | Kinney–Graham TNT 과압, EPA RMP 식 C-2, BST 화염 마하수 표(Pierorazio 2005)·곡선 맞춤식(NOAA ALOHA 표 15). TNO 다중에너지 곡선은 공개 맞춤식 미확인으로 없음 |
| `calc_pool_fire.jsx` · `calc_bleve.jsx` · `calc_vce.jsx` · `calc_probit_harm.jsx` | 묶음 "화재·폭발"(`fire`): 풀 화재 · BLEVE 화구 · 증기운 폭발(TNT·BST) · 피해 probit. 시험 `frontend/scripts/tests/test_fire_explosion.cjs` |
| `calc_release.jsx` · `calc_source_term.jsx` | 계산기 `release` **누출량(source term)** — 구멍 액체(Bernoulli)·기체(막힘/아음속) 누출률, 탱크 배출 시간·누출 곡선, 용기 등온 감압 / 그 순수 함수(`calcSrc*`). 이어서 계산: 가우스 플룸·웅덩이 증발·장외 영향·BLEVE·VCE |
| `calc_offsite.jsx` · `calc_offsite_run.jsx` · `calc_offsite_chart.jsx` | 계산기 `offsite` **장외 영향 사전 검토(참고용 스크리닝, KORA 대체 아님)** — EPA RMP OCA 지침 최악·대안 누출률과 참조표 끝점 거리, 한국/미국 끝점 전환 / 입력 → 풀이 한 벌 / 쓴 표의 거리 곡선 |
| `calc_rmp_core.jsx` · `calc_rmp_data.jsx` | RMP 지침 식(3-1…10-1, C-2)·표 읽기 규칙·한국 끝점 사다리(ERPG-2 via DOE PAC → AEGL-2 시간창 → PAC-2) 순수 함수 / **생성 파일** — 지침 부록 B·C 표와 참조표 1–30(`scripts/portal_build/rmp_oca_extract.py` → `rmp_oca/rmp_oca_tables.json` → `gen_frontend_rmp.py`, 끝점은 `el/<CAS>.json`) |
| `kora_sheet_panel.jsx` · `kora_sheet_table.jsx` · `kora_sheet_print.jsx` · `kora_sheet_core.jsx` · `kora_sheet_labels.jsx` · `kora_sheet_labels_en.jsx` | `offsite` 계산기 아래 **KORA 입력 준비표**(정의의 `panel`, calc_form.jsx) — 물질(f/·el/ 정적 자료)·저장·시나리오·기상·지형·확인 7절, 인쇄(body.kora-printing, calc.css) / 표 / 인쇄 단추 / 순수 모양 함수 / 문구. 비공식·NICS 서식 아님. 시험 `frontend/scripts/tests/test_release_offsite.cjs` |
| `calc_next_data.jsx` · `calc_results_next.jsx` | 정의의 `links(values, outputs)` → "이어서 계산" 딥링크(`calcNextLinksFor`, 질량 → BLEVE·VCE `calcFireMassLinks`) / 그 링크 줄 컴포넌트 `CalcNextLinks`(CalcForm 이 그림, 스타일 calc.css `.calc-next-*`) |
| `calc_tank_losses.jsx` · `calc_area_class.jsx` | 묶음 "환경·배출" 저장탱크 증발 손실(US EPA AP-42 7.1 고정지붕, 정치+작업 손실, 예제 1·2 로 시험, 정의의 `links` → PRTR 지도) / 묶음 "누출" 폭발위험장소 구분 도우미(참고용: 누출 등급 → 구역 안내, 구멍 누출량·누출 특성값·가상 체적 V_z, KS C IEC 60079-10-1 표·그림은 싣지 않음) |
| `calc_facts_link.jsx` | 물성 `f/<CAS>.json` → 계산기 딥링크(`calcTankLossesHref`: 증기압 1점·끓는점·분자량, `calcAreaClassHref`: 분자량·LFL). HAZOP 작성기의 "이 물질로 다른 도구 열기"가 쓴다 |
| `calc_if97_coef.jsx` · `calc_if97.jsx` · `calc_if97_solve.jsx` | **증기표 IAPWS-IF97 자체 구현**: 계수표(1·2·3·5영역, B23) / 순방향 식·영역 고르기·3영역 밀도 풀이·포화 액체·증기(`if97PT`·`if97SatPair`, 4영역은 `calc_physics.jsx`) / 두 성질 풀이 `if97Solve`((p,T)·(p,h)·(p,s)·(T,x)·(p,x), 오류는 code). 시험 `scripts/tests/test_steam.cjs`(공식 검증표) |
| `calc_steam.jsx` · `calc_steam_chart.jsx` · `calc_steam_table.jsx` | 계산기 `steam`(증기표, T–s·몰리에 h–s 선도) / 그 그래프 자료(포화 돔·등압선, 순수) / 계산기 `steam_table`(포화 증기표 온도표·압력표, `table()` 로 표·복사·CSV) |
| `calc_psy_math.jsx` · `calc_psychro_chart.jsx` | 습공기 순수 함수(상태·코일 가열·냉각/제습·단열 혼합) / 습공기 선도 그래프 자료(포화선·RH 선·과정선). 계산기 정의는 `calc_psychro.jsx` |
| `calc_table_data.jsx` · `calc_table_out.jsx` | 정의의 `table(values, outputs)` 결과 표 순수 함수(단위 환산·CSV·TSV) / 그 패널 `CalcTableOut`(큰 표, 복사·CSV 받기 단추, `calc_form.jsx` 가 그린다). 작은 결과 표는 `calc_out_table.jsx` |
| `calc_reaction_math.jsx` · `calc_batch_reactor.jsx` | **반응·경제** 묶음(`reaction`): 반응공학 순수 함수(회분 n차·직렬 CSTR·Arrhenius 회귀·단열 T–X·평형 전환율·단열 PFR/CSTR 부피) / 계산기 `batch_reactor`(네 계산 + 그래프). 단일 CSTR·PFR 1차는 `calc_reactor.jsx` 그대로. 시험 `scripts/tests/test_calc_reaction.cjs` |
| `calc_runaway.jsx` | 계산기 `runaway` 열폭주 선별(참고용 스크리닝): ΔTad·MTSR·0차 TMRad·TD24·Stoessel 위험도 등급 1–5, TMRad–온도 그래프 |
| `calc_economics_math.jsx` · `calc_economics.jsx` · `calc_economics_ppi.jsx` | 경제성 순수 함수(용량 지수·NPV·IRR·회수 기간·CRF) / 계산기 `economics`(6/10 법칙·비용 지수·NPV·유틸리티) / 미국 BLS PPI 연평균 자료(데이터만, 공공 자료, `scripts/portal_build/bls_ppi_annual.py` 가 만듦). CEPCI 값은 싣지 않는다 |
| `calc_flue_gas.jsx` | 계산기 `flue_gas` 연소 배가스 분석: 습·건 조성, 측정 O₂·CO₂ → 과잉 공기, 수증기·황산 이슬점, 배가스 손실(1. BImSchV 계수). 이론 공기·연소 한계는 `calc_stoich_air.jsx` |
| `calc_mix_flash_point.jsx` · `calc_loc_moc.jsx` · `calc_purge.jsx` · `calc_static_charge.jsx` | **가연성·불활성화** 묶음(`flammability`, `calc_mix_lfl.jsx`·`calc_stoich_air.jsx` 도 여기): 액체 혼합물 인화점(Liaw 식, 이상 용액·2성분 곡선) / LOC·MOC 어림·관리 목표 O₂·OSFC·ISOC·연소 범위 도표(z·Cst 는 `calc_stoich_air.jsx` `calcStoichO2`·`calcStoichCst`) / 진공·압력·스위프 퍼지 횟수·N₂ 사용량 / 정전기 완화시간·도전율 등급·½CV² 대 MIE. 시험 `frontend/scripts/tests/test_calc_flammability.cjs` |
| `calc_flam_fill.jsx` · `api_calc_fill_flam.jsx` | 위 묶음의 행 채우기(`rowFill: "flash_point"`·`"flam_limits"`, 등록은 `api_calc_fill.jsx` `CALC_ROW_FILLERS`): 순수 함수(f/<CAS>.json → 인화점·Antoine B·C·분자량 / LFL·UFL) / API 층(물질 검색 → `fetchFacts`). `api_calc_fill.jsx` 보다 먼저 읽는다 |
| `calc_flash.jsx` · `calc_mccabe.jsx` · `calc_fug.jsx` · `calc_rayleigh.jsx` · `calc_absorption.jsx` | **분리공정** 묶음(`separation`, 화공기사 실기): 다성분 기포점·이슬점·Rachford–Rice 플래시(Raoult·Wilson·직접 K, 2성분 T–x–y·P–x–y) / McCabe–Thiele(α 또는 Raoult 쌍, q 선·Rmin·Nmin·계단 그래프) / Fenske–Underwood–Gilliland(Molokanov)·Kirkbride / Rayleigh 단증류(α 일정) / Kremser 흡수·탈거·최소 액기비·Colburn NTU·HTU. Kremser·Rayleigh 순수 함수는 정의 파일 위쪽. 시험 `scripts/tests/test_calc_separations.cjs` |
| `calc_sep_vle.jsx` · `calc_mccabe_steps.jsx` · `calc_shortcut_math.jsx` | 분리공정 순수 함수: 다성분 K 모형(Raoult·Wilson)·기포점·이슬점·Rachford–Rice·2성분 곡선(`calcSep*`, 2성분 γ 모델은 `calc_vle_solve.jsx` 따로) / McCabe–Thiele 평형·핀치·계단 / Fenske·Underwood·Gilliland·Kirkbride |
| `calc_antoine_facts.jsx` · `calc_table_field_fill.jsx` · `api_calc_fill.jsx` | 표 행 채우기(`rowFill`): Antoine 상수 꼴 바꾸기·사전 설정(CoolProp 맞춤, `calc_vle_antoine_data.jsx`) 찾기·f/<CAS>.json 증기압 1점 + 끓는점 두 점 맞춤(순수) / 행 단추 `CalcRowFill`(`calc_table_field.jsx` 가 그림) / API 층 `CALC_ROW_FILLERS`(물질 검색 → `fetchFacts`) |
| `calc_pid_tuning.jsx` · `calc_loop_sim.jsx` · `calc_tf_tools.jsx` | **공정제어** 묶음(`control`) 계산기 셋 — PID 튜닝 비교표(ZN 두 가지·Cohen–Coon·IMC·SIMC·ITAE, 두 점 맞춤) / 폐루프 모의(설정값·부하 계단, 방법별 그래프·IAE 표) / 전달함수 도구(1·2차 계단 응답, Routh 배열·Ku, Bode·GM·PM). 시험 `scripts/tests/test_process_control.cjs` |
| `calc_ctrl_fopdt.jsx` · `calc_ctrl_tuning.jsx` · `calc_ctrl_sim.jsx` | 공정제어 순수 함수: FOPDT·PID 주파수 응답·두 점 맞춤·한계 이득 / 튜닝 규칙 목록 `CTRL_TUNING_RULES`(규칙 하나 = 한 항목) / 이산 시간 폐루프 모의(데드타임 고리 버퍼)·성능 지표 |
| `calc_ctrl_routh.jsx` · `calc_ctrl_step.jsx` · `calc_ctrl_margins.jsx` | Routh 배열(ε·0 행 처리)·다항식 근(Durand–Kerner)·한계 이득 탐색 / 1·2차 계단 응답과 특성값 / Bode 점·이득·위상 여유 |
| `calc_out_table.jsx` | 결과 표 `CalcOutTable` — 출력 `type: "table"`(`{ columns, rows }`, 형식은 `calc_registry.jsx` 머리 주석)을 그린다. 스타일 `calc.css` `.calc-out-table`·`.calc-result-table` |
| `calc_pump_system.jsx` · `calc_control_valve.jsx` · `calc_compressor.jsx` · `calc_hx_ntu.jsx` · `calc_fittings_dp.jsx` · `calc_separator.jsx` | **설비 사이징** 묶음(`sizing`) — 펌프 곡선×계통 곡선 운전점·상사법칙 / 조절밸브 Kv·Cv(IEC 60534-2-1 액체·기체, 초크·FP·FR) / 압축기 등엔트로피·폴리트로픽·다단 중간 냉각 / 열교환기 ε-NTU 평가·설계·총괄 U / 피팅 손실 K·2-K·3-K + Moody 선도 / 기액분리기 Souders–Brown. 시험 사례 `scripts/tests/test_calc_sizing_cases.cjs`(`test_calculators.cjs` 가 부른다) |
| `calc_sizing_common.jsx` · `calc_fittings_data.jsx` | 설비 사이징 공용 순수 함수(Darcy 마찰계수·이분법·등간격·2차 최소제곱) / 2-K(Hooper 1981)·3-K(Darby) 피팅 계수 자료(데이터만) |
| `calc_engine.jsx` | 정의 + 화면 상태 → 검사(빈칸·숫자·범위)·단위 환산·계산(`calcEvaluate`), 처음 상태, 숫자 표기 |
| `calc_link.jsx` | 딥링크 읽기·만들기(`calcReadLink`·`calcHref`), MSDS 9항 분자량 읽기·물질 → 계산기 주소(`calcSubstanceHref`) |
| `calc_labels.jsx` | 계산기 화면 공용 문구 한국어(`CALC_LABELS_KO`) |
| `calc_labels_en.jsx` | 위 문구의 영어(`CALC_LABELS_EN`)와 화면이 읽는 `CALC_LABELS = langPick(KO, EN)`. 계산기 정의 안의 문구는 각 `calc_<이름>.jsx` 에서 `tr(한국어, English)` 쌍 |
| `calc_view.jsx` · `calc_nav.jsx` · `calc_form.jsx` | 최상위 화면 "공학 계산기" 셸 / 묶음별 목록 / 계산기 하나의 본문(상태) |
| `calc_field.jsx` · `calc_table_field.jsx` · `calc_unit_select.jsx` | 입력 칸(수치·선택) / 행 표(혼합물) / 단위 고르기 |
| `calc_results.jsx` · `calc_notes.jsx` | 결과(출력 단위 고르기·경고·오류) / 식·주의·근거 문헌 |
| `calc_substance_link.jsx` | 물질 상세 머리의 "이 물질로 계산하기"(분자량 채워 ppm ↔ mg/m³ 열기)·"기체 유량 단위 변환"(분자량 채워 `units` 기체 유량 열기, `calcSubstanceUnitsHref`) |
| `safety_rules_data.jsx` | **생성 파일**(고치지 않는다): 안전 도구 규칙 `SAFETY_RULES` = ghs(유해성 분류 표)·compat(혼촉 체계 3개·짝 규칙)·mixture(혼합물 상수). 원본 `scripts/portal_build/safety_rules/*.json`, `gen_frontend_rules.py` |
| `ghs_hazard_parse.jsx` | GHS 분류 글 → 유해성 항목(`ghp*`: KOSHA 2항·CLP 코드·SCL/M/ATE·직접 입력·MSDS 상세 항목). 파이썬 `ghs_parse.py` 와 같은 답(`tests/fixtures/safety_parse_cases.json`) |
| `compat_core.jsx` | 저장 혼촉 매트릭스 순수 함수(`cm*`: 정적 표/MSDS 상세 → 반응성 분류, 짝 판정, 매트릭스) |
| `mixghs_core.jsx` · `mixghs_sources.jsx` · `mixghs_examples.jsx` | 혼합물 GHS 분류 순수 함수(`mg*`: ATEmix·가산법·농도 한계·수생 합산·표지 요소) / 행 → 성분(부속서 VI·KOSHA·직접 입력) / ECHA 예제 자료 |
| `safety_tools_labels.jsx` · `safety_tools_labels_en.jsx` | 안전 도구 문구(`SAFETY_LABELS_KO` / `_EN` → `SAFETY_LABELS`) |
| `api_safety_tools.jsx` | 안전 도구 훅: 정적 `g/reactive_class.json`·`g/clp_annex6.json`(`useSafetyTables`), 고른 물질 MSDS(`useToolSubstances`), 물질 고르기 검색 |
| `safety_tools_nav.jsx` · `safety_substance_picker.jsx` · `safety_basis.jsx` | 안전 도구 공용: 도구 목록(`SAFETY_TOOLS`, 한 줄 등록)·바로가기 줄(계산기 화면에도) / 물질 고르기 / 근거·참고용 안내 |
| `compat_view.jsx` · `compat_matrix.jsx` · `compat_pair_list.jsx` · `compat_classes.jsx` | 화면 "저장 혼촉 매트릭스"(`?view=compat&cas=A,B`) 셸 / 판정 표 / 짝별 이유 / 물질별 분류 |
| `mixghs_view.jsx` · `mixghs_row.jsx` · `mixghs_result.jsx` · `mixghs_steps.jsx` | 화면 "혼합물 GHS 분류"(`?view=mixghs`) 셸 / 성분 한 행 / 결과·표지 요소(그림문자 `assets/ghs/GHS0N.svg`) / 단계별 근거 |
| `hazop_data.jsx` · `hazop_labels.jsx` · `hazop_labels_en.jsx` | HAZOP 작성기 자료(변수×가이드워드 조합·설비·H 문구 → 유해성·위험도 척도·기록지 열, 문구 없음) / 문구·이탈 이름·제안 목록(`HAZOP_LABELS_KO` / `_EN` → `HAZOP_LABELS`) |
| `hazop_core.jsx` · `hazop_ops.jsx` · `hazop_store.jsx` · `api_hazop.jsx` | 순수 함수(`hz*`: 이탈 이름·위험도 S×L·저장 값 정리·CSV·제안 묶음) / 고치기(`hzOp*`) / localStorage `chemip-hazop-v1`(try/catch, 이 브라우저만) / 물질 자료 훅(MSDS 2항·물성·사고 사례). 시험 `frontend/scripts/tests/test_hazop.cjs` |
| `hazop_view.jsx` · `hazop_study_head.jsx` · `hazop_toolbar.jsx` · `hazop_print.jsx` · `hazop_node_list.jsx` · `hazop_node_form.jsx` · `hazop_guide_matrix.jsx` · `hazop_sheet.jsx` · `hazop_row.jsx` · `hazop_risk_badge.jsx` · `hazop_risk_settings.jsx` · `hazop_suggest_panel.jsx` · `hazop_tool_links.jsx` | 화면 "HAZOP 워크시트"(`?view=hazop`, 안전 도구 줄) 셸 / 검토 개요 / CSV·인쇄·예시·새로 시작 / 인쇄 기록지(`body.hz-printing`) / 검토구간 목록 / 구간 정보·물질 / 변수×가이드워드 표 / 기록지 / 한 줄(KOSHA C-C-37 열 순서) / 위험도 배지 / 위험도 기준 / 제안 목록 / 다른 도구 링크. 스타일 `calc.css` `.hz-*` |
| `apl_psm_data.jsx` · `apl_hazmat_data.jsx` · `apl_cca_data.jsx` · `apl_cites.jsx` | 적용 법규 판정기 자료(법령 옮겨 적기, ko·en): 산안법 시행령 별표 13 규정량 51종(`APL_PSM`) / 위험물 시행령 별표 1 지정수량·별표 6 안전관리자·제15–18조·별표 8·방유제 비율(`APL_HAZMAT`) / 화관법 규정수량 판정 틀(`APL_CCA`, 수량은 정적 `g/hazchem_quantity.json`) / 근거 조문 key → 이름·law.go.kr 주소(`APL_CITES`) |
| `apl_units.jsx` · `apl_psm_core.jsx` · `apl_cca_core.jsx` · `apl_hazmat_core.jsx` · `apl_dike_core.jsx` · `apl_evaluate.jsx` · `apl_report.jsx` | 판정 순수 함수: 수량 환산 / PSM R = ΣC/T / 화관법 최하위·하위·상위·1군·2군 / 위험물 배수·제조소등별 허가·안전관리자·예방규정·자체소방대 / 방유제 110 %·최대보유량 / 세 법 한 번에(`aplEvaluate`) / CSV. 시험 `frontend/scripts/tests/test_applicability.cjs` |
| `apl_terms.jsx` · `apl_examples.jsx` · `apl_labels.jsx` · `apl_labels_en.jsx` | 칸·결과 → 용어 key(`APL_TERMS`) / 예시 취급량 표 / 문구(`APL_LABELS_KO` / `_EN` → `APL_LABELS`, "위반" 표현 없음) |
| `api_applicability.jsx` | 판정기 자료 훅: 규정수량 정적 파일(`useAplQuantities`), 물질별 NCIS 분류·MSDS 물성·위험물 유별(`useAplInfos`) |
| `apl_view.jsx` · `apl_inventory.jsx` · `apl_row.jsx` · `apl_summary.jsx` · `apl_law_psm.jsx` · `apl_law_cca.jsx` · `apl_law_hazmat.jsx` · `apl_dike.jsx` · `apl_export.jsx` · `apl_print.jsx` · `apl_disclaimer.jsx` · `apl_common.jsx` | 화면 "적용 법규 판정기"(`?view=applicability`, 계산기 안전 도구 줄) 셸 / 취급량 표 / 한 행 / 법별 요약 / PSM·화관법·위험물 패널 / 방유제 도우미 / 인쇄·CSV / 인쇄 전용 표 / 사전 검토용 안내 / 배지·근거 링크·이유 목록. 스타일 `calc.css` `.apl-*` |
| `ghs_labels.jsx` · `ghs_labels_en.jsx` | GHS 그림문자 이름·경고표지 만들기 문구(`GHS_LABELS_KO` / `_EN` → `GHS_LABELS`). 표지 안의 글은 화면 언어가 아니라 표지 언어로: `ghsSheetLabels(lang)` |
| `ghs_helpers.jsx` | GHS 순수 함수: MSDS 2항 원문 읽기(`ghsParsePictograms` "GHS02.gif\|GHS07.gif" → 코드, `ghsParseSignal`, `ghsParseStatements` H/P 줄, `ghsSection2`), 그림 경로 한 곳 `ghsPictogramSrc` → `assets/ghs/GHSnn.svg` |
| `ghs_label_build.jsx` | 경고표지 순수 함수: 2항 → 입력 칸, 문구표 채우기·표지 언어로 바꾸기, 예방조치문구 줄이기(6개 + MSDS 참고), 표지 내용 `ghsBuildLabel`, 크기 키(치수는 `checklist_print.css`) |
| `ghs_label_url.jsx` | 딥링크 `?view=ghslabel&chem=&pict=&size=&llang=` 읽기·만들기 |
| `api_ghs.jsx` | H/P 문구표 `assets/ghs/phrases.json`(`useGhsPhrases`), 표지를 채울 물질 상세(`useGhsLabelSource`, 정적 먼저) |
| `ghs_label_store.jsx` | 공급자 정보 기억(localStorage, 이 브라우저만) |
| `ghs_pictogram_row.jsx` · `ghs_msds_pictograms.jsx` | 그림문자 그림 줄(대체 글 ko/en) / MSDS 탭 2항 "그림문자" 값을 그림으로 |
| `ghs_label_view.jsx` | 최상위 화면 "경고표지 만들기"(`?view=ghslabel`, 계산기 아래) 셸 |
| `ghs_label_status.jsx` · `ghs_label_toolbar.jsx` · `ghs_label_print.jsx` | 안내 줄 / 크기·표지 언어·줄이기·인쇄 / 인쇄 단추(`body.gl-printing`, 포털) |
| `ghs_label_form.jsx` · `ghs_label_pict_picker.jsx` · `ghs_label_statement_field.jsx` · `ghs_label_supplier_fields.jsx` | 입력 칸 / 그림문자 고르기 / H·P 문구 칸 / 공급자 칸 |
| `ghs_label_preview.jsx` · `ghs_label_fit.jsx` · `ghs_label_sheet.jsx` · `ghs_label_sheet_line.jsx` | 미리 보기 / 틀에 맞춰 줄이는 훅 / 표지 한 장(미리 보기·인쇄 공용) / H·P 한 줄 |
| `ghs_label_link.jsx` | 물질 상세 머리의 "경고표지 만들기" 링크 |
| `usearch_provider_ghslabel.jsx` | 통합 검색 묶음 "경고표지(GHS 라벨)": 도구 + 그림문자 9종 |
| `assets/ghs/` | GHS 그림문자 SVG 9개(UNECE, 공공 영역)·H/P 문구표 — 출처·라이선스는 그 폴더 README |
| `calc.css` | 계산기 화면 스타일(`.calc-*`, 토큰 변수만) |
| `term_glossary.jsx` | **용어 설명 자료** 한국어(`TERM_GLOSSARY_KO` = { key: { term, def, unit?, ref? } }, 계산기 용어 전부)와 문구 `TERM_HINT_LABELS_KO`. 정의는 여기 한 곳 |
| `term_glossary_en.jsx` | 같은 key 의 영어 이름·정의(`TERM_GLOSSARY_EN`, 한글 든 단위·근거만 따로)와 화면이 읽는 `TERM_GLOSSARY`·`TERM_HINT_LABELS = langPick(KO, EN)` |
| `term_hint.jsx` | 공용 용어 설명 `TermHint({ term })` — "?" 단추, hover·초점·터치로 열고 Esc·바깥 누르기·스크롤로 닫음, `aria-describedby`. 지금은 계산기(칸·표 머리·결과)에서만 쓴다 |
| `term_hint.css` | 용어 설명 스타일(`.th-*`, 토큰 변수만. 560px 이하는 화면 아래쪽에 폭 맞춤) |
| `usearch_labels.jsx` · `usearch_labels_en.jsx` | 통합 검색 문구(`USEARCH_LABELS_KO` / `_EN` → `USEARCH_LABELS`): 묶음 이름, 예시 검색어, MSDS 항목 안의 낱말(`msdsKeywords`, 예: 인화점 → 9항), 화면 바로가기 설명·낱말(`screens`). 검색은 한·영 두 벌을 모두 맞춘다 |
| `usearch_core.jsx` | 통합 검색 순수 함수(`us*`): 정규화·맞춤 점수(같음 > 앞부분 > 낱말 앞 > 포함)·문서 순위·묶음 모양(위 몇 건·더 보기)·묶음 순서(딱 맞는 묶음을 위로)·강조 조각 |
| `usearch_link.jsx` | 주소 `?view=search&q=`(만들기·처음 검색어·주소 맞추기), 다른 화면에서 열기 `usearchOpen` |
| `usearch_provider_<이름>.jsx` | **통합 검색 묶음 하나**(`USP_*`: key·아이콘·보일 건수·`search(q)`): `substances`(물질 검색 그대로) · `calculators`(`CALC_REGISTRY` + 쓰는 용어) · `terms`(용어사전 전체 `GLOSSARY_ENTRIES` → `?view=glossary&term=`) · `msds`(16개 항목) · `guides`(KOSHA 기술지침 제목+본문: 정적 본문 색인 `gs/` → 없으면 제목 목록 `g/guide_index.json` → 없으면 `/api/guides/search`) · `screens`(화면 바로가기) |
| `usearch_providers.jsx` | **통합 검색 묶음 등록 목록**(`USEARCH_PROVIDERS`, 형식은 머리 주석) — 묶음 하나 = 파일 하나 + 한 줄 |
| `api_usearch.jsx` | 묶음을 한꺼번에 돌리는 훅 `useUnifiedSearch`(묶음마다 상태 따로), 기술지침 목록 읽기 `fetchGuideIndexRows`·`fetchGuideSearchLive` |
| `guide_text_core.jsx` | KOSHA 기술지침 본문 검색 순수 함수(`gt*`: 정규화·두 글자 조각·조각 번호·후보 교집합·순서·본문 확인·발췌). 만드는 쪽 `scripts/static_export/guide_text_build.py` 와 같은 규칙, 형식 `CONTRACT.md` "gs/" |
| `api_guide_text.jsx` | 본문 색인 파일 받기 `fetchGuideFullText`(목록 → 조각 → 후보 12건 본문 확인), 색인이 없으면 null |
| `glossary_<분류>.jsx` · `glossary_<분류>_en.jsx` | **용어사전 자료** 분류 하나(`GLOSSARY_<분류>_KO` / `_EN`, 같은 key): psm·fire·ih·tox·reg·hazmat·unitop·thermo·fluid·control. 항목 `{ term, def, alias?, law?, lawUrl?, unit?, ref?, exams?, calc?, view?, see?, src }` |
| `glossary_registry.jsx` | **용어사전 등록 목록**(`GLOSSARY_CATS`, 분류 하나 = 파일 두 개 + 한 줄), 계산기 용어의 분류 규칙, 시험·화면 key |
| `glossary_core.jsx` · `glossary_entries.jsx` | 용어사전 순수 함수(`gl*`: 항목 묶기·첫 글자 색인 ㄱ–ㅎ·A–Z·거르기·검색 문서) / 화면 언어로 묶은 전체 목록 `GLOSSARY_ENTRIES`(분류 자료 + `TERM_GLOSSARY` + `GLOSSARY` 약어) |
| `glossary_labels.jsx` · `glossary_labels_en.jsx` · `glossary_link.jsx` | 용어사전 문구(`GLOSSARY_LABELS`) / 주소 `?view=glossary&term=<key>&cat=<분류>` |
| `glossary_view.jsx` · `glossary_toolbar.jsx` · `glossary_index_bar.jsx` · `glossary_entry.jsx` · `glossary_entry_meta.jsx` | 최상위 화면 "용어사전" 셸 / 머리(찾기·시험·분류) / 첫 글자 색인 / 항목 하나 / 펼친 자세한 칸(근거 조문 링크·관련 용어·계산기·주소 복사). 스타일 `product_search.css` `.gl-*` |
| `usearch_provider_identifiers.jsx` · `usearch_provider_transport.jsx` | 통합 검색 묶음 `identifiers`(EC·KE·InChIKey → 물질, 정적 `f/id_<n>.json`) · `transport`(UN1114·1114 → UN 요약 줄 + 물질들, 정적 `g/un_index.json`). 번호 모양이 아니면 요청하지 않는다 |
| `usearch_answers.jsx` | **통합 검색 "바로 답" 등록 목록**(`USEARCH_ANSWERS`, 형식은 머리 주석) — 답 하나 = `usearch_answer_<이름>.jsx` + 한 줄. 묶음 위에 카드로 보인다 |
| `usearch_answer_facts.jsx` · `facts_answer_card.jsx` | 바로 답 "물질 + 물성"(벤젠 인화점·benzene flash point → 값·조건·원출처·출처 배지·물질 링크) / 그 카드 |
| `api_usearch_answers.jsx` · `usearch_answers_view.jsx` | 답을 한꺼번에 돌리는 훅 `useUnifiedAnswers` / 묶음 위 답 자리 `UsAnswers` |
| `facts_labels.jsx` · `facts_labels_en.jsx` | 물성·식별자·운송 문구(`FACTS_LABELS_KO` / `_EN` → `FACTS_LABELS`). `props[k].words` = 물성 낱말(검색어 읽기에 한·영 두 벌 모두 씀) |
| `facts_core.jsx` | 물성 사실 순수 함수(`facts*`): 검색어 읽기(`factsParseQuery`)·물질 고르기·값 표기·답 카드 모양·"주요 물성" 줄 모양·번호 모양(EC·KE·InChIKey·UN) |
| `api_static_facts.jsx` · `api_facts.jsx` | 정적 `f/<CAS>.json`·`f/id_<n>.json`·`g/un_index.json` 읽기(없으면 null, `/api` 없음) / 화면·묶음용 `fetchFacts`·`fetchIdLookup`·`fetchUnEntry`·`fetchFactsAnswer`·`useFacts` |
| `product_facts_strip.jsx` | 물질 상세 머리 아래 "주요 물성" 한 줄(인화점·끓는점·녹는점·폭발 범위·자연발화·증기압·비중·분자량·UN). 스타일 `product_detail.css` `.pd-facts*` |
| `usearch_view.jsx` | 최상위 화면 "통합 검색"(`?view=search`) 셸 — 검색어 상태·주소 맞추기·배치만 |
| `usearch_box.jsx` · `usearch_group.jsx` · `usearch_item.jsx` · `usearch_mark.jsx` | 통합 검색 머리(검색창·예시) / 묶음 하나(이름·건수·더 보기) / 결과 한 건 / 검색어 강조 |
| `usearch_empty_line.jsx` · `usearch_no_results.jsx` | 결과 없는 묶음 한 줄 / 모두 없을 때 안내 |
| `usearch_topbar.jsx` | 상단 바 검색창 `TopbarSearch`(1280px 이상 검색창, 900px 이하 돋보기 단추, 그 사이는 숨김) → 통합 검색 |
| `reg_view.jsx` | 최상위 화면 "규제 목록"(`?view=reg`, 목록 하나는 `&list=<id>`) 셸 — 고른 목록·주소 맞추기·배치만. 화면 바로가기·통합 검색으로 연다 |
| `reg_index.jsx` · `reg_list_card.jsx` | 목록 전체(거르기·나라 고르기·묶음별) / 목록 한 장 |
| `reg_list_detail.jsx` · `reg_list_head.jsx` · `reg_rows.jsx` · `reg_pager.jsx` · `reg_back_link.jsx` | 목록 하나(목록 안 찾기·50건씩) / 머리(법령·개정일·라이선스·원문) / 등재 물질 줄(CAS → 물질 화면) / 쪽 넘기기 / "← 규제 목록" |
| `reg_changes_panel.jsx` · `reg_change_item.jsx` | "최근 변경" 패널(RSS 구독 링크 `v1/reg/changes.xml`) / 변경 한 건 |
| `reg_helpers.jsx` | 규제 목록 순수 함수(`reg*`: 화면 언어 이름·거르기·묶음·쪽·조각·변경 표시·주소). 시험 `frontend/scripts/tests/test_reg_lists.cjs` |
| `api_reg.jsx` | 규제 목록 정적 파일(`v1/reg/`, CONTRACT.md "reg/") 훅 `useRegLists`·`useRegChanges`·`useRegList`(긴 목록은 필요한 조각만). 뿌리 = 정적 pages 뿌리, 꺼져 있으면 같은 주소 `/data/v1`(PC: 백엔드 `routes/static_areas.py`). 집 PC `/api` 는 쓰지 않는다 |
| `reg_labels.jsx` · `reg_labels_en.jsx` · `reg_list_names_en.jsx` | 규제 목록 문구(`REG_LABELS_KO` / `_EN` → `REG_LABELS`) / 목록 id → 영어 이름(`REG_LIST_ENGLISH_NAMES`, 국가별 규제 DB 는 `PRODUCT_LABELS_EN.intl.listNames`) |
| `usearch_provider_reglists.jsx` | 통합 검색 묶음 "규제 목록"(`v1/reg/lists.json` 이름·법령·나라 → `?view=reg&list=<id>`) |
| `law_view.jsx` | 최상위 화면 "국내 법령 보기"(`?view=law&law=<id 또는 이름>&art=<조번호>&q=<찾을 말>`) 셸 — 주소 상태·맞추기·배치만. 규제 목록 머리·물질 「국내 근거 조문」·적용 법규 판정기·통합 검색으로 연다 |
| `law_index.jsx` · `law_corpus_results.jsx` | 법령 목록(법령·행정규칙 묶음, 말뭉치 찾기 칸) / 찾은 법령 이름·조문 제목·장절(`toc.json`) |
| `law_doc.jsx` · `law_doc_head.jsx` · `law_doc_search.jsx` · `law_toc.jsx` · `law_article.jsx` · `law_annexes.jsx` · `law_history.jsx` | 법령 하나(탭: 조문·별표·연혁) / 머리(종류·부처·공포·시행·법제처 원문) / 안에서 찾기(맞는 조문만, `q=`) / 차례(장·절 깊이, 누르면 `art=`) / 조문 하나(항·호·목 들여쓰기, 앵커 `law-art-<번호>`, 법제처 조문 링크) / 별표·서식(제목·PDF·원본) / 연혁 |
| `law_link.jsx` · `law_highlight.jsx` · `law_source_note.jsx` · `law_cite_links.jsx` · `law_corpus_link.jsx` | 공용 조각: `?view=law` 링크(같은 화면이면 상태만) / 찾을 말 `<mark>` / 출처·저작권법 제7조·사본 안내 / 근거 조문 링크 묶음(ChemIP·법제처·별표 PDF) / 법제처 주소 옆 "ChemIP 에서 보기"(말뭉치에 있을 때만, 적용 법규 판정기) |
| `law_core.jsx` | 법령 순수 함수(`law*`): 주소·조 표기·앵커·법제처 주소 읽기/만들기·이름 찾기·말뭉치 찾기·행정규칙 본문 줄 나누기·조문 줄·찾기·표시·차례·CAS 조각·물질 패널 모양. 시험 `frontend/scripts/tests/test_law_viewer.cjs` |
| `api_law.jsx` | 정적 `law/`(CONTRACT.md "law/": `index.json`·`toc.json`·`lists.json`·`<id>.json`·`cas_<n>.json`) 받기·훅 `useLawIndex`·`useLawToc`·`useLawDoc`·`useLawProvisions`. 뿌리 = 정적 pages 뿌리, 꺼져 있으면 `/data/v1`(PC: 백엔드 `static_areas.py`) |
| `law_labels.jsx` · `law_labels_en.jsx` | 법령 보기·국내 근거 조문 문구(`LAW_LABELS_KO` / `_EN` → `LAW_LABELS`). 법령 본문·이름은 원문(한국어) 그대로, 영어 화면은 "한국어 원문만" 안내 |
| `product_law_basis.jsx` · `law_basis_list.jsx` · `law_basis_card.jsx` · `law_cite_chip.jsx` · `law_excerpt.jsx` · `law_mention_list.jsx` | 물질 상세 아래 패널 "국내 근거 조문"(섹션 `id="kr-law"`, `?anchor=kr-law`, 국가별 규제 바로 아래): 목록마다 카드(목록 이름 / 할 일 한 줄 / 역할(근거 정의·의무 조항·대상 목록) 붙은 약칭 인용 칩 → 국내 법령 보기 / 접힌 "조문 보기" 발췌) · 접힌 "조문에 물질 이름이 나오는 곳" · 작은 꼬리말. EPC 검색(`product_provisions.jsx`)은 나라 지도에 그대로 |
| `law_cite_format.jsx` | 패널 인용 표기 순수 함수: `<개정>` 꼬리표 빼기·발췌 줄 나누기 `lawExcerptLines`, 인용 역할 `lawCiteRole`, 법령 약칭 `lawShortName`, 영어 조문 표기 `lawShortLabel` (시험 `test_law_basis_panel.cjs`) |
| `law_short_labels.jsx` · `law_short_labels_en.jsx` | 법령 약칭 자료(화관법·안전보건규칙… / Chemicals Control Act…), 시행령·시행규칙 꼬리 |
| `law_duty_labels.jsx` · `law_duty_labels_en.jsx` | 목록 id → "이 목록이면 할 일" 한 줄 + 받치는 조문(`src`, 현행 본문에 있는지 시험) |
| `product_handlers.jsx` | 취급 사업장(PRTR) 패널 — 자료가 있으면 "시도별 취급 사업장 지도로 보기" 링크(`?view=prtr&cas=`) |
| `product_oel.jsx` | 물질 상세 아래 패널 "노출기준 비교"(섹션 `id="oel"`, `?anchor=oel`) 셸: 단위 고르기·표·링크만 자료·면책 줄. 값은 출처별 참고값(적합 판정 없음) |
| `oel_table.jsx` · `oel_cell.jsx` · `oel_source_badge.jsx` · `oel_unit_toggle.jsx` · `oel_links.jsx` | 위 패널 하위: 표(줄 = 관할+출처, 열 = TWA·STEL·C·IDLH·표시·기준일) / 칸 하나(계산값 ≈) / 관할·출처 배지(원문 링크, 라이선스는 title) / 원문 단위·ppm·mg/m³ / ACGIH TLV·GESTIS 링크(값 없음) |
| `oel_helpers.jsx` | 노출기준 순수 함수(`oel*`): 파일 → 표 묶음, ppm ↔ mg/m³(계산기의 `calcPpmToMgm3`·`calcMgm3ToPpm`, 24.45 L/mol), 분자량(파일 `mw` → MSDS 9항), 통합 검색어 읽기·대표값 줄 |
| `oel_labels.jsx` · `oel_labels_en.jsx` | 노출기준 문구(`OEL_LABELS_KO` / `_EN` → `OEL_LABELS`), 출처 이름, 검색 낱말 `queryWords`(한·영 두 벌 모두 씀) |
| `api_oel.jsx` | 노출기준 정적 파일 `oel/<CAS>.json`·`g/oel_summary.json`(CONTRACT.md "oel/") 받기·훅 `useOelLimits`. 정적이 꺼져 있으면 같은 주소 `/data/v1`(PC: 백엔드 `static_areas.py`) |
| `product_el.jsx` | 물질 상세 아래 패널 "비상대응 기준"(섹션 `id="el"`, `?anchor=el`, 노출기준 비교 바로 아래) 셸: AEGL 표·PAC 표·RIVM probit 줄·노출기준과 견주기·면책(KORA) 줄 |
| `el_aegl_table.jsx` · `el_pac_table.jsx` · `el_value_cell.jsx` · `el_probit_line.jsx` · `el_oel_compare.jsx` | 위 패널 하위: AEGL-1·2·3 × 10분~8시간 / PAC-1·2·3·근거 계열·ERPG(DOE PAC 경유, 있을 때만) / 칸 하나(NR·ND·LEL 별표, ≈ mg/m³) / probit 식·계산기 링크 / TWA·IDLH·AEGL-2·PAC-2 칩·독성 끝점·`#oel` 링크 |
| `el_helpers.jsx` | 비상대응 기준 순수 함수(`el*`): 표 줄, 독성 끝점(ERPG-2 → AEGL-2 60분 → PAC-2), 노출기준 칩, 통합 검색어 읽기(`factsParseQuery` 재사용)·바로 답 모양 |
| `el_labels.jsx` · `el_labels_en.jsx` | 비상대응 기준 문구(`EL_LABELS_KO` / `_EN` → `EL_LABELS`), 검색 낱말 `query.props`(AEGL·ERPG·PAC·전체, 한·영) |
| `api_el.jsx` | 비상대응 기준 정적 파일 `el/<CAS>.json`·`el/index.json`(CONTRACT.md "el/") 받기·훅 `useEmergencyLimits`(→ `{ file, index }`)·바로 답 `fetchElAnswer` |
| `el_answer_card.jsx` · `usearch_answer_el.jsx` | 통합 검색 바로 답 "<물질> AEGL·ERPG·PAC" 카드 / 등록 객체 `USA_EL`(`usearch_answers.jsx` 한 줄) |
| `calc_toxic_probit.jsx` · `calc_toxic_probit_data.jsx` | 계산기 "독성 probit": Pr = a + b·ln(Cⁿ·t) → 치사 비율·LC1·LC50·1 %/50 % 까지 시간, 그래프(% 대 농도, 10·30·60분) / RIVM probit 상수 62종(`scripts/portal_build/gen_probit_data.py` 가 만든 파일, 손으로 고치지 않음) |
| `product_tp.jsx` | 물질 상세 아래 패널 "온도별 물성"(섹션 `id="tp"`, `?anchor=tp`) 셸: 물성 고르기·단위·온도 입력·그래프(`CalcChart`)·고른 온도 표·상수 표·Antoine 계산기 링크 |
| `tp_forms.jsx` | 상관식 계산 순수 함수 — 식 하나 = 함수 하나(`TP_FORMS`: ChemSep eq10·11–17·100–107·114–116·120·121, NASA-9 `tpNasa9` Cp·H·S), `tpEval`(범위 밖 null), 분리 계산기용 `tpPsatFromFile`·`tpPsatInverse` |
| `tp_props.jsx` · `tp_helpers.jsx` | 물성 묶음·단위 모드 자료(`TP_PROPS`·`TP_UNITS`, 묶음 하나 = 한 줄) / 표시 순수 함수(`tpChartProps`·`tpPointRows`·`tpConstRows`·`tpConvert`·`tpAntoineLink`) |
| `tp_labels.jsx` · `tp_labels_en.jsx` | 온도별 물성 문구(`TP_LABELS_KO` / `_EN` → `TP_LABELS`) |
| `api_tp.jsx` | 정적 `tp/<CAS>.json`·`tp/index.json`(CONTRACT.md "tp/") 받기·훅 `useTpProps`, **분리 계산기용** `loadTpPsatFn(cas)` → `{ fn(T K) → Pa | null, Tmin, Tmax, src }`(받은 파일은 기억), `tpPsatFn(cas)`(받은 뒤 동기, 요청 없음) |
| `tp_prop_picker.jsx` · `tp_unit_toggle.jsx` · `tp_temp_input.jsx` · `tp_point_table.jsx` · `tp_const_table.jsx` · `tp_source_badge.jsx` | 위 패널 하위: 물성 고르기 / K·몰 ↔ °C·질량 단위 / 온도 칸 / 고른 온도 값 표(범위 밖 "범위 밖") / 임계·기준 상수(출처 여럿) / 출처 배지(라이선스·인용은 title) |
| `calc_joback.jsx` · `calc_joback_groups.jsx` · `calc_joback_smiles.jsx` | 계산기 `joback`(Joback & Reid 1987 기여도법) / 41개 원자단 표(자료) / SMILES → 원자단(순수, 외부 라이브러리 없음). 시험 `scripts/tests/test_calc_joback.cjs` |
| `prtr_map_view.jsx` | 최상위 화면 "취급 사업장 지도"(`?view=prtr&cas=<CAS>`, `parent: "product"`) 셸 — 물질·지표·지역 상태와 배치만 |
| `prtr_map_labels.jsx` · `prtr_map_labels_en.jsx` | 위 화면 문구(`PRTR_MAP_LABELS_KO` / `_EN` → `PRTR_MAP_LABELS`), 통합 검색 낱말(`usearch`). 위험성·위반 판단 표현은 쓰지 않는다 |
| `prtr_map_helpers.jsx` | 위 화면 순수 함수(`prtr*`: 파일 행 → 객체, 물질 거르기, 지역 이름, 지도 칸 색·범례(제곱근 5칸, tokens 변수), 지역별 사업장·시군구, 주소) |
| `api_prtr.jsx` | 지도 자료 훅 `usePrtrIndex`·`usePrtrSubstance`(정적 `prtr/index.json`·`prtr/<CAS>.json` → 꺼져 있으면 `/api/prtr/*`; 정적 404 = "자료 없음") |
| `prtr_map_geo.jsx` | **생성 파일** — 한국 시도 경계 17개 TopoJSON(`PRTR_GEO_TOPO`, 23 KB)과 출처(`PRTR_GEO_SOURCE`: geoBoundaries gbOpen KOR ADM1 = Natural Earth, Public Domain). `scripts/geo/build_kr_sido_topo.py` 로 다시 만든다 |
| `prtr_geo.jsx` | 위 경계 → d3 Mercator 경로(한 번만, `usePrtrGeoPaths`) |
| `prtr_substance_picker.jsx` · `prtr_metric_switch.jsx` | 물질 고르기(거르기·고르기 상자·사업장 많은 물질) / 지도 지표(사업장 수·배출량·이동량) |
| `prtr_choropleth.jsx` · `prtr_map_legend.jsx` | 시도 단계 구분도(누르기·키보드로 지역 고르기) / 범례 |
| `prtr_region_table.jsx` | 시도별 표(지도와 같은 값, 화면 읽기·390px 대안, 이름 단추로 지역 고르기) |
| `prtr_region_detail.jsx` · `prtr_sigungu_list.jsx` · `prtr_facility_table.jsx` | 고른 지역(없으면 전국) 절 / 시군구별 사업장 수 / 사업장 목록(신고 합계 큰 순, 20곳씩) |
| `prtr_map_stats.jsx` · `prtr_source_note.jsx` | 합계 한 줄 / 출처(PRTR·연도·라이선스, 경계 출처)와 "신고 값 그대로, 판단 없음" 안내 |
| `usearch_provider_prtr.jsx` | 통합 검색 묶음 "취급 사업장 지도(PRTR)": 자료 있는 물질(한·영·CAS) → 지도 링크, 화면 바로가기 한 줄 |
| `use_in_view.jsx` | `useInView` — 아래 패널이 화면에 다가오면 요청 |
| `section_anchor.jsx` | `?anchor=<키>` → 아래 패널로 스크롤(키 표 `SECTION_ANCHORS`, 링크 규약 `docs/integration/LINK_CONTRACT_v9.md`) |
| `product_format.jsx` | 숫자 표기 순수 함수(`fmtMass`·`fmtKg`·`fmtUsd`) |
| `intl_regions.jsx` | 나라·기구 이름(ko·en)과 지도 ISO 코드(`INTL_JURISDICTIONS`), 화면 언어 이름 `jurisdictionName`·버튼 이름 `jurisdictionLabel` |
| `intl_world.jsx` | 세계 지도 바탕 자료(`data/world-110m.json` → d3 경로, `useWorldPaths`) |
| `product_intl_helpers.jsx` | 국가별 규제 순수 함수(지도 색인·목록 묶음·지도 칸 색·임계량 축) |
| `product_intl_map.jsx` | 국가별 규제 지도와 관할 버튼 줄 |
| `product_thresholds.jsx` | 나라별 임계량 비교 |
| `product_provisions.jsx` | 나라별 근거 조문 검색 결과(EPC, 미리 받아 둔 답이면 기준 날짜 표시). KR 이면 법제처 본문 기반 「국내 근거 조문」(`#kr-law`)으로 가는 안내 줄 |
| `product_intl.jsx` | 국가별 규제 패널 셸(통계·지도·목록 배치) |
| `intl_merge.jsx` · `api_intl.jsx` | 국가별 규제 자료 정리 순수 함수(`intlDedupe`: 같은 목록의 이름 표기만 다른 줄 하나로·aka·형태별 forms, `intlNamedItems`·`intlCombine`: 상대국 법령 목록 intl_lists/ 합치기) / 그 자료 받기(`fetchIntlCombined`: 정적 p 파일 intl + intl_lists + g/rulebook.json, /api 면 named_lists). 서버 쪽 같은 규칙 `backend/core/intl_dedupe.py` |
| `api_static_intl.jsx` | 정적 자료에 p/ 뒤 덧붙인 조각 합치기: `g/intl_add*`(상대국 법령 목록 추가분)·`g/intl_reg_add*`(국가별 규제 DB 코드 추가분) 읽기, 정적 `staticIntl`(서버와 같은 모양: 이름 합침·코드 순·`named_lists`)·`staticTradeControls`(조각이 있으면 규칙집으로 다시 조립). PC 꺼짐 = PC 켜짐 시험 `frontend/scripts/tests/test_static_trade.cjs` |
| `api_reach.jsx` · `intl_reach.jsx` · `reach_format.jsx` | EU REACH 등록 현황: 묶어 둔 g/intl_add(약 250종) 아니면 `GET /api/reach/<CAS>`(Worker·PC 같은 답, 물질 하나만 그때그때 ECHA CHEM 조회·캐시) 훅 `useReachRegistration` / 국가별 규제 자료에 EU_REACH_REGISTERED 항목으로 넣기(확인 중·미등록·조회 불가는 건수에 안 세는 상태 항목) / 항목 줄 정리(EC·활성 등록 정식·중간체·톤수 "연 1천만~1억 t"·날짜). 시험 `test_reach_format.cjs` |
| `reach_labels.jsx` · `reach_labels_en.jsx` · `product_intl_reach.jsx` | REACH 문구(`REACH_LABELS_KO` / `_EN` → `REACH_LABELS`, 출처 표시 "Source: European Chemicals Agency, https://echa.europa.eu/") / REACH 항목 한 칸 `ReachEntry`(국가별 규제 절·해외 규제 탭 REACH 패널이 같이 씀) |
| `product_catrules.jsx` · `catrule_data.jsx` · `catrule_core.jsx` · `catrule_labels.jsx` · `catrule_labels_en.jsx` · `api_catrules.jsx` | 물질 상세 아래 패널 "분류로 걸리는 규제"(섹션 `id="catrules"`, `?anchor=catrules`, 참고용): GHS 분류·인화점·폭발 한계로 정해지는 규정(PSM 별표 13 제1·2호는 `APL_PSM` 재사용·산안규칙 별표 9·위험물 `APL_HAZMAT`·OSHA 1910.119(a)(1)(ii)·Seveso III 부록 I 1부) / 원문 옮겨 적기 / 판정 순수 함수 `catEvaluate` / 문구 / 물성·CLP 부록 VI·KOSHA 분류 받기. 시험 `frontend/scripts/tests/test_catrules.cjs` |
| `product_incidents.jsx` | 사고 사례 × 설계 검증 패널 |
| `product_enforcement.jsx` | 미국 EPA 집행 사건 패널 |
| `product_tceq_events.jsx` | 텍사스 TCEQ 배출사고 보고 패널(건수·연도·신고 배출량·배출점 종류 분포 → EPC 설계 분야 링크·최근 보고), `useTceqEvents` |
| `product_tceq_events_helpers.jsx` | 위 패널 순수 함수(`tceq*`: 배출점 종류 막대 줄·배출점 합계·파운드 표기) |
| `tceq_events_labels.jsx` | 위 패널 문구(`TCEQ_EVENTS_LABELS`). "무허가"·"위반"·시설별 확률 표현은 쓰지 않는다 |
| `tceq_events_labels_en.jsx` | 위 패널 영어 문구(`TCEQ_EVENTS_LABELS_EN`, 배출점 종류 이름·안내 문장 포함). "unpermitted"·"violation" 표현은 쓰지 않는다 |
| `product_views.jsx` | 링크형 보조 화면(특허·무역·가이드) |
| `product_view_drugs.jsx` | 보조 화면 "의약품"(식약처·OpenFDA·PubMed) |
| `product_view_common.jsx` | 보조 화면 공용: `ViewTitle`, `EmptyView` |
| `product_views.css` | 보조 화면 스타일(`.pv-*`) |
| `mobile.jsx` · `mobile_labels.jsx` · `mobile_labels_en.jsx` | 모바일 화면 시안 / 문구(`MOBILE_LABELS_KO` / `_EN` → `MOBILE_LABELS`) |
| `tweaks.jsx` | 화면 설정 패널(문구는 `APP_LABELS.tweakPanel`) |
| `research.jsx` | 논문 연구 화면 |
| `benchmark.jsx` | 벤치마크 화면 셸(탭 목록 `BENCH_TABS`), 언어는 화면 언어를 따른다 |
| `benchmark_labels.jsx` · `benchmark_labels_en.jsx` · `benchmark_data.jsx` | 벤치마크 문구(`BENCH_T_KO` / `_EN` → `BENCH_T`, 언어 무관 영문 `BENCH_FIXED`) · 설정 자료(지표·검색 설정·라벨 형식·시트 주소) |
| `benchmark_csv.jsx` | 라벨 시트 순수 함수(CSV 읽기·쓰기·저장 라벨 되살리기·진행 집계) |
| `benchmark_common.jsx` | `Loading`·`ErrBox` |
| `benchmark_results.jsx` · `benchmark_explore.jsx` | 탭 Results · Explore |
| `benchmark_label.jsx` · `benchmark_label_card.jsx` · `benchmark_label_side.jsx` | 탭 Label: 상태·단축키 / 항목 카드 / 진행·단축키 옆줄 |
| `benchmark.css` | 벤치마크 스타일(`.bm-*`, 나머지는 `paper.css`) |
| `label.html` | 벤치마크 라벨링 단독 페이지 |
| `feed_labels.jsx` · `feed_labels_en.jsx` | 화학사고 소식 문구(`FEED_LABELS_KO` / `_EN` → `FEED_LABELS`): 출처 짧은 이름, 유럽 나라 이름, 통합 검색 낱말(`usearch`) |
| `feed_helpers.jsx` | 화학사고 소식 순수 함수(`feed*`): 나라·출처·물질 거르기, 선택지, 표시 값, 물질 링크(`?view=product&pv=chemical&chem=<CAS>&anchor=incidents`) |
| `feed_link.jsx` | 소식 화면 주소 `?view=feed&sub=<물질|CAS>&country=&src=` 읽기·만들기·맞추기 |
| `api_feed.jsx` | 소식 정적 파일 `feed/latest.json`·`feed/by-cas/<CAS>.json`(없으면 "소식 없음") 읽기·훅 `useFeedLatest`·`useFeedByCas`. 정적 자료 꺼짐 → 같은 주소 `/data/v1/feed/` |
| `feed_view.jsx` | 최상위 화면 "화학사고 소식"(`?view=feed`) 셸 — 거르기 상태·주소·자료 고르기(CAS 면 물질 파일)·배치만. 통합 검색으로 연다 |
| `feed_filters.jsx` · `feed_list.jsx` · `feed_item.jsx` · `feed_attribution.jsx` | 소식 화면: 거르기 줄(나라·출처·물질) / 목록(40건씩 더 보기) / 한 건(종류·날짜·출처·요약·물질 칩·설계 분야) / 출처와 이용 조건. 스타일 `product_views.css` `.feed-*`. 문서 `docs/portal/INCIDENT_FEED_v1.md` |
| `usearch_provider_feed.jsx` | 통합 검색 묶음 "화학사고 소식": 화면 줄·소식 많은 물질·소식 제목(CAS 면 그 물질 파일까지) |
| (`frontend/_legacy_chemip_jsx_2026-10-27/`) | 나누기 전 원본(`api.jsx`·`product_tabs.jsx` 등). 공개 폴더 밖으로 옮겼다 — 되돌릴 때만 |

## 정적 자료(집 PC 가 꺼져도 검색·물질 화면)

`window.CHEMIP_STATIC = { base, searchBase, version }` 을 `static_config.jsx` 보다 먼저 두면 켜진다(예: 배포 `dist/index.html`
머리의 인라인 스크립트). 순서는 `static_config → static_aliases → static_search_index → static_search →
static_trade_assembly → api_labels → api_errors → api_static → api_static_extras → api_core → api_origin → api_<도메인>`.
집 PC 전용 `/api`(해외 규제 정보·근거 조문·정적 파일에 없는 물질)는 `originGet`(api_origin.jsx)만 거친다. Worker 가 직접 답하는 경로(게시판·이용 집계·AI·의약품·KOTRA·네이버)는 `apiGet` 그대로. 순수 모듈 시험·브라우저 점검은
`frontend/scripts/tests/README.md`.

## 상세 탭 추가 방법

1. `product_<탭이름>.jsx` 에 `({ selected }) => ...` 컴포넌트를 만들고 `window` 로 내보낸다(스타일은 `product_detail.css`, 문구는 `product_labels.jsx`).
2. `product_tab_list.jsx` 의 `PRODUCT_DETAIL_TABS` 배열에 `{ k, label, n, Component }` 한 줄을 추가한다.
3. `index.html` 에 스크립트 한 줄을 `product_tab_list.jsx` 보다 앞에 추가하고, API 가 필요하면 훅은 알맞은 `api_<도메인>.jsx` 에 둔다.

## 통합 검색(?view=search&q=)

처음 화면 검색창과 상단 바 검색창이 이 화면을 연다. 묶음(물질·계산기·용어·MSDS 항목·기술지침·화면)마다 위쪽 몇 건을 보이고,
물질은 "전체 결과 보기"로 물질 검색 화면(`pv=search`)에, 나머지는 그 자리에서 펼친다. 이름이 딱 맞는 묶음은 맨 위로 올린다.
물질 검색과 기술지침 목록은 정적 자료 먼저(집 PC 가 꺼져도), 나머지 묶음은 화면 안 자료라 늘 동작한다.

묶음 추가: `usearch_provider_<이름>.jsx` 에 `{ k, icon, limit, max?, search(q) }` 를 만들어 `window` 로 내보내고(점수는 `usRankDocs`,
자료 요청은 `api_*.jsx` 함수로만), `usearch_providers.jsx` 의 `USEARCH_PROVIDERS` 에 한 줄, 묶음 이름을 `usearch_labels.jsx`·`_en.jsx` 의
`groups[k]` 에, `index.html` 에 스크립트 한 줄(`usearch_providers.jsx` 앞)을 더한다. 시험: `node frontend/scripts/tests/test_unified_search.cjs`.

## 점검(운영 빌드 없이)

- `node frontend/scripts/tests/compile_check.cjs` — 모든 jsx 를 빌드와 같은 Babel 설정으로 번역, `index.html` 목록 누락·중복, 파일 사이 최상위 이름 겹침 확인(`dist/` 를 쓰지 않는다)
- `frontend/scripts/tests/refactor_snapshot.cjs` · `refactor_diff.cjs` — 화면별 글자·캡처 비교(전후)

## 최상위 화면 추가 방법

`app.jsx` 의 `APP_SCREENS` 배열에 `{ k, icon, nav: true, Component }` 한 줄을 더하고, 이름을 `app_labels.jsx` 의
`APP_LABELS.screens[k]`(`{ ko, en }`)에 적는다. `nav: true` 면 상단 버튼이 생기고, 버튼 없이 다른 화면 아래에 두려면
`parent: "<상위 화면 키>"` 를 준다(예: 논문 연구·벤치마크·모바일 시안은 `parent: "dev"`). `?view=<k>` 딥링크도 함께 열린다.
컴포넌트는 `({ link, setView })` 를 받는다.

## 공학 계산기 추가·딥링크

계산기 추가: `calc_<이름>.jsx` 에 정의 객체(형식은 `calc_registry.jsx` 머리 주석)를 만들어 `window` 로 내보내고,
`CALC_REGISTRY` 에 한 줄, `index.html` 에 `calc_registry.jsx` 앞으로 스크립트 한 줄을 더한다. 식마다 근거 문헌을 적고,
`frontend/scripts/tests/test_calculators.cjs` 에 손계산·표값 기준 시험을 더한다(등록됐는데 시험이 없으면 시험이 실패한다).
목록을 고른 근거: `docs/calculators/CALC_BENCHMARK_v1.md`(13개), `CALC_BENCHMARK_v2.md`(16개 추가, EPC 와 나눈 범위).
용어 설명: 칸·표 열·출력에 `term: "<key>"` 를 붙이고, 처음 쓰는 key 는 `term_glossary.jsx` 와 `term_glossary_en.jsx` 에 한 줄씩 더한다(없는 key·안 쓰는 key 는 시험이 잡는다).
화면 언어: 정의 안의 한글 문구는 모두 `tr("한국어", "English")` 로 쓴다(규칙은 `calc_registry.jsx` 머리 주석). 시험이 같은 사례를 영어로도 돌려 수치가 같은지·한글이 남았는지 본다.
그래프: 정의에 `chart(values, outputs)` 를 두고 `CalcChart` 속성(`{ x, y, series, markers?, vlines?, hlines?, height?, ariaLabel }`, 형식은 `calc_chart.jsx` 머리 주석)을 돌려주면 결과 아래에 그린다. 곡선 점은 `calcChartRange(a, b, n)` 로 만들고, 축 단위로는 정의 안에서 바꾼다. 예: `antoine`·`pipe_dp`·`reactor`.

결과 표(큰 표·복사·CSV): 정의에 `table(values, outputs)` 를 두고 `{ caption?, columns: [{ key, label, dim?, unit, show?, digits? }], rows, filename? }` 를 돌려주면 결과 아래 `CalcTableOut` 패널에 그린다(`calc_table_data.jsx` 머리 주석, 예: `calc_steam_table.jsx`). 행 이름이 있는 작은 표는 출력 `type: "table"`(`calc_out_table.jsx`).
찾는 낱말: 제목·용어 이름에 없는 흔한 검색어(예: 증기표·몰리에·습공기선도)는 `usearch_labels.jsx`·`_en.jsx` 의 `calcKeywords[<계산기 key>]` 에 한·영 두 벌로 더한다.

딥링크: `?view=calc&calc=<계산기 key>&<입력 key>=<값>&name=<안내에 보일 이름>`
- 값은 그 칸이 처음 보이는 단위(정의의 `show`, 없으면 `unit`)로 읽는다. 예: `pipe_dp` 의 `D` 는 mm, `Q` 는 m³/h.
- 선택 칸은 옵션 값 그대로(예: `dir=mg2ppm`, `mode=vel`). 표 칸(혼합물 성분)은 채우지 않는다.
- 빈 값(`mw=`)은 칸을 비운다 — 물질 상세 링크가 분자량을 못 읽었을 때 예시값이 그 물질 값처럼 보이지 않게.
- 예: `?view=calc&calc=ppm_mgm3&mw=78.1134&name=벤젠`, `?view=calc&calc=pipe_dp&mode=vel&v=1.5&D=50`

## 문구 원칙

화면에 보이는 문구는 한국어가 주 표기이고, 영문은 작은 보조 글씨(`.title-en`)로만 붙인다. 문구는 `*_labels.jsx` 에 두고
화면 파일에는 쓰지 않는다. 연구·개발 화면 아래(`dev_overview.jsx`, `research.jsx`, `benchmark.jsx`, `mobile.jsx`)는
심사자·개발자 대상이라 영문을 유지한다.

화면 언어(한/EN): 상단 바 "한 / EN" 또는 주소 `?lang=en|ko`(`lang.jsx`, 링크 규약 `docs/integration/LINK_CONTRACT_v6.md`). 문구 파일 `<이름>_labels.jsx` 는 `<NAME>_KO`, 같은 모양의 영어는 `<이름>_labels_en.jsx` 의 `<NAME>_EN` 과 `<NAME> = langPick(KO, EN)`, `index.html` 에서 한국어 파일 바로 뒤에 읽는다. 한 줄짜리는 `tr("한국어", "English")`. 출처 자료(KOSHA MSDS 원문·국내 법령 이름·게시글)는 원문 그대로 둔다. 점검: `node frontend/scripts/tests/test_lang.cjs`(KO 경로가 EN 에 모두 있는지, 문구 파일 밖 한글 — 예외는 `lang_allowlist.json`).
