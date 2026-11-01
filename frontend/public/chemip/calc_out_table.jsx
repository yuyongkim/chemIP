// 계산 결과 표 한 개 — 출력 type: "table" 의 값 { columns: [{ key, label, digits? }], rows: [{ <열 key>: 수 | 글자 | null }] }.
// 첫 열은 행 이름(th). 수는 calcFormatNumber(유효숫자 digits, 기본 4), 값이 없으면 "—". 문구는 compute 가 tr 로 만든다.

function CalcOutTable({ label, term, table }) {
  if (!table || !table.rows || !table.rows.length) return null;
  const cell = (v, c) => (v == null || v === "" ? "—" : typeof v === "number" ? calcFormatNumber(v, c.digits || 4) : v);
  const [head, ...rest] = table.columns;
  return (
    <div className="calc-out-table">
      <div className="calc-out-k">{label}{term && <TermHint term={term} />}</div>
      <div className="calc-table-wrap">
        <table className="calc-table calc-result-table">
          <thead><tr>{table.columns.map(c => <th key={c.key} scope="col">{c.label}</th>)}</tr></thead>
          <tbody>
            {table.rows.map((r, i) => (
              <tr key={i}>
                <th scope="row">{cell(r[head.key], head)}</th>
                {rest.map(c => <td key={c.key} className={typeof r[c.key] === "number" ? "mono tnum" : ""}>{cell(r[c.key], c)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

Object.assign(window, { CalcOutTable });
