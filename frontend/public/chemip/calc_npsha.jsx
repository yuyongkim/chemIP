// 계산기: 펌프 유효 흡입 수두 NPSHa = (P_s − P_v)/(ρg) + z_s − h_f,s (흡입 쪽 액면 기준).

const CALC_NPSH_MARGIN_MIN = 1.1;   // ANSI/HI 9.6.1 권장 최소 여유비(NPSHa / NPSH3)

const CALC_DEF_NPSHA = {
  key: "npsha",
  group: "fluid",
  title: tr("펌프 NPSHa (유효 흡입 수두)", "Pump NPSHa (net positive suction head available)"),
  summary: tr("흡입 쪽 액면 압력·증기압·높이·흡입 배관 손실로 펌프 입구의 유효 흡입 수두를 구해, 펌프가 요구하는 값(NPSHr)과 비교합니다.",
    "Computes the net positive suction head available at the pump inlet from the suction-side surface pressure, vapor pressure, elevation and suction line loss, and compares it with the pump's required value (NPSHr)."),
  inputs: [
    { key: "Ps", label: tr("액면 압력 (절대)", "Liquid surface pressure (absolute)"), term: "absolute_pressure", dim: "pressure", unit: "Pa", show: "kPa", default: 101.325, positive: true, hint: tr("대기 개방 탱크는 대기압", "Atmospheric pressure for a tank open to air") },
    { key: "Pv", label: tr("액체 온도의 증기압", "Vapor pressure at liquid temperature"), term: "vapor_pressure", dim: "pressure", unit: "Pa", show: "kPa", default: 2.339, min: 0, hint: tr("기본값은 20 °C 물 2.339 kPa", "Default is water at 20 °C, 2.339 kPa") },
    { key: "rho", label: tr("액체 밀도 ρ", "Liquid density ρ"), term: "density", dim: "density", unit: "kgm3", show: "kgm3", default: 998.2, positive: true },
    { key: "z", label: tr("액면 높이 − 펌프 중심 높이", "Liquid level − pump centerline elevation"), term: "static_head", dim: "length", unit: "m", show: "m", default: 2,
      hint: tr("펌프보다 액면이 낮으면(흡상) 음수", "Negative if the liquid level is below the pump (suction lift)") },
    { key: "hf", label: tr("흡입 배관 손실 수두 h_f", "Suction line head loss h_f"), term: "head_loss", dim: "length", unit: "m", show: "m", default: 1, min: 0 },
    { key: "npshr", label: tr("펌프 요구 NPSHr (선택)", "Pump NPSH required (optional)"), term: "npshr", dim: "length", unit: "m", show: "m", default: 3, optional: true, positive: true },
  ],
  outputs: [
    { key: "npsha", label: "NPSHa", term: "npsha", dim: "length", unit: "m", show: "m" },
    { key: "hp", label: tr("압력 수두 (P_s − P_v)/(ρg)", "Pressure head (P_s − P_v)/(ρg)"), dim: "length", unit: "m", show: "m" },
    { key: "margin", label: tr("여유 NPSHa − NPSHr", "Margin NPSHa − NPSHr"), dim: "length", unit: "m", show: "m" },
    { key: "ratio", label: tr("여유비 NPSHa / NPSHr", "Margin ratio NPSHa / NPSHr"), unit: "—", digits: 3 },
    { key: "verdict", label: tr("판정", "Assessment"), type: "text" },
  ],
  compute(v) {
    if (v.Pv >= v.Ps) return { error: tr("증기압이 액면 압력 이상입니다. 액체가 끓는 조건이라 NPSHa 가 0 이하입니다.",
      "Vapor pressure is at or above the surface pressure. The liquid is boiling, so NPSHa is zero or less.") };
    const hp = (v.Ps - v.Pv) / (v.rho * CALC_CONST.g);
    const npsha = hp + v.z - v.hf;
    const warnings = [];
    if (npsha <= 0) warnings.push(tr("NPSHa 가 0 이하입니다. 흡입 쪽에서 액체가 끓습니다(캐비테이션).",
      "NPSHa is zero or less. The liquid flashes on the suction side (cavitation)."));
    if (!v.npshr) return { npsha, hp, warnings };
    const ratio = npsha / v.npshr;
    let verdict = tr("여유 충분", "Adequate margin");
    if (npsha < v.npshr) verdict = tr("NPSHa < NPSHr — 캐비테이션 위험", "NPSHa < NPSHr — cavitation risk");
    else if (ratio < CALC_NPSH_MARGIN_MIN) verdict = tr(`여유비 ${CALC_NPSH_MARGIN_MIN} 미만 — 여유 부족`, `Margin ratio below ${CALC_NPSH_MARGIN_MIN} — insufficient margin`);
    return { npsha, hp, margin: npsha - v.npshr, ratio, verdict, warnings };
  },
  formula: [
    "NPSHa = (P_s − P_v) / (ρ g) + z_s − h_f,s",
    tr("P_s: 흡입 액면의 절대 압력,  P_v: 액체 온도의 증기압,  z_s: 액면 높이 − 펌프 중심 높이",
      "P_s: absolute pressure at the suction liquid surface,  P_v: vapor pressure at liquid temperature,  z_s: liquid level − pump centerline elevation"),
  ],
  notes: [
    tr("압력은 모두 절대 압력입니다. 증기압이 절대값이기 때문입니다.", "All pressures are absolute, because vapor pressure is an absolute value."),
    tr("최고 운전 온도(증기압이 가장 높을 때)와 최저 액면으로 검토합니다. 증기압은 Antoine 증기압·물 포화 압력 계산기로 구할 수 있습니다.",
      "Check at the maximum operating temperature (highest vapor pressure) and the lowest liquid level. Vapor pressure can be obtained from the Antoine and water saturation calculators."),
    tr("ANSI/HI 9.6.1 은 용도에 따라 여유비 NPSHa/NPSH3 를 1.1–2.5 이상으로 권합니다. 이 계산기는 1.1 미만이면 알립니다.",
      "ANSI/HI 9.6.1 recommends a margin ratio NPSHa/NPSH3 of at least 1.1–2.5 depending on the application. This calculator flags ratios below 1.1."),
  ],
  reference: [
    tr("ANSI/HI 9.6.1, Rotodynamic Pumps Guideline for NPSH Margin (Hydraulic Institute) — NPSHa 정의, 여유비 권장값",
      "ANSI/HI 9.6.1, Rotodynamic Pumps Guideline for NPSH Margin (Hydraulic Institute) — definition of NPSHa, recommended margin ratios"),
    tr("McCabe, Smith & Harriott, Unit Operations of Chemical Engineering 7판(2005), 8장 유체 수송 — 유효 흡입 수두 NPSH = (p_a − p_v)/(ρg) + Z_a − h_fs",
      "McCabe, Smith & Harriott, Unit Operations of Chemical Engineering, 7th ed. (2005), Ch. 8 Transportation of Fluids — net positive suction head NPSH = (p_a − p_v)/(ρg) + Z_a − h_fs"),
  ],
};

Object.assign(window, { CALC_DEF_NPSHA });
