// 통합 검색 묶음 · 식별자 — 검색어가 EC 번호(200-753-7)·NCIS KE 번호(KE-02150)·InChIKey 이면 그 물질로.
// 모양 판정 factsDetectId(facts_core.jsx), 자료 fetchIdLookup(api_facts.jsx: 정적 f/id_<n>.json). 다른 검색어는 요청하지 않는다.

function usIdentifierItems(found, rows, lang) {
  const L = FACTS_LABELS;
  const type = L.idTypes[found.type] || found.type;
  return (rows || []).map(([t, cas, link, ko, en]) => ({
    id: `i:${t}:${cas}`,
    title: factsPickName(ko, en, lang) || L.casOnly(cas),
    sub: L.idSub(found.key, cas),
    badge: type,
    href: `?view=product&pv=chemical&chem=${encodeURIComponent(link || cas)}`,
    score: USEARCH_SCORE.exact,
  }));
}

const USP_IDENTIFIERS = {
  k: "identifiers",
  icon: "layers",
  limit: 5,
  search: async (q) => {
    const found = factsDetectId(q);
    if (!found) return { items: [], total: 0 };
    const items = usIdentifierItems(found, await fetchIdLookup(found.key), CHEMIP_LANG);
    return { items, total: items.length };
  },
};

Object.assign(window, { USP_IDENTIFIERS, usIdentifierItems });
