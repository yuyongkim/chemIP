// 계산기: 원관 레이놀즈 수 Re = ρvD/μ 와 흐름 구분.

const CALC_REGIME_TEXT = { laminar: tr("층류", "Laminar"), transition: tr("천이 영역", "Transition region"), turbulent: tr("난류", "Turbulent") };

const CALC_DEF_REYNOLDS = {
  key: "reynolds",
  group: "fluid",
  title: tr("레이놀즈 수", "Reynolds number"),
  summary: tr("원관 속 흐름의 레이놀즈 수를 구해 층류·천이·난류를 가립니다.", "Computes the Reynolds number for flow in a circular pipe and classifies the flow as laminar, transitional or turbulent."),
  inputs: [
    { key: "rho", term: "density", label: tr("밀도 ρ", "Density ρ"), dim: "density", unit: "kgm3", show: "kgm3", default: 998.2, positive: true, hint: tr("기본값은 20 °C 물", "Default: water at 20 °C") },
    { key: "v", term: "mean_velocity", label: tr("평균 유속 v", "Mean velocity v"), dim: "velocity", unit: "ms", show: "ms", default: 1, positive: true },
    { key: "D", label: tr("관 안지름 D", "Pipe inside diameter D"), dim: "length", unit: "m", show: "mm", default: 50, positive: true },
    { key: "mu", term: "viscosity", label: tr("점도 μ", "Viscosity μ"), dim: "viscosity", unit: "Pas", show: "cP", default: 1.002, positive: true },
  ],
  outputs: [
    { key: "Re", term: "reynolds", label: tr("레이놀즈 수 Re", "Reynolds number Re"), unit: "—" },
    { key: "regime", term: "flow_regime", label: tr("흐름", "Flow regime"), type: "text" },
  ],
  compute(v) {
    const Re = calcReynolds(v.rho, v.v, v.D, v.mu);
    return { Re, regime: CALC_REGIME_TEXT[calcFlowRegime(Re)] };
  },
  formula: ["Re = ρ · v · D / μ", tr("층류 Re < 2100, 천이 2100–4000, 난류 Re > 4000", "Laminar Re < 2100, transition 2100–4000, turbulent Re > 4000")],
  notes: [tr("원형 단면 기준입니다. 원형이 아니면 D 대신 수력 지름 4 × 단면적 / 젖은 둘레를 넣습니다.", "Assumes a circular cross-section. For other shapes enter the hydraulic diameter, 4 × flow area / wetted perimeter, as D.")],
  reference: [
    "Reynolds, O. (1883). An experimental investigation of the circumstances which determine whether the motion of water shall be direct or sinuous. Phil. Trans. R. Soc. 174, 935–982.",
    tr("McCabe, W.L., Smith, J.C. & Harriott, P., Unit Operations of Chemical Engineering, 7판(2005) — 층류·난류 구분 Re ≈ 2100 / 4000", "McCabe, W.L., Smith, J.C. & Harriott, P., Unit Operations of Chemical Engineering, 7th ed. (2005) — laminar/turbulent limits Re ≈ 2100 / 4000"),
  ],
};

Object.assign(window, { CALC_DEF_REYNOLDS, CALC_REGIME_TEXT });
