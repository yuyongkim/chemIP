// PRTR 지도 바탕 — 시도 경계(prtr_map_geo.jsx 의 PRTR_GEO_TOPO, 화면 묶음 안의 자료라 요청 없음)를 d3 투영으로 한 번만 경로로 바꾼다.
// 화면(prtr_choropleth.jsx)은 usePrtrGeoPaths() 결과만 그린다. 경로 id = ISO 3166-2:KR(파일의 regions[].iso 와 같다).

const PRTR_GEO_W = 480, PRTR_GEO_H = 560;
let prtrGeoCache = null;

function prtrGeoPaths() {
  if (prtrGeoCache) return prtrGeoCache;
  if (!window.d3 || !window.topojson || !window.PRTR_GEO_TOPO) throw new Error("map library unavailable");
  const topo = window.PRTR_GEO_TOPO;
  const fc = window.topojson.feature(topo, topo.objects.sido);
  const projection = window.d3.geoMercator().fitExtent([[6, 6], [PRTR_GEO_W - 6, PRTR_GEO_H - 6]], fc);
  const path = window.d3.geoPath(projection);
  prtrGeoCache = fc.features.map(f => ({ id: f.id, d: path(f) }));
  return prtrGeoCache;
}

function usePrtrGeoPaths() {
  return React.useMemo(() => {
    try { return { paths: prtrGeoPaths(), error: null }; } catch (e) { return { paths: [], error: String(e.message || e) }; }
  }, []);
}

Object.assign(window, { PRTR_GEO_W, PRTR_GEO_H, prtrGeoPaths, usePrtrGeoPaths });
