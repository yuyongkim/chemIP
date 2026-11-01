// PRTR 지도 · 지도에 칠할 값 고르기(사업장 수 / 배출량 / 이동량). 목록은 PRTR_METRICS, 이름은 PRTR_MAP_LABELS.metrics.

function PrtrMetricSwitch({ metric, onChange }) {
  const L = PRTR_MAP_LABELS;
  return (
    <div className="seg prtr-metric" role="group" aria-label={L.metricAria}>
      {PRTR_METRICS.map(k => (
        <button key={k} type="button" aria-pressed={metric === k} onClick={() => onChange(k)}>{L.metrics[k]}</button>
      ))}
    </div>
  );
}

Object.assign(window, { PrtrMetricSwitch });
