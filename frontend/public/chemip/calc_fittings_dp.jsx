// 계산기: 피팅·밸브 손실 + 직관 손실 — 손실계수 K 직접(표), 2-K 법(Hooper 1981), 3-K 법(Darby). 그래프는 대화형 Moody 선도.
// 계수 자료: calc_fittings_data.jsx. 마찰계수: calc_sizing_common.jsx(calcDarcyF).

const CALC_IN_PER_M = 1 / 0.0254;
const CALC_MOODY_RR = [0, 1e-4, 1e-3, 1e-2, 0.05];

// 2-K: K = K1/Re + K∞·(1 + 1/D[in])   (D = 안지름, 인치)
function calcK2(c, Re, Din) {
  return c[0] / Re + c[1] * (1 + 1 / Din);
}
// 3-K: K = K1/Re + Ki·(1 + Kd/D^0.3)   (D = 호칭 지름, 인치)
function calcK3(c, Re, Dn) {
  return c[0] / Re + c[1] * (1 + c[2] / Math.pow(Dn, 0.3));
}

const calcFitIsCount = v => v.method === "2k" || v.method === "3k";

const CALC_DEF_FITTINGS_DP = {
  key: "fittings_dp",
  group: "sizing",
  title: tr("피팅 손실 (K · 2-K · 3-K) · Moody 선도", "Fitting losses (K · 2-K · 3-K) · Moody chart"),
  summary: tr("엘보·티·밸브·입출구의 손실계수와 직관 마찰을 더해 배관 한 줄의 압력손실을 구합니다. 2-K·3-K 법은 레이놀즈 수와 관경에 따라 K 가 달라집니다. 운전점을 Moody 선도 위에 보여 줍니다.",
    "Adds fitting, valve and entrance/exit losses to straight-pipe friction for one pipe run. With the 2-K and 3-K methods K depends on the Reynolds number and pipe size. The operating point is shown on a Moody chart."),
  inputs: [
    { key: "Q", label: tr("부피 유량 Q", "Volumetric flow Q"), dim: "flow", unit: "m3s", show: "m3h", default: 50, positive: true },
    { key: "D", label: tr("관 안지름 D", "Pipe inside diameter D"), dim: "length", unit: "m", show: "mm", default: 102.3, positive: true },
    { key: "L", label: tr("직관 길이 L", "Straight pipe length L"), dim: "length", unit: "m", show: "m", default: 50, min: 0 },
    { key: "eps", term: "roughness", label: tr("절대 조도 ε", "Absolute roughness ε"), dim: "length", unit: "m", show: "mm", default: 0.046, min: 0 },
    { key: "rho", term: "density", label: tr("밀도 ρ", "Density ρ"), dim: "density", unit: "kgm3", show: "kgm3", default: 998.2, positive: true },
    { key: "mu", term: "viscosity", label: tr("점도 μ", "Viscosity μ"), dim: "viscosity", unit: "Pas", show: "cP", default: 1.002, positive: true },
    { key: "method", type: "choice", term: "loss_coefficient", label: tr("피팅 손실 방법", "Fitting-loss method"), default: "3k",
      options: [{ v: "3k", label: tr("3-K (Darby)", "3-K (Darby)") }, { v: "2k", label: tr("2-K (Hooper)", "2-K (Hooper)") }, { v: "k", label: tr("K 직접 입력", "Enter K directly") }] },
    { key: "NPS", label: tr("호칭 지름 NPS (3-K)", "Nominal pipe size NPS (3-K)"), unit: "in", default: "", positive: true, optional: true, when: v => v.method === "3k",
      hint: tr("비우면 안지름을 인치로 바꿔 씁니다.", "Leave blank to use the inside diameter in inches.") },
    ...CALC_FITTINGS.map((f, i) => ({ key: `n_${f.key}`, label: f.label, unit: tr("개", "pcs"), default: [4, 0, 0, 1, 0, 2, 0, 1, 1][i] ?? 0, min: 0, when: calcFitIsCount })),
    { key: "n_entrance", label: tr("관 입구 (날카로운 모서리, K = 0.5)", "Pipe entrance (sharp-edged, K = 0.5)"), unit: tr("개", "pcs"), default: 1, min: 0, when: calcFitIsCount },
    { key: "n_exit", label: tr("관 출구 (K = 1.0)", "Pipe exit (K = 1.0)"), unit: tr("개", "pcs"), default: 1, min: 0, when: calcFitIsCount },
    { key: "Kx", term: "loss_coefficient", label: tr("그 밖의 K 합", "Other K (sum)"), unit: "—", default: 0, min: 0, when: calcFitIsCount },
    { key: "krows", type: "table", term: "loss_coefficient", label: tr("부속별 K", "K by fitting"), minRows: 1, maxRows: 15, when: v => v.method === "k",
      columns: [
        { key: "name", label: tr("부속", "Fitting"), text: true, optional: true },
        { key: "n", label: tr("개수", "Count"), unit: tr("개", "pcs"), min: 0 },
        { key: "K", term: "loss_coefficient", label: "K", unit: "—", min: 0 },
      ],
      rows: [{ name: tr("90° 엘보", "90° elbow"), n: 4, K: 0.3 }, { name: tr("게이트 밸브", "Gate valve"), n: 2, K: 0.15 }, { name: tr("입구", "Entrance"), n: 1, K: 0.5 }, { name: tr("출구", "Exit"), n: 1, K: 1 }],
      hint: tr("기본 행의 K 는 예시입니다. 쓰는 자료(제조사·교재)의 값으로 바꾸십시오.", "The default K values are placeholders. Replace them with values from your own source (vendor or textbook).") },
  ],
  outputs: [
    { key: "dp", term: "pressure_drop", label: tr("전체 압력손실 ΔP", "Total pressure drop ΔP"), dim: "pressure", unit: "Pa", show: "kPa" },
    { key: "h", term: "head_loss", label: tr("전체 손실 수두", "Total head loss"), dim: "length", unit: "m", show: "m" },
    { key: "dpFit", label: tr("피팅 손실 ΔP_fit", "Fitting loss ΔP_fit"), dim: "pressure", unit: "Pa", show: "kPa" },
    { key: "dpPipe", label: tr("직관 손실 ΔP_pipe", "Straight-pipe loss ΔP_pipe"), dim: "pressure", unit: "Pa", show: "kPa" },
    { key: "Ksum", term: "loss_coefficient", label: tr("손실계수 합 ΣK", "Sum of loss coefficients ΣK"), unit: "—" },
    { key: "Leq", label: tr("피팅의 상당 길이 ΣK·D/f", "Equivalent length of fittings ΣK·D/f"), dim: "length", unit: "m", show: "m" },
    { key: "f", term: "friction_factor", label: tr("Darcy 마찰계수 f", "Darcy friction factor f"), unit: "—" },
    { key: "Re", term: "reynolds", label: tr("레이놀즈 수 Re", "Reynolds number Re"), unit: "—" },
    { key: "regime", term: "flow_regime", label: tr("흐름", "Flow regime"), type: "text" },
    { key: "vel", term: "mean_velocity", label: tr("평균 유속 v", "Mean velocity v"), dim: "velocity", unit: "ms", show: "ms" },
  ],
  compute(v) {
    const A = Math.PI * v.D * v.D / 4;
    const vel = v.Q / A;
    const Re = calcReynolds(v.rho, vel, v.D, v.mu);
    const rr = v.eps / v.D;
    const f = calcDarcyF(Re, rr);
    const warnings = [];
    let Ksum = 0;
    if (calcFitIsCount(v)) {
      const counts = CALC_FITTINGS.map(fi => v[`n_${fi.key}`]).concat([v.n_entrance, v.n_exit]);
      if (counts.some(n => !Number.isInteger(n))) return { error: tr("부속 개수는 정수여야 합니다.", "Fitting counts must be integers.") };
      const Din = v.D * CALC_IN_PER_M;
      const Dn = v.NPS || Din;
      for (const fi of CALC_FITTINGS) {
        const n = v[`n_${fi.key}`];
        if (n) Ksum += n * (v.method === "2k" ? calcK2(fi.hooper, Re, Din) : calcK3(fi.darby, Re, Dn));
      }
      Ksum += v.n_entrance * CALC_FITTING_ENDS.entrance + v.n_exit * CALC_FITTING_ENDS.exit + v.Kx;
    } else {
      Ksum = (v.krows || []).reduce((s, r) => s + (r.n || 0) * (r.K || 0), 0);
    }
    const dyn = v.rho * vel * vel / 2;
    const dpFit = Ksum * dyn;
    const dpPipe = f * v.L / v.D * dyn;
    const regime = calcFlowRegime(Re);
    if (regime === "transition") warnings.push(tr("천이 영역(Re 2100–4000)입니다. 마찰계수가 불확실합니다.", "Flow is in the transition region (Re 2100–4000); the friction factor is uncertain."));
    if (v.method !== "k" && Re < 1000) warnings.push(tr("Re 가 1000 미만입니다. 2-K·3-K 계수는 주로 난류·천이 자료로 맞춘 값이라 오차가 큽니다.", "Re is below 1000. The 2-K and 3-K coefficients were fitted mainly to turbulent and transitional data, so errors are large."));
    return {
      dp: dpFit + dpPipe, h: (dpFit + dpPipe) / (v.rho * CALC_CONST.g), dpFit, dpPipe, Ksum,
      Leq: Ksum * v.D / f, f, Re, regime: CALC_REGIME_TEXT[regime], vel, warnings,
    };
  },
  chart(v, o) {
    const res = calcLogspace(1e3, 1e8, 61);
    const lam = calcLogspace(600, 4000, 12).map(r => [r, 64 / r]);
    const series = [{ key: "lam", label: tr("층류 64/Re", "Laminar 64/Re"), points: lam }];
    for (const rr of CALC_MOODY_RR) {
      series.push({
        key: `rr${rr}`, label: rr === 0 ? tr("매끈한 관", "Smooth pipe") : `ε/D = ${rr}`, dashed: rr === 0,
        points: res.filter(r => r >= 2100).map(r => [r, calcFrictionColebrook(r, rr)]),
      });
    }
    return {
      x: { label: tr("레이놀즈 수 Re", "Reynolds number Re"), unit: "—", log: true, min: 600, max: 1e8 },
      y: { label: tr("Darcy 마찰계수 f", "Darcy friction factor f"), unit: "—", log: true, min: 0.006, max: 0.11 },
      series,
      markers: [{ x: o.Re, y: o.f, label: `ε/D = ${calcFormatNumber(v.eps / v.D, 2)}` }],
      vlines: [{ x: CALC_RE_LAMINAR, label: "Re 2100" }],
      ariaLabel: tr("Moody 선도와 현재 운전점", "Moody chart with the current operating point"),
    };
  },
  formula: [
    "ΔP = (f·L/D + ΣK)·ρv²/2,   h = ΔP/(ρg)",
    "2-K (Hooper): K = K₁/Re + K∞·(1 + 1/D)   — D: " + tr("안지름 [in]", "inside diameter [in]"),
    "3-K (Darby): K = K₁/Re + K_i·(1 + K_d/D^0.3)   — D: " + tr("호칭 지름 [in]", "nominal size [in]"),
    tr("입구 K = 0.5, 출구 K = 1.0 (Re 무관)", "Entrance K = 0.5, exit K = 1.0 (independent of Re)"),
    tr("마찰계수: 층류 64/Re, 그 밖은 Colebrook", "Friction factor: 64/Re when laminar, Colebrook otherwise"),
  ],
  notes: [
    tr("2-K 와 3-K 는 같은 부속이라도 근거 자료가 달라 값이 다릅니다(예: 티 분기). 볼 밸브는 2-K 가 축소 트림(β = 0.9), 3-K 가 전구경(β = 1) 계수입니다.",
      "The 2-K and 3-K methods use different data sets, so the same fitting can give different values (for example the branch tee). For ball valves the 2-K coefficients are for reduced trim (β = 0.9) and the 3-K ones for full bore (β = 1)."),
    tr("비압축성 한 관경 배관만 다룹니다. 기체는 ΔP 가 입구 압력의 10 % 를 넘으면 압축성 식을 쓰십시오. 감속관·확대관은 'K 직접 입력'이나 '그 밖의 K' 로 더하십시오.",
      "Covers incompressible flow in a single pipe size only. For gases use compressible-flow equations if ΔP exceeds 10 % of the inlet pressure. Add reducers or expanders through 'Enter K directly' or 'Other K'."),
  ],
  reference: [
    "Hooper, W.B. (1981). The 2-K method predicts head losses in pipe fittings. Chemical Engineering, Aug. 24, 1981, p. 97.",
    "Silverberg, P. & Darby, R. (1999). Correlate pressure drops through fittings: three constants accurately calculate flow through elbows, valves and tees. Chemical Engineering 106(7), 101.",
    "Darby, R. (2001). Chemical Engineering Fluid Mechanics, 2nd ed. Marcel Dekker — 3-K method.",
    "Moody, L.F. (1944). Friction factors for pipe flow. Trans. ASME 66, 671–684.",
    tr("Bell, C. fluids — fluids.fittings.Hooper2K·Darby3K (MIT), 계수 대조", "Bell, C. fluids — fluids.fittings.Hooper2K and Darby3K (MIT), coefficient cross-check"),
  ],
};

Object.assign(window, { CALC_DEF_FITTINGS_DP, calcK2, calcK3 });
