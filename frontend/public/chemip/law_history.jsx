// 국내 법령 보기 · 연혁 — 판마다 시행일(법제처 그 판 링크)·공포일·공포번호·종류·제·개정·구분(현행·연혁·시행예정), 새 판 먼저.
// 구분 이름: LAW_LABELS.statuses(원문 값 → 화면 말). 판 주소는 내보낼 때 정해 둔다(law_export_shape.py history_row url).

function LawHistory({ rows }) {
  const L = LAW_LABELS;
  const H = L.historyHead;
  if (!rows.length) return <EmptyState card>{L.noHistory}</EmptyState>;
  return (
    <div className="law-table-wrap">
      <table className="law-table">
        <thead><tr><th>{H.effective}</th><th>{H.promulgated}</th><th>{H.no}</th><th>{H.type}</th><th>{H.amend}</th><th>{H.status}</th></tr></thead>
        <tbody>
          {rows.map((h, i) => (
            <tr key={i} className={h.status === "현행" ? "is-current" : ""}>
              <td className="mono">{h.url ? <a href={h.url} target="_blank" rel="noopener">{h.effective_on}</a> : h.effective_on}</td>
              <td className="mono">{h.promulgated_on}</td>
              <td className="mono">{h.promulgation_no}</td>
              <td data-source-text="">{h.law_type}</td>
              <td data-source-text="">{h.amend_type}</td>
              <td>{L.statuses[h.status] || h.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Object.assign(window, { LawHistory });
