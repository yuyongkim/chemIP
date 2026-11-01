// 저장 혼촉 매트릭스 · 짝별 판정 표. 행 = 번호·이름, 열 = 번호(좁은 화면에서도 들어가게), 칸 = 판정 기호(× △ ○ ?).
// 칸을 누르면 onSelect(i, j) — 아래 짝 목록이 그 짝을 펼친다. 판정은 compat_core.jsx 의 cmMatrix 결과(pairs)만 읽는다.

function CompatLegend() {
  const O = SAFETY_LABELS.compat.outcomes;
  return (
    <div className="sft-legend" aria-label={SAFETY_LABELS.compat.legend}>
      {["x", "c", "o", "unknown"].map(k => (
        <span key={k} className={`sft-legend-item is-${k}`}><span className="sft-sym" aria-hidden="true">{O[k].symbol}</span> {O[k].name}</span>
      ))}
    </div>
  );
}

function CompatMatrix({ items, pairs, selected, onSelect }) {
  const L = SAFETY_LABELS.compat;
  return (
    <div className="panel calc-panel">
      <h3><b>{L.title}</b></h3>
      <div className="body">
        <CompatLegend />
        <div className="sft-matrix-wrap">
          <table className="sft-matrix" aria-label={L.matrixAria}>
            <thead>
              <tr>
                <th scope="col" />
                {items.map((it, j) => <th key={it.id} scope="col" className="mono" title={it.name}>{j + 1}</th>)}
              </tr>
            </thead>
            <tbody>
              {items.map((a, i) => (
                <tr key={a.id}>
                  <th scope="row" className="sft-matrix-name" title={a.name}><span className="sft-idx mono">{i + 1}</span> {a.name}</th>
                  {items.map((b, j) => {
                    if (i === j) return <td key={b.id} className="sft-cell is-self" aria-hidden="true">—</td>;
                    const p = cmCell(pairs, i, j);
                    const o = p ? p.outcome : "unknown";
                    const isSel = selected && ((selected[0] === i && selected[1] === j) || (selected[0] === j && selected[1] === i));
                    return (
                      <td key={b.id} className={`sft-cell is-${o}${isSel ? " is-selected" : ""}`}>
                        <button type="button" title={L.cellTitle(a.name, b.name, L.outcomes[o].name)} aria-label={L.cellTitle(a.name, b.name, L.outcomes[o].name)}
                          onClick={() => onSelect([Math.min(i, j), Math.max(i, j)])}>
                          {L.outcomes[o].symbol}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CompatLegend, CompatMatrix });
