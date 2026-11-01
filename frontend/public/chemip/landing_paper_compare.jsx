// 처음 화면 · 연구 논문 절의 "기존 방식 vs ChemIP" 비교 그림(HTML). 문구: LANDING_PAPER_LABELS.compare

function LandingPaperCompare() {
  const C = LANDING_PAPER_LABELS.compare;
  return (
    <div className="ld-cmp" role="figure" aria-label={C.title}>
      <h3 className="ld-cmp-title">{C.title}</h3>
      <div className="ld-cmp-grid">
        <div className="ld-cmp-col is-before">
          <div className="ld-cmp-label">{C.before.label}</div>
          <ol className="ld-cmp-steps">
            {C.before.steps.map(s => (
              <li key={s.name}><b>{s.name}</b><span>{s.task}</span></li>
            ))}
          </ol>
          <div className="ld-cmp-end">{C.before.end}</div>
        </div>
        <div className="ld-cmp-arrow" aria-hidden="true">→</div>
        <div className="ld-cmp-col is-after">
          <div className="ld-cmp-label">{C.after.label}</div>
          <div className="ld-cmp-query">{C.after.query}</div>
          <div className="ld-cmp-hub">{C.after.hub}</div>
          <ul className="ld-cmp-results">
            {C.after.results.map(r => <li key={r}>{r}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LandingPaperCompare });
