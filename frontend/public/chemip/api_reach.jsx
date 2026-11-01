// API 층 · EU REACH 등록 현황(물질 하나). 묶어 둔 자료(g/intl_add 의 EU_REACH_REGISTERED, 대표 물질 약 250종)에 있으면 그것,
// 없으면 GET /api/reach/<CAS> — 운영에서는 Cloudflare Worker(cloudflare/worker/src/routes/reach.js)가 PC 와 상관없이 ECHA CHEM 에
// 그 CAS 하나만 물어 답하고(캐시 30일 / 미등록 7일), PC 사이트에서는 backend/api/routes/reach.py 가 같은 답을 준다.
// 미리 긁어 오지 않는다(ECHA 법적 고지 5.1.1). 실패(PC 꺼진 시험 서버의 503·429·시간 초과)는 { status: "unknown" } 로 바꾼다.
// 같은 CAS 는 한 페이지에서 한 번만 묻는다(국가별 규제 절과 해외 규제 탭이 같이 쓴다). 화면 조립: intl_reach.jsx.

const REACH_ANSWERS = new Map(); // CAS → Promise<답>
const REACH_TIMEOUT_MS = 20000;

// 묶어 둔 자료의 항목 → /api/reach 와 같은 모양(bundled: true). 없으면 null.
async function staticReachAnswer(cas) {
  const added = await staticIntlAdded(cas).catch(() => null);
  const list = added && (added.lists || []).find(m => m.list_id === REACH_LIST_ID);
  const entry = list && (list.entries || [])[0];
  if (!entry) return null;
  const meta = (added.meta || []).find(m => m.list_id === REACH_LIST_ID) || {};
  return { cas, list_id: REACH_LIST_ID, status: "registered", registered: true, reason: "", entry, echa_url: entry.url || "",
    checked: meta.retrieved || "", attribution: REACH_LABELS.attribution, bundled: true };
}

async function askReach(cas) {
  const bundled = await staticReachAnswer(cas);
  if (bundled) return bundled;
  try {
    return await apiGetTimeout(`/reach/${encodeURIComponent(cas)}`, REACH_TIMEOUT_MS);
  } catch (e) {
    return { cas, list_id: REACH_LIST_ID, status: "unknown", registered: null, reason: String((e && e.message) || e), entry: null };
  }
}

function fetchReachRegistration(cas) {
  const c = String(cas || "").replace(/\s+/g, "");
  if (!c) return Promise.resolve(null);
  if (!REACH_ANSWERS.has(c)) {
    const p = askReach(c).then(a => { if (!a || a.status === "unknown") REACH_ANSWERS.delete(c); return a; }); // 실패는 다음에 다시 묻는다
    REACH_ANSWERS.set(c, p);
  }
  return REACH_ANSWERS.get(c);
}

// enabled=false 면 묻지 않는다(국가별 규제 자료에 이미 REACH 항목이 있을 때).
function useReachRegistration(cas, enabled = true) {
  return useApi(() => (enabled && cas ? fetchReachRegistration(cas) : Promise.resolve(null)), [cas, enabled]);
}

Object.assign(window, { staticReachAnswer, fetchReachRegistration, useReachRegistration });
