// 혼합물 GHS 분류 · 성분 한 행: 물질(고르기 또는 이름)·함량·분류 출처·급성 독성 자료 없음·빼기, 그 아래 성분 분류 칩과 직접 입력 칸.
// 행 상태는 mixghs_view.jsx 가 들고, 여기서는 onChange(바뀐 칸)만 부른다. 성분 계산값(built)은 mgRowComponent 결과.

function MixHazardChips({ hazards }) {
  const G = SAFETY_RULES.ghs;
  if (!hazards.length) return <span className="calc-hint">{SAFETY_LABELS.mix.noHazards}</span>;
  return (
    <div className="sft-chips">
      {hazards.map(h => {
        const p = ghpEntryParts(h);
        const def = G.hazards[p.key];
        return <span key={h} className={`sft-chip is-${def?.group || "phys"}`}>{def ? tr(def.ko, def.en) : p.key} {p.cat}{p.minimum ? " *" : ""}</span>;
      })}
    </div>
  );
}

function MixRow({ index, row, built, sub, onChange, onRemove, canRemove }) {
  const L = SAFETY_LABELS.mix;
  const P = SAFETY_LABELS.picker;
  const concBad = row.c !== "" && !(Number(String(row.c).replace(",", ".")) > 0);
  const entries = built.options.includes("annex") ? built.annexCount : 0;
  return (
    <div className="sft-mix-row">
      <div className="sft-mix-grid">
        <span className="sft-idx mono">{index + 1}</span>
        <div className="sft-mix-name">
          {row.item
            ? <div><b>{row.name}</b> <span className="muted mono">{row.item.cas_no || P.noCas}</span>
                {sub?.loading && <span className="calc-hint"> · {SAFETY_LABELS.common.loading}</span>}</div>
            : row.manual
              ? <input className="calc-input" aria-label={L.columns.name} placeholder={L.namePlaceholder} value={row.name}
                  onChange={e => onChange({ name: e.target.value })} />
              : <div className="sft-mix-pick">
                  <SubstancePicker label={L.columns.name} onPick={it => onChange({ item: it, name: chemPrimaryName(it) })} />
                  <button type="button" className="btn sm ghost" onClick={() => onChange({ manual: true, source: "typed" })}>{L.sources.typed}</button>
                </div>}
        </div>
        <label className="sft-mix-field">
          <span className="calc-label">{L.columns.conc}</span>
          <input className="calc-input mono" inputMode="decimal" value={row.c} aria-invalid={concBad} onChange={e => onChange({ c: e.target.value })} />
        </label>
        <label className="sft-mix-field">
          <span className="calc-label">{L.columns.source}</span>
          <select className="calc-unit sft-select" value={built.source} onChange={e => onChange({ source: e.target.value })}>
            {built.options.map(o => <option key={o} value={o}>{L.sources[o]}</option>)}
          </select>
        </label>
        <label className="gl-check sft-mix-unknown">
          <input type="checkbox" checked={Boolean(row.unknownAcute)} onChange={e => onChange({ unknownAcute: e.target.checked })} /> {L.columns.unknown}
        </label>
        <button type="button" className="btn sm ghost sft-remove" aria-label={`${index + 1} ${P.remove}`} title={P.remove} disabled={!canRemove} onClick={onRemove}>
          <Icon name="close" size={12} />
        </button>
      </div>
      {concBad && <div className="calc-err">{L.concInvalid}</div>}
      {built.source === "annex" && entries > 1 && (
        <select className="calc-unit sft-select" value={row.annexIdx || 0} onChange={e => onChange({ annexIdx: Number(e.target.value) })}>
          {Array.from({ length: entries }, (_, i) => <option key={i} value={i}>{L.annexEntry(i + 1, entries)} · {built.annexNames[i]}</option>)}
        </select>
      )}
      <MixHazardChips hazards={built.comp.hazards} />
      {built.source === "typed" && (
        <div className="calc-field">
          <span className="calc-label">{L.typedLabel}</span>
          <textarea className="calc-input gl-textarea mono" rows={3} placeholder={L.typedPlaceholder} value={row.typed}
            onChange={e => onChange({ typed: e.target.value })} aria-label={L.typedLabel} />
          <div className="calc-hint">{L.typedHint}</div>
          {built.unknownLines.length > 0 && <div className="calc-err">{L.typedUnknown(built.unknownLines)}</div>}
        </div>
      )}
      {built.source === "typed" && row.item && !built.options.includes("annex") && !built.options.includes("kosha") && !sub?.loading && (
        <div className="calc-hint">{L.noSourceData}</div>
      )}
    </div>
  );
}

Object.assign(window, { MixHazardChips, MixRow });
