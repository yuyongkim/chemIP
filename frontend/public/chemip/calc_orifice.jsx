// 계산기: 오리피스 유량계(비압축성 액체) — Q = C·A₀·√(2ΔP / (ρ(1 − β⁴))), 영구 압력손실(ISO 5167-2).

// ISO 5167-2 식 (영구 압력손실 Δϖ / ΔP)
function calcOrificeLossRatio(beta, C) {
  const s = Math.sqrt(1 - Math.pow(beta, 4) * (1 - C * C));
  return (s - C * beta * beta) / (s + C * beta * beta);
}

const CALC_DEF_ORIFICE = {
  key: "orifice",
  group: "fluid",
  title: tr("오리피스 유량계", "Orifice flow meter"),
  summary: tr("오리피스 전후 차압으로 액체 유량을 구하거나, 유량에서 차압을 구합니다. 영구 압력손실도 함께 냅니다.",
    "Computes liquid flow rate from the differential pressure across an orifice, or the differential pressure from a flow rate. Also gives the permanent pressure loss."),
  inputs: [
    { key: "mode", type: "choice", label: tr("구할 값", "Solve for"), default: "Q",
      options: [{ v: "Q", label: tr("차압 → 유량", "ΔP → flow") }, { v: "dp", label: tr("유량 → 차압", "Flow → ΔP") }] },
    { key: "D", label: tr("관 안지름 D", "Pipe inside diameter D"), dim: "length", unit: "m", show: "mm", default: 100, positive: true },
    { key: "d", label: tr("오리피스 구멍 지름 d", "Orifice bore diameter d"), dim: "length", unit: "m", show: "mm", default: 50, positive: true },
    { key: "C", label: tr("유출 계수 C", "Discharge coefficient C"), term: "discharge_coefficient", unit: "—", default: 0.61, positive: true, max: 1, hint: tr("날카로운 모서리 오리피스 약 0.60–0.61", "About 0.60–0.61 for a sharp-edged orifice") },
    { key: "rho", label: tr("밀도 ρ", "Density ρ"), term: "density", dim: "density", unit: "kgm3", show: "kgm3", default: 998.2, positive: true },
    { key: "dp", label: tr("차압 ΔP", "Differential pressure ΔP"), term: "pressure_drop", dim: "pressure", unit: "Pa", show: "kPa", default: 25, positive: true, when: c => c.mode === "Q" },
    { key: "Q", label: tr("부피 유량 Q", "Volumetric flow rate Q"), dim: "flow", unit: "m3s", show: "m3h", default: 30, positive: true, when: c => c.mode === "dp" },
    { key: "mu", label: tr("점도 μ (선택)", "Viscosity μ (optional)"), term: "viscosity", dim: "viscosity", unit: "Pas", show: "cP", default: 1.002, optional: true, positive: true },
  ],
  outputs: [
    { key: "Q_out", label: tr("부피 유량 Q", "Volumetric flow rate Q"), dim: "flow", unit: "m3s", show: "m3h" },
    { key: "dp_out", label: tr("차압 ΔP", "Differential pressure ΔP"), term: "pressure_drop", dim: "pressure", unit: "Pa", show: "kPa" },
    { key: "beta", label: tr("지름비 β = d/D", "Diameter ratio β = d/D"), term: "beta_ratio", unit: "—", digits: 4 },
    { key: "loss", label: tr("영구 압력손실", "Permanent pressure loss"), term: "permanent_loss", dim: "pressure", unit: "Pa", show: "kPa" },
    { key: "Re", label: tr("관 레이놀즈 수 Re_D", "Pipe Reynolds number Re_D"), term: "reynolds", unit: "—" },
  ],
  compute(v) {
    const beta = v.d / v.D;
    if (beta >= 1) return { error: tr("구멍 지름이 관 안지름보다 작아야 합니다.", "The bore diameter must be smaller than the pipe inside diameter.") };
    const A0 = Math.PI * v.d * v.d / 4;
    const k = v.C * A0 * Math.sqrt(2 / (v.rho * (1 - Math.pow(beta, 4))));   // Q = k √ΔP
    const Q = v.mode === "Q" ? k * Math.sqrt(v.dp) : v.Q;
    const dp = v.mode === "Q" ? v.dp : Math.pow(v.Q / k, 2);
    const warnings = [];
    if (beta < 0.1 || beta > 0.75) warnings.push(tr("ISO 5167-2 의 적용 범위(0.1 ≤ β ≤ 0.75) 밖입니다.", "Outside the ISO 5167-2 range of application (0.1 ≤ β ≤ 0.75)."));
    const Re = v.mu ? v.rho * (Q / (Math.PI * v.D * v.D / 4)) * v.D / v.mu : undefined;
    if (Re != null && Re < 5000) warnings.push(tr("Re_D 가 5000 미만입니다. 유출 계수가 크게 달라지므로 표준 값(0.6 안팎)을 쓸 수 없습니다.",
      "Re_D is below 5000. The discharge coefficient changes considerably, so the standard value (about 0.6) cannot be used."));
    return {
      Q_out: v.mode === "dp" ? undefined : Q, dp_out: v.mode === "Q" ? undefined : dp,
      beta, loss: dp * calcOrificeLossRatio(beta, v.C), Re, warnings,
    };
  },
  formula: [
    "Q = C · (π d² / 4) · √( 2 ΔP / (ρ (1 − β⁴)) ),   β = d / D",
    "ΔP = ρ (1 − β⁴) / 2 · ( Q / (C · π d²/4) )²",
    tr("영구 압력손실 Δϖ = ΔP · (√(1 − β⁴(1 − C²)) − C β²) / (√(1 − β⁴(1 − C²)) + C β²)",
      "Permanent pressure loss Δϖ = ΔP · (√(1 − β⁴(1 − C²)) − C β²) / (√(1 − β⁴(1 − C²)) + C β²)"),
  ],
  notes: [
    tr("액체(비압축성) 기준입니다. 기체는 팽창 계수 ε 를 곱해야 하므로 ΔP 가 입구 압력의 수 % 를 넘으면 이 계산기를 쓰지 않습니다.",
      "For incompressible liquids. Gases need the expansibility factor ε, so do not use this calculator when ΔP exceeds a few percent of the inlet pressure."),
    tr("C 는 β·Re·탭 위치(플랜지·코너·D–D/2)에 따라 바뀝니다. 정밀한 값은 ISO 5167-2 의 Reader-Harris/Gallagher 식이나 제조사 계산서를 씁니다.",
      "C varies with β, Re and tap location (flange, corner, D–D/2). For accurate values use the Reader-Harris/Gallagher equation in ISO 5167-2 or the manufacturer's sizing sheet."),
    tr("앞뒤 직관부가 ISO 5167-2 의 요건만큼 길어야 표준 C 를 쓸 수 있습니다.",
      "The standard C applies only if the upstream and downstream straight lengths meet ISO 5167-2 requirements."),
  ],
  reference: [
    tr("ISO 5167-1:2022 / ISO 5167-2:2022, Measurement of fluid flow by means of pressure differential devices — 유량 식, 적용 범위, 영구 압력손실 식",
      "ISO 5167-1:2022 / ISO 5167-2:2022, Measurement of fluid flow by means of pressure differential devices — flow equation, range of application, permanent pressure loss equation"),
    tr("McCabe, Smith & Harriott, Unit Operations of Chemical Engineering 7판(2005), 8장 유량 측정 — 오리피스 계수 약 0.61",
      "McCabe, Smith & Harriott, Unit Operations of Chemical Engineering, 7th ed. (2005), Ch. 8 Metering of Fluids — orifice coefficient about 0.61"),
  ],
};

Object.assign(window, { CALC_DEF_ORIFICE, calcOrificeLossRatio });
