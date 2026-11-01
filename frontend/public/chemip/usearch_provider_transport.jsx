// 통합 검색 묶음 · UN 번호 — "UN1114" · "UN 1114" · "1114" → 첫 줄은 UN 번호 요약(적정선적명·위험 등급·용기 등급·EmS),
// 그 아래 그 UN 번호의 물질들. 모양 판정 factsDetectUn(facts_core.jsx), 자료 fetchUnEntry(api_facts.jsx: 정적 g/un_index.json).
// "UN" 을 붙인 검색어는 딱 맞음(묶음 맨 위), 숫자 네 자리만이면 한 단계 낮게(다른 뜻일 수 있다).

function usTransportItems(un, entry, prefixed, lang) {
  const L = FACTS_LABELS;
  const T = L.transport;
  const score = prefixed ? USEARCH_SCORE.exact : USEARCH_SCORE.prefix;
  const view = factsTransportView({ un, name: entry.name, class: entry.class, pg: entry.pg, mp: entry.mp, ems: entry.ems }, L, lang);
  const first = (entry.cas || [])[0];
  const head = {
    id: `u:${un}`,
    title: T.title(un, view.name),
    sub: [...view.facts.map(f => `${f.label} ${f.value}`), T.substances(entry.n || 0)].join(" · "),
    badge: "UN",
    href: first ? `?view=product&pv=chemical&chem=${encodeURIComponent(first[1] || first[0])}` : "",
    score,
  };
  const subs = (entry.cas || []).map(([cas, link, ko, en]) => ({
    id: `u:${un}:${cas}`,
    title: factsPickName(ko, en, lang) || L.casOnly(cas),
    sub: L.casOnly(cas),
    href: `?view=product&pv=chemical&chem=${encodeURIComponent(link || cas)}`,
    score: score - 1,
  }));
  return [head, ...subs];
}

const USP_TRANSPORT = {
  k: "transport",
  icon: "map",
  limit: 4,
  search: async (q) => {
    const found = factsDetectUn(q);
    if (!found) return { items: [], total: 0 };
    const entry = await fetchUnEntry(found.un);
    if (!entry) return { items: [], total: 0 };
    const items = usTransportItems(found.un, entry, found.prefixed, CHEMIP_LANG);
    return { items, total: 1 + Math.max(entry.n || 0, items.length - 1) };
  },
};

Object.assign(window, { USP_TRANSPORT, usTransportItems });
