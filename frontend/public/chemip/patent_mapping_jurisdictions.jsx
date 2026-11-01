// 특허 매핑 · 관할별 건수(상위 8곳) 막대 목록. 줄을 누르면 그 관할 기록을 연다(onPick). 문구: PATENT_MAPPING_LABELS.

function PmJurisdictionBars({ rows, active, onPick }) {
  const L = PATENT_MAPPING_LABELS;
  if (rows.length === 0) return <div className="muted pd-note">—</div>;
  return rows.map(r => (
    <button
      key={r.code}
      type="button"
      className="series-row pd-pm-row"
      aria-pressed={active === r.code}
      aria-label={L.jurisdictionAria(r.name)}
      onClick={() => onPick(active === r.code ? "" : r.code)}
    >
      <div>
        <div className="pd-series-name"><span className="mono pd-pm-code">{r.code}</span> {r.name}</div>
        <div className="pd-track"><div className="pd-track-fill" style={{ "--w": `${r.p * 100}%` }} /></div>
      </div>
      <div className="mono tnum muted pd-series-val">{r.n.toLocaleString("ko-KR")}</div>
    </button>
  ));
}

Object.assign(window, { PmJurisdictionBars });
