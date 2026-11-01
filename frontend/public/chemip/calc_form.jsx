// 계산기 하나의 본문 — 입력 칸들(CalcField·CalcTableField), 결과(CalcResults), 결과 표(정의에 table 이 있으면 CalcTableOut), 이어서 계산(links 가 있으면 CalcNextLinks), 덧붙임 패널(정의의 panel = window 의 컴포넌트 이름, { def, result } 를 받는다), 식·주의·근거(CalcNotes).
// 상태는 이 컴포넌트 안에만 둔다. 검사·환산·계산은 calc_engine.jsx 의 순수 함수.

function CalcForm({ def, prefill, from }) {
  const L = CALC_LABELS;
  const [state, setState] = useState(() => calcInitialState(def, prefill || {}));
  const engine = useCalcEngine(def);   // 정의에 engine 이 있으면 이 계산기를 열 때만 불러온다(calc_form_engine.jsx)
  const result = useMemo(() => calcEvaluate(def, state), [def, state, engine.status]);
  const applied = useMemo(() => calcPrefillApplied(def, prefill), [def, prefill]);
  const choices = calcChoices(def, state);
  const set = (k, v) => setState(s => ({ ...s, [k]: v }));
  return (
    <section className="calc-main">
      <div className="panel calc-panel">
        <h3><b>{def.title}</b></h3>
        <div className="body">
          <p className="calc-summary">{def.summary}</p>
          {applied.length > 0 && (
            <div className="calc-prefill">
              <b>{L.prefill(from)}</b>
              {applied.map(a => <span key={a.key}>{a.label} = {a.value === "" ? "—" : a.value} {a.unit}</span>)}
            </div>
          )}
          <div className="calc-fields">
            {def.inputs.filter(i => calcVisible(i, choices)).map(i => (i.type === "table"
              ? <CalcTableField key={i.key} input={i} rows={state[i.key]} errors={result.errors} onChange={rows => set(i.key, rows)} choices={choices} />
              : <CalcField key={i.key} input={i} value={state[i.key]} error={result.errors[i.key]} onChange={v => set(i.key, v)} />))}
          </div>
        </div>
      </div>
      {def.engine && <CalcEngineStatus engine={def.engine} status={engine.status} onRetry={engine.retry} />}
      <CalcResults def={def} result={result} />
      {def.table && <CalcTableOut def={def} result={result} />}
      {def.links && <CalcNextLinks def={def} result={result} />}
      {def.panel && window[def.panel] && React.createElement(window[def.panel], { def, result })}
      <CalcNotes def={def} />
    </section>
  );
}

Object.assign(window, { CalcForm });
