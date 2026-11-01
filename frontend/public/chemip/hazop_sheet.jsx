// HAZOP 작성기 · 위험성평가 결과기록지(고른 검토구간의 줄 목록). 줄 하나는 HazopRow. 문구: HAZOP_LABELS.sheet

function HazopSheet({ node, risk, active, onActive, onPatch, onRemove, onMove }) {
  const S = HAZOP_LABELS.sheet;
  return (
    <div className="panel calc-panel">
      <h3><b>{S.title}</b><span className="muted mono">{node.rows.length}</span></h3>
      <div className="body">
        {node.rows.length === 0
          ? <EmptyState>{S.empty}</EmptyState>
          : <>
              <div className="calc-hint">{S.multiHint}</div>
              <div className="hz-rows">
                {node.rows.map((r, i) => (
                  <HazopRow key={r.id} row={r} no={hzRowNo(node, i)} risk={risk} first={i === 0} last={i === node.rows.length - 1}
                    active={active?.rowId === r.id} onFocusField={field => onActive({ rowId: r.id, field })}
                    onPatch={p => onPatch(r.id, p)} onRemove={() => onRemove(r.id)} onMove={dir => onMove(r.id, dir)} />
                ))}
              </div>
            </>}
      </div>
    </div>
  );
}

Object.assign(window, { HazopSheet });
