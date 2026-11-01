// Product · Threshold comparison — the same substance's quantity thresholds across jurisdictions, in kg.
// Data: `thresholds` of /api/regulations/international/{cas} (backend/core/intl_quantity.py does the unit work).
// Only thresholds of the same kind are compared; a log scale keeps 5 kg and 50 t on one axis.
// 문구: PRODUCT_LABELS.intl.thresholds. 계산: product_intl_helpers.jsx(logPos·thresholdScale), product_format.jsx(fmtMass).
// 스타일: product_detail.css(.pd-thr-*).

function ThresholdKind({ label, rows }) {
  const TL = PRODUCT_LABELS.intl.thresholds;
  const { lo, hi, strictest, ratio } = thresholdScale(rows);
  const compare = rows.length > 1; // 한 나라·한 목록뿐이면 막대가 비교 의미가 없어 값만 보인다
  return (
    <div className="pd-thr-kind">
      <div className="pd-thr-head">
        <b>{label}</b>
        {rows.length > 1 && ratio >= 1.5 && <span className="muted tnum">{TL.ratio(Math.round(ratio).toLocaleString("ko-KR"))}</span>}
      </div>
      {rows.map(r => (
        <div key={r.regulation} className="thr-row">
          <div className="thr-label" title={intlListName(r)}>
            <b>{jurisdictionName(r.country)}</b> <span className="muted">{intlListName(r)}</span>
          </div>
          <div className={`pd-thr-track${compare ? " compare" : ""}`}>
            {compare && <>
            {r.kg_upper && (
              <div className="pd-thr-range" style={{ "--l": `${logPos(r.kg, lo, hi)}%`, "--w": `${logPos(r.kg_upper, lo, hi) - logPos(r.kg, lo, hi)}%` }} />
            )}
            <div className={`pd-thr-fill${r.kg === strictest ? " strictest" : ""}`} style={{ "--w": `${logPos(r.kg, lo, hi)}%` }} />
            </>}
          </div>
          <div className={`tnum pd-thr-val${compare && r.kg === strictest ? " strong" : ""}`}>
            {fmtMass(r.kg)}{r.kg_upper ? <span className="muted"> ~{fmtMass(r.kg_upper)}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function ThresholdComparison({ thresholds }) {
  const TL = PRODUCT_LABELS.intl.thresholds;
  const kinds = [];
  (thresholds || []).forEach(t => {
    let k = kinds.find(x => x.kind === t.kind);
    if (!k) kinds.push(k = { kind: t.kind, label: TL.kindNames?.[t.kind] || t.kind_label, rows: [] });
    k.rows.push(t);
  });
  if (!kinds.length) return null;
  return (
    <div className="panel pd-sub-panel">
      <h3><b>{TL.heading}</b> <span className="muted">{TL.legend}</span></h3>
      <div className="body pd-thr-body">
        {kinds.map(k => <ThresholdKind key={k.kind} label={k.label} rows={k.rows} />)}
        <div className="muted pd-thr-note">{TL.note}</div>
      </div>
    </div>
  );
}

Object.assign(window, { ThresholdComparison });
