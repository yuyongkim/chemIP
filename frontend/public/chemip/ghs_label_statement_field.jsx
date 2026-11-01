// 경고표지 입력 · H/P 문구 칸 하나(여러 줄). 한 줄에 문구 하나 — 해석은 ghsParseStatements.

function GhsStatementField({ id, label, value, onChange, rows = 4, hint }) {
  return (
    <div className="calc-field gl-field-wide">
      <label className="calc-label" htmlFor={id}>{label}</label>
      <textarea id={id} className="calc-input gl-textarea" rows={rows} value={value} spellCheck={false}
        onChange={e => onChange(e.target.value)} />
      {hint && <div className="calc-hint">{hint}</div>}
    </div>
  );
}

Object.assign(window, { GhsStatementField });
