// 계산기 식·주의·근거 문헌 패널 — 정의의 formula·notes·reference 를 그대로 보인다. links 가 배열([{ href, label }])이면 주의 아래 관련 화면 링크(함수 links 는 "이어서 계산" — calc_results_next.jsx).

function CalcNotes({ def }) {
  const S = CALC_LABELS.sections;
  return (
    <div className="panel calc-panel calc-notes">
      <h3><b>{S.formula}</b></h3>
      <div className="body">
        <div className="calc-formula">{def.formula.map(f => <div key={f}>{f}</div>)}</div>
        {def.notes?.length > 0 && (
          <>
            <div className="calc-sub">{S.notes}</div>
            <ul className="calc-list">{def.notes.map(n => <li key={n}>{n}</li>)}</ul>
          </>
        )}
        {Array.isArray(def.links) && def.links.length > 0 && <div className="calc-links">{def.links.map(l => <a key={l.href} href={l.href}><Icon name="chev" size={11} /> {l.label}</a>)}</div>}
        <div className="calc-sub">{S.refs}</div>
        <ol className="calc-list calc-refs">{def.reference.map(r => <li key={r}>{r}</li>)}</ol>
      </div>
    </div>
  );
}

Object.assign(window, { CalcNotes });
