// 계산기: 희석 환기 필요 풍량 Q = G·K / C (정상상태, 증기 발생량 G 를 목표 농도 C 로 묽힌다).

const CALC_DEF_VENTILATION = {
  key: "ventilation",
  group: "safety",
  title: tr("희석 환기 필요 풍량", "Dilution ventilation airflow"),
  summary: tr("실내에서 증기가 일정하게 생길 때, 농도를 목표값 아래로 유지하는 데 필요한 환기량을 구합니다(정상상태).",
    "For a steady vapour release indoors, calculates the ventilation rate needed to keep the concentration below a target value (steady state)."),
  inputs: [
    { key: "G", term: "generation_rate", label: tr("증기 발생량", "Vapour generation rate"), dim: "massflow", unit: "kgs", show: "kgh", default: 1, positive: true, hint: tr("공기 중으로 나오는 증기의 질량 유량", "Mass flow of vapour released into the air") },
    { key: "C", term: "ppm", label: tr("목표 농도", "Target concentration"), unit: "ppm", default: 50, positive: true },
    { key: "mw", term: "molar_mass", label: tr("분자량", "Molecular weight"), unit: "g/mol", default: 92.14, positive: true },
    { key: "K", term: "mixing_factor", label: tr("혼합 계수 K", "Mixing factor K"), unit: "—", default: 3, min: 1, max: 10, hint: tr("1 = 완전 혼합, 보통 3–10", "1 = perfect mixing, typically 3–10") },
    { key: "T", label: tr("실내 온도", "Room temperature"), dim: "temperature", unit: "K", show: "C", default: 25, positive: true },
    { key: "P", label: tr("실내 압력", "Room pressure"), dim: "pressure", unit: "Pa", show: "atm", default: 1, positive: true },
    { key: "V", label: tr("실내 부피 (선택)", "Room volume (optional)"), dim: "volume", unit: "m3", show: "m3", default: "", optional: true, positive: true },
  ],
  outputs: [
    { key: "Q", term: "ventilation_rate", label: tr("필요 환기량 Q", "Required ventilation rate Q"), dim: "flow", unit: "m3s", show: "m3min" },
    { key: "Cmg", label: tr("목표 농도 (질량)", "Target concentration (mass)"), unit: "mg/m³" },
    { key: "ach", term: "ach", label: tr("시간당 환기 횟수", "Air changes per hour"), unit: tr("회/h", "1/h"), digits: 3 },
  ],
  compute(v) {
    const vm = calcMolarVolumeL(v.T, v.P);
    const Cmg = calcPpmToMgm3(v.C, v.mw, vm);       // mg/m³
    const Q = v.G * 1e6 * v.K / Cmg;                 // (mg/s)·K / (mg/m³) = m³/s
    return { Q, Cmg, ach: v.V ? Q * 3600 / v.V : undefined };
  },
  formula: [
    "Q = G · K / C",
    "C[mg/m³] = ppm × M / Vm,  Vm = R·T / P",
    tr("같은 식의 야드파운드 판(ACGIH): Q[cfm] = 403 × 10⁶ × SG × ER × K / (M × C[ppm]), ER 은 액체 증발량[pint/min], 21 °C 기준",
      "Same equation in US customary units (ACGIH): Q[cfm] = 403 × 10⁶ × SG × ER × K / (M × C[ppm]), ER = liquid evaporation rate [pint/min], at 21 °C"),
  ],
  notes: [
    tr("K 는 ACGIH 의 혼합·안전 계수입니다. Crowl & Louvar 의 k(0.1–0.5)는 1/K 와 같습니다.",
      "K is the ACGIH mixing (safety) factor. The k (0.1–0.5) of Crowl & Louvar equals 1/K."),
    tr("희석 환기는 독성이 낮고 발생원이 넓게 퍼진 경우에 씁니다. 발생원이 한 곳이면 국소배기가 우선입니다(ACGIH).",
      "Dilution ventilation suits low-toxicity contaminants from widely dispersed sources. For a single point source, local exhaust ventilation comes first (ACGIH)."),
    tr("결과 풍량은 입력한 실내 온도·압력 상태의 부피 유량입니다.",
      "The resulting airflow is the volumetric flow at the room temperature and pressure entered."),
  ],
  reference: [
    tr("ACGIH, Industrial Ventilation: A Manual of Recommended Practice for Design — 희석 환기 장, Q = 403×10⁶·SG·ER·K / (M·C)",
      "ACGIH, Industrial Ventilation: A Manual of Recommended Practice for Design — dilution ventilation chapter, Q = 403×10⁶·SG·ER·K / (M·C)"),
    tr("Crowl & Louvar, Chemical Process Safety 3판(2011), 3장 산업위생 — 희석 환기 정상상태 식(비이상 혼합 계수 k)",
      "Crowl & Louvar, Chemical Process Safety, 3rd ed. (2011), Ch. 3 Industrial Hygiene — steady-state dilution ventilation equation (nonideal mixing factor k)"),
  ],
};

Object.assign(window, { CALC_DEF_VENTILATION });
