// 화학사고 소식 순수 함수(feed*): 거르기·선택지·표시 값·물질 링크. React·fetch 없음(시험: frontend/scripts/tests/test_incident_feed.cjs).
// 소식 한 건 모양: CONTRACT.md "feed/" items — { id, date, title, url, source, cas[], names[], equipment[], disciplines[], country, summary }.

const FEED_UNKNOWN_COUNTRY = "_";
const FEED_KIND_BY_PREFIX = [["chemeng_", "incident"], ["press_", "press"]];
const FEED_PAGE = 40;

function feedIsCas(s) {
  return /^\d{2,7}-\d{2}-\d$/.test(String(s || "").trim());
}

// 출처 key → 종류(incident | news | press). 배지 색·문구는 FEED_LABELS.kinds.
function feedSourceKind(sourceId) {
  const hit = FEED_KIND_BY_PREFIX.find(([p]) => String(sourceId || "").startsWith(p));
  return hit ? hit[1] : "news";
}

function feedNorm(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

// filters = { country, source, sub }. country "" = 모두, FEED_UNKNOWN_COUNTRY = 나라 미상. sub 는 CAS·이름·제목에서 찾는 글자.
function feedFilterItems(items, filters = {}) {
  const country = filters.country || "";
  const source = filters.source || "";
  const sub = feedNorm(filters.sub);
  return (items || []).filter(it => {
    if (country === FEED_UNKNOWN_COUNTRY ? it.country : country && it.country !== country) return false;
    if (source && it.source !== source) return false;
    if (!sub) return true;
    if ((it.cas || []).includes(sub)) return true;
    return [...(it.names || []), it.title].some(t => feedNorm(t).includes(sub));
  });
}

// [[값, 건수]] 건수 많은 순(같으면 값 순). 나라가 빈 소식은 FEED_UNKNOWN_COUNTRY 로 맨 뒤.
function feedCountryOptions(items) {
  const n = {};
  (items || []).forEach(it => { const k = it.country || FEED_UNKNOWN_COUNTRY; n[k] = (n[k] || 0) + 1; });
  return Object.entries(n).sort((a, b) =>
    (a[0] === FEED_UNKNOWN_COUNTRY) - (b[0] === FEED_UNKNOWN_COUNTRY) || b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
}

// [[출처 key, 건수]] — 자료 파일 sources 의 순서(없으면 건수 순), 이 목록에 있는 출처만.
function feedSourceOptions(items, sources) {
  const n = {};
  (items || []).forEach(it => { n[it.source] = (n[it.source] || 0) + 1; });
  const order = Object.keys(sources || {});
  return Object.entries(n).sort((a, b) => {
    const ia = order.indexOf(a[0]);
    const ib = order.indexOf(b[0]);
    if (ia !== ib) return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib);
    return b[1] - a[1];
  });
}

// 물질 화면의 사고 사례 패널(링크 규약 docs/integration/LINK_CONTRACT_v5.md: ?view=product&pv=chemical&chem=<CAS>&anchor=incidents)
function feedSubstanceHref(cas) {
  const p = new URLSearchParams({ view: "product", pv: "chemical", chem: cas, anchor: "incidents" });
  return `?${p.toString()}`;
}

function feedChems(item) {
  return (item.cas || []).map((cas, i) => ({ cas, name: (item.names || [])[i] || cas, href: feedSubstanceHref(cas) }));
}

// 나라 이름: INTL_JURISDICTIONS(jurisdictionName) 먼저, 없으면 문구 파일의 이름, 그래도 없으면 코드.
function feedCountryName(code, labels, nameOf) {
  if (!code || code === FEED_UNKNOWN_COUNTRY) return labels.filters.unknownCountry;
  const fromIntl = nameOf ? nameOf(code) : code;
  return fromIntl && fromIntl !== code ? fromIntl : (labels.countries[code] || code);
}

function feedSourceName(sourceId, labels, sources) {
  return labels.sourceNames[sourceId] || (sources && sources[sourceId] && sources[sourceId].name) || sourceId;
}

// 설계 분야 key → 이름: 화면 언어 이름(PRODUCT_LABELS.disciplineNames) → 자료 파일 disciplines(한국어) → key
function feedDisciplineName(key, uiNames, dataNames) {
  return (uiNames && uiNames[key]) || (dataNames && dataNames[key]) || key;
}

// 소식 한 건 → 화면에 그릴 값
function feedItemView(item, labels, sources, nameOf) {
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    date: item.date || labels.noDate,
    kind: feedSourceKind(item.source),
    kindLabel: labels.kinds[feedSourceKind(item.source)],
    source: feedSourceName(item.source, labels, sources),
    country: item.country ? feedCountryName(item.country, labels, nameOf) : "",
    summary: item.summary || "",
    chems: feedChems(item),
    equipment: item.equipment || [],
    disciplines: item.disciplines || [],
  };
}

Object.assign(window, {
  FEED_UNKNOWN_COUNTRY, FEED_PAGE, feedIsCas, feedSourceKind, feedFilterItems, feedCountryOptions, feedSourceOptions,
  feedSubstanceHref, feedChems, feedCountryName, feedSourceName, feedDisciplineName, feedItemView,
});
