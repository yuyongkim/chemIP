// 계산기: 원관 마찰 압력손실 — Darcy–Weisbach + Darcy 마찰계수(층류 64/Re, 난류 Colebrook 또는 Swamee–Jain).

// Swamee & Jain (1976) 명시식. rr = ε/D. 적용 범위 5000 ≤ Re ≤ 1e8, 1e-6 ≤ ε/D ≤ 1e-2.
function calcFrictionSwameeJain(Re, rr) {
  const t = Math.log10(rr / 3.7 + 5.74 / Math.pow(Re, 0.9));
  return 0.25 / (t * t);
}

// Colebrook (1939) 음함수 — x = 1/√f 고정점 반복(Swamee–Jain 값에서 시작, 보통 5회 안에 1e-12 수렴).
function calcFrictionColebrook(Re, rr) {
  let x = 1 / Math.sqrt(calcFrictionSwameeJain(Re, rr));
  for (let i = 0; i < 100; i++) {
    const next = -2 * Math.log10(rr / 3.7 + 2.51 * x / Re);
    if (Math.abs(next - x) < 1e-12) { x = next; break; }
    x = next;
  }
  return 1 / (x * x);
}

// 유속 vel [m/s] 에서 마찰계수·압력손실 [Pa] (v: 기준 단위 입력)
function calcPipeDpAt(v, vel) {
  const Re = calcReynolds(v.rho, vel, v.D, v.mu);
  const rr = v.eps / v.D;
  const regime = calcFlowRegime(Re);
  const f = regime === "laminar" ? 64 / Re : v.method === "swamee" ? calcFrictionSwameeJain(Re, rr) : calcFrictionColebrook(Re, rr);
  return { Re, rr, regime, f, dp: f * (v.L / v.D) * v.rho * vel * vel / 2 };
}

// 그래프: 유량(또는 유속) 0.05–2 배에서 ΔP 곡선(kPa)과 계산점
function calcPipeDpChart(v, out) {
  const area = Math.PI * v.D * v.D / 4;
  const byFlow = v.mode === "flow";
  const x0 = byFlow ? v.Q * 3600 : out.vel;
  const pts = calcChartRange(x0 * 0.05, x0 * 2, 39).map(x => [x, calcPipeDpAt(v, byFlow ? x / 3600 / area : x).dp / 1000]);
  return {
    x: byFlow ? { label: tr("부피 유량 Q", "Volumetric flow Q"), unit: "m³/h", min: 0 } : { label: tr("평균 유속 v", "Mean velocity v"), unit: "m/s", min: 0 },
    y: { label: tr("압력손실 ΔP", "Pressure drop ΔP"), unit: "kPa", min: 0 },
    series: [{ key: "dp", label: tr("압력손실 ΔP", "Pressure drop ΔP"), points: pts }],
    markers: [{ x: x0, y: out.dp / 1000, label: tr("계산점", "Result") }],
    ariaLabel: tr("유량에 따른 배관 압력손실 곡선", "Pipe pressure drop versus flow"),
  };
}

const CALC_DEF_PIPE_DP = {
  key: "pipe_dp",
  group: "fluid",
  title: tr("배관 압력손실 (Darcy–Weisbach)", "Pipe pressure drop (Darcy–Weisbach)"),
  summary: tr("곧은 원관의 마찰 압력손실과 손실 수두를 구합니다. 마찰계수는 레이놀즈 수와 상대 조도로 자동 계산합니다.", "Computes the frictional pressure drop and head loss in a straight circular pipe. The friction factor is calculated from the Reynolds number and relative roughness."),
  inputs: [
    { key: "mode", type: "choice", label: tr("유량 입력", "Flow input"), default: "flow",
      options: [{ v: "flow", label: tr("부피 유량", "Volumetric flow") }, { v: "vel", label: tr("평균 유속", "Mean velocity") }] },
    { key: "Q", label: tr("부피 유량 Q", "Volumetric flow Q"), dim: "flow", unit: "m3s", show: "m3h", default: 50, positive: true, when: v => v.mode === "flow" },
    { key: "v", term: "mean_velocity", label: tr("평균 유속 v", "Mean velocity v"), dim: "velocity", unit: "ms", show: "ms", default: 2, positive: true, when: v => v.mode === "vel" },
    { key: "D", label: tr("관 안지름 D", "Pipe inside diameter D"), dim: "length", unit: "m", show: "mm", default: 100, positive: true },
    { key: "L", label: tr("관 길이 L", "Pipe length L"), dim: "length", unit: "m", show: "m", default: 100, positive: true },
    { key: "eps", term: "roughness", label: tr("절대 조도 ε", "Absolute roughness ε"), dim: "length", unit: "m", show: "mm", default: 0.046, min: 0, hint: tr("상용 강관 0.046 mm (Moody 1944)", "Commercial steel 0.046 mm (Moody 1944)") },
    { key: "rho", term: "density", label: tr("밀도 ρ", "Density ρ"), dim: "density", unit: "kgm3", show: "kgm3", default: 998.2, positive: true },
    { key: "mu", term: "viscosity", label: tr("점도 μ", "Viscosity μ"), dim: "viscosity", unit: "Pas", show: "cP", default: 1.002, positive: true },
    { key: "method", term: "friction_factor", type: "choice", label: tr("난류 마찰계수", "Turbulent friction factor"), default: "colebrook",
      options: [{ v: "colebrook", label: tr("Colebrook (반복 풀이)", "Colebrook (iterative)") }, { v: "swamee", label: tr("Swamee–Jain (명시식)", "Swamee–Jain (explicit)") }] },
  ],
  outputs: [
    { key: "dp", term: "pressure_drop", label: tr("압력손실 ΔP", "Pressure drop ΔP"), dim: "pressure", unit: "Pa", show: "kPa" },
    { key: "hf", term: "head_loss", label: tr("손실 수두 h_f", "Head loss h_f"), dim: "length", unit: "m", show: "m" },
    { key: "f", term: "friction_factor", label: tr("Darcy 마찰계수 f", "Darcy friction factor f"), unit: "—" },
    { key: "Re", term: "reynolds", label: tr("레이놀즈 수 Re", "Reynolds number Re"), unit: "—" },
    { key: "regime", term: "flow_regime", label: tr("흐름", "Flow regime"), type: "text" },
    { key: "vel", label: tr("평균 유속 v", "Mean velocity v"), dim: "velocity", unit: "ms", show: "ms" },
  ],
  compute(v) {
    const vel = v.mode === "flow" ? v.Q / (Math.PI * v.D * v.D / 4) : v.v;
    const { Re, rr, regime, f, dp } = calcPipeDpAt(v, vel);
    const warnings = [];
    if (regime !== "laminar") {
      if (regime === "transition") warnings.push(tr("천이 영역(Re 2100–4000)입니다. 마찰계수가 불확실하므로 결과를 참고로만 씁니다.", "Flow is in the transition region (Re 2100–4000). The friction factor is uncertain, so treat the result as indicative only."));
      if (v.method === "swamee" && (Re < 5000 || Re > 1e8 || rr > 1e-2 || (rr > 0 && rr < 1e-6)))
        warnings.push(tr("Swamee–Jain 식의 적용 범위(5000 ≤ Re ≤ 10⁸, 10⁻⁶ ≤ ε/D ≤ 10⁻²) 밖입니다. Colebrook 을 쓰십시오.", "Outside the Swamee–Jain range (5000 ≤ Re ≤ 10⁸, 10⁻⁶ ≤ ε/D ≤ 10⁻²). Use Colebrook instead."));
    }
    if (rr > 0.05) warnings.push(tr("상대 조도 ε/D 가 0.05 를 넘습니다. Moody 선도 범위 밖입니다.", "Relative roughness ε/D exceeds 0.05, beyond the range of the Moody chart."));
    return { dp, hf: dp / (v.rho * CALC_CONST.g), f, Re, regime: CALC_REGIME_TEXT[regime], vel, warnings };
  },
  chart: calcPipeDpChart,
  formula: [
    "ΔP = f · (L / D) · ρ v² / 2,   h_f = ΔP / (ρ g)",
    tr("층류: f = 64 / Re", "Laminar: f = 64 / Re"),
    "Colebrook: 1/√f = −2 log₁₀( ε/(3.7 D) + 2.51 / (Re √f) )",
    "Swamee–Jain: f = 0.25 / [ log₁₀( ε/(3.7 D) + 5.74 / Re^0.9 ) ]²",
  ],
  notes: [
    tr("f 는 Darcy 마찰계수입니다(Fanning 마찰계수의 4배).", "f is the Darcy friction factor (4 × the Fanning friction factor)."),
    tr("비압축성·완전 발달 흐름의 직관부 손실만 셉니다. 밸브·엘보 등 부속 손실은 따로 더합니다. 기체는 ΔP 가 입구 압력의 10 % 를 넘으면 압축성 식을 씁니다.", "Covers straight-pipe loss for incompressible, fully developed flow only. Add fitting losses (valves, elbows, etc.) separately. For gases, use compressible-flow equations if ΔP exceeds 10 % of the inlet pressure."),
  ],
  reference: [
    "Colebrook, C.F. (1939). Turbulent flow in pipes, with particular reference to the transition region between the smooth and rough pipe laws. J. Inst. Civil Eng. 11(4), 133–156.",
    "Swamee, P.K. & Jain, A.K. (1976). Explicit equations for pipe-flow problems. J. Hydraulics Div. ASCE 102(HY5), 657–664.",
    tr("Moody, L.F. (1944). Friction factors for pipe flow. Trans. ASME 66, 671–684. — 상용 강관 ε = 0.00015 ft", "Moody, L.F. (1944). Friction factors for pipe flow. Trans. ASME 66, 671–684. — commercial steel ε = 0.00015 ft"),
    tr("Perry's Chemical Engineers' Handbook, 8판(2008), 6절 유체와 입자 역학 — Darcy–Weisbach 식", "Perry's Chemical Engineers' Handbook, 8th ed. (2008), Sec. 6 Fluid and Particle Dynamics — Darcy–Weisbach equation"),
  ],
};

Object.assign(window, { CALC_DEF_PIPE_DP, calcFrictionSwameeJain, calcFrictionColebrook, calcPipeDpAt, calcPipeDpChart });
