// 노출기준 비교 · 표 — 줄 = 관할 + 출처, 열 = TWA·STEL·C·IDLH·표시·기준일. 값 모양은 oel_helpers.jsx(oelCellValues).
// 좁은 화면에서는 표만 옆으로 밀린다(.pd-oel-wrap).

function OelTable({ groups, sources, mode, mw, vapour }) {
  const L = OEL_LABELS;
  return (
    <div className="pd-oel-wrap">
      <table className="pat-table pd-oel-table">
        <thead>
          <tr>
            <th>{L.cols.source}</th>
            {OEL_KINDS.map(k => <th key={k} title={L.kindHints[k]}>{L.cols[k]}</th>)}
            <th>{L.cols.note}</th>
            <th>{L.cols.asOf}</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(g => (
            <tr key={g.key}>
              <td><OelSourceBadge j={g.j} src={g.src} source={sources[g.src]} /></td>
              {OEL_KINDS.map(k => <OelCell key={k} values={oelCellValues(g.cells[k], mode, mw, vapour)} />)}
              <td className="muted pd-oel-note-col">{g.notes.join(" · ") || L.empty}</td>
              <td className="mono muted pd-oel-date">{g.asOf || L.asOfNone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Object.assign(window, { OelTable });
