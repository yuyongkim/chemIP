// HAZOP 작성기 · 검토구간 정보(구간 번호·표시·설계 의도·도면·주요 설비·취급 물질). 물질은 안전 도구 공용 SubstancePicker 로 고른다.
// 문구: HAZOP_LABELS.node · equipment

function HazopNodeForm({ node, onChange, onRemove }) {
  const L = HAZOP_LABELS;
  const N = L.node;
  const ask = (msg) => (typeof window.confirm === "function" ? window.confirm(msg) : true);
  const sub = node.substance;
  return (
    <div className="panel calc-panel">
      <h3><b>{N.title}</b>
        <button type="button" className="btn sm ghost" onClick={() => { if (ask(L.nodes.confirmRemove(node.name || node.no))) onRemove(); }}>
          <Icon name="close" size={12} /> {L.nodes.remove}
        </button>
      </h3>
      <div className="body">
        <div className="hz-grid">
          <label className="calc-field hz-narrow">
            <span className="calc-label">{N.no}</span>
            <input className="calc-input mono" value={node.no} onChange={e => onChange({ no: e.target.value })} />
          </label>
          <label className="calc-field hz-wide">
            <span className="calc-label">{N.name}</span>
            <input className="calc-input" value={node.name} placeholder={N.namePh} onChange={e => onChange({ name: e.target.value })} />
          </label>
          <label className="calc-field hz-wide">
            <span className="calc-label">{N.intent}</span>
            <textarea className="calc-input hz-text" rows={2} value={node.intent} placeholder={N.intentPh} onChange={e => onChange({ intent: e.target.value })} />
          </label>
          <label className="calc-field">
            <span className="calc-label">{N.drawing}</span>
            <input className="calc-input" value={node.drawing} onChange={e => onChange({ drawing: e.target.value })} />
          </label>
          <label className="calc-field">
            <span className="calc-label">{N.equipment}</span>
            <select className="calc-input" value={node.equipment} onChange={e => onChange({ equipment: e.target.value })}>
              {HAZOP_EQUIPMENT.map(k => <option key={k} value={k}>{L.equipment[k]}</option>)}
            </select>
          </label>
        </div>
        <div className="sft-pick-row">
          <SubstancePicker label={N.substance} onPick={it => onChange({ substance: { chem_id: it.chem_id || "", cas_no: it.cas_no || "", name: it.name || "", name_en: it.name_en || "", has_msds: Boolean(it.has_msds) } })} />
          <div className="hz-sub">
            {sub
              ? <>
                  <span className="chip accent">{chemPrimaryName(sub)}{sub.cas_no ? <span className="mono muted"> {sub.cas_no}</span> : null}</span>
                  <button type="button" className="btn sm ghost" onClick={() => onChange({ substance: null })}>{N.substanceClear}</button>
                </>
              : <span className="muted hz-mini">{N.substanceNone}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HazopNodeForm });
