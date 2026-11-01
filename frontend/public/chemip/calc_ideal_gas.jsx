// 계산기: 이상기체 상태식 PV = nRT — 네 변수 중 하나를 고른다.

const CALC_DEF_IDEAL_GAS = {
  key: "ideal_gas",
  group: "chem",
  title: tr("이상기체 상태식", "Ideal gas law"),
  summary: tr("압력·부피·몰수·온도 중 셋을 넣어 나머지 하나를 구합니다.",
    "Enter three of pressure, volume, amount of substance and temperature to solve for the fourth."),
  inputs: [
    { key: "solve", term: "ideal_gas", type: "choice", label: tr("구할 값", "Solve for"), default: "V",
      options: [{ v: "P", label: tr("압력 P", "Pressure P") }, { v: "V", label: tr("부피 V", "Volume V") }, { v: "n", label: tr("몰수 n", "Amount n") }, { v: "T", label: tr("온도 T", "Temperature T") }] },
    { key: "P", term: "absolute_pressure", label: tr("압력 P", "Pressure P"), dim: "pressure", unit: "Pa", show: "kPa", default: 101.325, positive: true, when: v => v.solve !== "P" },
    { key: "V", label: tr("부피 V", "Volume V"), dim: "volume", unit: "m3", show: "L", default: 22.414, positive: true, when: v => v.solve !== "V" },
    { key: "n", term: "mol", label: tr("몰수 n", "Amount n"), unit: "mol", default: 1, positive: true, when: v => v.solve !== "n" },
    { key: "T", term: "absolute_temperature", label: tr("온도 T", "Temperature T"), dim: "temperature", unit: "K", show: "C", default: 0, positive: true, when: v => v.solve !== "T" },
  ],
  outputs: [
    { key: "P_out", label: tr("압력 P", "Pressure P"), dim: "pressure", unit: "Pa", show: "kPa", digits: 5 },
    { key: "V_out", label: tr("부피 V", "Volume V"), dim: "volume", unit: "m3", show: "L", digits: 5 },
    { key: "n_out", label: tr("몰수 n", "Amount n"), unit: "mol", digits: 5 },
    { key: "T_out", label: tr("온도 T", "Temperature T"), dim: "temperature", unit: "K", show: "C", digits: 5 },
  ],
  compute(v) {
    const R = CALC_CONST.R;
    if (v.solve === "P") return { P_out: v.n * R * v.T / v.V };
    if (v.solve === "V") return { V_out: v.n * R * v.T / v.P };
    if (v.solve === "n") return { n_out: v.P * v.V / (R * v.T) };
    return { T_out: v.P * v.V / (v.n * R) };
  },
  formula: ["P · V = n · R · T", "R = 8.314462618 J/(mol·K)"],
  notes: [
    tr("고압이거나 임계점 가까운 저온에서는 압축인자 Z 가 1 에서 벗어나 오차가 커집니다.",
      "At high pressure, or at low temperature near the critical point, the compressibility factor Z departs from 1 and the error grows."),
    tr("기본값은 0 °C·101.325 kPa 에서 1 mol 의 부피(22.414 L)를 구하는 예시입니다.",
      "The defaults solve for the volume of 1 mol at 0 °C and 101.325 kPa (22.414 L)."),
  ],
  reference: [
    tr("Smith, J.M., Van Ness, H.C. & Abbott, M.M., Introduction to Chemical Engineering Thermodynamics, 7판(2005), 3장 순수 유체의 부피 성질",
      "Smith, J.M., Van Ness, H.C. & Abbott, M.M., Introduction to Chemical Engineering Thermodynamics, 7th ed. (2005), Ch. 3 Volumetric Properties of Pure Fluids"),
    tr("CODATA 2018 기본 상수 — 기체 상수 R = 8.314 462 618 J mol⁻¹ K⁻¹ (NIST)",
      "CODATA 2018 fundamental constants — gas constant R = 8.314 462 618 J mol⁻¹ K⁻¹ (NIST)"),
  ],
};

Object.assign(window, { CALC_DEF_IDEAL_GAS });
