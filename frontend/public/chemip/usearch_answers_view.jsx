// 통합 검색 · "바로 답" 자리 — 등록된 답(usearch_answers.jsx) 가운데 이 검색어에 답이 있는 것을 묶음 위에 차례로.

function UsAnswers({ query }) {
  const shown = useUnifiedAnswers(query);
  if (!shown.length) return null;
  return (
    <div className="us-answers">
      {shown.map(({ k, answer, Component }) => <Component key={`${k}:${query}`} answer={answer} query={query} />)}
    </div>
  );
}

Object.assign(window, { UsAnswers });
