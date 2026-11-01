// 경고표지 입력 칸 — 명칭·CAS·신호어·그림문자·유해·위험문구·예방조치문구(예방·대응·저장·폐기)·공급자.
// 상태는 셸(ghs_label_view.jsx)이 들고, 여기서는 그리기와 바뀐 값 넘기기만.

const GHS_SIGNAL_CHOICES = ["danger", "warning", ""];

function GhsLabelForm({ form, onChange, supplier, onSupplier, onReset, onClear }) {
  const L = GHS_LABELS;
  const F = L.form;
  const set = (k, v) => onChange({ ...form, [k]: v });
  const setP = (g, v) => onChange({ ...form, precautions: { ...form.precautions, [g]: v } });
  return (
    <div className="panel gl-form">
      <div className="body">
        <div className="calc-fields">
          <div className="calc-field">
            <label className="calc-label" htmlFor="gl-product">{F.product}</label>
            <input id="gl-product" className="calc-input" type="text" autoComplete="off" value={form.product} onChange={e => set("product", e.target.value)} />
          </div>
          <div className="calc-field">
            <label className="calc-label" htmlFor="gl-cas">{F.cas}</label>
            <input id="gl-cas" className="calc-input mono" type="text" autoComplete="off" value={form.cas} onChange={e => set("cas", e.target.value)} />
          </div>
          <div className="calc-field calc-field-choice">
            <span className="calc-label">{F.signal}</span>
            <div className="seg calc-seg" role="group" aria-label={F.signal}>
              {GHS_SIGNAL_CHOICES.map(k => (
                <button key={k || "none"} type="button" aria-pressed={form.signal === k} onClick={() => set("signal", k)}>{L.signal[k || "none"]}</button>
              ))}
            </div>
          </div>
          <GhsPictPicker value={form.pictograms} onChange={v => set("pictograms", v)} />
          <GhsStatementField id="gl-h" label={F.hazards} value={form.hazards} onChange={v => set("hazards", v)} rows={5} hint={F.statementHint} />
          {GHS_P_GROUPS.map(g => (
            <GhsStatementField key={g} id={`gl-p-${g}`} label={`${F.precautions} · ${F.groups[g]}`} value={form.precautions[g]}
              onChange={v => setP(g, v)} rows={g === "response" ? 5 : 3} />
          ))}
        </div>
        <GhsSupplierFields supplier={supplier} onChange={onSupplier} />
        <div className="gl-form-actions">
          {onReset && <button type="button" className="btn sm" onClick={onReset}>{F.resetMsds}</button>}
          <button type="button" className="btn sm ghost" onClick={onClear}>{F.clear}</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GhsLabelForm });
