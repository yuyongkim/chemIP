// Static data for ChemIP prototype

const SOURCES = [
  { code: "KOSHA", kr: "한국산업안전보건공단", en: "Safety & MSDS", desc: "48,000+ substance MSDS with 16 regulated sections — lazy-fetched on cache miss.", endpoint: "/api/chemicals", live: true },
  { code: "KIPRIS", kr: "한국특허정보원", en: "Korean Patents", desc: "Live keyword search + detail lookup for Korean patent filings across all fields.", endpoint: "/api/patents", live: true },
  { code: "KOTRA", kr: "대한무역투자진흥공사", en: "Trade Intel", desc: "Market news, entry strategy, price info, fraud cases across 85 country offices.", endpoint: "/api/trade", live: true },
  { code: "MFDS", kr: "식품의약품안전처", en: "Drug Approval", desc: "Approval & easy-info aggregation for domestic pharmaceutical registrations.", endpoint: "/api/drugs", live: true },
  { code: "OpenFDA", kr: "미 식약청 오픈 API", en: "FDA Labels", desc: "Brand → generic → substance fallback chain for global drug labeling data.", endpoint: "/api/drugs/fda", live: true },
  { code: "PubMed", kr: "미 의학도서관", en: "Literature", desc: "Article summary retrieval across 36M+ indexed biomedical citations.", endpoint: "/api/drugs/pubmed", live: true },
  { code: "USPTO", kr: "미 특허청 인덱스", en: "Global Patents", desc: "Local index across 11M US patent grants + applications, offline-capable.", endpoint: "/uspto/{chem_id}", live: false },
  { code: "GLOBAL", kr: "EPO·JPO·WIPO 인덱스", en: "Intl. Patents", desc: "Pre-built local index for cross-jurisdictional patent landscape analysis.", endpoint: "/global/{chem_id}", live: false },
  { code: "NAVER", kr: "네이버 뉴스 API", en: "News Fallback", desc: "News-derived fallback when upstream KOTRA data is sparse for a country-keyword pair.", endpoint: "/api/trade/news", live: true },
];

const WORKFLOWS = [
  {
    code: "W-01",
    name: "Chemical-First Research",
    kr: "화학물질 중심 조사",
    steps: [
      "Search by name or CAS on home.",
      "Open /chemical/{id} detail view.",
      "Review MSDS sections, bilingual safety, regulation panel.",
      "Check KOSHA Guides tab for recommendations.",
      "Use AI tab for evidence-backed insights with sources.",
      "Expand to patents + market in the same page.",
    ],
  },
  {
    code: "W-02",
    name: "Patent-First Research",
    kr: "특허 중심 조사",
    steps: [
      "Search on /patents with keyword filter.",
      "Review live KIPRIS results table.",
      "Cross-check with local global/USPTO index.",
      "Drill into chemical detail from patent citation.",
    ],
  },
  {
    code: "W-03",
    name: "Trade Intelligence",
    kr: "무역 인텔리전스",
    steps: [
      "Use /trade with country + keyword filters.",
      "Consume KOTRA feeds first.",
      "Fall back to Naver/news when upstream is sparse.",
      "Correlate with price-info and fraud cases.",
    ],
  },
  {
    code: "W-04",
    name: "Drug Evidence Lookup",
    kr: "의약품 근거 검색",
    steps: [
      "Search on /drugs by name or ingredient.",
      "Review MFDS approval / easy-info.",
      "Expand to OpenFDA labels for global context.",
      "Pull PubMed literature for evidence chain.",
    ],
  },
];

const MSDS_SECTIONS = [
  { n: 1,  en: "Product & Supplier", kr: "제품 및 회사정보" },
  { n: 2,  en: "Hazards Identification", kr: "유해성·위험성", hazard: true },
  { n: 3,  en: "Composition & Ingredients", kr: "구성성분" },
  { n: 4,  en: "First-Aid Measures", kr: "응급조치 요령" },
  { n: 5,  en: "Fire-Fighting Measures", kr: "폭발·화재시 대처" },
  { n: 6,  en: "Accidental Release", kr: "누출 사고시 대처" },
  { n: 7,  en: "Handling & Storage", kr: "취급 및 저장방법" },
  { n: 8,  en: "Exposure Controls / PPE", kr: "노출방지·개인보호구" },
  { n: 9,  en: "Physical & Chemical", kr: "물리화학적 특성" },
  { n: 10, en: "Stability & Reactivity", kr: "안정성 및 반응성" },
  { n: 11, en: "Toxicological Info", kr: "독성에 관한 정보", hazard: true },
  { n: 12, en: "Ecological Info", kr: "환경에 미치는 영향" },
  { n: 13, en: "Disposal Considerations", kr: "폐기시 주의사항" },
  { n: 14, en: "Transport Info", kr: "운송에 필요한 정보" },
  { n: 15, en: "Regulatory Info", kr: "법적 규제현황" },
  { n: 16, en: "Other Information", kr: "그 밖의 참고사항" },
];

const PATENTS = [
  { id: "KR10-2024-0153022", title: "Acetone-based low-VOC reactive solvent system for epoxy hardeners", kr: "에폭시 경화제용 저VOC 아세톤 반응성 용매 시스템", assignee: "LG Chem", year: 2024, status: "Granted", jur: "KR" },
  { id: "KR10-2023-0098441", title: "Method of purifying acetone from bioprocess effluent", kr: "바이오공정 배출수로부터 아세톤 정제 방법", assignee: "Samyang Corp.", year: 2023, status: "Granted", jur: "KR" },
  { id: "KR10-2023-0071820", title: "Controlled-release pharmaceutical excipient carrier", kr: "제어방출 약제학적 부형제 담체", assignee: "Hanmi Pharm.", year: 2023, status: "Pending", jur: "KR" },
  { id: "US 2024/0134521 A1", title: "Solvent recovery apparatus using molecular sieves", kr: "분자체를 사용한 용매 회수 장치", assignee: "Dow Chemical", year: 2024, status: "Published", jur: "US" },
  { id: "US 11,987,412 B2", title: "Low-residue cleaning composition with acetone blend", kr: "아세톤 혼합 저잔여 세척 조성물", assignee: "3M Innovative", year: 2024, status: "Granted", jur: "US" },
  { id: "EP 4 221 883 A1", title: "Distillation process for solvent mixtures containing acetone", kr: "아세톤 함유 용매 혼합물 증류 공정", assignee: "BASF SE", year: 2023, status: "Published", jur: "EP" },
  { id: "JP 2023-184221", title: "High-purity acetone for semiconductor photoresist rinse", kr: "반도체 포토레지스트 린스용 고순도 아세톤", assignee: "Tokyo Chemical", year: 2023, status: "Granted", jur: "JP" },
  { id: "KR10-2022-0140193", title: "Acetone-tolerant PVDF membrane for solvent filtration", kr: "용매 여과용 아세톤 내성 PVDF 멤브레인", assignee: "Toray Korea", year: 2022, status: "Granted", jur: "KR" },
];

const GUIDES = [
  { code: "W-12", title: "소규모 사업장 유기용제 취급 가이드", en: "Small-site organic solvent handling", score: 0.94 },
  { code: "H-041", title: "휘발성 유기화합물 작업환경 관리", en: "VOC workplace environment control", score: 0.88 },
  { code: "P-203", title: "화학물질 누출 대응 절차서", en: "Chemical spill response procedure", score: 0.81 },
  { code: "K-017", title: "개인보호구(PPE) 선정 가이드라인", en: "PPE selection guidelines", score: 0.78 },
  { code: "E-088", title: "폐유기용제 적정 처리 매뉴얼", en: "Waste solvent disposal manual", score: 0.72 },
];

const TRADE_ROWS = [
  { country: "🇻🇳 Vietnam", kr: "베트남", hs: "2914.11", flow: "+12.4%", value: "$ 48.2M", note: "Strong growth in electronics-sector demand." },
  { country: "🇮🇳 India", kr: "인도", hs: "2914.11", flow: "+8.1%", value: "$ 31.7M", note: "Pharma intermediate category up Q/Q." },
  { country: "🇮🇩 Indonesia", kr: "인도네시아", hs: "2914.11", flow: "+4.9%", value: "$ 18.3M", note: "New VAT regulation effective April 2026." },
  { country: "🇨🇳 China", kr: "중국", hs: "2914.11", flow: "-2.3%", value: "$ 112.6M", note: "Domestic surplus pressuring import pricing." },
  { country: "🇺🇸 U.S.A.", kr: "미국", hs: "2914.11", flow: "+0.6%", value: "$ 64.4M", note: "Semiconductor rinse-grade steady." },
  { country: "🇯🇵 Japan", kr: "일본", hs: "2914.11", flow: "-1.1%", value: "$ 22.1M", note: "High-purity segment flat YoY." },
];

const USERS = [
  { role: "R&D", en: "Chemical / Materials R&D", kr: "화학·소재 연구개발", items: ["Route-scouting", "Literature", "Landscape"] },
  { role: "SAFETY", en: "Regulatory & Compliance", kr: "규제·안전준수", items: ["MSDS verify", "Guide lookup", "Audit prep"] },
  { role: "TRADE", en: "Market Intelligence", kr: "무역·시장분석", items: ["Country briefs", "Price", "Fraud cases"] },
  { role: "IP", en: "IP & Commercialization", kr: "지식재산·사업화", items: ["Landscape", "FTO", "Competitor"] },
];

const GAPS = [
  { k: "AI", title: "Retrieval-assisted, not production LLM yet", desc: "The /ai/analyze endpoint returns evidence-based summaries with citations today. Full external-LLM integration with streaming is Phase 1 work." },
  { k: "RL", title: "Rate limiting is in-memory only", desc: "Suitable for a single-node deploy; distributed limits (Redis-backed) are pending for multi-replica Kubernetes setups." },
  { k: "UP", title: "Integration quality depends on upstream quotas", desc: "KOSHA / KIPRIS / KOTRA all have per-key quotas and variable latency. Caching + backoff is implemented but not yet uniform." },
  { k: "QA", title: "Test scope strong on smoke paths", desc: "19/19 smoke tests currently pass in CI. Regression depth (contract + fuzz) is scoped but not yet delivered." },
];

const PHASES = [
  { n: "01", title: "Reliability", kr: "신뢰성", status: "now", items: [
    "Connect /ai/analyze to real LLM with explicit citations.",
    "Introduce Redis API caching — reduce latency & quota pressure.",
    "Standardize error codes and operational dashboards.",
  ]},
  { n: "02", title: "Data Quality", kr: "데이터 품질", status: "next", items: [
    "Improve synonym / alias normalization for chemical names.",
    "Automate global patent index refresh pipeline.",
    "Add quality scoring + reliability metrics for market signals.",
  ]},
  { n: "03", title: "Enterprise Readiness", kr: "엔터프라이즈 대응", status: "future", items: [
    "Role-based access + audit logs.",
    "Batch analysis & report export (PDF / slides).",
    "Formalize Docker / Kubernetes deployment blueprint.",
  ]},
];

const CAPABILITIES_BACKEND = [
  { path: "/api/chemicals", desc: "Local FTS search via terminology.db; lazy KOSHA section fetch 1–16." },
  { path: "/api/patents", desc: "KIPRIS keyword + detail; local USPTO / global index by chem_id." },
  { path: "/api/trade", desc: "Market news, entry strategy, price, fraud cases, national info." },
  { path: "/api/drugs", desc: "MFDS approval/easy-info; OpenFDA fallback chain; PubMed retrieval." },
  { path: "/api/guides", desc: "Local KOSHA guide dataset — status/search/detail/recommendation." },
  { path: "/api/ai/analyze", desc: "Evidence-based output with sources[] and confidence." },
];
const CAPABILITIES_FRONTEND = [
  { path: "app/page.tsx", desc: "Home search entry (chemical name / CAS)." },
  { path: "app/patents/page.tsx", desc: "Dedicated patent search page." },
  { path: "app/trade/page.tsx", desc: "Country × keyword trade filter." },
  { path: "app/drugs/page.tsx", desc: "Drug search across MFDS + OpenFDA + PubMed." },
  { path: "app/chemical/[id]/page.tsx", desc: "MSDS / patents / market / guides / AI tabs." },
  { path: "next.config.ts", desc: "Rewrites /api/* to backend origin (BACKEND_ORIGIN)." },
];

// Export everything
Object.assign(window, {
  SOURCES, WORKFLOWS, MSDS_SECTIONS, PATENTS, GUIDES, TRADE_ROWS, USERS, GAPS, PHASES,
  CAPABILITIES_BACKEND, CAPABILITIES_FRONTEND,
});
