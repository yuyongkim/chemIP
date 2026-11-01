// API 층 · 안전 도구(저장 혼촉 매트릭스·혼합물 GHS 분류). 화면 컴포넌트는 fetch 하지 않고 여기 훅만 쓴다.
// - 공용 표: 정적 g/reactive_class.json(CAS → 반응성 분류)·g/clp_annex6.json(CAS → CLP 부속서 VI 조화 분류). 집 PC 에 같은 API 는 없다 —
//   정적 자료가 꺼져 있거나 파일이 없으면 null 이고, 화면은 물질 MSDS 상세로 같은 규칙을 적용한다(compat_core.jsx).
// - 물질 상세: 기존 fetchChemicalDetail(정적 먼저, 없으면 집 PC). 고른 물질이 CAS 항목이면 같은 CAS 의 KOSHA MSDS 물질을 먼저(resolveLinkChemId).
// 형식: scripts/static_export/CONTRACT.md "g/reactive_class.json", "g/clp_annex6.json".

async function fetchSafetyTable(name) {
  const rel = STATIC_LAYOUT.pages.safety[name];
  try {
    return rel ? await staticPagesFile(rel) : null;
  } catch (e) {
    return null;
  }
}

// { reactive, annex6 } — 둘 다 없을 수 있다(null)
function useSafetyTables() {
  return useApi(() => Promise.all([fetchSafetyTable("reactiveClass"), fetchSafetyTable("clpAnnex6")])
    .then(([reactive, annex6]) => ({ reactive, annex6 })), []);
}

// 검색 결과 항목 → MSDS 상세(없으면 null). 실패는 { error } 로 돌려 화면이 그 물질만 "불러오지 못함" 으로 그린다.
async function fetchToolSubstance(item) {
  try {
    const cas = item.cas_no || "";
    let chemId = item.chem_id || cas;
    if (!item.has_msds && /^\d{2,7}-\d{2}-\d$/.test(cas)) chemId = await resolveLinkChemId(cas);
    const detail = chemId ? await fetchChemicalDetail(chemId) : null;
    return { detail, chemId };
  } catch (e) {
    return { detail: null, error: String(e.message || e) }; // 실시간 전용 안내(API_LABELS.liveOnly)도 그대로 — 화면이 apiIsNotice 로 가린다
  }
}

// 고른 물질 목록 [{ id, item }] → { [id]: { loading, detail, error } }. 새로 들어온 물질만 받는다.
function useToolSubstances(entries) {
  const [state, setState] = React.useState({});
  const ids = (entries || []).map(e => e.id).join("|");
  React.useEffect(() => {
    let alive = true;
    (entries || []).forEach(e => {
      if (state[e.id]) return;
      setState(s => ({ ...s, [e.id]: { loading: true } }));
      fetchToolSubstance(e.item).then(r => { if (alive) setState(s => ({ ...s, [e.id]: { loading: false, ...r } })); });
    });
    return () => { alive = false; };
  }, [ids]);
  return state;
}

// CAS → 검색 항목 하나(같은 CAS 의 MSDS 물질 먼저, 없으면 첫 항목). 예시 불러오기용. 못 찾으면 null.
async function fetchSubstanceByCas(cas) {
  try {
    const items = (await fetchChemicalSearch(cas, 20)).items || [];
    return linkPreferredItem(items, cas) || items.find(it => it.cas_no === cas) || null;
  } catch (e) {
    return null;
  }
}

// 물질 고르기 검색(입력이 멈추고 250 ms 뒤, 8건)
function useSubstanceSuggest(q) {
  const [query, setQuery] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setQuery(String(q || "").trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  return useApi(() => (query.length >= 2 ? fetchChemicalSearch(query, 8) : Promise.resolve({ items: [] })), [query]);
}

Object.assign(window, { fetchSafetyTable, useSafetyTables, fetchToolSubstance, useToolSubstances, fetchSubstanceByCas, useSubstanceSuggest });
