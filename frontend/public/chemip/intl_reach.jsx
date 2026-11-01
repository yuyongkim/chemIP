// 국가별 규제 순수 함수 — 묶어 둔 자료(g/intl_add·named_lists)에 REACH 등록이 없는 물질에, 그때그때 조회한 답(/api/reach/<CAS>)을
// EU 의 EU_REACH_REGISTERED 항목으로 넣는다. React·fetch 없음. 시험: frontend/scripts/tests/test_reach_format.cjs
//   intlHasReach(data)                 이미 EU REACH 등록 항목이 있나(묶어 둔 250종 등) → 있으면 조회하지 않는다
//   reachStateOf(reachApi)             useApi 상태 {data, loading, error} → "checking" | "registered" | "none" | "unknown" | "ambiguous"
//   intlWithReach(data, reachApi, L)   등록이면 등재 항목(facts 포함, 건수에 셈), 아니면 상태만 보이는 항목(status_only, 건수에 안 셈)
//   intlListingCount(items)            상태만 보이는 항목을 뺀 등재 건수
//   reachEntryOf(reachApi)             useApi 상태 → ReachEntry 한 칸(해외 규제 탭 REACH 패널)

const REACH_LIST_ID = "EU_REACH_REGISTERED";
const REACH_JURISDICTION = "EU";

function intlHasReach(data) {
  return ((data && data.jurisdictions && data.jurisdictions[REACH_JURISDICTION]) || []).some(x => x.regulation === REACH_LIST_ID);
}

function reachStateOf(reachApi) {
  if (!reachApi || reachApi.loading) return "checking";
  const d = reachApi.data;
  if (reachApi.error) return "unknown";
  if (!d) return "checking"; // 요청이 막 켜진 첫 화면(useApi 가 아직 loading 으로 바꾸기 전)
  if (d.status === "registered" && d.entry) return "registered";
  if (d.status === "not_registered") return "none";
  return String(d.reason || "").startsWith("ambiguous") ? "ambiguous" : "unknown";
}

function intlListingCount(items) {
  return (items || []).filter(x => !x.status_only).length;
}

function intlWithReach(data, reachApi, L) {
  if (!reachApi || intlHasReach(data)) return data;
  const state = reachStateOf(reachApi);
  const answer = (reachApi && reachApi.data) || {};
  const base = (data && data.jurisdictions) || {};
  // 아무 데도 등재되지 않은 물질에 "등록 없음"만 보이려고 EU 칸을 만들지 않는다(빈 화면 안내가 맞다).
  if (state !== "registered" && !Object.keys(base).length) return data;
  const item = { regulation: REACH_LIST_ID, list: L.listTitle, source: L.law, named_list: true, on_demand: true,
    reach_state: state, checked: answer.checked || "", echa_url: answer.echa_url || "" };
  if (state === "registered") {
    const e = answer.entry;
    Object.assign(item, { name: e.name || "", detail: e.detail || "", facts: intlEntryFacts(e) });
  } else {
    Object.assign(item, { name: "", detail: "", status_only: true });
  }
  const jurisdictions = { ...base, [REACH_JURISDICTION]: [...(base[REACH_JURISDICTION] || []), item] };
  const add = item.status_only ? 0 : 1;
  return { ...(data || { cas_no: answer.cas || "", thresholds: [] }), jurisdictions,
    count: ((data && data.count) || 0) + add, named: ((data && data.named) || 0) + add };
}

function reachEntryOf(reachApi) {
  const d = (reachApi && reachApi.data) || {};
  const e = d.entry || {};
  return { reachState: reachStateOf(reachApi), name: e.name || "", detail: e.detail || "", facts: d.entry ? intlEntryFacts(e) : null,
    checked: d.checked || "", echaUrl: d.echa_url || "", onDemand: !d.bundled };
}

Object.assign(window, { REACH_LIST_ID, REACH_JURISDICTION, intlHasReach, reachStateOf, intlListingCount, intlWithReach, reachEntryOf });
