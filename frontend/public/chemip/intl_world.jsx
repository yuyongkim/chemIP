// 국가별 규제 지도 바탕 자료 — data/world-110m.json(정적 파일)을 한 번 읽어 d3 투영으로 나라 경로를 만든다.
// 화면(product_intl_map.jsx)은 useWorldPaths() 결과만 그린다.

const WORLD_URL = "data/world-110m.json";
const MAP_W = 960, MAP_H = 470;
let worldPromise = null;

function loadWorld() {
  if (!worldPromise) {
    worldPromise = fetch(WORLD_URL)
      .then(r => { if (!r.ok) throw new Error(`map ${r.status}`); return r.json(); })
      .then(topo => window.topojson.feature(topo, topo.objects.countries).features
        .filter(f => f.id !== "010")); // Antarctica only wastes vertical space
    worldPromise.catch(() => { worldPromise = null; });
  }
  return worldPromise;
}

function useWorldPaths() {
  const [state, setState] = useState({ paths: [], error: null });
  React.useEffect(() => {
    if (!window.d3 || !window.topojson) { setState({ paths: [], error: "map library unavailable" }); return; }
    let cancelled = false;
    loadWorld().then(features => {
      if (cancelled) return;
      const projection = window.d3.geoNaturalEarth1().fitSize([MAP_W, MAP_H], { type: "FeatureCollection", features });
      const path = window.d3.geoPath(projection);
      setState({ paths: features.map(f => ({ id: f.id, name: f.properties?.name || "", d: path(f) })), error: null });
    }).catch(e => { if (!cancelled) setState({ paths: [], error: String(e.message || e) }); });
    return () => { cancelled = true; };
  }, []);
  return state;
}

Object.assign(window, { MAP_W, MAP_H, useWorldPaths });
