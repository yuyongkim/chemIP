// 혼합물 GHS 분류 · 단계별 근거 — mgClassify 의 steps(값)를 SAFETY_LABELS.mix.steps 문구 함수로 그린다. 계산은 하지 않는다.

const MIX_FMT = v => calcFormatNumber(Number(v), 4);

function mixHazardName(key) {
  const sub = key.match(/^stot_se_(3[RN])$/);
  const def = SAFETY_RULES.ghs.hazards[sub ? "stot_se" : key];
  const name = def ? tr(def.ko, def.en) : key;
  return sub ? `${name} ${SAFETY_LABELS.mix.stotSub[sub[1]]}` : name;
}

function MixStep({ st }) {
  const S = SAFETY_LABELS.mix.steps;
  const R = SAFETY_LABELS.mix.routes;
  if (st.kind === "acute") {
    return (
      <li className="sft-step">
        <b>{S.acuteHead(R[st.route])}</b>
        <ul>
          {st.rows.map((r, i) => <li key={i}>{S.acuteRow(r.name, MIX_FMT(r.c), MIX_FMT(r.ate), st.unit, r.how, r.cat)}</li>)}
          {st.skipped.map((r, i) => <li key={`s${i}`} className="muted">{S.acuteSkipped(r.name, MIX_FMT(r.c))}</li>)}
          <li className="mono">{S.acuteFormula(st.corrected, MIX_FMT(st.unknown), MIX_FMT(st.sum))}</li>
          <li><b>{S.acuteResult(MIX_FMT(st.ateMix), st.unit, st.cat)}</b></li>
        </ul>
      </li>
    );
  }
  if (st.kind === "sum") {
    return (
      <li className="sft-step">
        <b>{S.sumHead(mixHazardName(st.hazard), SAFETY_LABELS.mix.stotSub[st.target] ? "3" : st.target)}</b>
        <ul>
          {st.rows.map((r, i) => <li key={i} className="mono">{S.sumRow(r.name, MIX_FMT(r.c), MIX_FMT(r.limit), r.scl)}</li>)}
          <li><b>{S.sumResult(MIX_FMT(st.total), st.met)}</b></li>
        </ul>
      </li>
    );
  }
  if (st.kind === "implied") return <li className="sft-step">{S.implied}</li>;
  if (st.kind === "limit") {
    return (
      <li className="sft-step">
        <b>{S.limitHead(mixHazardName(st.hazard))}</b>
        <ul>
          {st.rows.map((r, i) => <li key={i}>{S.limitRow(r.name, MIX_FMT(r.c), r.cat, MIX_FMT(r.limit), r.scl, r.met)}</li>)}
          <li><b>{S.limitResult(st.cat)}</b></li>
        </ul>
      </li>
    );
  }
  if (st.kind === "stot") {
    return (
      <li className="sft-step">
        <b>{S.limitHead(mixHazardName(st.hazard))}</b>
        <ul>
          {st.rows.map((r, i) => <li key={i}>{S.stotRow(r.name, MIX_FMT(r.c), r.cat, r.limits.map(MIX_FMT), r.got)}</li>)}
          <li><b>{S.limitResult(st.cat)}</b></li>
        </ul>
      </li>
    );
  }
  if (st.kind === "asp") {
    return (
      <li className="sft-step">
        <b>{S.aspHead}</b>
        <ul>
          {st.rows.map((r, i) => <li key={i}>{r.name}: {MIX_FMT(r.c)} %</li>)}
          <li><b>{S.aspResult(MIX_FMT(st.total), st.met, st.viscosityHigh)}</b></li>
        </ul>
      </li>
    );
  }
  if (st.kind === "aq_acute") {
    return (
      <li className="sft-step">
        <b>{S.aqAcuteHead}</b>
        <ul>
          {st.rows.map((r, i) => <li key={i} className="mono">{S.aqAcuteRow(r.name, MIX_FMT(r.c), MIX_FMT(r.m))}</li>)}
          <li><b>Σ = {MIX_FMT(st.total)} → {S.result(st.met ? "1" : null)}</b></li>
        </ul>
      </li>
    );
  }
  if (st.kind === "aq_chronic") {
    return (
      <li className="sft-step">
        <b>{S.aqChronicHead}</b>
        <ul>
          {st.rows.map((r, i) => <li key={i} className="mono">{S.aqChronicRow(r.name, MIX_FMT(r.c), r.cat, MIX_FMT(r.m))}</li>)}
          {st.tests.map(t => <li key={t.cat} className="mono">{S.aqTest(t.cat, MIX_FMT(t.value), t.value >= st.trigger)}</li>)}
          <li><b>{S.result(st.cat)}</b></li>
        </ul>
      </li>
    );
  }
  return null;
}

function MixSteps({ steps }) {
  const L = SAFETY_LABELS.mix;
  if (!steps || !steps.length) return null;
  return (
    <div className="panel calc-panel">
      <h3><b>{L.stepsTitle}</b></h3>
      <div className="body"><ol className="sft-steps">{steps.map((st, i) => <MixStep key={i} st={st} />)}</ol></div>
    </div>
  );
}

Object.assign(window, { mixHazardName, MixStep, MixSteps });
