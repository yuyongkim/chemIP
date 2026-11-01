// 적용 법규 판정기 · 취급량 표 한 행: 물질(고르기·직접 입력) · 최대보유량·단위 · 밀도 · 함량 · 성상 · 시설 · PSM 구분 · 위험물 품명 · 빼기.
// 행 상태는 apl_view.jsx 가 들고 여기서는 onChange(바뀐 칸)만 부른다. 아래 줄: 불러오는 중·NCIS 지정 현황·MSDS 비중 사용 안내.

function AplSelect({ label, term, value, onChange, children }) {
  return (
    <label className="apl-field">
      <span className="calc-label calc-label-row">{label}{term && <TermHint term={term} />}</span>
      <select className="calc-unit sft-select apl-select" value={value} onChange={e => onChange(e.target.value)}>{children}</select>
    </label>
  );
}

function AplNumField({ label, term, value, onChange, invalid }) {
  return (
    <label className="apl-field">
      <span className="calc-label calc-label-row">{label}{term && <TermHint term={term} />}</span>
      <input className="calc-input mono" inputMode="decimal" value={value} aria-invalid={invalid || undefined} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

function AplHazmatOptions() {
  const H = APL_HAZMAT;
  return Object.keys(H.classes).map(c => (
    <optgroup key={c} label={tr(H.classes[c].ko, H.classes[c].en)}>
      {H.items.filter(i => String(i.cls) === c).map(i => (
        <option key={i.k} value={i.k}>{tr(i.ko, i.en)} — {aplFmt(i.qty)} {i.unit}</option>
      ))}
    </optgroup>
  ));
}

function AplRow({ index, row, info, hzItem, onChange, onRemove, canRemove }) {
  const L = APL_LABELS.inv;
  const T = APL_TERMS;
  const P = SAFETY_LABELS.picker;
  const bad = (v) => v !== "" && aplNum(v) == null;
  const autoName = hzItem && hzItem.item && row.hazmat === "auto" ? tr(hzItem.item.ko, hzItem.item.en) : "";
  const usesDensity = !aplNum(row.density) && info && info.density;   // 밀도 칸이 비면 kg ↔ L 환산에 MSDS 비중을 쓴다(aplDensity)
  return (
    <div className="apl-row">
      <div className="apl-row-head">
        <span className="sft-idx mono">{index + 1}</span>
        <div className="apl-row-name">
          {row.item
            ? <div><b>{chemPrimaryName(row.item)}</b> <span className="muted mono">{row.cas || P.noCas}</span></div>
            : row.manual
              ? <div className="apl-manual">
                  <input className="calc-input" aria-label={L.columns.name} placeholder={L.namePlaceholder} value={row.name} onChange={e => onChange({ name: e.target.value })} />
                  <input className="calc-input mono apl-cas" aria-label={L.columns.cas} placeholder={L.columns.cas} value={row.cas} onChange={e => onChange({ cas: e.target.value.trim() })} />
                </div>
              : <div className="sft-mix-pick">
                  <SubstancePicker label={L.columns.name} onPick={it => onChange({ item: it, cas: it.cas_no || "", name: chemPrimaryName(it) })} />
                  <button type="button" className="btn sm ghost" onClick={() => onChange({ manual: true })}>{L.typed}</button>
                </div>}
        </div>
        <button type="button" className="btn sm ghost sft-remove" aria-label={`${L.rowIndex(index + 1)} ${L.remove}`} title={L.remove} disabled={!canRemove} onClick={onRemove}>
          <Icon name="close" size={12} />
        </button>
      </div>
      <div className="apl-row-grid">
        <AplNumField label={L.columns.qty} term={T.qty} value={row.qty} invalid={bad(row.qty)} onChange={v => onChange({ qty: v })} />
        <AplSelect label={L.columns.unit} value={row.unit} onChange={v => onChange({ unit: v })}>
          {APL_UNITS.map(u => <option key={u} value={u}>{L.units[u]}</option>)}
        </AplSelect>
        <AplNumField label={L.columns.density} term={T.density} value={row.density} invalid={bad(row.density)} onChange={v => onChange({ density: v })} />
        <AplNumField label={L.columns.conc} term={T.conc} value={row.conc} invalid={bad(row.conc)} onChange={v => onChange({ conc: v })} />
        <AplSelect label={L.columns.state} term={T.state} value={row.state} onChange={v => onChange({ state: v })}>
          {Object.keys(L.states).map(s => <option key={s} value={s}>{L.states[s]}</option>)}
        </AplSelect>
        <AplSelect label={L.columns.use} term={T.use} value={row.use} onChange={v => onChange({ use: v })}>
          {Object.entries(APL_HAZMAT.facilities).map(([k, f]) => <option key={k} value={k}>{tr(f.ko, f.en)}</option>)}
        </AplSelect>
        <AplSelect label={L.columns.psm} term={T.psmQty} value={row.psmClass} onChange={v => onChange({ psmClass: v })}>
          {Object.keys(L.psmClass).map(k => <option key={k} value={k}>{L.psmClass[k]}</option>)}
        </AplSelect>
        <AplSelect label={L.columns.hazmat} term={T.hzQty} value={row.hazmat} onChange={v => onChange({ hazmat: v })}>
          <option value="auto">{L.hazmatAuto(autoName)}</option>
          <option value="none">{L.hazmatNone}</option>
          <AplHazmatOptions />
        </AplSelect>
      </div>
      <div className="apl-row-foot">
        {info && info.loading && <span className="calc-hint">{L.loading}</span>}
        {info && info.error && <span className="calc-hint">{L.loadFailed}</span>}
        {usesDensity ? <span className="calc-hint">{L.densityFrom(aplFmt(info.density, 4))}</span> : null}
        {info && info.ncis && info.ncis.length > 0 && (
          <span className="sft-chips" aria-label={L.designations}>
            {info.ncis.map(c => <span key={c} className="sft-chip" data-source-text="">{c}</span>)}
          </span>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { AplSelect, AplNumField, AplHazmatOptions, AplRow });
