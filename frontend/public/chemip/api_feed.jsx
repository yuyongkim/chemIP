// API 층 · 화학사고 소식(정적 파일만, 집 PC /api 없음). 형식: scripts/static_export/CONTRACT.md "feed/".
//   feed/latest.json          최근 소식(출처·라이선스·나라 수·물질 목록 포함). Worker 정기 실행이 CSB 소식을 더해 갱신할 수 있다
//   feed/by-cas/<CAS>.json    물질 하나의 소식(최신 100건 + 전체 건수). 파일이 없으면 "소식 없음" 빈 답
// 뿌리 = 정적 자료가 켜져 있으면 static_config.jsx 의 pages 뿌리(배포: R2), 꺼져 있으면 같은 주소 /data/<version>
// (특허 매핑 api_patents_static.jsx 와 같은 규칙). 받기·gzip 풀기·캐시는 api_static.jsx 의 staticGetJson.

const FEED_FALLBACK_BASE = "/data";
const FEED_CAS_RE = /^\d{2,7}-\d{2}-\d$/;

function feedUrl(rel) {
  return staticUrl("pages", rel) || `${FEED_FALLBACK_BASE}/${staticConfig().version}/${rel}`;
}

// latest.json 본문, 파일이 없으면 null(화면은 "자료 준비 중").
function fetchFeedLatest() {
  return staticGetJson(feedUrl(STATIC_LAYOUT.pages.feed.latest));
}

// 물질 하나의 소식. CAS 가 아니면 null, 파일이 없으면(소식 없는 물질) 빈 답.
async function fetchFeedByCas(cas) {
  const c = String(cas || "").trim();
  if (!FEED_CAS_RE.test(c)) return null;
  const body = await staticGetJson(feedUrl(STATIC_LAYOUT.pages.feed.byCas(c)));
  return body || { v: 1, cas: c, name: "", total: 0, by_source: {}, items: [] };
}

function useFeedLatest() {
  return useApi(() => fetchFeedLatest(), []);
}

function useFeedByCas(cas) {
  return useApi(() => (cas ? fetchFeedByCas(cas) : Promise.resolve(null)), [cas]);
}

Object.assign(window, { feedUrl, fetchFeedLatest, fetchFeedByCas, useFeedLatest, useFeedByCas, FEED_CAS_RE });
