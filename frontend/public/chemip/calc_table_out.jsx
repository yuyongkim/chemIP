// 계산 결과 표 패널 — 정의에 table(values, outputs) 가 있으면 결과 아래에 표, 복사(탭 구분)·CSV 받기 단추. 문구: CALC_LABELS.tableOut.
// 표 자료·글자 만들기는 calc_table_data.jsx(순수 함수). 스타일: calc.css(.calc-tout-*).

function calcDownloadText(filename, text, type) {
  const blob = new Blob(["﻿", text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CalcTableOut({ def, result }) {
  const L = CALC_LABELS.tableOut;
  const [copied, setCopied] = useState(false);
  const table = calcTableFor(def, result);
  if (!table || !table.rows.length) return null;
  const copy = () => {
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1500); };
    try { navigator.clipboard.writeText(calcTableTsv(table)).then(done, () => {}); } catch (e) { /* 복사 못 하는 브라우저 */ }
  };
  const csv = () => calcDownloadText(table.filename || `${def.key}.csv`, calcTableCsv(table), "text/csv;charset=utf-8");
  return (
    <div className="panel calc-panel calc-tout">
      <h3><b>{table.caption || L.title}</b><span className="calc-tout-n">{L.rows(table.rows.length)}</span></h3>
      <div className="body">
        <div className="calc-tout-actions">
          <button type="button" className="btn sm" onClick={copy}><Icon name="doc" size={12} /> {copied ? L.copied : L.copy}</button>
          <button type="button" className="btn sm" onClick={csv}><Icon name="down" size={12} /> {L.csv}</button>
        </div>
        <div className="calc-table-wrap calc-tout-wrap" tabIndex={0} role="region" aria-label={table.caption || L.title}>
          <table className="calc-table calc-tout-table">
            <thead>
              <tr>{table.columns.map(c => <th key={c.key} scope="col">{calcTableHead(c)}</th>)}</tr>
            </thead>
            <tbody>
              {table.rows.map((r, ri) => (
                <tr key={ri}>
                  {table.columns.map(c => {
                    const v = calcTableValue(c, r);
                    return <td key={c.key} className="mono tnum">{v == null ? "—" : calcFormatNumber(v, c.digits)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CalcTableOut, calcDownloadText });
