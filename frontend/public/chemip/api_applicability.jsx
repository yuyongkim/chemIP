// API 층 · 적용 법규 판정기(?view=applicability). 화면 컴포넌트는 fetch 하지 않고 여기 훅만 쓴다.
//   g/hazchem_quantity.json   화관법 규정수량(고시 별표 2·3) — 정적 pages 뿌리, 꺼져 있으면 같은 주소 /data/<version>(PC: 백엔드 static_areas "g").
//                             형식 scripts/static_export/CONTRACT.md "g/hazchem_quantity.json". 못 받으면 null → 화관법 판정 "확인 필요".
//   물질 하나(CAS)            NCIS 분류·목록 코드(fetchTradeControls 의 substance, 정적 먼저), MSDS 9항 물성(fetchFacts: 인화점·폭발 한계·비중),
//                             위험물 유별 글(g/reactive_class.json 의 kr 줄, 없으면 MSDS 15항 — fetchToolSubstance + cmKrClasses)
// 결과 info = { loading, error, ncis[], lists[], flash, lfl, ufl, density, s15[] } — 판정 순수 함수(apl_*_core.jsx)가 읽는 모양.

const APL_QUANTITY_FILE = "g/hazchem_quantity.json";
const APL_CAS_RE = /^\d{2,7}-\d{2}-\d$/;

function fetchAplQuantities() {
  return staticGetJson(staticPagesUrlOrLocal(APL_QUANTITY_FILE)).catch(() => null);
}

function useAplQuantities() {
  return useApi(() => fetchAplQuantities(), []);
}

function aplFirstProp(facts, key, lo, hi) {
  const xs = (facts && facts.props && facts.props[key]) || [];
  const hit = xs.find(x => Number.isFinite(x.n) && x.n >= lo && x.n <= hi);
  return hit ? hit.n : null;
}

// reactive 표(g/reactive_class.json)의 kr 줄 basis "s15:…"
function aplS15FromTable(table, cas) {
  const rows = (table && table.classes && table.classes[cas]) || [];
  return rows.filter(r => r[0] === "kr").map(r => String(r[2] || ""));
}

async function fetchAplSubstance(cas, item, reactiveTable) {
  const [trade, facts] = await Promise.all([
    fetchTradeControls(cas, "import", "").catch(() => null),
    fetchFacts(cas).catch(() => null),
  ]);
  let s15 = aplS15FromTable(reactiveTable, cas);
  if (!s15.length && item) {
    const sub = await fetchToolSubstance(item).catch(() => null);
    const text = sub && sub.detail ? ghpMsdsItems(sub.detail, 15).O06 : "";
    s15 = cmKrClasses(text).map(c => c.basis);
  }
  const s = (trade && trade.substance) || {};
  return {
    ncis: s.ncis_categories || [],
    lists: s.list_codes || [],
    flash: aplFirstProp(facts, "flash_point", -200, 400),
    lfl: aplFirstProp(facts, "lfl", 0, 100),
    ufl: aplFirstProp(facts, "ufl", 0, 100),
    density: aplFirstProp(facts, "relative_density", 0.05, 25),
    s15,
    found: Boolean(trade || facts),
  };
}

// 행 [{ id, cas, item }] → { [id]: info }. CAS 마다 한 번만 받는다(같은 CAS 여러 행은 같은 info).
function useAplInfos(rows, reactiveTable, tableReady) {
  const [byCas, setByCas] = React.useState({});
  const started = React.useRef(new Set());
  const mounted = React.useRef(true);
  React.useEffect(() => () => { mounted.current = false; }, []);
  const list = (rows || []).filter(r => APL_CAS_RE.test(r.cas || ""));
  const casKey = [...new Set(list.map(r => r.cas))].join("|");
  React.useEffect(() => {
    if (!tableReady) return;
    for (const r of list) {
      if (started.current.has(r.cas)) continue;
      started.current.add(r.cas);
      setByCas(s => ({ ...s, [r.cas]: { loading: true } }));
      fetchAplSubstance(r.cas, r.item, reactiveTable)
        .then(info => { if (mounted.current) setByCas(s => ({ ...s, [r.cas]: { loading: false, ...info } })); })
        .catch(e => { if (mounted.current) setByCas(s => ({ ...s, [r.cas]: { loading: false, error: String(e.message || e) } })); });
    }
  }, [casKey, tableReady]);
  return Object.fromEntries((rows || []).map(r => [r.id, byCas[r.cas] || {}]));
}

Object.assign(window, { APL_QUANTITY_FILE, APL_CAS_RE, fetchAplQuantities, useAplQuantities, fetchAplSubstance, useAplInfos });
