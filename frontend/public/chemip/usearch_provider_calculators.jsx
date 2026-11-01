// 통합 검색 묶음 · 공학 계산기 — CALC_REGISTRY(calc_registry.jsx)의 제목·key·요약·묶음 이름과,
// 계산기가 쓰는 용어(term key → TERM_GLOSSARY_KO·_EN 의 이름, 두 언어 모두), 찾는 낱말(USEARCH_LABELS_KO·_EN.calcKeywords[key])로 맞춘다.
// 정의의 keywords(언어 무관 단위 기호)도 본다. 결과는 계산기 딥링크(calcHref).

// 계산기 정의 하나가 쓰는 용어 key(칸·표 열·출력, 겹침 없이 처음 나온 순서).
function usCalcTermKeys(def) {
  const keys = [];
  for (const f of (def && def.inputs) || []) {
    keys.push(f.term);
    for (const c of f.columns || []) keys.push(c.term);
  }
  for (const o of (def && def.outputs) || []) keys.push(o.term);
  return usUnique(keys);
}

function usCalcDocs(registry, glossaryKo, glossaryEn, groupLabels, keywordsKo, keywordsEn) {
  return (registry || []).map(def => {
    const terms = usCalcTermKeys(def).flatMap(k => [glossaryKo?.[k]?.term, glossaryEn?.[k]?.term]);
    const group = groupLabels?.[def.group]?.name || "";
    const kw = [...(keywordsKo?.[def.key] || []), ...(keywordsEn?.[def.key] || [])];
    return {
      id: `c:${def.key}`,
      fields: [
        { t: def.title, w: 1 },
        { t: def.key, w: 1 },
        { t: String(def.key).replace(/_/g, " "), w: 1 },
        ...usUnique(terms).map(t => ({ t, w: 0.8 })),
        ...(def.keywords || []).map(t => ({ t, w: 0.8 })),
        ...usUnique(kw).map(t => ({ t, w: 0.9 })),
        { t: def.summary, w: 0.5 },
        { t: group, w: 0.4 },
      ],
      item: { id: `c:${def.key}`, title: def.title, desc: def.summary, badge: group, href: calcHref(def.key) },
    };
  });
}

const USP_CALCULATORS = {
  k: "calculators",
  icon: "flask",
  limit: 4,
  max: 12,
  search: (q) => {
    const items = usRankDocs(q, usCalcDocs(CALC_REGISTRY, TERM_GLOSSARY_KO, TERM_GLOSSARY_EN, CALC_LABELS.groups,
      USEARCH_LABELS_KO.calcKeywords, USEARCH_LABELS_EN.calcKeywords));
    return { items, total: items.length };
  },
};

Object.assign(window, { USP_CALCULATORS, usCalcTermKeys, usCalcDocs });
