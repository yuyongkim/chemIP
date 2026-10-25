// Trade controls · 방향(수입/수출) toggle + counterpart country select. State lives in the tab shell.

function TradeControlsBar({ direction, setDirection, country, setCountry }) {
  const L = TRADE_LABELS;
  return (
    <div className="tc-bar">
      <div className="seg" role="group" aria-label={L.directionGroup}>
        {Object.entries(L.directions).map(([k, d]) => (
          <button key={k} aria-pressed={direction === k} onClick={() => setDirection(k)}>{d.label}</button>
        ))}
      </div>
      <label className="tc-select-label">
        <span className="muted">{L.countryLabel}</span>
        <select className="tc-select" value={country} onChange={e => setCountry(e.target.value)}>
          <option value="">{L.countryNone}</option>
          {tcCountryOptions(INTL_JURISDICTIONS).map(c => <option key={c} value={c}>{jurisdictionLabel(c)}</option>)}
        </select>
      </label>
    </div>
  );
}

Object.assign(window, { TradeControlsBar });
