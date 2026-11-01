// 화면 "혼합물 GHS 분류"(?view=mixghs) 셸 — 성분 행 상태·자료 훅·배치만. 행 → 성분: mgRowComponent, 분류: mgClassify, 표지: mgLabel(순수 함수).
// 성분 분류 출처: 정적 g/clp_annex6.json(부속서 VI) · 물질 MSDS 상세(KOSHA 2항) · 직접 입력. 문구: SAFETY_LABELS.mix. 스타일: calc.css .sft-*

const MIXGHS_MAX_ROWS = 20;
let mixNextId = 1;

function mixEmptyRow(extra = {}) {
  return { id: mixNextId++, item: null, name: "", c: "", source: null, annexIdx: 0, typed: "", unknownAcute: false, manual: false, ...extra };
}

function MixGhsView({ setView }) {
  const L = SAFETY_LABELS.mix;
  const [rows, setRows] = useState(() => [mixEmptyRow()]);
  const [viscosityHigh, setViscosityHigh] = useState(false);
  const tables = useSafetyTables();
  const picked = useMemo(() => rows.filter(r => r.item).map(r => ({ id: r.id, item: r.item })), [rows]);
  const subs = useToolSubstances(picked);
  const update = (id, patch) => setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id) => setRows(rs => (rs.length > 1 ? rs.filter(r => r.id !== id) : rs));
  const loadExample = (k) => setRows(MIXGHS_EXAMPLES[k].map(e => mixEmptyRow({ ...e, manual: true, source: "typed" })));

  const built = useMemo(() => rows.map(r => {
    const cas = r.item?.cas_no || "";
    return mgRowComponent(r, { detail: subs[r.id]?.detail || null, annexEntries: (cas && tables.data?.annex6?.entries?.[cas]) || null });
  }), [rows, subs, tables.data]);
  const comps = built.map(b => b.comp).filter(c => c.c > 0);
  const result = useMemo(() => (comps.length ? mgClassify(comps, { viscosityHigh }) : null), [built, viscosityHigh]);
  const label = useMemo(() => (result ? mgLabel(result.classes) : null), [result]);
  const total = comps.reduce((s, c) => s + c.c, 0);
  const annexOff = !tables.loading && !tables.data?.annex6;

  return (
    <div className="calc-view sft-view">
      <SafetyToolsNav current="mixghs" setView={setView} />
      <h1 className="calc-title">{L.title}{L.titleSub && <> <span className="title-en">{L.titleSub}</span></>}</h1>
      <p className="calc-lede">{L.lede}</p>
      <div className="sft-layout">
        <section className="sft-main">
          <div className="panel calc-panel">
            <h3><b>{L.rowsTitle}</b><span className="muted mono">{L.total(calcFormatNumber(total, 4))}</span></h3>
            <div className="body">
              <div className="sft-examples">
                <span className="calc-label">{L.examples}</span>
                {Object.keys(MIXGHS_EXAMPLES).map(k => <button key={k} type="button" className="btn sm" onClick={() => loadExample(k)}>{L.exampleNames[k]}</button>)}
              </div>
              {annexOff && <div className="calc-hint">{L.annexOff}</div>}
              <div className="sft-mix-rows">
                {rows.map((r, i) => (
                  <MixRow key={r.id} index={i} row={r} built={built[i]} sub={subs[r.id]} canRemove={rows.length > 1}
                    onChange={patch => update(r.id, patch)} onRemove={() => remove(r.id)} />
                ))}
              </div>
              {rows.length < MIXGHS_MAX_ROWS && (
                <button type="button" className="btn sm calc-row-add" onClick={() => setRows(rs => [...rs, mixEmptyRow()])}><Icon name="plus" size={12} /> {L.addRow}</button>
              )}
              <label className="gl-check sft-visc">
                <input type="checkbox" checked={viscosityHigh} onChange={e => setViscosityHigh(e.target.checked)} /> {L.viscosity}
              </label>
            </div>
          </div>
          <MixSteps steps={result?.steps} />
        </section>
        <aside className="sft-side">
          <MixResult result={result} label={label} />
          <SafetyBasis basis={L.basis} disclaimer={L.disclaimer}
            asOf={tables.data?.annex6 ? `${tables.data.annex6.atp} · ${SAFETY_LABELS.common.asOf(tables.data.annex6.table_date)}` : ""} />
        </aside>
      </div>
    </div>
  );
}

Object.assign(window, { MixGhsView, MIXGHS_MAX_ROWS, mixEmptyRow });
