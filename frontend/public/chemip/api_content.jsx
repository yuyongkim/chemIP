// API · 상세 탭·보조 화면 자료: KIPRIS 특허, KOSHA 가이드(정적 자료 먼저, /api 는 집 PC 전용 → originGet),
// 의약품, KOTRA·네이버 뉴스(Worker 가 직접 답한다).
// 빈 결과로 넘기던 훅은 연결 끊김만 오류로 올린다(apiKeepOffline, api_errors.jsx).

/* ── Patents (KIPRIS) ───────────────────────────── */
function usePatents(q, pageSize = 20) {
  return useApi(
    () => q ? originGet(`/patents?q=${encodeURIComponent(q)}&page_size=${pageSize}`) : Promise.resolve({ results: [] }),
    [q, pageSize]
  );
}

/* ── Guides ──────────────────────────────────────── */
function useGuideRecommendations(chemId, name) {
  return useApi(
    () => {
      if (!chemId) return Promise.resolve({ items: [] });
      const params = new URLSearchParams({ search: name || "" });
      return staticFirst(
        () => staticGuideRecommendations(chemId),
        () => originGet(`/guides/recommend/${encodeURIComponent(chemId)}?${params.toString()}`),
      ).catch(apiKeepOffline(() => ({ items: [] })));
    },
    [chemId, name]
  );
}

function useGuideStatus() {
  return useApi(() => staticFirst(staticGuideStatus, () => originGet(`/guides/status`)).catch(apiKeepOffline(() => null)), []);
}

/* ── Drugs ──────────────────────────────────────── */
function useDrugSearch(q) {
  return useApi(
    () => q ? apiGet(`/drugs/unified?q=${encodeURIComponent(q)}`).catch(apiKeepOffline(() => ({ items: [] }))) : Promise.resolve({ items: [] }),
    [q]
  );
}

/* ── Trade news ─────────────────────────────────── */
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

Object.assign(window, { usePatents, useGuideRecommendations, useGuideStatus, useDrugSearch, useTradeNews, useNaverTradeNews });
