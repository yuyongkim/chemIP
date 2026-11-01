// HAZOP 작성기 · 검토구간 물질로 다른 도구 열기: 탱크 증발 손실·폭발위험장소 도우미(물성으로 칸 채움, calc_facts_link.jsx), PRTR 지도, 물질 상세.
// 문구: HAZOP_LABELS.tools

function HazopToolLinks({ substance, facts }) {
  const T = HAZOP_LABELS.tools;
  if (!substance) return null;
  const name = chemPrimaryName(substance);
  const cas = substance.cas_no || "";
  const chem = substance.chem_id || cas;
  return (
    <div className="panel calc-panel">
      <h3><b>{T.title}</b></h3>
      <div className="body hz-links">
        <a href={calcTankLossesHref(facts, name)}><Icon name="flask" size={12} /> {T.tank}</a>
        <a href={calcAreaClassHref(facts, name)}><Icon name="bolt" size={12} /> {T.area}</a>
        {cas && <a href={`?view=prtr&cas=${encodeURIComponent(cas)}`}><Icon name="map" size={12} /> {T.prtr}</a>}
        {chem && <a href={`?view=product&pv=chemical&chem=${encodeURIComponent(chem)}`}><Icon name="doc" size={12} /> {T.product}</a>}
        {!facts && <div className="calc-hint">{T.noFacts}</div>}
      </div>
    </div>
  );
}

Object.assign(window, { HazopToolLinks });
