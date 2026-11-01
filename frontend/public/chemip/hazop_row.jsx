// HAZOP 작성기 · 기록지 한 줄: 이탈번호·이탈 / 원인·결과·현재안전조치 / 강도·빈도·위험도 / 개선번호·개선권고·책임·일정·진행.
// 칸에 들어가면 그 줄이 "고른 줄"이 되어 옆 제안 목록이 거기에 더해진다. 문구: HAZOP_LABELS.cols·sheet·status

function HazopLevelSelect({ label, value, max, hint, onChange }) {
  return (
    <label className="calc-field hz-narrow" title={hint}>
      <span className="calc-label">{label}</span>
      <select className="calc-input mono" value={value ?? ""} onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))}>
        <option value="">—</option>
        {Array.from({ length: max }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    </label>
  );
}

function HazopRow({ row, no, risk, first, last, active, onFocusField, onPatch, onRemove, onMove }) {
  const L = HAZOP_LABELS;
  const C = L.cols;
  const area = (k) => (
    <label className="calc-field">
      <span className="calc-label">{C[k]}</span>
      <textarea className="calc-input hz-text" rows={3} value={row[k]} onFocus={() => onFocusField(k)} onChange={e => onPatch({ [k]: e.target.value })} />
    </label>
  );
  const input = (k, extra = {}) => (
    <label className={`calc-field${extra.narrow ? " hz-narrow" : ""}`}>
      <span className="calc-label">{C[k]}</span>
      <input className="calc-input" type={extra.type || "text"} value={row[k]} onFocus={() => onFocusField(k)} onChange={e => onPatch({ [k]: e.target.value })} />
    </label>
  );
  return (
    <article className={`hz-row${active ? " is-active" : ""}`} onFocusCapture={() => !active && onFocusField("causes")}>
      <div className="hz-row-head">
        <span className="sft-idx mono">{no}</span>
        {row.param && <span className="chip hz-chip">{L.params[row.param] || row.param}{row.guide && row.guide !== "gen" ? ` · ${L.guides[row.guide] || row.guide}` : ""}</span>}
        <input className="calc-input hz-dev" aria-label={C.deviation} placeholder={L.sheet.deviationPh} value={row.deviation} onChange={e => onPatch({ deviation: e.target.value })} />
        <span className="hz-row-actions">
          <button type="button" className="btn sm ghost" disabled={first} title={L.sheet.up} aria-label={L.sheet.up} onClick={() => onMove(-1)}>↑</button>
          <button type="button" className="btn sm ghost" disabled={last} title={L.sheet.down} aria-label={L.sheet.down} onClick={() => onMove(1)}>↓</button>
          <button type="button" className="btn sm ghost" title={L.sheet.remove} aria-label={L.sheet.remove} onClick={onRemove}><Icon name="close" size={12} /></button>
        </span>
      </div>
      <div className="hz-row-grid">
        {area("causes")}
        {area("consequences")}
        {area("safeguards")}
      </div>
      <div className="hz-row-grid is-tail">
        <div className="hz-risk-group">
          <HazopLevelSelect label={C.S} value={row.S} max={risk.sMax} hint={L.risk.sevHint} onChange={v => onPatch({ S: v })} />
          <HazopLevelSelect label={C.L} value={row.L} max={risk.lMax} hint={L.risk.likHint} onChange={v => onPatch({ L: v })} />
          <div className="calc-field hz-narrow">
            <span className="calc-label">{C.risk}</span>
            <HazopRiskBadge score={hzRiskScore(row, risk)} risk={risk} />
          </div>
        </div>
        {input("recNo", { narrow: true })}
        {area("rec")}
        <div className="hz-plan">
          {input("owner")}
          {input("due", { type: "date" })}
          <label className="calc-field">
            <span className="calc-label">{C.status}</span>
            <select className="calc-input" value={row.status} onChange={e => onPatch({ status: e.target.value })}>
              {HAZOP_STATUS.map(s => <option key={s} value={s}>{L.status[s]}</option>)}
            </select>
          </label>
        </div>
      </div>
    </article>
  );
}

Object.assign(window, { HazopRow, HazopLevelSelect });
