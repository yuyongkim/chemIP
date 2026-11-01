// HAZOP 작성기 · 위험도 기준: 척도(강도 × 빈도 단계 수)·높음/보통 경계 고르기와 그 행렬 보기. 문구: HAZOP_LABELS.risk

function HazopRiskSettings({ risk, onChange }) {
  const R = HAZOP_LABELS.risk;
  const C = HAZOP_LABELS.cols;
  const scale = HAZOP_RISK_SCALES.find(s => s.sMax === risk.sMax && s.lMax === risk.lMax)?.k || "";
  const sev = Array.from({ length: risk.sMax }, (_, i) => risk.sMax - i);
  const lik = Array.from({ length: risk.lMax }, (_, i) => i + 1);
  const num = (k) => (
    <label className="calc-field hz-narrow">
      <span className="calc-label">{R[k]}</span>
      <input className="calc-input mono" type="number" min={1} max={risk.sMax * risk.lMax} value={risk[k]}
        onChange={e => onChange({ ...risk, [k]: Number(e.target.value) })} />
    </label>
  );
  return (
    <div className="panel calc-panel">
      <h3><b>{R.title}</b></h3>
      <div className="body">
        <label className="calc-field">
          <span className="calc-label">{R.scale}</span>
          <select className="calc-input" value={scale} onChange={e => { const s = HAZOP_RISK_SCALES.find(x => x.k === e.target.value); if (s) onChange({ sMax: s.sMax, lMax: s.lMax, high: s.high, mid: s.mid }); }}>
            {HAZOP_RISK_SCALES.map(s => <option key={s.k} value={s.k}>{R.scales[s.k]}</option>)}
          </select>
        </label>
        <div className="hz-grid">{num("high")}{num("mid")}</div>
        <div className="sft-matrix-wrap">
          <table className="hz-risk-matrix" aria-label={R.matrixAria}>
            <thead>
              <tr><th scope="col">{C.S} \ {C.L}</th>{lik.map(l => <th key={l} scope="col" className="mono">{l}</th>)}</tr>
            </thead>
            <tbody>
              {sev.map(s => (
                <tr key={s}>
                  <th scope="row" className="mono">{s}</th>
                  {lik.map(l => <td key={l}><HazopRiskBadge score={s * l} risk={risk} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="calc-hint">{R.note}</div>
      </div>
    </div>
  );
}

Object.assign(window, { HazopRiskSettings });
