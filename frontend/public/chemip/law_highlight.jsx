// 글 안의 찾을 말 표시(<mark>) — 국내 법령 보기 조문·물질 패널 발췌가 같이 쓴다. 나누기 규칙: law_core.jsx lawHighlight.

function LawHighlight({ text, q }) {
  const parts = lawHighlight(text, q);
  return <>{parts.map((p, i) => (p.hit ? <mark key={i} className="law-hit">{p.t}</mark> : <React.Fragment key={i}>{p.t}</React.Fragment>))}</>;
}

Object.assign(window, { LawHighlight });
