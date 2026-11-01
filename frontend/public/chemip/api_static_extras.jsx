// API 층 · 정적 자료(Cloudflare) — 물질 하나의 아래 패널·안전 가이드 파일 p/<chem_id>.x.json 과 g/guides_status.json,
// 텍사스 배출사고 tx/<CAS>.json(없으면 "사고 없음", 아래 staticTceqEvents), 근거 조문 pv/<CAS>.json(아래 staticProvisions).
// 파일 형식: scripts/static_export/CONTRACT.md "p/<chem_id>.x.json". 각 함수는 /api 와 같은 모양을 돌려주고,
// 정적 자료가 꺼져 있거나 파일·항목이 없으면 null(→ staticFirst 가 /api 로, 정적 배포면 api_origin.jsx 관문을 거친다).
// 파일 받기·캐시는 api_static.jsx 의 staticPagesFile 이 맡는다(같은 파일은 한 번만 받는다).

const STATIC_EXTRAS_CAS_RE = /^\d{2,7}-\d{2}-\d$/;

function staticExtras(chemId) {
  return chemId ? staticPagesFile(STATIC_LAYOUT.pages.extras(chemId)) : Promise.resolve(null);
}

async function staticExtrasPart(chemId, key) {
  const x = await staticExtras(chemId);
  return x && x[key] != null ? x[key] : null;
}

// 사고 사례·EPA 집행은 CAS 로 연다. 그 CAS 이름의 파일(kind "cas")에만 들어 있다.
function staticExtrasByCas(cas, key) {
  const c = String(cas || "").trim();
  return STATIC_EXTRAS_CAS_RE.test(c) ? staticExtrasPart(c, key) : Promise.resolve(null);
}

// GET /api/guides/recommend/{chem_id}
function staticGuideRecommendations(chemId) {
  return staticExtrasPart(chemId, "guides");
}

// GET /api/guides/status
function staticGuideStatus() {
  return staticPagesFile(STATIC_LAYOUT.pages.guideStatus);
}

// KOSHA 기술지침 목록(통합 검색용, 번호·제목·공표일·원문 주소). /api 에 같은 모양 없음 — 없으면 null(→ /api/guides/search)
function staticGuideIndex() {
  return staticPagesFile(STATIC_LAYOUT.pages.guideIndex);
}

// GET /api/handlers?chem_id=…&facility_limit=50 (지역 PRTR 자료만; 실시간 출처는 서버가 꺼졌을 때 모양)
function staticHandlers(chemId) {
  return staticExtrasPart(chemId, "handlers");
}

// GET /api/integrations/incidents/{cas}?limit=8
function staticIncidents(cas) {
  return staticExtrasByCas(cas, "incidents");
}

// GET /api/integrations/enforcement/{cas}?limit=6
function staticEnforcement(cas) {
  return staticExtrasByCas(cas, "enforcement");
}

// GET /api/integrations/tceq-events/{cas}?limit=6 — tx/<CAS>.json(CONTRACT.md "tx/<CAS>.json").
// 파일은 사고가 있는 CAS 에만 있다. 그래서 정적 자료가 켜져 있는데 파일이 없으면(404 → null) null 대신 "사고 없음" 빈 응답을
// 돌려준다: null 이면 staticFirst 가 집 PC /api 로 넘어가 PC 가 꺼졌을 때 실시간 전용 안내가 뜨지만, 이 자료는 정적 파일이
// 전부라 "없음"이 맞는 답이다. 정적 자료가 꺼져 있거나 CAS 가 아니면 null(→ /api), 네트워크 오류는 던진다(→ /api).
const STATIC_TCEQ_EMPTY = { available: true, total: 0, years: [], qty_total_lbs: 0, units: {}, point_kinds: {},
  point_kind_labels: {}, disciplines: [], counties: {}, top_facilities: [], recent: [] };

async function staticTceqEvents(cas) {
  const c = String(cas || "").trim();
  if (!staticEnabled("pages") || !STATIC_EXTRAS_CAS_RE.test(c)) return null;
  const body = await staticPagesFile(STATIC_LAYOUT.pages.tceq(c));
  return body || { cas_no: c, ...STATIC_TCEQ_EMPTY };
}

// GET /api/integrations/provisions/{cas}?country=&name= — pv/<CAS>.json(CONTRACT.md "pv/<CAS>.json").
// 파일은 정해 둔 물질에만 있고, 그 물질 화면이 보낼 나라·이름으로 미리 받아 둔 답이다. 파일·나라가 없거나 이름이 다르면
// null(→ 집 PC /api, 켜져 있으면 지금처럼 바로 찾는다). 미리 받아 둔 답에는 받은 날짜(static_as_of)를 붙여 화면이 알린다.
async function staticProvisions(cas, country, name) {
  const c = String(cas || "").trim();
  if (!STATIC_EXTRAS_CAS_RE.test(c)) return null;
  const file = await staticPagesFile(STATIC_LAYOUT.pages.provisions(c));
  const body = file && file.name === (name || "") ? (file.countries || {})[country] : null;
  return body ? { ...body, static_as_of: file.exported_at || "" } : null;
}

Object.assign(window, {
  staticGuideRecommendations, staticGuideStatus, staticGuideIndex, staticHandlers, staticIncidents, staticEnforcement, staticTceqEvents,
  staticProvisions,
});
