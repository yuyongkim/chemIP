// 계산 엔진 불러오기 상태 줄(useCalcEngine, calc_form_engine.jsx) — 받는 중 / 실패(다시 시도). 준비되면 그리지 않는다. 문구: CALC_LABELS.engine.

function CalcEngineStatus({ engine, status, onRetry }) {
  const L = CALC_LABELS.engine;
  if (!engine || status === "ready") return null;
  if (status === "failed") {
    return (
      <div className="calc-alert is-hazard calc-engine-status" role="alert">
        {L.failed(engine.name)}{" "}
        <button type="button" className="btn sm" onClick={onRetry}>{L.retry}</button>
      </div>
    );
  }
  return <div className="calc-alert calc-engine-status is-loading" role="status">{L.loading(engine.name, engine.size)}</div>;
}

Object.assign(window, { CalcEngineStatus });
