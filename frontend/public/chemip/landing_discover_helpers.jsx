// 처음 화면 · 둘러보기 순수 함수(React·fetch 없음) — 날짜로 고르는 오늘의 물질, 물질 화면 주소, 등록된 도구만 고르기,
// 사고 소식 최신 몇 건. 시험: frontend/scripts/tests/test_discovery.cjs

const LANDING_DAY_MS = 86400000;

// 그 날짜(보는 사람의 달력 날짜)가 1970-01-01 부터 며칠째인지. 시각·시간대와 무관하게 날짜만 본다.
function landingDayNumber(date) {
  const d = date instanceof Date ? date : new Date(date);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / LANDING_DAY_MS);
}

// 날짜 → 목록의 한 CAS. 같은 날은 같은 물질, 다음 날은 다음 물질(목록 끝에서 처음으로).
function landingTodayCas(list, date) {
  if (!list || !list.length) return "";
  const n = landingDayNumber(date);
  return list[((n % list.length) + list.length) % list.length];
}

function landingSubstanceHref(cas) {
  return `?${new URLSearchParams({ view: "product", pv: "chemical", chem: cas }).toString()}`;
}

function landingViewHref(view) {
  return `?${new URLSearchParams({ view }).toString()}`;
}

// 도구 목록 → 화면이 등록된 것만 { ...tool, view, count }. views: 등록된 화면 key 목록, globals: 개수를 셀 등록 목록이 있는 곳.
function landingAvailableTools(tools, views, globals) {
  const have = new Set(views || []);
  const out = [];
  for (const t of tools || []) {
    const view = (t.views || []).find(v => have.has(v));
    if (!view) continue;
    const reg = t.count && globals ? globals[t.count] : null;
    out.push({ ...t, view, count: Array.isArray(reg) ? reg.length : null });
  }
  return out;
}

// feed/latest.json → 날짜순 최신 n 건 { id, date, title, url, source(이름) }. 모양이 다르거나 비면 [].
function landingFeedItems(body, n) {
  const items = body && Array.isArray(body.items) ? body.items : [];
  const sources = (body && body.sources) || {};
  return items
    .filter(it => it && it.title)
    .slice()
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, n)
    .map(it => ({
      id: String(it.id || it.url || it.title),
      date: String(it.date || ""),
      title: String(it.title),
      url: /^https?:\/\//.test(it.url || "") ? it.url : "",
      source: (sources[it.source] && sources[it.source].name) || it.source || "",
    }));
}

Object.assign(window, {
  landingDayNumber, landingTodayCas, landingSubstanceHref, landingViewHref, landingAvailableTools, landingFeedItems,
});
