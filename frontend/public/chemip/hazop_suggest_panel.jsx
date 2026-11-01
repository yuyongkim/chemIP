// HAZOP 작성기 · 제안 목록 — 고른 줄의 변수·검토구간 설비·물질 자료(H 문구·물성·사고 사례·설계 분야)로 만든 문장 조각.
// 누르면 고른 줄의 해당 칸(원인·결과·현재안전조치·개선권고)에 한 줄 더한다. 묶음 만들기: hzSuggestions(hazop_core.jsx). 문구: HAZOP_LABELS.suggest

function HazopSuggestPanel({ node, row, sub, onAppend }) {
  const L = HAZOP_LABELS;
  const S = L.suggest;
  const hazardKeys = useMemo(() => (sub.sections ? hzHazardKeys(ghsSection2(sub.sections).hazards) : []), [sub.sections]);
  const factsItems = useMemo(() => factsStripItems(sub.facts, FACTS_LABELS, CHEMIP_LANG).filter(f => f.k !== "transport"), [sub.facts]);
  const discNames = (typeof PRODUCT_LABELS !== "undefined" && PRODUCT_LABELS.disciplineNames) || null;
  const incidentHints = useMemo(() => (sub.incidents ? hzIncidentHints(sub.incidents, discNames) : null), [sub.incidents]);
  const groups = useMemo(() => hzSuggestions({ param: row?.param, equipment: node?.equipment, hazardKeys, factsItems, incidentHints }, L),
    [row?.param, node?.equipment, hazardKeys, factsItems, incidentHints]);
  const fromSubstance = groups.some(g => ["hazards", "facts", "incidents", "disciplines"].includes(g.k));
  return (
    <div className="panel calc-panel hz-suggest">
      <h3><b>{S.title}</b></h3>
      <div className="body">
        <div className="calc-hint">{row ? S.forRow(row.deviation || "—") : S.noRow}</div>
        {!node?.substance && <div className="calc-hint">{S.pickSubstance}</div>}
        {node?.substance && sub.loading && <div className="calc-hint">{S.loading}</div>}
        {node?.substance && !sub.loading && !fromSubstance && <div className="calc-hint">{S.none}</div>}
        {groups.map(g => (
          <div key={g.k} className="hz-sg">
            <div className="calc-sub">{g.title}</div>
            {["causes", "consequences", "safeguards", "rec"].map(field => {
              const items = g.items.filter(it => it.field === field);
              if (!items.length) return null;
              return (
                <div key={field} className="hz-sg-row">
                  <span className="muted hz-mini">{S.groups[field]}</span>
                  {items.map(it => (
                    <button key={it.text} type="button" className="chip hz-sg-chip" disabled={!row} onClick={() => onAppend(field, it.text)}>{it.text}</button>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { HazopSuggestPanel });
