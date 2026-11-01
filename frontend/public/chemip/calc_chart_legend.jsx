// 계산기 그래프 범례 — 계열이 2개 이상일 때만(하나면 축 제목이 이름). 색 견본 + 글자(글자는 본문 색).

function CalcChartLegend({ lines }) {
  if (!lines || lines.length < 2) return null;
  return (
    <ul className="calc-chart-legend" aria-label={CALC_LABELS.chart.legend}>
      {lines.map(l => (
        <li key={l.key} className="calc-chart-legend-item">
          <span className={`calc-chart-swatch calc-chart-s${l.slot}${l.dashed ? " is-dashed" : ""}${l.kind === "scatter" ? " is-dot" : ""}`} aria-hidden="true" />
          {l.label}
        </li>
      ))}
    </ul>
  );
}

Object.assign(window, { CalcChartLegend });
