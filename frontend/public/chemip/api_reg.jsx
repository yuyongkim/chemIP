// API 층 · 규제 목록·변경 알림 정적 파일(v1/reg/, 형식 scripts/static_export/CONTRACT.md "reg/").
//   reg/lists.json          목록 전부(묶음·나라·건수·날짜·출처)
//   reg/list/<id>.json      목록 하나: 머리 + 첫 조각 행, 긴 목록은 reg/list/<id>.<k>.json 조각(필요할 때만 받는다)
//   reg/changes.json        최근 변경, reg/changes.xml 은 같은 내용의 RSS
// 뿌리 = 정적 자료가 켜져 있으면 static_config.jsx 의 pages 뿌리(배포: /data/v1), 꺼져 있으면 같은 주소 /data/<version>
// (PC 사이트: Next → 백엔드 backend/api/routes/portal_static.py). 집 PC /api 는 쓰지 않는다. 받기·gzip·캐시 = staticGetJson.
// 화면 컴포넌트는 fetch 하지 않고 아래 훅만 쓴다.

const REG_LAYOUT = {
  fallbackBase: "/data",
  lists: "reg/lists.json",
  changes: "reg/changes.json",
  rss: "reg/changes.xml",
  list: (id, part) => `reg/list/${encodeURIComponent(id)}${part ? `.${part}` : ""}.json`,
};
const REG_ID_RE = /^[A-Z0-9_]+$/;

function regDataUrl(rel) {
  const cfg = staticConfig();
  const root = cfg.roots.pages || `${REG_LAYOUT.fallbackBase}/${cfg.version}`;
  return `${root}/${rel}`;
}

function fetchRegLists() {
  return staticGetJson(regDataUrl(REG_LAYOUT.lists));
}

function fetchRegChanges() {
  return staticGetJson(regDataUrl(REG_LAYOUT.changes));
}

function fetchRegListPart(id, part = 0) {
  if (!REG_ID_RE.test(id || "")) return Promise.resolve(null);
  return staticGetJson(regDataUrl(REG_LAYOUT.list(id, part)));
}

function regRssUrl() {
  return regDataUrl(REG_LAYOUT.rss);
}

function useRegLists() {
  return useApi(fetchRegLists, []);
}

function useRegChanges() {
  return useApi(fetchRegChanges, []);
}

// 목록 하나. 처음엔 머리(조각 0)만, want = 더 받을 조각 번호 배열("all" = 전부: 목록 안 찾기).
// → { head, partsMap: {k: rows}, loading, error, complete }
function useRegList(id, want) {
  const [state, setState] = React.useState({ head: null, partsMap: {}, loading: true, error: null });
  React.useEffect(() => {
    let cancelled = false;
    setState({ head: null, partsMap: {}, loading: true, error: null });
    fetchRegListPart(id, 0)
      .then(head => { if (!cancelled) setState({ head, partsMap: head ? { 0: head.rows || [] } : {}, loading: false, error: null }); })
      .catch(e => { if (!cancelled) setState({ head: null, partsMap: {}, loading: false, error: String(e.message || e) }); });
    return () => { cancelled = true; };
  }, [id]);

  const parts = state.head?.parts || 1;
  const need = !state.head ? [] : (want === "all" ? [...Array(parts).keys()] : (want || [])).filter(k => k > 0 && k < parts && !state.partsMap[k]);
  const needKey = need.join(",");
  React.useEffect(() => {
    if (!need.length) return undefined;
    let cancelled = false;
    setState(s => ({ ...s, loading: true }));
    Promise.all(need.map(k => fetchRegListPart(id, k).then(p => [k, (p && p.rows) || []])))
      .then(got => { if (!cancelled) setState(s => ({ ...s, loading: false, partsMap: { ...s.partsMap, ...Object.fromEntries(got) } })); })
      .catch(e => { if (!cancelled) setState(s => ({ ...s, loading: false, error: String(e.message || e) })); });
    return () => { cancelled = true; };
  }, [id, needKey]);

  const complete = Boolean(state.head) && Object.keys(state.partsMap).length >= parts;
  return { ...state, complete };
}

Object.assign(window, { REG_LAYOUT, regDataUrl, regRssUrl, fetchRegLists, fetchRegChanges, fetchRegListPart, useRegLists, useRegChanges, useRegList });
