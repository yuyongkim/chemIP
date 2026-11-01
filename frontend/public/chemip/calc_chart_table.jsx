// 계산기 그래프의 자료 표(접었다 펴기) — 화면 읽기 도구·인쇄용 대안. 표 모양은 calcChartTable(calc_chart_scale.jsx).

function CalcChartTable({ x, y, series }) {
  const t = calcChartTable({ x, y, series });
  if (!t.rows.length) return null;
  const cell = (v) => (typeof v === "number" ? calcFormatNumber(v, 4) : v);
  return (
    <details className="calc-chart-data">
      <summary>{CALC_LABELS.chart.table(t.rows.length)}</summary>
      <div className="calc-table-wrap">
        <table className="calc-chart-table">
          <thead><tr>{t.head.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
          <tbody>{t.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className={typeof v === "number" ? "mono tnum" : ""}>{cell(v)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </details>
  );
}

Object.assign(window, { CalcChartTable });
