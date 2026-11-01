// 계산기: 2성분 기액평형(VLE) Txy·Pxy·xy 선도 — 활동도 계수 모델(Raoult·Margules·van Laar·Wilson·NRTL·원 UNIFAC), 기포점·이슬점, 공비점.
// 성분: calc_vle_presets.jsx(사전 설정 18종 또는 직접 입력), 모델: calc_vle_models.jsx·calc_vle_unifac.jsx, 풀이: calc_vle_solve.jsx.

const CALC_VLE_MODELS = ["ideal", "margules", "vanlaar", "wilson", "nrtl", "unifac"];
const CALC_VLE_EU = { K: 1, Jmol: 1 / CALC_CONST.R, calmol: 4.184 / CALC_CONST.R };   // 에너지 매개변수 → K
const calcVleIs = (...models) => (v) => models.includes(v.model);
const calcVleCustom = (k) => (v) => v[k] === CALC_VLE_CUSTOM;
const calcVleAnyCustom = (v) => v.c1 === CALC_VLE_CUSTOM || v.c2 === CALC_VLE_CUSTOM;

function calcVleAntoineInputs(n, defaults) {
  const on = calcVleCustom(`c${n}`);
  return [
    { key: `A${n}`, term: "antoine_constants", label: tr(`성분 ${n} Antoine A`, `Component ${n} Antoine A`), unit: "—", default: defaults[0], when: on },
    { key: `B${n}`, term: "antoine_constants", label: tr(`성분 ${n} Antoine B`, `Component ${n} Antoine B`), unit: "—", default: defaults[1], when: on },
    { key: `C${n}`, term: "antoine_constants", label: tr(`성분 ${n} Antoine C`, `Component ${n} Antoine C`), unit: "—", default: defaults[2], when: on },
  ];
}

function calcVleGroupInput(n, rows) {
  return {
    key: `g${n}`, type: "table", term: "unifac_group", label: tr(`성분 ${n} UNIFAC 부그룹`, `Component ${n} UNIFAC subgroups`),
    columns: [{ key: "g", text: true, label: tr("부그룹(이름·번호)", "Subgroup (name or no.)") }, { key: "n", label: tr("개수", "Count"), positive: true }],
    rows, minRows: 1, maxRows: 8, when: v => v[`c${n}`] === CALC_VLE_CUSTOM && v.model === "unifac",
    hint: tr("Hansen et al. (1991) 부그룹 이름 또는 번호. 예: 에탄올 = CH3 1, CH2 1, OH 1 / 톨루엔 = ACH 5, ACCH3 1.", "Hansen et al. (1991) subgroup name or number. E.g. ethanol = CH3 1, CH2 1, OH 1 / toluene = ACH 5, ACCH3 1."),
  };
}

// 값 → 계(sys)·성분 이름·사전 설정 범위, 또는 { error }
function calcVleSystem(v) {
  if (v.c1 === v.c2 && v.c1 !== CALC_VLE_CUSTOM) return { error: tr("두 성분이 같습니다. 서로 다른 물질을 고르십시오.", "Both components are the same. Pick two different substances.") };
  const form = { base: v.ab, pu: v.apu, tu: v.atu };
  const user = (n) => ({ name: tr(`성분 ${n}`, `Component ${n}`), antoine: { ...form, A: v[`A${n}`], B: v[`B${n}`], C: v[`C${n}`] }, rows: v.model === "unifac" ? v[`g${n}`] : null });
  const c1 = calcVleComponent(v.c1, user(1)), c2 = calcVleComponent(v.c2, user(2));
  if (c1.error || c2.error) return { error: c1.error || c2.error };
  const eu = CALC_VLE_EU[v.eu] || 1;
  const g = calcVleGammaFn(v.model, {
    A12: v.A12, A21: v.A21, V1: v.V1, V2: v.V2, a12: v.a12 * eu, a21: v.a21 * eu, b12: v.b12 * eu, b21: v.b21 * eu, alpha: v.alpha,
    groups1: c1.groups, groups2: c2.groups,
  });
  if (g.error) return { error: g.error };
  return { sys: { c1, c2, gamma: g.fn }, c1, c2 };
}

function calcVleAzText(az, basis) {
  if (!az) return tr("공비점 없음(이 조건, 이 모델)", "No azeotrope (at this condition, with this model)");
  const kind = { minBoiling: tr("최저 공비(최고 압력)", "minimum-boiling (maximum-pressure)"), maxBoiling: tr("최고 공비(최저 압력)", "maximum-boiling (minimum-pressure)"), other: tr("공비", "azeotrope") }[az.kind];
  const at = basis === "P" ? `${(az.T - 273.15).toFixed(2)} °C` : `${(az.P / 1000).toFixed(3)} kPa`;
  return tr(`공비점 있음 — ${kind}, x₁ = y₁ = ${az.x1.toFixed(4)}, ${at}`, `Azeotrope — ${kind}, x₁ = y₁ = ${az.x1.toFixed(4)}, ${at}`);
}

// 계산 한 번(compute·chart 가 함께 쓴다)
function calcVleSolveAll(v) {
  const s = calcVleSystem(v);
  if (s.error) return s;
  const fixed = v.basis === "P" ? v.P : v.T;
  const curve = calcVleCurve(s.sys, v.basis, fixed);
  if (curve.length < CALC_VLE_X_GRID.length) return { error: tr("일부 조성에서 기포점을 풀지 못했습니다. 압력·온도가 두 물질의 Antoine 범위 안인지 확인하십시오.", "The bubble point could not be solved at some compositions. Check that the pressure or temperature lies within both substances' Antoine ranges.") };
  const bub = calcVleBubble(s.sys, v.basis, v.z1, fixed), dew = calcVleDew(s.sys, v.basis, v.z1, fixed);
  const az = calcVleAzeotrope(s.sys, v.basis, fixed, curve);
  return { ...s, fixed, curve, bub, dew, az, splits: v.model === "ideal" ? false : calcVleSplits(s.sys, curve) };
}

function calcVleWarnings(r, v) {
  const w = [];
  const Ts = v.basis === "P" ? r.curve.map(p => p.T) : [v.T];
  const lo = Math.min(...Ts), hi = Math.max(...Ts);
  [r.c1, r.c2].forEach(c => {
    if (c.range && (lo < c.range[0] - 0.5 || hi > c.range[1] + 0.5)) {
      w.push(tr(`${c.name}: 온도(${(lo - 273.15).toFixed(0)}–${(hi - 273.15).toFixed(0)} °C)가 Antoine 맞춤 범위(${(c.range[0] - 273.15).toFixed(0)}–${(c.range[1] - 273.15).toFixed(0)} °C) 밖입니다.`,
        `${c.name}: the temperature (${(lo - 273.15).toFixed(0)} to ${(hi - 273.15).toFixed(0)} °C) is outside the Antoine fitted range (${(c.range[0] - 273.15).toFixed(0)} to ${(c.range[1] - 273.15).toFixed(0)} °C).`));
    }
  });
  if (r.splits) w.push(tr("이 모델은 일부 조성에서 액상이 두 층으로 갈린다(액액 분리)고 봅니다. 그 구간의 Txy·Pxy 는 기액액(VLLE) 계산이 필요하며 여기 선은 참고만 하십시오.", "This model predicts liquid–liquid splitting at some compositions. There the Txy/Pxy lines need a VLLE calculation; treat them as indicative only."));
  if (r.az && (r.az.x1 < 0.03 || r.az.x1 > 0.97)) w.push(tr("공비점이 순수 성분에 아주 가깝습니다. 끓는점 차가 거의 없는 접선 모양이라 모델 오차로 생긴 것일 수 있으니 실측 자료로 확인하십시오.", "The azeotrope lies very close to a pure component. Such a tangent pinch with almost no boiling-point difference may be a model artefact; check against measured data."));
  if (v.model === "unifac") w.push(tr("UNIFAC 은 예측 모델입니다(γ 오차 보통 10–20 %). 설계에는 실측 VLE 로 맞춘 매개변수를 쓰십시오.", "UNIFAC is predictive (γ typically within 10–20 %). For design use parameters regressed from measured VLE."));
  return w;
}

const CALC_DEF_VLE_BINARY = {
  key: "vle_binary",
  group: "thermo",
  title: tr("2성분 기액평형(VLE) Txy·Pxy·xy 선도", "Binary VLE: Txy, Pxy and xy diagrams"),
  summary: tr("두 물질의 기액평형(수정 Raoult 식)을 Raoult·Margules·van Laar·Wilson·NRTL·UNIFAC 활동도 계수로 풀어 Txy·Pxy·xy 선도, 기포점·이슬점, 공비점(에탄올–물 등)을 구합니다.",
    "Solves binary vapour–liquid equilibrium (modified Raoult's law) with Raoult, Margules, van Laar, Wilson, NRTL or UNIFAC activity coefficients: Txy, Pxy and xy diagrams, bubble and dew points, and azeotropes (e.g. ethanol–water)."),
  inputs: [
    { key: "c1", type: "choice", select: true, term: "vle_component", label: tr("성분 1 (가벼운 쪽 권장)", "Component 1 (lighter one suggested)"), default: "Ethanol", options: calcVlePresetOptions() },
    { key: "c2", type: "choice", select: true, term: "vle_component", label: tr("성분 2", "Component 2"), default: "Water", options: calcVlePresetOptions() },
    { key: "basis", type: "choice", label: tr("고정 조건", "Fixed condition"), default: "P",
      options: [{ v: "P", label: tr("압력 고정 (Txy)", "Constant pressure (Txy)") }, { v: "T", label: tr("온도 고정 (Pxy)", "Constant temperature (Pxy)") }] },
    { key: "P", term: "absolute_pressure", label: tr("압력 (절대)", "Pressure (absolute)"), dim: "pressure", unit: "Pa", show: "kPa", default: 101.325, positive: true, when: v => v.basis === "P" },
    { key: "T", label: tr("온도", "Temperature"), dim: "temperature", unit: "K", show: "C", default: 60, positive: true, when: v => v.basis === "T" },
    { key: "model", type: "choice", term: "activity_model", label: tr("활동도 계수 모델", "Activity-coefficient model"), default: "unifac",
      options: [{ v: "ideal", label: tr("Raoult (이상 용액)", "Raoult (ideal)") }, { v: "margules", label: "Margules" }, { v: "vanlaar", label: "van Laar" },
        { v: "wilson", label: "Wilson" }, { v: "nrtl", label: "NRTL" }, { v: "unifac", label: tr("UNIFAC (예측)", "UNIFAC (predictive)") }] },
    { key: "A12", term: "margules_vanlaar", label: "A₁₂", unit: "—", default: 1.6, when: calcVleIs("margules", "vanlaar"), hint: tr("= ln γ₁∞ (무한 희석)", "= ln γ₁∞ (infinite dilution)") },
    { key: "A21", term: "margules_vanlaar", label: "A₂₁", unit: "—", default: 0.8, when: calcVleIs("margules", "vanlaar"), hint: tr("= ln γ₂∞", "= ln γ₂∞") },
    { key: "eu", type: "choice", label: tr("에너지 매개변수 단위", "Energy parameter unit"), default: "calmol", when: calcVleIs("wilson", "nrtl"),
      options: [{ v: "K", label: "K (Δ/R)" }, { v: "Jmol", label: "J/mol" }, { v: "calmol", label: "cal/mol" }] },
    { key: "V1", term: "wilson_nrtl", label: tr("성분 1 액체 몰부피 V₁", "Component 1 liquid molar volume V₁"), unit: "cm³/mol", default: 58.7, positive: true, when: calcVleIs("wilson") },
    { key: "V2", term: "wilson_nrtl", label: tr("성분 2 액체 몰부피 V₂", "Component 2 liquid molar volume V₂"), unit: "cm³/mol", default: 18.1, positive: true, when: calcVleIs("wilson") },
    { key: "a12", term: "wilson_nrtl", label: "a₁₂ (Wilson)", unit: tr("고른 단위", "chosen unit"), default: 300, when: calcVleIs("wilson") },
    { key: "a21", term: "wilson_nrtl", label: "a₂₁ (Wilson)", unit: tr("고른 단위", "chosen unit"), default: 900, when: calcVleIs("wilson") },
    { key: "b12", term: "wilson_nrtl", label: "b₁₂ (NRTL)", unit: tr("고른 단위", "chosen unit"), default: 100, when: calcVleIs("nrtl") },
    { key: "b21", term: "wilson_nrtl", label: "b₂₁ (NRTL)", unit: tr("고른 단위", "chosen unit"), default: 1000, when: calcVleIs("nrtl") },
    { key: "alpha", term: "wilson_nrtl", label: tr("NRTL 비무작위 α", "NRTL non-randomness α"), unit: "—", default: 0.3, positive: true, max: 1, when: calcVleIs("nrtl") },
    ...calcVleAntoineInputs(1, [8.20417, 1642.89, 230.3]),
    ...calcVleAntoineInputs(2, [8.07131, 1730.63, 233.426]),
    { key: "ab", type: "choice", label: tr("Antoine 로그", "Antoine logarithm"), default: "log10", when: calcVleAnyCustom, options: [{ v: "log10", label: "log₁₀" }, { v: "ln", label: "ln" }] },
    { key: "apu", type: "choice", label: tr("Antoine 압력 단위", "Antoine pressure unit"), default: "mmHg", when: calcVleAnyCustom,
      options: CALC_ANTOINE_P_UNITS.map(u => ({ v: u, label: CALC_UNITS.pressure[u].label })) },
    { key: "atu", type: "choice", label: tr("Antoine 온도 단위", "Antoine temperature unit"), default: "C", when: calcVleAnyCustom,
      options: CALC_ANTOINE_T_UNITS.map(u => ({ v: u, label: CALC_UNITS.temperature[u].label })) },
    calcVleGroupInput(1, [{ g: "CH3", n: 1 }, { g: "CH2", n: 1 }, { g: "OH", n: 1 }]),
    calcVleGroupInput(2, [{ g: "H2O", n: 1 }]),
    { key: "z1", term: "vle_mole_fraction", label: tr("기포점·이슬점을 볼 조성 (성분 1 몰분율)", "Composition for bubble and dew points (mole fraction of 1)"), unit: "—", default: 0.5, min: 0, max: 1 },
    { key: "plot", type: "choice", term: "vle_diagram", label: tr("그래프", "Chart"), default: "phase",
      options: [{ v: "phase", label: tr("Txy / Pxy", "Txy / Pxy") }, { v: "xy", label: tr("x–y 선도", "x–y diagram") }] },
  ],
  outputs: [
    { key: "bub_T", term: "bubble_dew_point", label: tr("기포점 온도 (z₁ 액)", "Bubble-point temperature (liquid z₁)"), dim: "temperature", unit: "K", show: "C", digits: 5 },
    { key: "bub_P", term: "bubble_dew_point", label: tr("기포점 압력 (z₁ 액)", "Bubble-point pressure (liquid z₁)"), dim: "pressure", unit: "Pa", show: "kPa", digits: 5 },
    { key: "bub_y", term: "vle_mole_fraction", label: tr("평형 증기 y₁", "Equilibrium vapour y₁"), unit: "—", digits: 4 },
    { key: "dew_T", term: "bubble_dew_point", label: tr("이슬점 온도 (z₁ 증기)", "Dew-point temperature (vapour z₁)"), dim: "temperature", unit: "K", show: "C", digits: 5 },
    { key: "dew_P", term: "bubble_dew_point", label: tr("이슬점 압력 (z₁ 증기)", "Dew-point pressure (vapour z₁)"), dim: "pressure", unit: "Pa", show: "kPa", digits: 5 },
    { key: "dew_x", term: "vle_mole_fraction", label: tr("평형 액 x₁", "Equilibrium liquid x₁"), unit: "—", digits: 4 },
    { key: "g1", term: "activity_model", label: tr("γ₁ (기포점)", "γ₁ (at bubble point)"), unit: "—", digits: 4 },
    { key: "g2", term: "activity_model", label: tr("γ₂ (기포점)", "γ₂ (at bubble point)"), unit: "—", digits: 4 },
    { key: "alpha12", term: "vle_relative_volatility", label: tr("상대 휘발도 α₁₂", "Relative volatility α₁₂"), unit: "—", digits: 4 },
    { key: "az_text", term: "azeotrope_point", label: tr("공비점", "Azeotrope"), type: "text" },
    { key: "az_x", term: "azeotrope_point", label: tr("공비 조성 x₁", "Azeotropic composition x₁"), unit: "—", digits: 4 },
    { key: "az_T", term: "azeotrope_point", label: tr("공비 온도", "Azeotropic temperature"), dim: "temperature", unit: "K", show: "C", digits: 5 },
    { key: "az_P", term: "azeotrope_point", label: tr("공비 압력", "Azeotropic pressure"), dim: "pressure", unit: "Pa", show: "kPa", digits: 5 },
    { key: "s1", term: "vapor_pressure", label: tr("성분 1 포화 증기압 (이 T)", "Component 1 vapour pressure (at this T)"), dim: "pressure", unit: "Pa", show: "kPa", digits: 5 },
    { key: "s2", term: "vapor_pressure", label: tr("성분 2 포화 증기압 (이 T)", "Component 2 vapour pressure (at this T)"), dim: "pressure", unit: "Pa", show: "kPa", digits: 5 },
    { key: "tb1", term: "boiling_point", label: tr("성분 1 끓는점 (이 P)", "Component 1 boiling point (at this P)"), dim: "temperature", unit: "K", show: "C", digits: 5 },
    { key: "tb2", term: "boiling_point", label: tr("성분 2 끓는점 (이 P)", "Component 2 boiling point (at this P)"), dim: "temperature", unit: "K", show: "C", digits: 5 },
    { key: "grp1", term: "unifac_group", label: tr("성분 1 UNIFAC 그룹", "Component 1 UNIFAC groups"), type: "text" },
    { key: "grp2", term: "unifac_group", label: tr("성분 2 UNIFAC 그룹", "Component 2 UNIFAC groups"), type: "text" },
  ],
  compute(v) {
    const r = calcVleSolveAll(v);
    if (r.error) return { error: r.error };
    const out = { az_text: calcVleAzText(r.az, v.basis), warnings: calcVleWarnings(r, v) };
    if (r.bub) {
      Object.assign(out, v.basis === "P" ? { bub_T: r.bub.T } : { bub_P: r.bub.P });
      Object.assign(out, { bub_y: r.bub.y1, g1: r.bub.g1, g2: r.bub.g2, alpha12: r.bub.g1 * r.bub.P1 / (r.bub.g2 * r.bub.P2) });
    }
    if (r.dew) Object.assign(out, v.basis === "P" ? { dew_T: r.dew.T } : { dew_P: r.dew.P }, { dew_x: r.dew.x1 });
    if (r.az) Object.assign(out, { az_x: r.az.x1 }, v.basis === "P" ? { az_T: r.az.T } : { az_P: r.az.P });
    if (v.basis === "T") Object.assign(out, { s1: r.c1.psat(v.T), s2: r.c2.psat(v.T) });
    else Object.assign(out, { tb1: r.c1.tsat(v.P), tb2: r.c2.tsat(v.P) });
    if (v.model === "unifac") Object.assign(out, { grp1: calcUnifacLabel(r.c1.groups), grp2: calcUnifacLabel(r.c2.groups) });
    return out;
  },
  chart(v) {
    const r = calcVleSolveAll(v);
    if (r.error) return null;
    const n1 = r.c1.name;
    const xLab = { label: tr(`${n1} 몰분율 x₁, y₁`, `${n1} mole fraction x₁, y₁`), unit: "—", min: 0, max: 1 };
    const marks = r.az ? [{ x: r.az.x1, y: v.plot === "xy" ? r.az.x1 : v.basis === "P" ? r.az.T - 273.15 : r.az.P / 1000, label: tr("공비점", "Azeotrope") }] : [];
    if (v.plot === "xy") {
      return {
        x: { label: tr(`액 x₁ (${n1})`, `Liquid x₁ (${n1})`), unit: "—", min: 0, max: 1 }, y: { label: tr(`증기 y₁ (${n1})`, `Vapour y₁ (${n1})`), unit: "—", min: 0, max: 1 },
        series: [{ key: "xy", label: tr("평형선 y–x", "Equilibrium curve y–x"), points: r.curve.map(p => [p.x1, p.y1]) },
          { key: "diag", label: "y = x", points: [[0, 0], [1, 1]], dashed: true }],
        markers: marks, ariaLabel: tr(`${n1}–${r.c2.name} x–y 선도`, `${n1}–${r.c2.name} x–y diagram`),
      };
    }
    const isP = v.basis === "P";
    const yv = (p) => (isP ? p.T - 273.15 : p.P / 1000);
    const pt = r.bub ? [{ x: v.z1, y: yv(r.bub), label: tr("기포점", "Bubble point") }] : [];
    return {
      x: xLab,
      y: isP ? { label: tr("온도", "Temperature"), unit: "°C" } : { label: tr("압력", "Pressure"), unit: "kPa" },
      series: [{ key: "bub", label: tr("기포점선 (액, x₁)", "Bubble line (liquid, x₁)"), points: r.curve.map(p => [p.x1, yv(p)]) },
        { key: "dew", label: tr("이슬점선 (증기, y₁)", "Dew line (vapour, y₁)"), points: r.curve.map(p => [p.y1, yv(p)]) }],
      markers: [...pt, ...marks],
      ariaLabel: tr(`${n1}–${r.c2.name} ${isP ? "Txy" : "Pxy"} 선도`, `${n1}–${r.c2.name} ${isP ? "Txy" : "Pxy"} diagram`),
    };
  },
  formula: [
    "y_i·P = x_i·γ_i·P_i^sat(T)   (i = 1, 2)",
    tr("기포점: P = x₁γ₁P₁ˢᵃᵗ + x₂γ₂P₂ˢᵃᵗ,  이슬점: 1/P = y₁/(γ₁P₁ˢᵃᵗ) + y₂/(γ₂P₂ˢᵃᵗ)", "Bubble: P = x₁γ₁P₁ˢᵃᵗ + x₂γ₂P₂ˢᵃᵗ,  dew: 1/P = y₁/(γ₁P₁ˢᵃᵗ) + y₂/(γ₂P₂ˢᵃᵗ)"),
    "Margules: ln γ₁ = x₂²[A₁₂ + 2(A₂₁ − A₁₂)x₁]   van Laar: ln γ₁ = A₁₂(A₂₁x₂ / (A₁₂x₁ + A₂₁x₂))²",
    "Wilson: Λ₁₂ = (V₂/V₁)·exp(−a₁₂/RT), ln γ₁ = −ln(x₁ + x₂Λ₁₂) + x₂[Λ₁₂/(x₁ + x₂Λ₁₂) − Λ₂₁/(x₂ + x₁Λ₂₁)]",
    "NRTL: τ₁₂ = b₁₂/RT, G₁₂ = exp(−ατ₁₂), ln γ₁ = x₂²[τ₂₁(G₂₁/(x₁ + x₂G₂₁))² + τ₁₂G₁₂/(x₂ + x₁G₁₂)²]",
    tr("UNIFAC: ln γ_i = ln γ_i^C(조합, r_i·q_i) + ln γ_i^R(잔여, 그룹 상호작용 a_mn)", "UNIFAC: ln γ_i = ln γ_i^C (combinatorial, r_i·q_i) + ln γ_i^R (residual, group interactions a_mn)"),
    tr("공비점: 내부에서 y₁ = x₁ (α₁₂ = 1)", "Azeotrope: y₁ = x₁ inside the range (α₁₂ = 1)"),
  ],
  notes: [
    tr("기상은 이상기체로 봅니다(저압, 대략 수 bar 이하). 고압·초임계 근처는 상태방정식(φ–φ) 계산이 필요합니다.", "The vapour is treated as an ideal gas (low pressure, below a few bar). High pressures and near-critical conditions need an equation-of-state (φ–φ) method."),
    tr("사전 설정 18종의 증기압은 CoolProp 8.0.0 포화 곡선에 맞춘 Antoine 상수(포화압 1–500 kPa 범위, 최대 오차 0.6 %)입니다. 직접 입력은 상수와 그 단위를 그대로 넣습니다.", "Vapour pressures of the 18 presets use Antoine constants fitted to the CoolProp 8.0.0 saturation curve (1–500 kPa, max error 0.6 %). For custom components enter the constants with their own units."),
    tr("Margules·van Laar·Wilson·NRTL 매개변수는 문헌(예: DECHEMA Chemistry Data Series)이나 실측 맞춤값을 넣습니다. 기본값은 모양을 보기 위한 예시입니다. Wilson·NRTL 에너지 매개변수는 온도에 무관한 상수로 둡니다.", "Enter Margules, van Laar, Wilson or NRTL parameters from the literature (e.g. DECHEMA Chemistry Data Series) or your own regression. Defaults are examples only. Wilson and NRTL energy parameters are taken as temperature-independent."),
    tr("UNIFAC 은 원 UNIFAC(Hansen 1991·Wittig 2003 표)입니다. Dortmund 수정 UNIFAC 이 아니며, 표에 없는 그룹 쌍은 계산하지 않습니다.", "UNIFAC here is original UNIFAC (Hansen 1991 / Wittig 2003 tables), not modified UNIFAC (Dortmund). Group pairs missing from the table are not calculated."),
  ],
  reference: [
    tr("Smith, J.M., Van Ness, H.C. & Abbott, M.M., Introduction to Chemical Engineering Thermodynamics, 7판(2005), 10·12장(예제 10.1·10.3 으로 검증)", "Smith, J.M., Van Ness, H.C. & Abbott, M.M., Introduction to Chemical Engineering Thermodynamics, 7th ed. (2005), Ch. 10 and 12 (validated with Examples 10.1 and 10.3)"),
    "Fredenslund, A., Jones, R.L. & Prausnitz, J.M. (1975). Group-contribution estimation of activity coefficients in nonideal liquid mixtures. AIChE J. 21(6), 1086–1099.",
    "Hansen, H.K., Rasmussen, P., Fredenslund, A., Schiller, M. & Gmehling, J. (1991). Vapor–liquid equilibria by UNIFAC group contribution. 5. Revision and extension. Ind. Eng. Chem. Res. 30(10), 2352–2355.",
    "Wittig, R., Lohmann, J. & Gmehling, J. (2003). Vapor–liquid equilibria by UNIFAC group contribution. 6. Revision and extension. Ind. Eng. Chem. Res. 42(1), 183–188.",
    tr("UNIFAC 표 이전 개정: Skjold-Jørgensen 외(1979) I&EC PDD 18, 714; Gmehling 외(1982) 21, 118; Macedo 외(1983) 22, 676; Tiegs 외(1987) I&EC Res. 26, 159", "Earlier UNIFAC revisions: Skjold-Jørgensen et al. (1979) I&EC PDD 18, 714; Gmehling et al. (1982) 21, 118; Macedo et al. (1983) 22, 676; Tiegs et al. (1987) I&EC Res. 26, 159"),
    "Renon, H. & Prausnitz, J.M. (1968). Local compositions in thermodynamic excess functions for liquid mixtures. AIChE J. 14(1), 135–144.  Wilson, G.M. (1964). J. Am. Chem. Soc. 86, 127–130.",
  ],
};

Object.assign(window, { CALC_DEF_VLE_BINARY, CALC_VLE_MODELS, calcVleSolveAll });
