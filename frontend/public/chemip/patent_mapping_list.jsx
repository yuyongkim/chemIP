// 특허 매핑 · 기록 표(번호·명칭·관할·연도·원문 링크만 — 초록·발췌는 보이지 않는다). 행: pmRecordRows. 문구: PATENT_MAPPING_LABELS.

function PmRecordTable({ rows }) {
  const L = PATENT_MAPPING_LABELS;
  return (
    <table className="pat-table pd-pm-table">
      <thead><tr>{L.cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id}>
            <td>
              {r.link
                ? <a className="pid" href={r.link} target="_blank" rel="noopener noreferrer" title={L.open}>{r.id} ↗</a>
                : <span className="pid">{r.id}</span>}
            </td>
            <td className="title-cell"><b>{r.title || "—"}</b></td>
            <td className="mono pd-td-sm" title={pmJurisdictionName(r.jur)}>{r.jur || "—"}</td>
            <td className="mono">{r.year || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

Object.assign(window, { PmRecordTable });
