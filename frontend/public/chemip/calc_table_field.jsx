// 계산기 행 표 입력(혼합물 성분) — 열 정의는 input.columns, 빈 행은 계산에서 건너뛴다. 행 추가·삭제.
// 표·열의 term 이 있으면 표 이름·열 머리 옆에 용어 설명(TermHint).
// input.rowFill 이 있으면 행마다 자료로 채우기 단추(CalcRowFill(calc_table_field_fill.jsx), 종류는 api_calc_fill.jsx CALC_ROW_FILLERS) + 표 아래 안내 줄. choices = 선택 칸 값.

function CalcTableField({ input, rows, errors, onChange, choices }) {
  const L = CALC_LABELS.table;
  const [fillNotes, setFillNotes] = useState({});
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const fillRow = (ri, patch) => onChange(rowsRef.current.map((r, i) => (i === ri ? { ...r, ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, String(v)])) } : r)));
  const max = input.maxRows || 10;
  const setCell = (ri, ck, v) => onChange(rows.map((r, i) => (i === ri ? { ...r, [ck]: v } : r)));
  const addRow = () => onChange([...rows, Object.fromEntries(input.columns.map(c => [c.key, ""]))]);
  const removeRow = (ri) => { setFillNotes({}); onChange(rows.filter((_, i) => i !== ri)); };
  const messages = Object.entries(errors).filter(([k]) => k === input.key || k.startsWith(`${input.key}.`)).map(([, m]) => m);
  return (
    <div className="calc-field calc-field-table">
      <span className="calc-label">{input.label}{input.term && <TermHint term={input.term} />}</span>
      <div className="calc-table-wrap">
        <table className="calc-table">
          <thead>
            <tr>
              <th className="calc-table-n">#</th>
              {input.columns.map(c => (
                <th key={c.key}>{c.label}{c.unit ? <span className="calc-th-unit"> ({c.unit})</span> : null}{c.term && <TermHint term={c.term} />}</th>
              ))}
              {input.rowFill && <th />}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                <td className="calc-table-n">{ri + 1}</td>
                {input.columns.map(c => (
                  <td key={c.key}>
                    <input
                      className={`calc-input calc-cell${c.text ? "" : " mono"}`}
                      type="text"
                      inputMode={c.text ? "text" : "decimal"}
                      autoComplete="off"
                      aria-label={`${L.row(ri + 1)} ${c.label}`}
                      aria-invalid={Boolean(errors[`${input.key}.${ri}.${c.key}`])}
                      value={r[c.key]}
                      onChange={e => setCell(ri, c.key, e.target.value)}
                    />
                  </td>
                ))}
                {input.rowFill && (
                  <td>
                    <CalcRowFill kind={input.rowFill} row={r} choices={choices} rowNo={ri + 1}
                      onFill={patch => fillRow(ri, patch)} onNote={note => setFillNotes(n => ({ ...n, [ri]: note }))} />
                  </td>
                )}
                <td>
                  <button type="button" className="btn sm ghost calc-row-del" aria-label={`${L.row(ri + 1)} ${L.remove}`} title={L.remove}
                    disabled={rows.length <= 1} onClick={() => removeRow(ri)}>
                    <Icon name="close" size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length < max && (
        <button type="button" className="btn sm calc-row-add" onClick={addRow}><Icon name="plus" size={12} /> {L.add}</button>
      )}
      {messages.map(m => <div key={m} className="calc-err">{m}</div>)}
      {Object.entries(fillNotes).map(([ri, n]) => <div key={`fill-${ri}`} className={n.ok ? "calc-hint" : "calc-err"} role="status">{n.text}</div>)}
      {input.hint && <div className="calc-hint">{input.hint}</div>}
    </div>
  );
}

Object.assign(window, { CalcTableField });
