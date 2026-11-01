// HAZOP 작성기 · 검토 개요(공정 이름·도면·검토일·팀·공정 종류)와 도구 줄(HazopToolbar). 문구: HAZOP_LABELS.study

function HazopStudyHead({ study, saved, onChange, onReplace }) {
  const L = HAZOP_LABELS;
  const S = L.study;
  const text = (k, ph) => (
    <label className="calc-field">
      <span className="calc-label">{S[k]}</span>
      <input className="calc-input" value={study[k]} placeholder={ph || ""} onChange={e => onChange({ [k]: e.target.value })} />
    </label>
  );
  return (
    <div className="panel calc-panel">
      <h3><b>{S.title}</b></h3>
      <div className="body">
        <div className="hz-grid">
          {text("name", S.namePh)}
          {text("drawing")}
          <label className="calc-field">
            <span className="calc-label">{S.date}</span>
            <input className="calc-input" type="date" value={study.date} onChange={e => onChange({ date: e.target.value })} />
          </label>
          {text("team")}
        </div>
        <div className="calc-field">
          <span className="calc-label">{S.processType}</span>
          <div className="seg" role="group" aria-label={S.processType}>
            {HAZOP_PROCESS_TYPES.map(t => (
              <button key={t} type="button" aria-pressed={study.processType === t} onClick={() => onChange({ processType: t })}>{L.processTypes[t]}</button>
            ))}
          </div>
        </div>
        <HazopToolbar study={study} saved={saved} onReplace={onReplace} />
      </div>
    </div>
  );
}

Object.assign(window, { HazopStudyHead });
