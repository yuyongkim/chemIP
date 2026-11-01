// API 층 · 노출기준 비교(정적, 읽기 전용). 형식: scripts/static_export/CONTRACT.md "oel/<CAS>.json"·"g/oel_summary.json".
// 뿌리 = 정적 자료가 켜져 있으면 static_config.jsx 의 pages 뿌리(배포: /data/v1, 집 PC 가 꺼져도 R2), 꺼져 있으면 같은 주소
// /data/<version>(PC 사이트: Next 가 백엔드 backend/api/routes/static_areas.py 로 넘긴다). 받기·gzip 풀기·캐시는 api_static.jsx 의
// staticGetJson. 404 = 이 물질의 노출기준 자료 없음 → null. 화면 컴포넌트는 fetch 하지 않고 아래 함수·훅만 쓴다.

const OEL_FALLBACK_BASE = "/data";
const OEL_CAS_RE = /^\d{2,7}-\d{2}-\d$/;

function oelUrl(rel) {
  const cfg = staticConfig();
  const root = cfg.roots.pages || `${OEL_FALLBACK_BASE}/${cfg.version}`;
  return `${root}/${rel}`;
}

function fetchOelLimits(cas) {
  const c = String(cas || "").trim();
  if (!OEL_CAS_RE.test(c)) return Promise.resolve(null);
  return staticGetJson(oelUrl(STATIC_LAYOUT.pages.oel(c)));
}

// 자료 있는 CAS 목록(통합 검색이 없는 물질의 파일을 받지 않게). 받지 못하면 null — 그때는 파일을 바로 받아 본다.
function fetchOelSummary() {
  return staticGetJson(oelUrl(STATIC_LAYOUT.pages.oelSummary)).catch(() => null);
}

async function fetchOelForSearch(cas) {
  const summary = await fetchOelSummary();
  if (summary && Array.isArray(summary.cas) && !summary.cas.includes(cas)) return null;
  return fetchOelLimits(cas).catch(() => null);
}

// 물질 상세 패널 자료: 그 CAS 파일, 없으면 값 없는 빈 모양(links 는 목록 파일에서 — 값을 싣지 않는 자료 링크는 늘 보인다).
async function fetchOelPanel(cas) {
  const file = await fetchOelLimits(cas);
  if (file) return file;
  const summary = await fetchOelSummary();
  return { cas, rows: [], sources: {}, links: (summary && summary.links) || [], mw: null, exported_at: (summary && summary.exported_at) || "" };
}

// 화면에 다가오면(enabled) 받는다.
function useOelLimits(cas, enabled = true) {
  return useApi(() => (cas && enabled ? fetchOelPanel(cas) : Promise.resolve(null)), [cas, enabled]);
}

Object.assign(window, { fetchOelLimits, fetchOelSummary, fetchOelForSearch, fetchOelPanel, useOelLimits });
