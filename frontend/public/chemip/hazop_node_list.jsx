// HAZOP 작성기 · 검토구간(노드) 목록 — 구간 단추(번호·이름·이탈 건수)와 "검토구간 추가". 문구: HAZOP_LABELS.nodes

function HazopNodeList({ study, current, onPick, onAdd }) {
  const N = HAZOP_LABELS.nodes;
  const full = study.nodes.length >= HAZOP_MAX_NODES;
  return (
    <div className="panel calc-panel">
      <h3><b>{N.title}</b><span className="muted mono">{study.nodes.length}</span></h3>
      <div className="body">
        <div className="hz-node-list" role="tablist" aria-label={N.title}>
          {study.nodes.map((n, i) => (
            <button key={n.id} type="button" role="tab" aria-selected={n.id === current} className="hz-node-btn" onClick={() => onPick(n.id)}>
              <span className="sft-idx mono">{n.no}</span>
              <span className="hz-node-name">{n.name || N.untitled(i + 1)}</span>
              <span className="muted hz-mini">{N.count(n.rows.length)}</span>
            </button>
          ))}
          <button type="button" className="btn sm" onClick={onAdd} disabled={full}><Icon name="plus" size={12} /> {N.add}</button>
        </div>
        {full && <div className="calc-hint">{N.full(HAZOP_MAX_NODES)}</div>}
      </div>
    </div>
  );
}

Object.assign(window, { HazopNodeList });
