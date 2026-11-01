// 비상대응 기준 · PAC 표(DOE Rev. 29, 60분) — 줄 = 단계 1·2·3, 열 = PAC(원문 단위)·mg/m³·근거 계열(AEGL·ERPG·TEEL)·ERPG(DOE PAC 경유, 있을 때만).
// ERPG 는 DOE 가 다시 실은 AIHA 값만 보이고 AIHA 문서 글은 싣지 않는다. 줄 모양: el_helpers.jsx elPacRows.

function ElPacTable({ file }) {
  const L = EL_LABELS;
  const p = file && file.pac;
  const rows = elPacRows(file);
  if (!p || !rows.length) return null;
  const hasErpg = rows.some(r => r.erpg);
  return (
    <div className="pd-el-block">
      <div className="pd-el-sub"><b>{L.pac.title}</b></div>
      <div className="pd-el-wrap">
        <table className="pat-table pd-el-table">
          <thead>
            <tr>
              <th />
              <th>PAC</th>
              <th>mg/m³</th>
              <th>{L.pac.basis}</th>
              {hasErpg && <th title={L.erpg.via}>{L.erpg.title}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.tier}>
                <th scope="row">{L.pac.tier(r.tier)}</th>
                <ElValueCell v={r.pac} flag={r.flag} flagTitles={L.pac.flagTitle} />
                <td className="mono tnum pd-el-val">{r.pacMg || "—"}</td>
                <td><span className="chip">{L.pac.families[r.family] || r.family}</span></td>
                {hasErpg && (r.erpg ? <ElValueCell v={r.erpg} flag="" /> : <td className="muted pd-el-val">—</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="muted pd-mini">{L.pac.basis}: {p.basis}{` · ${file.erpg ? (file.erpg.surrogate ? L.erpg.surrogate : L.erpg.via) : L.erpg.noneNote}`}</div>
    </div>
  );
}

Object.assign(window, { ElPacTable });
