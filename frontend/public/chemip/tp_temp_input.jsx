// 온도별 물성 · 온도 넣기(표시 단위 = 단위 고르기의 K 또는 °C). 값 검사는 tpParseT(tp_helpers.jsx).

function TpTempInput({ raw, setRaw, unit, error, hint }) {
  const L = TP_LABELS;
  return (
    <div className="pd-tp-tin">
      <label className="pd-tp-tlabel" htmlFor="pd-tp-t">{L.tLabel}</label>
      <input id="pd-tp-t" className="calc-input mono pd-tp-tfield" type="text" inputMode="decimal" autoComplete="off"
        value={raw} aria-invalid={Boolean(error)} onChange={e => setRaw(e.target.value)} />
      <span className="pd-tp-tunit">{unit}</span>
      {error ? <span className="calc-err">{error}</span> : hint ? <span className="muted pd-mini">{hint}</span> : null}
    </div>
  );
}

Object.assign(window, { TpTempInput });
