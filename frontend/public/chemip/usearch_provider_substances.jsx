// 통합 검색 묶음 · 화학물질 — 기존 물질 검색(fetchChemicalSearch, api_chemicals.jsx: 정적 색인 먼저, 없으면 /api) 결과 그대로.
// 순서는 물질 검색과 같고, 점수는 묶음 순서(이름·CAS 가 딱 맞는지)에만 쓴다. 전체 결과는 물질 검색 화면(pv=search)으로.

const USP_SUBSTANCES_FETCH = 20; // 물질 검색 화면과 같은 요청(정적 색인의 미리 계산한 답이 limit 20)

function usSubstanceHref(item) {
  return `?view=product&pv=chemical&chem=${encodeURIComponent(item.chem_id || item.cas_no || "")}`;
}

function usSubstanceMoreHref(q) {
  return `?view=product&pv=search&q=${encodeURIComponent(q)}`;
}

// 검색 응답의 물질 한 건 → 결과 한 건. 점수는 이름(한·영)·CAS 에 대한 맞춤.
function usSubstanceItem(query, it, labels) {
  const { primary, secondary } = chemDisplayNames(it);
  const doc = { fields: [{ t: it.name }, { t: it.name_en }, { t: secondary }, { t: primary }, { t: it.cas_no }] };
  return {
    id: `s:${it.chem_id || it.id}`,
    title: primary,
    sub: [labels.substanceSub(it.cas_no), secondary].filter(Boolean).join(" · "),
    badge: it.has_msds ? labels.badges.msds : (it.source || ""),
    href: usSubstanceHref(it),
    score: usDocScore(query, doc),
  };
}

function usSubstanceResult(query, data, labels) {
  const items = ((data && data.items) || []).filter(it => it && (it.chem_id || it.cas_no)).map(it => usSubstanceItem(query, it, labels));
  const total = Math.max(Number(data && data.total) || 0, items.length);
  return { items, total, moreHref: total > 0 ? usSubstanceMoreHref(query) : "" };
}

const USP_SUBSTANCES = {
  k: "substances",
  icon: "atom",
  limit: 5,
  search: async (q) => usSubstanceResult(q, await fetchChemicalSearch(q, USP_SUBSTANCES_FETCH), USEARCH_LABELS),
};

Object.assign(window, { USP_SUBSTANCES, usSubstanceItem, usSubstanceResult, usSubstanceHref, usSubstanceMoreHref });
