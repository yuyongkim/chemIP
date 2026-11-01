// API 층 · HAZOP 워크시트 작성기 — 검토구간에 고른 물질 하나의 자료를 모은다. 화면 컴포넌트는 fetch 하지 않고 이 훅만 쓴다.
//   MSDS 상세(fetchToolSubstance, 정적 먼저) → 2항 H 문구 · 물성 f/<CAS>.json(fetchFacts, 정적만) · 사고 사례(useIncidents, 정적 먼저)
// 하나가 실패해도 나머지 제안은 그대로 쓴다.

function useHazopSubstance(item) {
  const key = item ? `${item.chem_id || ""}|${item.cas_no || ""}` : "";
  const cas = item?.cas_no || "";
  const detail = useApi(() => (item ? fetchToolSubstance(item) : Promise.resolve(null)), [key]);
  const facts = useApi(() => (cas ? fetchFacts(cas).catch(() => null) : Promise.resolve(null)), [cas]);
  const incidents = useIncidents(cas, Boolean(cas));
  return {
    loading: Boolean(item) && (detail.loading || facts.loading || incidents.loading),
    sections: detail.data?.detail?.sections || null,
    facts: facts.data || null,
    incidents: incidents.error ? null : incidents.data || null,
  };
}

Object.assign(window, { useHazopSubstance });
