// 최상위 화면 "우리 사업장에 어떤 법이 걸리나"(적용 법규 판정기, ?view=applicability) 셸 — 취급량 행 상태·자료 훅·배치만.
// 판정: aplEvaluate(apl_evaluate.jsx → apl_psm_core·apl_cca_core·apl_hazmat_core). 자료: api_applicability.jsx(규정수량 정적 파일·물질 정보),
// api_safety_tools.jsx useSafetyTables(위험물 유별 g/reactive_class.json). 문구: APL_LABELS. 스타일: calc.css(.apl-*, .sft-*).

let aplNextId = 1;

function aplEmptyRow(extra = {}) {
  return { id: `apl${aplNextId++}`, item: null, cas: "", name: "", qty: "", unit: "kg", density: "", conc: "100",
    state: "liquid", use: "warehouse", psmClass: "auto", hazmat: "auto", manual: false, ...extra };
}

function AplView({ setView }) {
  const L = APL_LABELS;
  const [rows, setRows] = useState(() => [aplEmptyRow()]);
  const [industry, setIndustry] = useState("");
  const quantities = useAplQuantities();
  const tables = useSafetyTables();
  const infos = useAplInfos(rows, tables.data?.reactive, !tables.loading);
  const result = aplEvaluate(rows, infos, quantities.data, { industry });
  const names = Object.fromEntries(rows.map(r => [r.id, r.item ? chemPrimaryName(r.item) : r.name || r.cas]));
  const hzItems = Object.fromEntries(result.hazmat.items.map(i => [i.id, i]));

  const update = (id, patch) => setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id) => setRows(rs => (rs.length > 1 ? rs.filter(r => r.id !== id) : rs));
  const add = (extra) => setRows(rs => (rs.length < APL_MAX_ROWS ? [...rs.filter(r => r.cas || r.name || r.qty), aplEmptyRow(extra)] : rs));
  const loadExample = async (k) => {
    const list = APL_EXAMPLES[k];
    const items = await Promise.all(list.map(e => fetchSubstanceByCas(e.cas)));
    setRows(list.map((e, i) => aplEmptyRow({ ...e, item: items[i], name: items[i] ? chemPrimaryName(items[i]) : "", manual: !items[i] })));
  };
  const ccaLoading = quantities.loading;

  return (
    <div className="calc-view sft-view apl-view">
      <SafetyToolsNav current="applicability" setView={setView} />
      <h1 className="calc-title">{L.title} <span className="title-en">{L.titleSub}</span></h1>
      <p className="calc-lede">{L.lede}</p>
      <AplDisclaimer notice={quantities.data?.source} />
      <section className="calc-main">
        <AplInventory rows={rows} infos={infos} hzItems={hzItems} industry={industry} onIndustry={setIndustry}
          onChange={update} onRemove={remove} onAdd={() => add()} onExample={loadExample} onClear={() => setRows([aplEmptyRow()])} />
        <AplPrintInventory rows={rows} names={names} />
        <AplSummary result={result} ccaLoading={ccaLoading}>
          <AplExport result={result} rows={rows} names={names} />
        </AplSummary>
        {result.filled.length > 0 && (
          <>
            <AplPsmPanel psm={result.psm} names={names} />
            <AplCcaPanel cca={result.cca} names={names} loading={ccaLoading} />
            <AplHazmatPanel hazmat={result.hazmat} names={names} />
          </>
        )}
        <AplDike onAddRow={(extra) => add(extra)} />
        <AplPrintFooter />
      </section>
    </div>
  );
}

Object.assign(window, { AplView, aplEmptyRow });
