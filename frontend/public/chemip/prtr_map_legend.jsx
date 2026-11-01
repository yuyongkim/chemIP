// PRTR 지도 · 범례(값이 든 칸마다 그 칸 지역 값의 범위, 신고 없음). 칸·색은 prtrLegend(prtr_map_helpers.jsx).

function PrtrMapLegend({ values, metric }) {
  const L = PRTR_MAP_LABELS;
  const bins = prtrLegend(Object.values(values));
  const text = (v) => prtrMetricText(metric, v, fmtKg);
  return (
    <div className="prtr-legend" role="group" aria-label={L.legend(L.metrics[metric])}>
      <span className="muted prtr-legend-title">{L.legend(L.metrics[metric])}</span>
      <span className="prtr-legend-item">
        <span className="prtr-swatch" style={{ "--fill": prtrBinFill(0) }} />{L.legendNone}
      </span>
      {bins.map(b => (
        <span key={b.bin} className="prtr-legend-item tnum">
          <span className="prtr-swatch" style={{ "--fill": b.fill }} />{b.lo === b.hi ? text(b.hi) : `${text(b.lo)}–${text(b.hi)}`}
        </span>
      ))}
    </div>
  );
}

Object.assign(window, { PrtrMapLegend });
