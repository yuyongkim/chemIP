// 처음 화면 · 둘러보기 자료(문구 없음) — "자주 찾는 물질"·"오늘의 물질"·"도구" 목록. 이름·한 줄 설명은 landing_discover_labels*.jsx(같은 CAS 키).
// 추적이 아니라 고정 목록이다. 고른 근거(2026-10-31):
//   자주 찾는 물질 = SEO 시드(frontend/lib/chemip-seed.ts) 중 자료가 가장 많은 물질(E:\dev-cache\chemip-seo\reports\selection.csv
//                   점수 상위) 가운데 KOSHA MSDS 가 있고 실무에서 자주 묻는 12종.
//   오늘의 물질   = 같은 기준의 잘 알려진 물질 28종. 날짜로 돌아간다(landingTodayCas, landing_discover_helpers.jsx).
// 물질 화면 주소는 ?view=product&pv=chemical&chem=<CAS>(같은 CAS 의 KOSHA 물질로 열린다, api_chemicals.jsx resolveLinkChemId).

const LANDING_POPULAR_CAS = [
  "71-43-2", "108-88-3", "1330-20-7", "50-00-0", "67-56-1", "64-17-5",
  "67-64-1", "7664-93-9", "7697-37-2", "1310-73-2", "7664-41-7", "100-42-5",
];

const LANDING_TODAY_CAS = [
  "71-43-2", "67-64-1", "50-00-0", "67-56-1", "7664-93-9", "7664-41-7", "108-88-3",
  "1330-20-7", "1310-73-2", "74-90-8", "75-44-5", "1332-21-4", "100-42-5", "107-13-1",
  "64-17-5", "7697-37-2", "302-01-2", "7440-43-9", "62-53-3", "74-98-6", "100-41-4",
  "56-23-5", "127-18-4", "75-15-0", "106-99-0", "91-20-3", "68-12-2", "75-07-0",
];

// 도구 묶음(계산기·GHS 표지·저장 혼촉·혼합물 GHS 분류·용어사전) — 화면이 등록돼 있을 때만 보인다(views 중 APP_SCREENS 에 있는 첫 key 로 연다). 이름·설명은 LANDING_DISCOVER.tools.items[k].
// count: 개수를 셀 등록 목록 이름(전역). 없으면 개수 없이.
const LANDING_TOOLS = [
  { k: "calc", icon: "flask", views: ["calc"], count: "CALC_REGISTRY" },
  { k: "label", icon: "doc", views: ["ghslabel"] },
  { k: "compat", icon: "shield", views: ["compat"] },
  { k: "mixghs", icon: "layers", views: ["mixghs"] },
  { k: "glossary", icon: "book", views: ["glossary"] },
];

const LANDING_POPULAR_LIMIT = 12;

Object.assign(window, { LANDING_POPULAR_CAS, LANDING_TODAY_CAS, LANDING_TOOLS, LANDING_POPULAR_LIMIT });
