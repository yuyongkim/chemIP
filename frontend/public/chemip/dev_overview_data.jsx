// 개발자용 소개(dev_overview*.jsx)의 문구·자료(DEV_OVERVIEW_KO, 영어 화면: dev_overview_data_en.jsx) — 심사자·개발자 대상이라 대부분 영문.
// showKr: 목록 자료(data.jsx)의 한국어 보조 이름(kr)을 보일지.
// 목록 자료(SOURCES·WORKFLOWS·USERS·PHASES·GAPS·CAPABILITIES_*)는 data.jsx. 제목 { a, b } 는 "a<br/><em>b</em>".

const DEV_REPO_URL = "https://github.com/yuyongkim/chemIP";

const DEV_OVERVIEW_KO = {
  showKr: true,
  banner: { status: "v0.9.2 · build passing · 19/19 tests · ready for reviewer mode", license: "AGPL-3.0 · self-hostable" },
  hero: {
    kicker: "CHEMICAL SAFETY · INTELLECTUAL PROPERTY · TRADE INTELLIGENCE",
    titleA: "Nine public data sources.", titleB: "One query. ", titleEm: "Zero portal-hopping.",
    ledeA: "보통은 포털 여러 개를 돌아다녀야 얻는 정부 데이터를 ",
    ledeBrand: "ChemIP",
    ledeB: " 는 한 번의 질의로 모읍니다. KOSHA 안전보건자료, KIPRIS 특허, KOTRA 무역, MFDS 의약품, PubMed 문헌. 오픈소스로 직접 호스팅할 수 있고, 데이터가 밖으로 나가면 안 되는 환경의 화학안전 업무를 염두에 두고 만들었습니다.",
    start: "화학물질 검색 시작", clone: "Clone repo", repoSlug: "yuyongkim/chemIP", docs: "Read docs",
    openLabel: "상세페이지 바로 열기", directSearch: "직접 검색",
    // Featured chemicals link straight to the full detail page (/chemical/[id]).
    featured: [
      { chem_id: "000329", name_en: "Di(2-ethylhexyl) phthalate", cas_no: "117-81-7" },
      { chem_id: "001008", name_en: "Benzene", cas_no: "71-43-2" },
      { chem_id: "001067", name_en: "Acetone", cas_no: "67-64-1" },
    ],
    meta: [["48,000+", "substances indexed"], ["16 / 16", "MSDS sections"], ["4", "patent jurisdictions"], ["< 5 min", "reviewer install"]],
  },
  console: {
    title: "chemip — unified query · localhost:7000", live: "live", tickMs: 2200,
    queries: [
      { q: "아세톤", label: "CAS 67-64-1 · 화학물질" },
      { q: "acetaminophen", label: "MFDS + OpenFDA + PubMed" },
      { q: "isopropyl alcohol", label: "KOSHA + KIPRIS + KOTRA" },
    ],
    foot: ["request-id · 8f3e-2a41", "p99 412 ms · cache hit 71%", "200 OK"],
  },
  stats: [
    { label: "Substances · 화학물질", value: "48,132", unit: "", note: "FTS-indexed in terminology.db" },
    { label: "MSDS Sections · 안전자료", value: "16", unit: "/16", note: "Lazy-fetched via KOSHA on cache miss" },
    { label: "Patent Jurisdictions · 관할권", value: "4", unit: "KR·US·EP·JP", note: "KIPRIS live + USPTO / EPO local index" },
    { label: "Test Coverage · 검증", value: "19", unit: "/19", note: "pytest · KIPRIS live · next build" },
  ],
  sections: {
    sources: { no: "01", eyebrow: "DATA FEDERATION", a: "Nine sources,", b: "one federated index.", kicker: "Each source is accessed with its own client, cached locally, and normalized to a shared schema before a unified response is returned.", live: "LIVE", local: "LOCAL INDEX" },
    workflows: { no: "02", eyebrow: "TYPICAL WORKFLOWS", a: "Four research paths.", b: "Same unified context.", kicker: "Whichever door users enter — a chemical, a patent, a country, or a drug — the rest of the dossier follows them through the session." },
    capabilities: {
      no: "03", eyebrow: "CODE-VERIFIED CAPABILITIES", a: "Every route is shipped.", b: "Every stack choice is deliberate.", kicker: "Enumerated from backend/main.py and frontend/app/ — no roadmap promises mixed in.",
      backend: { tag: "BACKEND", stack: "FastAPI · Python", chips: ["request-id middleware", "security headers", "rate-limit (in-memory)", "summary logging"] },
      frontend: { tag: "FRONTEND", stack: "Next 16 · React 19 · TS", chips: ["Tailwind CSS 4", "composition-first", "app router", "/api rewrite"] },
    },
    quickstart: {
      no: "04", eyebrow: "QUICK START · REVIEWER MODE", a: "Running in five minutes.", b: "No patent DB or LLM required.", kicker: "Local chemical search (48k+ substances), cached MSDS sections, guide recommendations, and the full frontend UI work with zero API keys.",
      steps: [
        { title: "1 · Clone & install", code: `git clone https://github.com/yuyongkim/chemIP.git
cd chemIP
pip install -r requirements.txt
cd frontend && npm ci && cd ..` },
        { title: "2 · Minimal env", code: `cp .env.example .env
# only two keys needed for basic search:
#   KOSHA_SERVICE_KEY_DECODED
#   KIPRIS_API_KEY
# both free at data.go.kr` },
        { title: "3 · Run", code: `python -m uvicorn backend.main:app --port 7010 &
cd frontend && npm run dev -- --port 7000
# open http://localhost:7000` },
        { title: "4 · Verify", code: `bash submit_check.sh
# → pytest
# → test_kipris_live.py
# → frontend lint + build
# ✓ 19 passed · ready` },
      ],
    },
    users: { no: "05", eyebrow: "TARGET USERS", a: "Built for teams that", b: "cannot afford to be wrong." },
    roadmap: { no: "06", eyebrow: "EVOLUTION DIRECTION", a: "Three phases.", b: "Honest about what's next.", phase: "PHASE", status: { now: "IN PROGRESS", next: "NEXT UP", later: "FUTURE" } },
    gaps: { no: "07", eyebrow: "KNOWN GAPS", a: "What this is", b: "not (yet).", kicker: "We are allergic to demo-ware. Here is exactly what the code does not do." },
  },
  footer: {
    version: "v0.9.2",
    blurb: "An open-source, self-hostable platform for chemical safety decision-making. AGPL-3.0 licensed. Built against nine public data sources.",
    columns: [
      { h: "PRODUCT", links: [{ label: "Prototype →", href: "#prototype", product: true }, { label: "Quick start", href: "#quickstart" }, { label: "Workflows", href: "#workflows" }, { label: "Roadmap", href: "#roadmap" }] },
      { h: "DOCS", links: [
        { label: "README (KR) ↗", href: `${DEV_REPO_URL}/blob/main/README.md`, ext: true },
        { label: "README (EN) ↗", href: `${DEV_REPO_URL}/blob/main/README.en.md`, ext: true },
        { label: "Contributing ↗", href: `${DEV_REPO_URL}/blob/main/CONTRIBUTING.md`, ext: true },
        { label: "Data structure ↗", href: `${DEV_REPO_URL}/blob/main/DATA_STRUCTURE.md`, ext: true },
      ] },
      { h: "COMMUNITY", links: [
        { label: "GitHub ↗", href: DEV_REPO_URL, ext: true },
        { label: "Issues ↗", href: `${DEV_REPO_URL}/issues`, ext: true },
        { label: "License (AGPL-3.0) ↗", href: `${DEV_REPO_URL}/blob/main/LICENSE`, ext: true },
        { label: "Code of conduct ↗", href: `${DEV_REPO_URL}/blob/main/CODE_OF_CONDUCT.md`, ext: true },
      ] },
    ],
    bottom: ["© 2026 ChemIP contributors · AGPL-3.0", "Built in Seoul · KR · 🇰🇷"],
  },
};

Object.assign(window, { DEV_REPO_URL, DEV_OVERVIEW_KO });
