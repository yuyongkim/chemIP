// 온도별 물성 · 고른 온도의 값 표(줄 = 상관식 하나). 범위 밖이면 값 대신 "범위 밖". 줄 모양: tpPointRows(tp_helpers.jsx).

function TpPointTable({ rows, sources }) {
  const L = TP_LABELS;
  return (
    <div className="pd-tp-wrap">
      <table className="pat-table pd-tp-table">
        <caption className="pd-tp-cap">{L.pointTitle}</caption>
        <thead>
          <tr><th>{L.cols.prop}</th><th>{L.cols.value}</th><th>{L.cols.unit}</th><th>{L.cols.range}</th><th>{L.cols.src}</th></tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} className={r.value == null ? "is-out" : ""}>
              <td>{r.label}</td>
              <td className="mono tnum pd-tp-val">{r.value == null ? <span className="muted">{L.outOfRange}</span> : tpFmt(r.value, 5)}</td>
              <td className="muted">{r.unit}</td>
              <td className="mono muted pd-tp-range">{r.range}</td>
              <td><TpSourceBadge src={r.src} sources={sources} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Object.assign(window, { TpPointTable });
