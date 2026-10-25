// API integration for ChemIP design — talks to FastAPI backend via Next.js /api rewrite

const API_BASE = "/api";

async function apiGet(path) {
  const r = await fetch(`${API_BASE}${path}`);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

// Like apiGet but never hangs — aborts after `ms` and rejects, so callers can
// fall back to a graceful "retry" state instead of spinning forever.
async function apiGetTimeout(path, ms = 30000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(`${API_BASE}${path}`, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return await r.json();
  } catch (e) {
    if (e.name === "AbortError") throw new Error(`timeout after ${Math.round(ms / 1000)}s`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function apiPost(path, body) {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
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
function useChemicalSearch(q) {
  return useApi(
    () => q ? apiGet(`/chemicals?q=${encodeURIComponent(q)}&limit=20`) : Promise.resolve({ items: [] }),
    [q]
  );
}

function useChemicalDetail(chemId) {
  return useApi(
    () => chemId ? apiGet(`/chemicals/${encodeURIComponent(chemId)}`) : Promise.resolve(null),
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
      return apiGet(`/guides/recommend/${encodeURIComponent(chemId)}?${params.toString()}`).catch(() => ({ items: [] }));
    },
    [chemId, name]
  );
}

function useGuideStatus() {
  return useApi(() => apiGet(`/guides/status`).catch(() => null), []);
}

/* ── Drugs ──────────────────────────────────────── */
function useDrugSearch(q) {
  return useApi(
    () => q ? apiGet(`/drugs/unified?q=${encodeURIComponent(q)}`).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
    [q]
  );
}

/* ── Trade ──────────────────────────────────────── */
function useTradeNews(keyword) {
  return useApi(
    () => apiGet(`/trade/news?q=${encodeURIComponent(keyword || "화학")}&limit=10`).catch(() => ({ data: [] })),
    [keyword]
  );
}

function useNaverTradeNews(keyword) {
  return useApi(
    () => apiGet(`/trade/naver-news?q=${encodeURIComponent(keyword || "화학")}&limit=10`).catch(() => ({ data: [] })),
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
    () => apiGetTimeout(`/regulations/kotra/reach?q=${encodeURIComponent(name || "")}&limit=8`, 15000).catch(() => ({ data: [] })),
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
    () => cas ? apiGet(`/regulations/international/${encodeURIComponent(cas)}`) : Promise.resolve(null),
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
        KR_PERMIT_CONTEXT_CACHE[cas] = apiGetTimeout(`/integrations/kr-permit-context/${encodeURIComponent(cas)}`, 20000)
          .catch(e => { delete KR_PERMIT_CONTEXT_CACHE[cas]; throw e; });
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
function useTradeControls(cas, direction, country) {
  return useApi(
    () => {
      if (!cas) return Promise.resolve(null);
      const params = new URLSearchParams({ direction: direction || "import", country: country || "" });
      return apiGetTimeout(`/regulations/trade-controls/${encodeURIComponent(cas)}?${params.toString()}`, 30000);
    },
    [cas, direction, country]
  );
}

// 자료 규모 요약(국내 법령 목록 수 등). 처음 화면 문구의 숫자를 채운다.
// 처음 화면의 여러 칸이 함께 쓰므로 한 번만 요청한다(실패하면 다음 화면에서 다시 요청).
let tradeCatalogPromise = null;
function useTradeCatalog() {
  return useApi(() => {
    tradeCatalogPromise = tradeCatalogPromise || apiGetTimeout("/regulations/trade-controls-catalog", 15000)
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
  apiGet, apiGetTimeout, apiPost, useApi,
  useIncidents, useEnforcement, useProvisions, useTradeControls, useKrPermitContext,
  useChemicalSearch, useChemicalDetail, usePatents,
  useGuideRecommendations, useGuideStatus,
  useDrugSearch, useTradeNews, useNaverTradeNews, useAIAnalysis, useHandlers,
  useRegulatoryIntelligence, useKotraReach, useIntlRegulations,
  parseSectionRows, sectionStatus, useSelectedChemical,
});
