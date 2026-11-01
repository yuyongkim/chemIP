// 국가별 규제 — 세계 지도(등재 건수만큼 진하게)와 관할 버튼 줄. 지도 자료: intl_world.jsx.
// 문구: PRODUCT_LABELS.intl. 스타일: product_detail.css(.pd-map-*, .pd-jur*).

function WorldMap({ paths, byIso, counts, active, onSelect }) {
  const IL = PRODUCT_LABELS.intl;
  const max = Math.max(1, ...Object.values(counts));
  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label={IL.mapAria} className="pd-map-svg">
      {paths.map(p => {
        const code = byIso[p.id];
        const n = code ? counts[code] : 0;
        const paint = mapCellPaint(code, active, n, max);
        return (
          <path key={p.id || p.name} d={p.d} fill={paint.fill} stroke={paint.stroke} strokeWidth={paint.strokeWidth}
            className={`pd-map-path${code ? " on" : ""}`}
            onClick={() => code && onSelect(code)}>
            <title>{code ? IL.mapTitle(p.name, jurisdictionLabel(code), n) : p.name}</title>
          </path>
        );
      })}
    </svg>
  );
}

function IntlMapCard({ paths, mapError, byIso, counts, codes, current, onSelect }) {
  const IL = PRODUCT_LABELS.intl;
  return (
    <div className="card pd-map-card">
      {mapError
        ? <div className="muted pd-map-error">{IL.mapError(mapError)}</div>
        : <WorldMap paths={paths} byIso={byIso} counts={counts} active={current} onSelect={onSelect} />}
      <div className="pd-jur-row">
        {codes.map(c => (
          <button key={c} className={`chip pd-jur${c === current ? " on" : ""}`} aria-pressed={c === current} onClick={() => onSelect(c)}>
            {jurisdictionLabel(c)} <span className="tnum">{counts[c]}</span>
          </button>
        ))}
      </div>
      <div className="muted pd-map-hint">{IL.mapHint}</div>
    </div>
  );
}

Object.assign(window, { WorldMap, IntlMapCard });
