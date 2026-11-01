// API 층 · 통합 검색 — 묶음(USEARCH_PROVIDERS)을 한꺼번에 돌리는 훅 useUnifiedSearch 와
// KOSHA 기술지침 목록 읽기(정적 g/guide_index.json 먼저 → 집 PC /api/guides/search).
// 묶음마다 상태가 따로라 빠른 묶음(계산기·용어)은 바로, 느린 묶음(물질·지침)은 오는 대로 보인다.

const USEARCH_GUIDE_LIVE_LIMIT = 20;

// 정적 목록의 행 배열, 정적 자료가 꺼져 있거나 파일이 없으면 null.
async function fetchGuideIndexRows() {
  const idx = await staticGuideIndex();
  return idx && Array.isArray(idx.rows) ? idx.rows : null;
}

function fetchGuideSearchLive(q) {
  return originGet(`/guides/search?q=${encodeURIComponent(q)}&limit=${USEARCH_GUIDE_LIVE_LIMIT}`);
}

// q → { [묶음 key]: { status: "loading" | "done" | "error", items, total, moreHref?, error? } }
function useUnifiedSearch(q, providers = USEARCH_PROVIDERS) {
  const [states, setStates] = React.useState({});
  React.useEffect(() => {
    const query = usCleanQuery(q);
    if (!query) { setStates({}); return undefined; }
    let cancelled = false;
    const put = (k, st) => { if (!cancelled) setStates(prev => ({ ...prev, [k]: st })); };
    setStates(Object.fromEntries(providers.map(p => [p.k, { status: "loading", items: [], total: 0 }])));
    providers.forEach(p => {
      Promise.resolve()
        .then(() => p.search(query))
        .then(r => put(p.k, { status: "done", items: (r && r.items) || [], total: (r && r.total) || 0, moreHref: (r && r.moreHref) || "" }))
        .catch(e => put(p.k, { status: "error", items: [], total: 0, error: String((e && e.message) || e) }));
    });
    return () => { cancelled = true; };
  }, [q]);
  return states;
}

Object.assign(window, { fetchGuideIndexRows, fetchGuideSearchLive, useUnifiedSearch });
