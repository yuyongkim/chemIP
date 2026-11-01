// 특허 매핑 · 연도별 건수(최근 12년 작은 막대 목록 + 그 이전 합계). 값: pmYearBars. 문구: PATENT_MAPPING_LABELS.

function PmYearBars({ data }) {
  const L = PATENT_MAPPING_LABELS;
  if (!data || data.bars.length === 0) return <div className="muted pd-note">—</div>;
  return (
    <>
      {data.bars.map(b => (
        <div key={b.y} className="pd-pm-year">
          <span className="mono tnum muted">{b.y}</span>
          <div className="pd-track"><div className="pd-track-fill" style={{ "--w": `${b.p * 100}%` }} /></div>
          <span className="mono tnum muted pd-series-val">{b.n.toLocaleString("ko-KR")}</span>
        </div>
      ))}
      {data.earlier > 0 && <div className="ui-hint pd-pm-earlier">{L.earlierYears(data.from, data.earlier)}</div>}
    </>
  );
}

Object.assign(window, { PmYearBars });
