// PRTR 지도 · 시도 단계 구분도. 칸 색은 prtrCellPaint(tokens.css 변수), 경로는 usePrtrGeoPaths(prtr_geo.jsx).
// 지역마다 키보드로도 고를 수 있다(Tab → Enter/Space). 같은 내용의 표는 prtr_region_table.jsx.

function PrtrChoropleth({ paths, values, active, names, metric, substanceName, onSelect }) {
  const L = PRTR_MAP_LABELS;
  const max = Math.max(0, ...Object.values(values));
  const pick = (iso) => onSelect(iso === active ? "" : iso);
  return (
    <svg viewBox={`0 0 ${PRTR_GEO_W} ${PRTR_GEO_H}`} className="prtr-map-svg" role="group"
      aria-label={L.mapAria(substanceName, L.metrics[metric])}>
      {paths.map(p => {
        const v = values[p.id] || 0;
        const name = prtrRegionName(names, p.id, CHEMIP_LANG);
        const label = L.mapTitle(name, prtrMetricText(metric, v, fmtKg));
        const paint = prtrCellPaint(v, max, p.id === active);
        return (
          <path key={p.id} d={p.d} fill={paint.fill} stroke={paint.stroke} strokeWidth={paint.strokeWidth}
            className={`prtr-map-path${p.id === active ? " on" : ""}`} tabIndex={0} role="button"
            aria-label={label} aria-pressed={p.id === active}
            onClick={() => pick(p.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(p.id); } }}>
            <title>{label}</title>
          </path>
        );
      })}
    </svg>
  );
}

Object.assign(window, { PrtrChoropleth });
