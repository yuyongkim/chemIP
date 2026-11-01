// API integration for ChemIP design — talks to FastAPI backend via Next.js /api rewrite
// 정적 자료가 켜져 있으면(static_config.jsx) 검색·물질 상세·수출입·국가별 목록·통합허가 사례는 정적 파일을 먼저 읽고
// (api_static.jsx) 없거나 실패하면 /api 로 간다. 나머지는 /api 전용이다. 서버에 닿지 못하면 오류 문구는
// API_LABELS.offline(api_errors.jsx) 이 되어 각 화면의 기존 오류 자리에 보인다.

const API_BASE = "/api";

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

/* ── Chemical search & detail ───────────────────── */
function fetchChemicalSearch(q, limit = 20) {
  return staticFirst(() => staticChemicalSearch(q, 1, limit), () => apiGet(`/chemicals?q=${encodeURIComponent(q)}&limit=${limit}`));
}

function fetchChemicalAutocomplete(q, limit = 5) {
  return staticFirst(() => staticAutocomplete(q, limit), () => apiGet(`/chemicals/autocomplete?q=${encodeURIComponent(q)}&limit=${limit}`));
}

function fetchChemicalDetail(chemId) {
  return staticFirst(() => staticChemicalDetail(chemId), () => apiGet(`/chemicals/${encodeURIComponent(chemId)}`));
}

function useChemicalSearch(q) {
  return useApi(
    () => q ? fetchChemicalSearch(q, 20) : Promise.resolve({ items: [] }),
    [q]
  );
}

function useChemicalDetail(chemId) {
  return useApi(
    () => chemId ? fetchChemicalDetail(chemId) : Promise.resolve(null),
    [chemId]
  );
}

/* ── Patents (KIPRIS) ───────────────────────────── */
function usePatents(q, pageSize = 20) {
  return useApi(
    () => q ? apiGet(`/patents?q=${encodeURIComponent(q)}&page_size=${pageSize}`) : Promise.resolve({ results: [] }),
    [q, pageSize]
  );
}

/* ── Guides ──────────────────────────────────────── */
function useGuideRecommendations(chemId, name) {
  return useApi(
    () => {
      if (!chemId) return Promise.resolve({ items: [] });
      const params = new URLSearchParams({ search: name || "" });
      return apiGet(`/guides/recommend/${encodeURIComponent(chemId)}?${params.toString()}`).catch(apiKeepOffline(() => ({ items: [] })));
    },
    [chemId, name]
  );
}

function useGuideStatus() {
  return useApi(() => apiGet(`/guides/status`).catch(apiKeepOffline(() => null)), []);
}

/* ── Drugs ──────────────────────────────────────── */
function useDrugSearch(q) {
  return useApi(
    () => q ? apiGet(`/drugs/unified?q=${encodeURIComponent(q)}`).catch(apiKeepOffline(() => ({ items: [] }))) : Promise.resolve({ items: [] }),
    [q]
  );
}

/* ── Trade ──────────────────────────────────────── */
function useTradeNews(keyword) {
  return useApi(
    () => apiGet(`/trade/news?q=${encodeURIComponent(keyword || "화학")}&limit=10`).catch(apiKeepOffline(() => ({ data: [] }))),
    [keyword]
  );
}

function useNaverTradeNews(keyword) {
  return useApi(
    () => apiGet(`/trade/naver-news?q=${encodeURIComponent(keyword || "화학")}&limit=10`).catch(apiKeepOffline(() => ({ data: [] }))),
    [keyword]
  );
}

/* ── Regulatory intelligence (ECHA / NIOSH / CompTox / KISCHEM / NCIS) ── */
function useRegulatoryIntelligence(chemId, nonce = 0) {
  return useApi(
    () => chemId
      ? apiGetTimeout(`/regulations/intelligence/${encodeURIComponent(chemId)}?limit=6`, 30000)
      : Promise.resolve(null),
    [chemId, nonce]
  );
}

function useKotraReach(name) {
  return useApi(
    () => apiGetTimeout(`/regulations/kotra/reach?q=${encodeURIComponent(name || "")}&limit=8`, 15000).catch(apiKeepOffline(() => ({ data: [] }))),
    [name]
  );
}

/* ── Handling companies (PRTR) ──────────────────── */
// `enabled` lets the caller defer the call until the panel is scrolled into view.
function useHandlers(chem, enabled = true) {
  const chemId = chem?.chem_id || "";
  const cas = chem?.cas_no || "";
  const name = chem?.name || "";
  const nameEn = chem?.name_en || "";
  return useApi(
    () => {
      if (!enabled || (!chemId && !cas && !name)) return Promise.resolve(null);
      const params = new URLSearchParams({ chem_id: chemId, cas, name, name_en: nameEn, facility_limit: 50 });
      return apiGet(`/handlers?${params.toString()}`);
    },
    [enabled, chemId, cas, name, nameEn]
  );
}

/* ── AI Analysis (POST) ─────────────────────────── */
function useAIAnalysis(chemId, chemicalName) {
  const [state, setState] = React.useState({ data: null, loading: false, error: null });
  const run = React.useCallback(() => {
    if (!chemId || !chemicalName) return;
    setState({ data: null, loading: true, error: null });
    apiPost(`/ai/analyze`, { chemId, chemicalName })
      .then(d => setState({ data: d, loading: false, error: null }))
      .catch(e => setState({ data: null, loading: false, error: String(e.message || e) }));
  }, [chemId, chemicalName]);
  return { ...state, run };
}

/* ── MSDS section parsing helpers ───────────────── */
// Backend returns sections as Section 1..16 with content[] containing items with msdsItemNameKor + itemDetail.
// For panel display, return readable "key: value" rows.
function parseSectionRows(section) {
  if (!section || !section.content) return [];
  return section.content
    .filter(it => it.itemDetail && it.itemDetail !== "자료없음" && it.msdsItemNameKor)
    .map(it => ({ k: it.msdsItemNameKor, v: it.itemDetail, code: it.msdsItemCode, lev: it.lev }));
}

function sectionStatus(section) {
  const rows = parseSectionRows(section);
  return rows.length > 0 ? "ok" : "empty";
}

/* Shared currently-selected chemical state — kept in localStorage so views agree */
function useSelectedChemical() {
  const [chem, setChem] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("chemip-selected") || "null"); }
    catch { return null; }
  });
  const update = (c) => {
    setChem(c);
    try { localStorage.setItem("chemip-selected", JSON.stringify(c)); } catch {}
  };
  return [chem, update];
}

/* ── International regulation listings (by CAS) ── */
function useIntlRegulations(cas) {
  return useApi(
    () => cas
      ? staticFirst(() => staticIntl(cas), () => apiGet(`/regulations/international/${encodeURIComponent(cas)}`))
      : Promise.resolve(null),
    [cas]
  );
}

/* ── Sibling-project integrations (by CAS): Chem_Eng incidents · EPC provisions · ECHO enforcement ── */
function useIncidents(cas, enabled = true) {
  return useApi(
    () => cas && enabled ? apiGet(`/integrations/incidents/${encodeURIComponent(cas)}?limit=8`) : Promise.resolve(null),
    [cas, enabled]
  );
}

function useEnforcement(cas, enabled = true) {
  return useApi(
    () => cas && enabled ? apiGet(`/integrations/enforcement/${encodeURIComponent(cas)}?limit=6`) : Promise.resolve(null),
    [cas, enabled]
  );
}

// 한국 통합허가 실제 사례. 같은 CAS 를 섹션과 인허가 카드가 함께 쓰므로 요청은 CAS 마다 한 번(성공한 것만 보관).
const KR_PERMIT_CONTEXT_CACHE = {};
function useKrPermitContext(cas) {
  return useApi(
    () => {
      if (!cas) return Promise.resolve(null);
      if (!KR_PERMIT_CONTEXT_CACHE[cas]) {
        KR_PERMIT_CONTEXT_CACHE[cas] = staticFirst(
          () => staticPermitContext(cas),
          () => apiGetTimeout(`/integrations/kr-permit-context/${encodeURIComponent(cas)}`, 20000),
        ).catch(e => { delete KR_PERMIT_CONTEXT_CACHE[cas]; throw e; });
      }
      return KR_PERMIT_CONTEXT_CACHE[cas];
    },
    [cas]
  );
}

function useProvisions(cas, country, name, enabled = true) {
  return useApi(
    () => cas && country && enabled
      ? apiGetTimeout(`/integrations/provisions/${encodeURIComponent(cas)}?country=${encodeURIComponent(country)}&name=${encodeURIComponent(name || "")}`, 45000)
      : Promise.resolve(null),
    [cas, country, name, enabled]
  );
}

/* ── Import/export controls (by CAS · direction · counterpart country) ── */
// 수출 + 상대국이면 KOTRA 수입규제(실시간 전용)가 들어가므로 정적 조립과 /api 를 함께 부르고 /api 가 되면 그것을 쓴다.
// /api 에 닿지 못하면 정적 조립 결과(destination.kotra_unavailable = "offline")를 쓴다.
function fetchTradeControls(cas, direction, country) {
  const dir = direction || "import";
  const params = new URLSearchParams({ direction: dir, country: country || "" });
  const live = ms => apiGetTimeout(`/regulations/trade-controls/${encodeURIComponent(cas)}?${params.toString()}`, ms);
  const fromStatic = () => staticTradeControls(cas, dir, country || "");
  const ctry = String(country || "").trim().toUpperCase();
  const needsKotra = dir === "export" && ctry && ctry !== "KR";
  if (!needsKotra || !staticEnabled("pages")) return staticFirst(fromStatic, () => live(30000));
  const st = fromStatic().catch(() => null);
  return live(staticConfig().timeoutMs).catch(async e => {
    const d = await st;
    if (d) return d;
    throw e;
  });
}

function useTradeControls(cas, direction, country) {
  return useApi(
    () => cas ? fetchTradeControls(cas, direction, country) : Promise.resolve(null),
    [cas, direction, country]
  );
}

// 자료 규모 요약(국내 법령 목록 수 등). 처음 화면 문구의 숫자를 채운다.
// 처음 화면의 여러 칸이 함께 쓰므로 한 번만 요청한다(실패하면 다음 화면에서 다시 요청).
let tradeCatalogPromise = null;
function useTradeCatalog() {
  return useApi(() => {
    tradeCatalogPromise = tradeCatalogPromise || staticFirst(staticTradeCatalog, () => apiGetTimeout("/regulations/trade-controls-catalog", 15000))
      .catch(e => { tradeCatalogPromise = null; throw e; });
    return tradeCatalogPromise;
  }, []);
}

/* ── 요청 게시판 (/api/feedback) · 익명 이용 집계 (/api/usage) ── */
function useFeedbackMeta() {
  return useApi(() => apiGet(`/feedback/meta`), []);
}

// filters: { category, status, limit, offset }. nonce 를 올리면 다시 읽는다(새 글 등록 뒤).
function useFeedbackList(filters = {}, nonce = 0) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") params.set(k, v); });
  const qs = params.toString();
  return useApi(() => apiGet(`/feedback${qs ? `?${qs}` : ""}`), [qs, nonce]);
}

function useFeedbackItem(id, nonce = 0) {
  return useApi(() => (id ? apiGet(`/feedback/${encodeURIComponent(id)}`) : Promise.resolve(null)), [id, nonce]);
}

// 오류 본문(칸별 errors)을 화면에 보여 줘야 해서 apiPost 와 달리 던지지 않고 { ok, status, data } 를 돌려준다.
async function submitFeedback(body) {
  try {
    const r = await fetch(`${API_BASE}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let data = null;
    try { data = await r.json(); } catch (e) { data = null; }
    return { ok: r.ok, status: r.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { message: String(e.message || e) } };
  }
}

// 관리자(운영자) 경로 — 토큰은 헤더 X-Admin-Token 으로만 보낸다(주소·로그에 남기지 않는다).
// 토큰 보관은 feedback_admin_session.jsx(sessionStorage). 여기서는 받은 값을 실어 보내기만 한다.
async function feedbackAdminRequest(method, path, token, body) {
  try {
    const headers = { "X-Admin-Token": token || "" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const r = await fetch(`${API_BASE}/feedback${path}`, {
      method, headers, cache: "no-store", body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data = null;
    try { data = await r.json(); } catch (e) { data = null; }
    return { ok: r.ok, status: r.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { message: String(e.message || e) } };
  }
}

// { ok, status, data } 를 그대로 돌려준다(401 이면 화면이 로그아웃시킨다).
function useFeedbackAdminList(token, nonce = 0) {
  return useApi(() => (token ? feedbackAdminRequest("GET", "/admin/list", token) : Promise.resolve(null)), [token, nonce]);
}

function checkFeedbackAdminToken(token) {
  return feedbackAdminRequest("GET", "/admin/list?limit=1", token);
}

function updateFeedbackAdmin(id, token, changes) {
  return feedbackAdminRequest("PATCH", `/${encodeURIComponent(id)}`, token, changes);
}

function deleteFeedbackAdmin(id, token) {
  return feedbackAdminRequest("DELETE", `/${encodeURIComponent(id)}`, token);
}

function useUsageSummary(days = 30) {
  return useApi(() => apiGet(`/usage/summary?days=${days}&top=0`), [days]);
}

Object.assign(window, {
  useTradeCatalog, useFeedbackMeta, useFeedbackList, useFeedbackItem, submitFeedback, useUsageSummary,
  useFeedbackAdminList, checkFeedbackAdminToken, updateFeedbackAdmin, deleteFeedbackAdmin,
});

Object.assign(window, {
  apiGet, apiGetTimeout, apiPost, useApi, staticFirst,
  fetchChemicalSearch, fetchChemicalAutocomplete, fetchChemicalDetail, fetchTradeControls,
  useIncidents, useEnforcement, useProvisions, useTradeControls, useKrPermitContext,
  useChemicalSearch, useChemicalDetail, usePatents,
  useGuideRecommendations, useGuideStatus,
  useDrugSearch, useTradeNews, useNaverTradeNews, useAIAnalysis, useHandlers,
  useRegulatoryIntelligence, useKotraReach, useIntlRegulations,
  parseSectionRows, sectionStatus, useSelectedChemical,
});
