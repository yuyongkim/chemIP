// 국내 법령 보기 · 별표·서식 목록 — 번호·구분·제목(원문)과 법제처 파일 링크(PDF·원본). 본문은 받아 두지 않았다. 문구: LAW_LABELS.

function LawAnnexList({ annexes }) {
  const L = LAW_LABELS;
  const H = L.annexHead;
  if (!annexes.length) return <EmptyState card>{L.noAnnexes}</EmptyState>;
  return (
    <div className="law-annexes">
      <p className="muted law-mini">{L.annexNote}</p>
      <div className="law-table-wrap">
        <table className="law-table">
          <thead><tr><th>{H.no}</th><th>{H.kind}</th><th>{H.title}</th><th>{H.links}</th></tr></thead>
          <tbody>
            {annexes.map((x, i) => (
              <tr key={i}>
                <td className="mono">{x.no}</td>
                <td data-source-text="">{x.kind}</td>
                <td data-source-text="">{x.title}</td>
                <td className="law-links">
                  {x.pdf && <a href={x.pdf} target="_blank" rel="noopener">{L.annexPdf}</a>}
                  {x.file && <a href={x.file} target="_blank" rel="noopener">{L.annexFile}</a>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

Object.assign(window, { LawAnnexList });
