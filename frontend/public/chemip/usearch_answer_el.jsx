// 통합 검색 바로 답 · 비상대응 기준 — "염소 AEGL" · "ammonia ERPG" · "PAC 황화수소" → 단계별 값·출처 배지·물질 상세(#el) 링크.
// 답 만들기 fetchElAnswer(api_el.jsx: 물질 검색 → 정적 el/<CAS>.json → elAnswer), 화면 ElAnswerCard(el_answer_card.jsx).
// 검색어에 AEGL·ERPG·PAC·TEEL·비상대응 기준 낱말이 없으면 요청하지 않는다(elParseQuery 가 null).

const USA_EL = {
  k: "el",
  answer: (q) => (elParseQuery(q, [EL_LABELS_KO, EL_LABELS_EN]) ? fetchElAnswer(q) : Promise.resolve(null)),
  Component: ({ answer, query }) => <ElAnswerCard answer={answer} query={query} />,
};

Object.assign(window, { USA_EL });
