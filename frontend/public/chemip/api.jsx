// API integration for ChemIP design — talks to FastAPI backend via Next.js /api rewrite

const API_BASE = "/api";

async function apiGet(path) {
  const r = await fetch(`${API_BASE}${path}`);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
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
    () => apiGet(`/trade/news?keyword=${encodeURIComponent(keyword || "화학")}&page=1&perPage=10`).catch(() => ({ items: [] })),
    [keyword]
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

Object.assign(window, {
  apiGet, apiPost, useApi,
  useChemicalSearch, useChemicalDetail, usePatents,
  useGuideRecommendations, useGuideStatus,
  useDrugSearch, useTradeNews, useAIAnalysis,
  parseSectionRows, sectionStatus, useSelectedChemical,
});
