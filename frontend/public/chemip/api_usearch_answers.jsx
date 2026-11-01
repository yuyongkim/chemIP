// API 층 · 통합 검색 "바로 답" — 답(USEARCH_ANSWERS)을 한꺼번에 돌리는 훅. 답마다 따로 와서 오는 대로 보인다.
// 실패한 답·답 없음(null)은 보이지 않는다(묶음 결과가 그대로 있으므로 오류 줄을 따로 두지 않는다).

// q → [{ k, answer }] (등록 순서, 답이 있는 것만)
function useUnifiedAnswers(q, answers = USEARCH_ANSWERS) {
  const [got, setGot] = React.useState({});
  React.useEffect(() => {
    const query = usCleanQuery(q);
    setGot({});
    if (!query) return undefined;
    let cancelled = false;
    answers.forEach(a => {
      Promise.resolve()
        .then(() => a.answer(query))
        .then(r => { if (!cancelled && r) setGot(prev => ({ ...prev, [a.k]: r })); })
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [q]);
  return answers.filter(a => got[a.k]).map(a => ({ k: a.k, answer: got[a.k], Component: a.Component }));
}

Object.assign(window, { useUnifiedAnswers });
