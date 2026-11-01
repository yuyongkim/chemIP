// 화면 "HAZOP 워크시트 작성기"(?view=hazop) 셸 — 검토 상태(이 브라우저 저장)·고른 검토구간·고른 줄과 배치만.
// 고치기: hazop_ops.jsx(hzOp*), 이름·제안: hazop_core.jsx, 문구: HAZOP_LABELS, 스타일: calc.css .hz-*

function HazopView({ setView }) {
  const L = HAZOP_LABELS;
  const [study, setStudy, saved] = useHazopStudy();
  const [nodeId, setNodeId] = useState(() => study.nodes[0]?.id || "");
  const [active, setActive] = useState(null); // { rowId, field }
  const node = study.nodes.find(n => n.id === nodeId) || study.nodes[0];
  const sub = useHazopSubstance(node?.substance || null);
  const activeRow = node?.rows.find(r => r.id === active?.rowId) || null;

  const edit = (fn) => setStudy(s => fn(s));
  const pickNode = (id) => { setNodeId(id); setActive(null); };
  const addNode = () => {
    const next = hzOpAddNode(study);
    if (next === study) return;
    setStudy(next);
    setNodeId(next.nodes[next.nodes.length - 1].id);
    setActive(null);
  };
  const removeNode = (id) => { edit(s => hzOpRemoveNode(s, id)); setNodeId(""); setActive(null); };
  const addRows = (rows) => {
    if (!node || !rows.length) return;
    edit(s => hzOpAddRows(s, node.id, rows));
    setActive({ rowId: rows[rows.length - 1].id, field: "causes" });
  };
  const replaceStudy = (next) => { setStudy(next); setNodeId(next.nodes[0].id); setActive(null); };

  return (
    <div className="calc-view sft-view hz-view">
      <SafetyToolsNav current="hazop" setView={setView} />
      <h1 className="calc-title">{L.title}{L.titleSub && <> <span className="title-en">{L.titleSub}</span></>}</h1>
      <p className="calc-lede">{L.lede}</p>
      <div className="calc-alert is-warn hz-aid">{L.aid}</div>
      <div className="sft-layout">
        <section className="sft-main">
          <HazopStudyHead study={study} saved={saved} onChange={p => edit(s => hzOpPatchStudy(s, p))} onReplace={replaceStudy} />
          <HazopNodeList study={study} current={node?.id} onPick={pickNode} onAdd={addNode} />
          {node && (
            <>
              <HazopNodeForm node={node} onChange={p => edit(s => hzOpPatchNode(s, node.id, p))} onRemove={() => removeNode(node.id)} />
              <HazopGuideMatrix node={node} processType={study.processType} onAdd={addRows} />
              <HazopSheet node={node} risk={study.risk} active={active} onActive={setActive}
                onPatch={(rowId, p) => edit(s => hzOpPatchRow(s, node.id, rowId, p))}
                onRemove={(rowId) => { edit(s => hzOpRemoveRow(s, node.id, rowId)); setActive(null); }}
                onMove={(rowId, dir) => edit(s => hzOpMoveRow(s, node.id, rowId, dir))} />
            </>
          )}
        </section>
        <aside className="sft-side">
          <HazopSuggestPanel node={node} row={activeRow} sub={sub}
            onAppend={(field, text) => activeRow && edit(s => hzOpAppendToRow(s, node.id, activeRow.id, field, text))} />
          <HazopToolLinks substance={node?.substance} facts={sub.facts} />
          <HazopRiskSettings risk={study.risk} onChange={risk => edit(s => hzOpPatchStudy(s, { risk: hzNormalizeRisk(risk) }))} />
          <SafetyBasis basis={L.basis} disclaimer={L.disclaimer} />
        </aside>
      </div>
    </div>
  );
}

Object.assign(window, { HazopView });
