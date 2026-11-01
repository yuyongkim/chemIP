// API 층 · 둘러보기 — 관련 물질 rel/<CAS>.json(정적 파일만, 집 PC /api 없음). 형식: scripts/static_export/CONTRACT.md "rel/<CAS>.json".
// 뿌리 = 정적 자료가 켜져 있으면 pages 뿌리(배포: R2), 꺼져 있으면 같은 주소 /data/<version>(api_static.jsx staticPagesUrlOrLocal).
// 파일이 없으면(404) "관련 물질 없음" → null, 화면은 절을 숨긴다. 사고 소식은 api_feed.jsx 의 useFeedLatest 를 그대로 쓴다.

const DISCOVERY_CAS_RE = /^\d{2,7}-\d{2}-\d$/;

// { v, cas, items: [{ cas, ko, en, s, why: [{ t: "fam"|"law"|"ghs", k, ko? }], nl, ng }] } | null
async function fetchRelatedSubstances(cas) {
  const c = String(cas || "").trim();
  if (!DISCOVERY_CAS_RE.test(c)) return null;
  const body = await staticGetJson(staticPagesUrlOrLocal(STATIC_LAYOUT.pages.related(c)));
  return body && Array.isArray(body.items) && body.items.length ? body : null;
}

// enabled 가 false 면 요청하지 않는다(아래 패널이 화면에 다가올 때만, useInView).
function useRelatedSubstances(cas, enabled = true) {
  return useApi(() => (enabled && cas ? fetchRelatedSubstances(cas) : Promise.resolve(null)), [cas, enabled]);
}

Object.assign(window, { fetchRelatedSubstances, useRelatedSubstances });
