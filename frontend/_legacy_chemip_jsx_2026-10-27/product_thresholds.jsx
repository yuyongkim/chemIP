// Product · Threshold comparison — the same substance's quantity thresholds across jurisdictions, in kg.
// Data: `thresholds` of /api/regulations/international/{cas} (backend/core/intl_quantity.py does the unit work).
// Only thresholds of the same kind are compared; a log scale keeps 5 kg and 50 t on one axis.

function fmtMass(kg) {
  const n = Number(kg);
  if (!isFinite(n)) return "—";
  if (n >= 1000) return `${(n / 1000).toLocaleString("ko-KR", { maximumFractionDigits: n >= 100000 ? 0 : 2 })} t`;
  return `${n.toLocaleString("ko-KR", { maximumFractionDigits: n < 10 ? 2 : 0 })} kg`;
}

function logPos(v, lo, hi) {
  const a = Math.log10(lo), b = Math.log10(hi);
  return b > a ? Math.max(2, Math.min(100, ((Math.log10(v) - a) / (b - a)) * 100)) : 100;
}

function ThresholdKind({ label, rows }) {
  const vals = rows.flatMap(r => [r.kg, r.kg_upper].filter(Boolean));
  const lo = Math.min(...vals) / 3, hi = Math.max(...vals) * 1.5;
  const strictest = Math.min(...rows.map(r => r.kg));
  const compare = rows.length > 1; // 한 나라·한 목록뿐이면 막대가 비교 의미가 없어 값만 보인다
  return (
    <div style={{ padding: "10px 0", borderTop: "1px dashed var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, marginBottom: 6 }}>
        <b>{label}</b>
        {rows.length > 1 && Math.max(...rows.map(r => r.kg)) / strictest >= 1.5 && <span className="muted tnum">최대/최소 {Math.round(Math.max(...rows.map(r => r.kg)) / strictest).toLocaleString("ko-KR")}배</span>}
      </div>
      {rows.map(r => (
        <div key={r.regulation} className="thr-row">
          <div className="thr-label" title={r.list}>
            <b>{INTL_JURISDICTIONS[r.country]?.ko || r.country}</b> <span className="muted">{r.list}</span>
          </div>
          <div style={{ position: "relative", height: 10, background: compare ? "var(--bg-sunken)" : "transparent", borderRadius: 5 }}>
            {compare && <>
            {r.kg_upper && (
              <div style={{ position: "absolute", left: `${logPos(r.kg, lo, hi)}%`, width: `${logPos(r.kg_upper, lo, hi) - logPos(r.kg, lo, hi)}%`,
                top: 3, height: 4, background: "color-mix(in srgb, var(--accent) 35%, transparent)" }} />
            )}
            <div style={{ width: `${logPos(r.kg, lo, hi)}%`, height: "100%", borderRadius: 5,
              background: r.kg === strictest ? "var(--accent)" : "color-mix(in srgb, var(--accent) 45%, var(--bg-sunken))" }} />
            </>}
          </div>
          <div className="tnum" style={{ textAlign: "right", fontWeight: compare && r.kg === strictest ? 700 : 500 }}>
            {fmtMass(r.kg)}{r.kg_upper ? <span className="muted"> ~{fmtMass(r.kg_upper)}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function ThresholdComparison({ thresholds }) {
  const kinds = [];
  (thresholds || []).forEach(t => {
    let k = kinds.find(x => x.kind === t.kind);
    if (!k) kinds.push(k = { kind: t.kind, label: t.kind_label, rows: [] });
    k.rows.push(t);
  });
  if (!kinds.length) return null;
  return (
    <div className="panel" style={{ marginTop: 14 }}>
      <h3><b>임계량 비교 · kg 환산</b> <span className="muted">진한 막대 = 가장 낮은(엄격한) 기준</span></h3>
      <div className="body" style={{ paddingTop: 4 }}>
        {kinds.map(k => <ThresholdKind key={k.kind} label={k.label} rows={k.rows} />)}
        <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
          lb·t·kg를 kg으로 환산했습니다(1 lb = 0.4536 kg). 형태별로 값이 여러 개면 가장 낮은 값을, Seveso는 하위~상위 기준을 표시합니다.
          농도 조건(예: 20% 이상)은 목록마다 다를 수 있어 원문 확인이 필요합니다.
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ThresholdComparison, fmtMass });
