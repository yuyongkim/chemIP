// HAZOP 작성기 · 변수 × 가이드워드 표 — 칸을 누르면 그 이탈 줄을 기록지에 더한다(숫자 = 이미 적은 건수).
// 일반 변수(가이드워드 "gen")는 표 아래 단추 줄. 변수 목록·쓸 만한 조합: HAZOP_PARAMS(hazop_data.jsx), 문구: HAZOP_LABELS.matrix

function HazopGuideMatrix({ node, processType, onAdd }) {
  const L = HAZOP_LABELS;
  const M = L.matrix;
  const params = hzParamsFor(processType);
  const specific = params.filter(p => !p.guides.includes("gen"));
  const general = params.filter(p => p.guides.includes("gen"));
  const add = (param, guide) => onAdd([hzNewRow(param, guide, L)]);
  const full = node.rows.length >= HAZOP_MAX_ROWS;
  return (
    <div className="panel calc-panel">
      <h3><b>{M.title}</b></h3>
      <div className="body">
        <div className="calc-hint">{M.hint}</div>
        {full && <div className="calc-alert is-warn">{L.sheet.full(HAZOP_MAX_ROWS)}</div>}
        <div className="sft-matrix-wrap">
          <table className="hz-matrix">
            <thead>
              <tr>
                <th scope="col">{L.cols.param}</th>
                {HAZOP_GUIDES.map(g => <th key={g} scope="col">{L.guides[g]}</th>)}
                <th />
              </tr>
            </thead>
            <tbody>
              {specific.map(p => (
                <tr key={p.k}>
                  <th scope="row" className="hz-matrix-param">{L.params[p.k]}</th>
                  {HAZOP_GUIDES.map(g => {
                    if (!p.guides.includes(g)) return <td key={g} className="hz-cell is-off" aria-hidden="true" />;
                    const n = hzRowCount(node, p.k, g);
                    const name = hzDeviationName(p.k, g, L);
                    return (
                      <td key={g} className={`hz-cell${n ? " is-used" : ""}`}>
                        <button type="button" disabled={full} title={name} aria-label={`${name}${n ? ` (${n})` : ""}`} onClick={() => add(p.k, g)}>
                          {n ? n : "+"}
                        </button>
                      </td>
                    );
                  })}
                  <td>
                    <button type="button" className="btn sm ghost hz-addall" disabled={full} title={M.addAll}
                      onClick={() => onAdd(p.guides.filter(g => !hzRowCount(node, p.k, g)).map(g => hzNewRow(p.k, g, L)))}>
                      <Icon name="plus" size={11} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="calc-sub">{M.general}</div>
        <div className="calc-hint">{M.generalHint}</div>
        <div className="hz-gen-row">
          {general.map(p => {
            const n = hzRowCount(node, p.k, "gen");
            return (
              <button key={p.k} type="button" className={`btn sm${n ? " is-used" : ""}`} disabled={full} title={hzDeviationName(p.k, "gen", L)} onClick={() => add(p.k, "gen")}>
                {L.params[p.k]}{n ? ` · ${n}` : ""}
              </button>
            );
          })}
          <button type="button" className="btn sm ghost" disabled={full} onClick={() => onAdd([hzNewRow("", "", L)])}><Icon name="plus" size={12} /> {M.custom}</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HazopGuideMatrix });
