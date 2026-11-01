// 장외 영향 스크리닝 — 입력(기준 단위 값) → 시나리오 풀이 한 벌(누출률·지속 시간·끝점·표·거리). React 없음.
// 계산기 정의(calc_offsite.jsx)의 compute 와 chart 가 같은 풀이를 쓴다. 식·표 읽기는 calc_rmp_core.jsx, 자료는 CALC_RMP_DATA.
// 결과: { error } 또는 { kind, sub, rateLb, minutes, ep, dist: { miles, table, … }, method: [식], warn: [문구], areaFt2?, tntKg? }

const CALC_OFFSITE_DEFAULTS = { toxic: "7782-50-5", flam: "74-98-6" };   // 염소, 프로판

function calcOffsiteHoleIn2(dM) {
  const dIn = dM / CALC_RMP_SI.inch;
  return Math.PI * dIn * dIn / 4;
}

// 기체 구멍 누출(식 7-1). 탱크 압력을 비우면 Exhibit 의 25 °C 증기압(액화 기체)을 쓴다.
function calcOffsiteGasHole(v, sub, warn) {
  let ptPsia = v.Pt != null ? v.Pt / CALC_RMP_SI.psi : null;
  if (ptPsia == null && sub.vpUnit === "psia" && sub.vp) {
    ptPsia = sub.vp;
    warn.push(tr(`탱크 압력 칸이 비어 25 °C 증기압 ${sub.vp} psia(지침 Exhibit)를 썼습니다.`, `Tank pressure left blank: used the 25 °C vapour pressure of ${sub.vp} psia from the guidance exhibit.`));
  }
  if (ptPsia == null) return { error: tr("탱크 압력(절대)을 넣으십시오. 이 물질은 지침에 25 °C 증기압이 없습니다.", "Enter the tank pressure (absolute). The guidance gives no 25 °C vapour pressure for this substance.") };
  if (sub.gf == null) return { error: tr("지침에 이 물질의 기체 계수(GF)가 없습니다. 누출률을 직접 넣으십시오.", "The guidance gives no gas factor (GF) for this substance. Enter the release rate directly.") };
  return { rateLb: calcRmpGasHole(calcOffsiteHoleIn2(v.dh), ptPsia, v.Tt, sub.gf), method: "7-1" };
}

// 누출 → 대기로 나가는 누출률(lb/min)·지속 시간(분)·웅덩이. 독성·인화성(증기운 화재) 공용.
function calcOffsiteRelease(v, sub, warn) {
  const qsLb = v.QS / CALC_RMP_SI.lb;
  const scn = v.scn;
  const gas = sub.state === "gas";
  const building = v.mit === "building";
  // 방류벽 안 면적, 건물이면 바닥(또는 그 안 방류벽) 면적 — 1 cm 웅덩이보다 작을 때만 줄인다(3.2.3절)
  const dikeFt2 = (v.mit === "dike" || building) && v.dikeA ? v.dikeA / (CALC_RMP_SI.ft ** 2) : null;
  if (gas && v.mit === "dike") warn.push(tr("방류벽은 액체 웅덩이에만 적용합니다(기체는 무시).", "A dike applies only to liquid pools (ignored for a gas)."));
  const mode = scn === "worst" ? "total" : v.alt;
  if (mode === "rate") {
    const rateLb = v.Qd / (CALC_RMP_SI.lb / 60);
    return { rateLb, minutes: v.dur / 60, method: [tr("누출률 직접 입력", "release rate entered")] };
  }
  if (gas) {
    if (mode === "total") {
      const rateLb = calcRmpGasWorst(qsLb, building);
      return { rateLb, minutes: 10, method: [building ? "3-1, 3-2" : "3-1"] };
    }
    const hole = calcOffsiteGasHole(v, sub, warn);
    if (hole.error) return hole;
    let rateLb = hole.rateLb * (building ? CALC_RMP_SI.bldGas : 1);
    let minutes = Math.min(qsLb / rateLb, 60);
    if (v.tstop != null) minutes = Math.min(minutes, v.tstop / 60);
    if (minutes < 10) {   // 10분 안에 멈추면 새어 나간 양을 10분으로 나눈다(7.1.2절)
      rateLb = rateLb * minutes / 10;
      warn.push(tr("10분 안에 멈추는 누출이라 새어 나간 양을 10분으로 나눈 누출률을 씁니다(지침 7.1.2절).", "The release stops within 10 minutes, so the quantity released is spread over 10 minutes (guidance §7.1.2)."));
      minutes = 10;
    }
    return { rateLb, minutes, method: [building ? "7-1, 3-2" : "7-1"] };
  }
  // 액체: 웅덩이 증발(필요하면 구멍 누출률과 비교)
  let poolLb = qsLb;
  let liquidLb = null;
  const method = [];
  if (mode === "hole") {
    if (sub.llf == null) return { error: tr("지침에 이 물질의 액체 누출 계수(LLF)가 없습니다. 누출률을 직접 넣으십시오.", "The guidance gives no liquid leak factor (LLF) for this substance. Enter the release rate directly.") };
    liquidLb = calcRmpLiquidHole(calcOffsiteHoleIn2(v.dh), v.LH / CALC_RMP_SI.inch, sub.llf);
    if (v.tstop != null) poolLb = Math.min(qsLb, liquidLb * v.tstop / 60);
    method.push("7-4");
  }
  const pool = calcRmpPool({ sub, qsLb: poolLb, tC: v.T - 273.15, scn, dikeFt2, building });
  method.push(scn === "alt" ? (pool.diked ? "7-10/7-11" : "7-8/7-9") : (pool.diked ? "3-7/3-8" : "3-3/3-4"), "3-6");
  if (building) method.push(scn === "alt" ? tr("건물 ×0.05", "building ×0.05") : tr("건물 ×0.1", "building ×0.1"));
  if (pool.factor.kind === "LFA×TCF") method.push(`TCF ${pool.factor.tcf} (${pool.factor.tcfAt} °C)`);
  let rateLb = pool.qr;
  if (liquidLb != null && liquidLb < rateLb) {
    rateLb = liquidLb;
    warn.push(tr("웅덩이 증발량이 구멍 누출률보다 커서 구멍 누출률을 대기 누출률로 씁니다(지침 7.2.3절).", "Pool evaporation exceeds the liquid release rate, so the liquid release rate is used as the rate to air (guidance §7.2.3)."));
  }
  return { rateLb, minutes: poolLb / rateLb, poolLb, liquidLb, areaFt2: pool.areaFt2, factor: pool.factor, method };
}

function calcOffsiteToxic(v, warn) {
  const sub = calcRmpToxic(v.sub_t);
  if (!sub) return { error: tr("물질을 고르십시오.", "Choose a substance.") };
  const rel = calcOffsiteRelease(v, sub, warn);
  if (rel.error) return rel;
  const minutes = v.scn === "worst" && sub.state === "gas" ? 10 : rel.minutes;
  let ep = calcRmpEndpoint(sub, v.basis, minutes);
  if (v.epUser != null) ep = { mgL: calcRmpPpmToMgL(v.epUser, sub.mw), ppm: v.epUser, kind: "user", label: tr("직접 입력", "user entry") };
  if (!ep) return { error: tr("이 물질은 ERPG-2·AEGL-2·PAC-2 값이 없습니다. 쓸 끝점을 '끝점 직접 입력'에 넣으십시오.", "No ERPG-2, AEGL-2 or PAC-2 for this substance. Enter the endpoint to use under 'Endpoint (optional)'.") };
  const dist = calcRmpToxicDistance({ sub, rate: rel.rateLb, epMgL: ep.mgL, scn: v.scn, topo: v.topo, minutes, nh3: v.nh3 });
  if (sub.state === "liquid" && v.T - 273.15 > 25 && rel.factor?.kind === "LFB") warn.push(tr("25 °C 보다 높고 온도 보정 계수가 없거나 50 °C 를 넘어 끓는점 기준 계수(LFB)를 썼습니다.", "Above 25 °C with no temperature correction factor (or above 50 °C): the boiling-point factor (LFB) is used."));
  return { kind: "toxic", sub, ...rel, minutes, ep, dist };
}

function calcOffsiteFlam(v, warn) {
  const sub = calcRmpFlammable(v.sub_f);
  if (!sub) return { error: tr("물질을 고르십시오.", "Choose a substance.") };
  const qsLb = v.QS / CALC_RMP_SI.lb;
  const event = v.scn === "worst" ? "vce" : v.event;
  if (event === "vce") {
    const y = v.scn === "worst" ? CALC_RMP_SI.yieldWorst : CALC_RMP_SI.yieldAlt;
    let cloudLb = qsLb;
    const method = ["C-2"];
    if (v.scn === "alt") {
      if (v.Qcloud != null) cloudLb = Math.min(qsLb, v.Qcloud / CALC_RMP_SI.lb);
      else if (sub.fff != null) { cloudLb = Math.min(qsLb, 2 * sub.fff * qsLb); method.push("10-2"); }
    }
    if (sub.hc_kJkg == null) return { error: tr("지침에 이 물질의 연소열이 없습니다.", "The guidance gives no heat of combustion for this substance.") };
    const miles = calcRmpVceMiles(cloudLb, sub.hc_kJkg, y);
    return { kind: "vce", sub, event, cloudLb, yieldFrac: y, tntKg: y * cloudLb * CALC_RMP_SI.lb * sub.hc_kJkg / CALC_RMP_SI.tnt,
      dist: { miles, eq: true }, method };
  }
  if (event === "pool") {
    if (sub.pff == null || sub.df == null) return { error: tr("지침에 이 물질의 웅덩이 화재 계수(PFF)가 없습니다.", "The guidance gives no pool fire factor (PFF) for this substance.") };
    const maxArea = qsLb * sub.df;
    const dikeFt2 = v.mit === "dike" && v.dikeA ? v.dikeA / (CALC_RMP_SI.ft ** 2) : null;
    const areaFt2 = dikeFt2 && dikeFt2 < maxArea ? dikeFt2 : maxArea;
    if (sub.state === "gas") warn.push(tr("가압 액화 기체는 웅덩이 화재보다 화구·증기운 폭발이 더 멀리 미칠 수 있습니다(지침 10.2절).", "For a gas liquefied under pressure, a fireball or vapour cloud explosion may reach farther than a pool fire (guidance §10.2)."));
    const ft = calcRmpPoolFireFt(areaFt2, sub.pff);
    return { kind: "pool", sub, event, areaFt2, dist: { miles: ft * CALC_RMP_SI.ft / CALC_RMP_SI.mi, eq: true }, method: ["3-6", "10-1"] };
  }
  if (event === "bleve") {
    const b = calcRmpBleve(sub.cas, qsLb);
    if (!b) return { error: tr("참조표 30 에 이 물질의 화구 거리가 없습니다.", "Reference Table 30 has no fireball distance for this substance.") };
    if (Math.abs(b.qLb - qsLb) / qsLb > 0.25) warn.push(tr(`표에서 가장 가까운 양 ${b.qLb.toLocaleString("en-US")} lb 의 거리를 읽었습니다.`, `Read the distance for the nearest tabulated quantity, ${b.qLb.toLocaleString("en-US")} lb.`));
    return { kind: "bleve", sub, event, dist: b, durationS: b.durationS, method: [tr("참조표 30", "Reference Table 30")] };
  }
  // 증기운 화재: 누출률 → LFL 표
  if (sub.lfl_mgL == null) return { error: tr("지침에 이 물질의 LFL(mg/L)이 없습니다.", "The guidance gives no LFL (mg/L) for this substance.") };
  const rel = calcOffsiteRelease(v, sub, warn);
  if (rel.error) return rel;
  const dist = calcRmpLflDistance({ sub, rate: rel.rateLb, topo: v.topo });
  return { kind: "vcf", sub, event, ...rel, dist };
}

function calcOffsiteRun(v) {
  const warn = [];
  const res = v.cat === "flam" ? calcOffsiteFlam(v, warn) : calcOffsiteToxic(v, warn);
  return res.error ? res : { ...res, warn };
}

Object.assign(window, { CALC_OFFSITE_DEFAULTS, calcOffsiteHoleIn2, calcOffsiteRelease, calcOffsiteRun });
