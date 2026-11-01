// 저장 혼촉 매트릭스 · 물질별 반응성 분류 목록(번호·이름·CAS·분류 칩, 칩 title = 근거). 고른 물질 빼기 단추.
// 분류 이름은 SAFETY_RULES(compat 체계·ghs 유해성)의 ko/en, 근거 종류 이름은 SAFETY_LABELS.common.sourceKinds.

function CompatBasisText({ basis }) {
  const K = SAFETY_LABELS.common.sourceKinds;
  const p = cmBasisParts(basis);
  if (p.kind === "name") return K.name;
  if (p.kind === "ph") return `${K.ph} ${p.text}`;
  if (p.kind === "s15" || p.kind === "s14") return `${K[p.kind]}${p.sub ? ` · ${K.sub}` : ""}: ${p.text}`;
  const h = p.hazard && SAFETY_RULES.ghs.hazards[p.hazard.key];
  const text = h ? `${tr(h.ko, h.en)} ${p.hazard.cat}`.trim() : p.text;
  return p.kind === "clp" ? `${K.clp}: ${text}` : text;
}

function CompatClassChip({ c }) {
  const L = SAFETY_LABELS.compat;
  const name = cmClassName(c.system, c.code);
  return (
    <span className={`sft-chip is-${c.system}`}>
      <span className="sft-chip-sys">{L.reasonSystem[c.system]}</span> {tr(name.ko, name.en)}
      <span className="sft-chip-basis"> · <CompatBasisText basis={c.basis} /></span>
    </span>
  );
}

function CompatClasses({ items, onRemove }) {
  const L = SAFETY_LABELS;
  return (
    <div className="panel calc-panel">
      <h3><b>{L.compat.classesTitle}</b></h3>
      <div className="body sft-class-list">
        {items.map((it, i) => (
          <div key={it.id} className="sft-class-row">
            <div className="sft-class-head">
              <span className="sft-idx mono">{i + 1}</span>
              <b className="sft-class-name">{it.name}</b>
              <span className="muted mono">{it.cas || L.picker.noCas}</span>
              <button type="button" className="btn sm ghost sft-remove" aria-label={`${it.name} ${L.picker.remove}`} title={L.picker.remove} onClick={() => onRemove(it.id)}>
                <Icon name="close" size={12} />
              </button>
            </div>
            {it.loading && <div className="calc-hint">{L.common.loading}</div>}
            {!it.loading && it.error && !apiIsNotice(it.error) && <div className="calc-err">{L.common.loadFailed}</div>}
            {!it.loading && it.classes.length === 0 && <div className="calc-hint"><b>{L.compat.noClasses}</b> — {L.compat.noClassesHint}</div>}
            <div className="sft-chips">{it.classes.map((c, j) => <CompatClassChip key={`${c.system}-${c.code}-${j}`} c={c} />)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { CompatBasisText, CompatClassChip, CompatClasses });
