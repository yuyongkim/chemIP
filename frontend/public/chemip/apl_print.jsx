// 적용 법규 판정기 · 인쇄에만 보이는 조각: 넣은 취급량 표(입력 칸 대신 글자 표)와 "비공식·사전 검토용" 바닥 줄. 화면에서는 숨긴다(.apl-print-only).

function AplPrintInventory({ rows, names }) {
  const L = APL_LABELS.inv;
  const filled = rows.filter(r => r.cas || r.name);
  return (
    <div className="apl-print-only">
      <h2 className="apl-print-title">{L.title}</h2>
      <table className="calc-table apl-table">
        <thead><tr>
          <th>{L.columns.name}</th><th>CAS</th><th className="num">{L.columns.qty}</th><th className="num">{L.columns.conc}</th>
          <th>{L.columns.state}</th><th>{L.columns.use}</th>
        </tr></thead>
        <tbody>
          {filled.map(r => (
            <tr key={r.id}>
              <td>{names[r.id] || r.name}</td><td className="mono">{r.cas}</td>
              <td className="num mono">{r.qty} {L.units[r.unit]}</td><td className="num mono">{r.conc || 100}</td>
              <td>{L.states[r.state]}</td><td>{tr(APL_HAZMAT.facilities[r.use]?.ko, APL_HAZMAT.facilities[r.use]?.en)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AplPrintFooter() {
  return <p className="apl-print-only apl-print-foot">{APL_LABELS.export.unofficial}</p>;
}

Object.assign(window, { AplPrintInventory, AplPrintFooter });
