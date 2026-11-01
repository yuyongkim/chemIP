// 규제 목록 · 등재 물질 줄(CAS·이름·내용). CAS 가 있으면 물질 화면 링크, 계열(CAS 없음)은 표시만. 문구: REG_LABELS.detail.

function RegRows({ rows }) {
  const L = REG_LABELS.detail;
  return (
    <div className="reg-rows">
      <div className="reg-row reg-row-head muted mono">
        <span>{L.head.cas}</span><span>{L.head.name}</span>
      </div>
      {rows.map((r, i) => {
        const name = regRowName(r);
        return (
          <div className="reg-row" key={`${r[0]}|${r[1]}|${i}`}>
            <span className="mono tnum">
              {r[0] ? <a href={regSubstanceHref(r[0])} title={L.openSubstance(name || r[0])}>{r[0]}</a>
                : <span className="chip pd-chip-10">{L.family}</span>}
            </span>
            <span>
              <b className="reg-row-name">{name}</b>
              {r[3] && <div className="muted reg-row-detail">{r[3]}</div>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { RegRows });
