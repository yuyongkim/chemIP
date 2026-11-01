// 통합 검색 · 검색어 강조 — 글자를 usHighlight(usearch_core.jsx) 조각으로 나눠 맞은 부분만 <mark>.

function UsMark({ text, query }) {
  return usHighlight(text, query).map((p, i) => (p.hit ? <mark key={i} className="us-mark">{p.t}</mark> : <React.Fragment key={i}>{p.t}</React.Fragment>));
}

Object.assign(window, { UsMark });
