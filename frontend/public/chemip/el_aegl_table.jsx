// 비상대응 기준 · AEGL 표 — 줄 = AEGL-1·2·3, 열 = 10분·30분·60분·4시간·8시간(EPA 값 페이지 그대로). 상태(최종·잠정)·LEL·원문 링크.
// 줄 모양: el_helpers.jsx elAeglRows. 좁은 화면에서는 표만 옆으로 밀린다(.pd-el-wrap).

function ElAeglTable({ file }) {
  const L = EL_LABELS.aegl;
  const a = file && file.aegl;
  const rows = elAeglRows(file);
  if (!a || !rows.length) return null;
  return (
    <div className="pd-el-block">
      <div className="pd-el-sub">
        <b>{L.title}</b>
        {a.status && <span className="chip">{L.status[a.status] || a.status}</span>}
        {a.page && <SourceLink url={a.page} label={L.page} />}
        {a.tsd && <SourceLink url={a.tsd} label={L.tsd} />}
      </div>
      <div className="pd-el-wrap">
        <table className="pat-table pd-el-table">
          <thead>
            <tr>
              <th />
              {EL_AEGL_TIMES.map(t => <th key={t}>{L.times[t]}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.tier}>
                <th scope="row">{L.tier(r.tier)}</th>
                {r.cells.map((c, i) => <ElValueCell key={i} v={c.v} flag={c.flag} flagTitles={L.lelTitle} />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {a.lel && <div className="muted pd-mini">{L.lel(oelFmt(a.lel.value), elUnitName(a.lel.unit))}</div>}
    </div>
  );
}

Object.assign(window, { ElAeglTable });
