// 계산기: 물의 포화 압력 ↔ 포화 온도(증기표 포화선) — IAPWS-IF97 4영역. 함수는 calc_physics.jsx.

const CALC_DEF_WATER_SAT = {
  key: "water_sat",
  group: "chem",
  title: tr("물 포화 압력 · 끓는점 (IAPWS-IF97)", "Water saturation pressure · boiling point (IAPWS-IF97)"),
  summary: tr("증기표 포화선 값입니다. 물의 온도에서 포화 증기압을, 또는 압력에서 끓는 온도(포화 온도)를 구합니다.", "Steam-table saturation line. Gives the saturation pressure of water from temperature, or the boiling (saturation) temperature from pressure."),
  inputs: [
    { key: "mode", type: "choice", label: tr("구할 값", "Solve for"), default: "P",
      options: [{ v: "P", label: tr("온도 → 포화 압력", "Temperature → saturation pressure") }, { v: "T", label: tr("압력 → 포화 온도", "Pressure → saturation temperature") }] },
    { key: "T", label: tr("온도", "Temperature"), dim: "temperature", unit: "K", show: "C", default: 100, min: CALC_IF97_RANGE.Tmin, max: CALC_IF97_RANGE.Tmax, when: c => c.mode === "P" },
    { key: "P", label: tr("압력 (절대)", "Pressure (absolute)"), term: "absolute_pressure", dim: "pressure", unit: "Pa", show: "kPa", default: 101.325, min: CALC_IF97_RANGE.Pmin, max: CALC_IF97_RANGE.Pmax, when: c => c.mode === "T" },
  ],
  outputs: [
    { key: "Psat", label: tr("포화 압력", "Saturation pressure"), term: "saturation", dim: "pressure", unit: "Pa", show: "kPa", digits: 6 },
    { key: "Tsat", label: tr("포화 온도 (끓는점)", "Saturation temperature (boiling point)"), term: "saturation", dim: "temperature", unit: "K", show: "C", digits: 6 },
  ],
  compute(v) {
    return v.mode === "P" ? { Psat: calcWaterPsat(v.T) } : { Tsat: calcWaterTsat(v.P) };
  },
  formula: [
    tr("IAPWS-IF97 포화선(4영역): β² ϑ² + n₁β² ϑ + n₂β² + n₃β ϑ² + n₄β ϑ + n₅β + n₆ϑ² + n₇ϑ + n₈ = 0", "IAPWS-IF97 saturation line (Region 4): β² ϑ² + n₁β² ϑ + n₂β² + n₃β ϑ² + n₄β ϑ + n₅β + n₆ϑ² + n₇ϑ + n₈ = 0"),
    "β = (P_sat / 1 MPa)^¼,  ϑ = T/1 K + n₉ / (T/1 K − n₁₀)",
    tr("적용 범위 273.15 K – 647.096 K (임계점 22.064 MPa)", "Valid range 273.15 K – 647.096 K (critical point 22.064 MPa)"),
  ],
  notes: [
    tr("포화 액체·증기의 엔탈피·엔트로피·비체적은 '증기표 (IAPWS-IF97)'·'포화 증기표' 계산기에서 구합니다.", "For enthalpy, entropy and specific volume of saturated liquid and vapor, use the 'Steam tables (IAPWS-IF97)' and 'Saturated steam table' calculators."),
    tr("IAPWS-IF97 검증표 값(300 K → 3.53658941 kPa, 1 MPa → 453.035632 K 등)과 유효숫자 9자리까지 같음을 시험으로 확인했습니다.", "Tests confirm agreement with the IAPWS-IF97 verification values (300 K → 3.53658941 kPa, 1 MPa → 453.035632 K, etc.) to 9 significant figures."),
  ],
  reference: [
    tr("IAPWS R7-97(2012), Revised Release on the IAPWS Industrial Formulation 1997 for the Thermodynamic Properties of Water and Steam — 8절 포화선 식 30·31, 검증표 35·36", "IAPWS R7-97(2012), Revised Release on the IAPWS Industrial Formulation 1997 for the Thermodynamic Properties of Water and Steam — Sec. 8 saturation-line Eqs. 30–31, verification Tables 35–36"),
    "Wagner, W. et al. (2000). The IAPWS Industrial Formulation 1997 for the Thermodynamic Properties of Water and Steam. J. Eng. Gas Turbines Power 122, 150–182.",
  ],
};

Object.assign(window, { CALC_DEF_WATER_SAT });
