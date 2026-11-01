// 적용 법규 판정기 · 취급량 표 패널: 예시·모두 지우기 줄, 행들(AplRow), 행 추가, 업종 고르기(산안법 시행령 제43조제1항).
// 상태는 apl_view.jsx. hzItems 는 위험물 판정 결과(행 id → 품명, "자동: …" 표시용).

const APL_MAX_ROWS = 30;

function AplInventory({ rows, infos, hzItems, industry, onIndustry, onChange, onRemove, onAdd, onExample, onClear }) {
  const L = APL_LABELS.inv;
  return (
    <div className="panel calc-panel apl-no-print">
      <h3><b>{L.title}</b></h3>
      <div className="body">
        <p className="calc-hint apl-hint">{L.hint}</p>
        <div className="sft-examples">
          <span className="calc-label">{L.examples}</span>
          {Object.keys(APL_EXAMPLES).map(k => <button key={k} type="button" className="btn sm" onClick={() => onExample(k)}>{L.exampleNames[k]}</button>)}
          <button type="button" className="btn sm ghost" onClick={onClear}>{L.clear}</button>
        </div>
        <div className="apl-rows">
          {rows.map((r, i) => (
            <AplRow key={r.id} index={i} row={r} info={infos[r.id]} hzItem={hzItems[r.id]} canRemove={rows.length > 1}
              onChange={patch => onChange(r.id, patch)} onRemove={() => onRemove(r.id)} />
          ))}
        </div>
        {rows.length < APL_MAX_ROWS && (
          <button type="button" className="btn sm calc-row-add" onClick={onAdd}><Icon name="plus" size={12} /> {L.add}</button>
        )}
        <div className="apl-industry">
          <AplSelect label={L.industry} value={industry} onChange={onIndustry}>
            <option value="">{L.industryNone}</option>
            {APL_PSM.industries.map(i => <option key={i.k} value={i.k}>{tr(i.ko, i.en)}</option>)}
          </AplSelect>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { APL_MAX_ROWS, AplInventory });
