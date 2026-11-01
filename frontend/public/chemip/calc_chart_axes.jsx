// 계산기 그래프의 축·격자·기준선(SVG 조각) — 모델(calcChartModel, calc_chart_scale.jsx)만 그린다. 색은 calc.css(.calc-chart-*).

function CalcChartAxes({ model }) {
  const m = model;
  return (
    <g className="calc-chart-axes" aria-hidden="true">
      {m.yTicks.map(t => (
        <g key={`y${t.v}`}>
          <line className="calc-chart-grid" x1={m.left} x2={m.right} y1={t.px} y2={t.px} />
          <text className="calc-chart-tick" x={m.left - 6} y={t.px} textAnchor="end" dominantBaseline="middle">{t.text}</text>
        </g>
      ))}
      {m.xTicks.map(t => (
        <g key={`x${t.v}`}>
          <line className="calc-chart-grid" x1={t.px} x2={t.px} y1={m.top} y2={m.bottom} />
          <text className="calc-chart-tick" x={t.px} y={m.bottom + 16} textAnchor="middle">{t.text}</text>
        </g>
      ))}
      <line className="calc-chart-axis" x1={m.left} x2={m.right} y1={m.bottom} y2={m.bottom} />
      <line className="calc-chart-axis" x1={m.left} x2={m.left} y1={m.top} y2={m.bottom} />
      <text className="calc-chart-title" x={m.left} y={m.top - 12}>{m.yTitle}</text>
      <text className="calc-chart-title" x={(m.left + m.right) / 2} y={m.height - 6} textAnchor="middle">{m.xTitle}</text>
      {m.hlines.map(h => (
        <g key={`h${h.y}${h.label || ""}`}>
          <line className="calc-chart-ref" x1={m.left} x2={m.right} y1={h.py} y2={h.py} />
          {h.label && <text className="calc-chart-ref-text" x={m.right - 4} y={h.py - 5} textAnchor="end">{h.label}</text>}
        </g>
      ))}
      {m.vlines.map(v => (
        <g key={`v${v.x}${v.label || ""}`}>
          <line className="calc-chart-ref" x1={v.px} x2={v.px} y1={m.top} y2={m.bottom} />
          {v.label && <text className="calc-chart-ref-text" x={v.px + 4} y={m.top + 11} textAnchor={v.px > (m.left + m.right) / 2 ? "end" : "start"} dx={v.px > (m.left + m.right) / 2 ? -8 : 0}>{v.label}</text>}
        </g>
      ))}
    </g>
  );
}

Object.assign(window, { CalcChartAxes });
