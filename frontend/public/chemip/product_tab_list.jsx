// 물질 상세 탭 목록(데이터) — 새 탭은 product_<탭>.jsx 파일 하나 + 여기 한 줄로 붙인다.
// k: 탭 키 · label: 탭 이름 · n: 옆 작은 표시(문자열, 또는 ({ sections }) => 문자열) · Component: 탭 본문.
// Component 는 { selected, sections, loading, error } 를 받는다(sections 등은 물질 상세 요청 결과).
// 이 파일은 탭 파일들과 product_trade_controls.jsx 보다 뒤에 읽어야 한다(index.html 순서).
// 실무에 가장 필요한 "규제·인허가 / 수출입" 탭을 MSDS 바로 뒤에 둔다.

const PRODUCT_DETAIL_TABS = [
  { k: "msds", label: PRODUCT_LABELS.tabs.msds.ko, n: ({ sections }) => `${sections.length}/16`, Component: MSDSTab },
  { k: "trade", label: TRADE_LABELS.tabLabel, n: "↔", Component: TradeControlsTab },
  { k: "regulation", label: PRODUCT_LABELS.tabs.regulation.ko, n: "EU·US", Component: RegulationTab }, // ECHA·REACH(EU) + NIOSH·CompTox(US) 실시간 — 나라별 목록 수는 아래 "국가별 규제"
  { k: "patents", label: PRODUCT_LABELS.tabs.patents.ko, n: "↻", Component: PatentsTab },
  { k: "market", label: PRODUCT_LABELS.tabs.market.ko, n: "—", Component: MarketTab },
  { k: "guides", label: PRODUCT_LABELS.tabs.guides.ko, n: "↻", Component: GuidesTab },
  { k: "ai", label: PRODUCT_LABELS.tabs.ai.ko, n: "★", Component: AITab },
];

Object.assign(window, { PRODUCT_DETAIL_TABS });
