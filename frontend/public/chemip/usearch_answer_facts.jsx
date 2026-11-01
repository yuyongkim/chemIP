// 통합 검색 바로 답 · 물성 — "벤젠 인화점" · "benzene flash point" · "toluene boiling point" → 값·조건·출처 배지·물질 링크.
// 답 만들기 fetchFactsAnswer(api_facts.jsx: 물질 검색 → 정적 f/<CAS>.json → factsAnswer), 화면 FactsAnswerCard(facts_answer_card.jsx).
// 검색어에 물성 낱말이 없으면 요청하지 않는다(factsParseQuery 가 null).

const USA_FACTS = {
  k: "facts",
  answer: (q) => (factsParseQuery(q, [FACTS_LABELS_KO, FACTS_LABELS_EN]) ? fetchFactsAnswer(q) : Promise.resolve(null)),
  Component: ({ answer, query }) => <FactsAnswerCard answer={answer} query={query} />,
};

Object.assign(window, { USA_FACTS });
