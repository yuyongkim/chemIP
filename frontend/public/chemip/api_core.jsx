// API 층 바탕 — /api 호출(apiGet·apiGetTimeout·apiPost), 정적 자료 먼저(staticFirst), 상태 훅(useApi).
// 도메인별 훅은 api_<도메인>.jsx 에 있다. 정적 자료가 켜져 있으면(static_config.jsx) 검색·물질 상세·수출입·
// 국가별 목록·통합허가 사례·자료 규모는 정적 파일을 먼저 읽고(api_static.jsx) 없거나 실패하면 /api 로 간다.
// 서버에 닿지 못하면 오류 문구는 API_LABELS.offline(api_errors.jsx) 이 되어 각 화면의 기존 오류 자리에 보인다.
// 집 PC 전용 경로는 api_origin.jsx 의 originGet 으로 부른다(정적 배포에서 PC 가 꺼져 있으면 요청하지 않음).

// 배포 화면이 window.CHEMIP_API_BASE 를 주면 그 주소를 쓴다(운영 Worker 가 서울 경유 pages.dev 주소를 넣는다,
// cloudflare/worker/src/routes/site_assets.js). 없으면 같은 출처 /api.
const API_BASE = (typeof window !== "undefined" && window.CHEMIP_API_BASE) || "/api";

async function apiGet(path) {
  let r;
  try { r = await fetch(`${API_BASE}${path}`); } catch (e) { throw apiNetworkError(e); }
  if (!r.ok) throw apiStatusError(r);
  return r.json();
}

// Like apiGet but never hangs — aborts after `ms` and rejects, so callers can
// fall back to a graceful "retry" state instead of spinning forever.
async function apiGetTimeout(path, ms = 30000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(`${API_BASE}${path}`, { signal: ctrl.signal });
    if (!r.ok) throw apiStatusError(r);
    return await r.json();
  } catch (e) {
    if (e.name === "AbortError") throw new Error(`timeout after ${Math.round(ms / 1000)}s`);
    throw apiNetworkError(e);
  } finally {
    clearTimeout(timer);
  }
}

async function apiPost(path, body) {
  let r;
  try {
    r = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) { throw apiNetworkError(e); }
  if (!r.ok) throw apiStatusError(r);
  return r.json();
}

// 정적 자료 먼저, 없거나(null) 실패하면 /api. staticCall 은 api_static.jsx 의 함수.
async function staticFirst(staticCall, liveCall) {
  try {
    const d = await staticCall();
    if (d != null) return d;
  } catch (e) { /* 정적 자료 실패 → /api */ }
  return liveCall();
}

function useApi(fn, deps) {
  const [state, setState] = React.useState({ data: null, loading: true, error: null });
  React.useEffect(() => {
    let cancelled = false;
    setState({ data: null, loading: true, error: null });
    fn()
      .then(d => { if (!cancelled) setState({ data: d, loading: false, error: null }); })
      .catch(e => { if (!cancelled) setState({ data: null, loading: false, error: String(e.message || e) }); });
    return () => { cancelled = true; };
  }, deps);
  return state;
}

Object.assign(window, { API_BASE, apiGet, apiGetTimeout, apiPost, useApi, staticFirst });
