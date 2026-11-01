// 계산기 입력 칸 하나 — 수치(+ 단위 고르기 CalcUnitSelect) 또는 선택(.seg, select: true 면 펼침 목록). input.term 이 있으면 이름 옆에 용어 설명(TermHint).

function CalcField({ input, value, error, onChange }) {
  const id = `calc-in-${input.key}`;
  if (input.type === "choice" && input.select) {   // 고를 것이 많으면(select: true) 펼침 목록
    return (
      <div className="calc-field calc-field-choice">
        <label className="calc-label" htmlFor={id}>{input.label}{input.term && <TermHint term={input.term} />}</label>
        <select id={id} className="calc-unit calc-select" value={value} onChange={e => onChange(e.target.value)}>
          {input.options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
      </div>
    );
  }
  if (input.type === "choice") {
    return (
      <div className="calc-field calc-field-choice">
        <span className="calc-label">{input.label}{input.term && <TermHint term={input.term} />}</span>
        <div className="seg calc-seg" role="group" aria-label={input.label}>
          {input.options.map(o => (
            <button key={o.v} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)}>{o.label}</button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="calc-field">
      <div className="calc-label-row">
        <label className="calc-label" htmlFor={id}>{input.label}</label>
        {input.term && <TermHint term={input.term} />}
      </div>
      <div className="calc-control">
        <input
          id={id}
          className="calc-input mono"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value.raw}
          aria-invalid={Boolean(error)}
          onChange={e => onChange({ ...value, raw: e.target.value })}
        />
        {input.dim
          ? <CalcUnitSelect dim={input.dim} unit={value.unit} label={input.label} onChange={u => onChange({ ...value, unit: u })} />
          : <span className="calc-unit-text">{input.unit}</span>}
      </div>
      {error ? <div className="calc-err">{error}</div> : input.hint ? <div className="calc-hint">{input.hint}</div> : null}
    </div>
  );
}

Object.assign(window, { CalcField });
