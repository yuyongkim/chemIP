// 통합 검색 묶음 · 용어 — 용어사전 전체(GLOSSARY_ENTRIES, glossary_entries.jsx: 분류별 자료 + 계산기 용어 + 자료원·규제 약어).
// 이름·다른 이름은 한·영 두 벌로 맞추고(glSearchDocs), 보이는 글자는 화면 언어. 결과는 용어사전 딥링크 ?view=glossary&term=<key>.
// 정의 글자는 결과 카드에 그대로 보인다(네이버 지식백과처럼 바로 읽게). id: 약어 "a:<약어>", 나머지 "t:<key>".

function usGlossaryItem(e, labels) {
  const calc = e.calc ? (CALC_REGISTRY || []).find(d => d.key === e.calc) : null;
  return {
    id: e.abbr ? `a:${e.abbr}` : `t:${e.key}`,
    title: e.shown.term,
    sub: [GLOSSARY_LABELS.cats[e.cat], e.abbr ? e.shown.alias && e.shown.alias[0] : "", e.shown.unit, calc ? labels.termCalc(calc.title) : ""]
      .filter(Boolean).join(" · "),
    desc: e.shown.def,
    badge: e.abbr ? labels.badges.abbr : labels.badges.term,
    href: glossaryHref(e.key),
  };
}

const USP_TERMS = {
  k: "terms",
  icon: "book",
  limit: 3,
  max: 12,
  search: (q) => {
    const L = USEARCH_LABELS;
    const items = usRankDocs(q, glSearchDocs(GLOSSARY_ENTRIES, e => usGlossaryItem(e, L)));
    return { items, total: items.length, moreHref: "" };
  },
};

Object.assign(window, { USP_TERMS, usGlossaryItem });
