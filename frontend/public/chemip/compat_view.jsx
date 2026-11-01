// 화면 "저장 혼촉 매트릭스"(?view=compat, 미리 고를 물질 ?cas=CAS1,CAS2,…) 셸 — 고른 물질 상태·자료 훅·배치만.
// 분류: 정적 g/reactive_class.json 먼저, 없으면 물질 MSDS 상세로(compat_core.jsx cmSubstanceClasses). 판정: cmMatrix. 문구: SAFETY_LABELS.compat.

const COMPAT_MAX = 10;
const COMPAT_EXAMPLE_CAS = ["7697-37-2", "67-64-1", "1310-73-2", "7722-84-1"]; // 질산·아세톤·수산화나트륨·과산화수소
let compatNextId = 1;

function compatLinkCas() {
  try {
    return (new URLSearchParams(window.location.search).get("cas") || "").split(",").map(s => s.trim())
      .filter(s => /^\d{2,7}-\d{2}-\d$/.test(s)).slice(0, COMPAT_MAX);
  } catch (e) {
    return [];
  }
}

function CompatView({ setView }) {
  const L = SAFETY_LABELS.compat;
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState(null);
  const tables = useSafetyTables();
  const subs = useToolSubstances(entries);
  const add = (item) => setEntries(es => (es.length >= COMPAT_MAX || es.some(e => e.item.chem_id === item.chem_id) ? es : [...es, { id: compatNextId++, item }]));
  const remove = (id) => { setEntries(es => es.filter(e => e.id !== id)); setSelected(null); };
  const loadCas = async (list) => {
    const found = (await Promise.all(list.map(fetchSubstanceByCas))).filter(Boolean);
    setSelected(null);
    setEntries(found.slice(0, COMPAT_MAX).map(item => ({ id: compatNextId++, item })));
  };
  useEffect(() => { const cas = compatLinkCas(); if (cas.length) loadCas(cas); }, []);

  const items = useMemo(() => entries.map(e => {
    const s = subs[e.id] || { loading: true };
    const cas = e.item.cas_no || s.detail?.cas_no || "";
    const names = [e.item.name, e.item.name_en, s.detail?.name, s.detail?.name_en].filter(Boolean);
    const annexEntries = tables.data?.annex6?.entries?.[cas] || null;
    const res = cmSubstanceClasses({ cas, table: tables.data?.reactive, detail: s.detail, names, annexEntries });
    return { id: e.id, name: chemPrimaryName(e.item), cas, loading: s.loading && res.from !== "table", error: s.error, ...res };
  }), [entries, subs, tables.data]);
  const pairs = useMemo(() => cmMatrix(items), [items]);
  const tableOff = !tables.loading && !tables.data?.reactive;

  return (
    <div className="calc-view sft-view">
      <SafetyToolsNav current="compat" setView={setView} />
      <h1 className="calc-title">{L.title}{L.titleSub && <> <span className="title-en">{L.titleSub}</span></>}</h1>
      <p className="calc-lede">{L.lede}</p>
      <div className="sft-layout">
        <section className="sft-main">
          <div className="panel calc-panel">
            <div className="body sft-pick-row">
              <SubstancePicker onPick={add} disabled={entries.length >= COMPAT_MAX} max={COMPAT_MAX} />
              <button type="button" className="btn sm" onClick={() => loadCas(COMPAT_EXAMPLE_CAS)}>{L.example}</button>
            </div>
            {tableOff && entries.length > 0 && <div className="body"><div className="calc-hint">{SAFETY_LABELS.common.tableOff}</div></div>}
          </div>
          {entries.length < 2
            ? <EmptyState card>{L.empty}</EmptyState>
            : <>
                <CompatMatrix items={items} pairs={pairs} selected={selected} onSelect={setSelected} />
                <CompatPairList items={items} pairs={pairs} selected={selected} />
              </>}
          {entries.length > 0 && <CompatClasses items={items} onRemove={remove} />}
        </section>
        <aside className="sft-side">
          <SafetyBasis basis={L.basis} disclaimer={L.disclaimer}
            asOf={tables.data?.reactive?.exported_at ? SAFETY_LABELS.common.asOf(tables.data.reactive.exported_at) : ""} />
        </aside>
      </div>
    </div>
  );
}

Object.assign(window, { CompatView, COMPAT_MAX, COMPAT_EXAMPLE_CAS });
