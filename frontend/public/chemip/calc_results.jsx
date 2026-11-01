// 계산 결과 패널 — 출력 줄(값 + 단위 고르기, term 이 있으면 용어 설명), 경고, 계산 오류. 표시 단위 환산은 calcConvert, 숫자 표기는 calcFormatNumber.
// 출력 type: "table" 은 결과 표(CalcOutTable, calc_out_table.jsx)로 그린다.
// 정의에 chart(values, outputs) 가 있으면 결과 아래에 그래프(CalcChart, calc_chart.jsx)를 그린다(calcChartFor).

function CalcResults({ def, result }) {
  const L = CALC_LABELS;
  const [units, setUnits] = useState(() => Object.fromEntries(def.outputs.filter(o => o.dim).map(o => [o.key, o.show || o.unit])));
  const outs = result.outputs ? def.outputs.filter(o => result.outputs[o.key] != null) : [];
  const chart = calcChartFor(def, result);
  return (
    <div className="panel calc-panel calc-results" aria-live="polite">
      <h3><b>{L.sections.results}</b></h3>
      <div className="body">
        {result.error && <div className="calc-alert is-hazard">{result.error}</div>}
        {!result.outputs && !result.error && <div className="calc-wait">{L.waiting}</div>}
        {outs.map(o => {
          const val = result.outputs[o.key];
          if (o.type === "table") return <CalcOutTable key={o.key} label={o.label} term={o.term} table={val} />;
          return (
            <div key={o.key} className={`calc-out${o.dim ? " has-select" : ""}`}>
              <span className="calc-out-k">{o.label}{o.term && <TermHint term={o.term} />}</span>
              <span className={`calc-out-v${o.type === "text" ? "" : " mono tnum"}`}>
                {o.type === "text" ? val : calcFormatNumber(o.dim ? calcConvert(o.dim, val, o.unit, units[o.key]) : val, o.digits)}
              </span>
              <span className="calc-out-u">
                {o.type === "text" ? null : o.dim
                  ? <CalcUnitSelect dim={o.dim} unit={units[o.key]} label={o.label} onChange={u => setUnits(s => ({ ...s, [o.key]: u }))} />
                  : o.unit === "—" ? null : o.unit}
              </span>
            </div>
          );
        })}
        {result.outputs && result.warnings.map(w => <div key={w} className="calc-alert is-warn">{w}</div>)}
        {chart && <CalcChart {...chart} />}
      </div>
    </div>
  );
}

Object.assign(window, { CalcResults });
