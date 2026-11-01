// 계산기: 액체 웅덩이(누출·개방 용기) 증발량 Q_m = M·K·A·P_sat / (R_g·T_L) 과 환기 공간의 평균 농도(Crowl & Louvar 3장).

const CALC_EVAP_K0 = { K: 0.83e-2, M: 18.015 };   // 물의 기준 물질전달계수 0.83 cm/s (Crowl & Louvar 식 3-14 의 기준값)

const CALC_DEF_EVAPORATION = {
  key: "evaporation",
  group: "release",
  title: tr("웅덩이 증발량 · 실내 농도", "Pool evaporation · indoor concentration"),
  summary: tr("흘린 액체나 뚜껑 열린 용기에서 증기가 나오는 속도를 구하고, 환기량을 넣으면 실내 평균 농도를 어림합니다. 증기압·분자량은 MSDS 9항 값을 씁니다.",
    "Calculates the evaporation rate from a spilled liquid or an open container and, if a ventilation rate is given, estimates the average room concentration. Take vapour pressure and molecular weight from SDS Section 9."),
  inputs: [
    { key: "mw", label: tr("분자량", "Molecular weight"), term: "molar_mass", unit: "g/mol", default: 92.14, positive: true, hint: tr("기본값은 톨루엔(92.14) 예시", "Default is toluene (92.14) as an example") },
    { key: "psat", label: tr("액체 온도의 증기압", "Vapour pressure at liquid temperature"), term: "vapor_pressure", dim: "pressure", unit: "Pa", show: "kPa", default: 3.79, positive: true,
      hint: tr("톨루엔 25 °C 약 3.79 kPa (28.4 mmHg)", "Toluene at 25 °C is about 3.79 kPa (28.4 mmHg)") },
    { key: "T", label: tr("액체 온도", "Liquid temperature"), dim: "temperature", unit: "K", show: "C", default: 25, positive: true },
    { key: "A", label: tr("증발 면적", "Pool area"), dim: "area", unit: "m2", show: "m2", default: 1, positive: true },
    { key: "Qv", label: tr("환기량 (선택)", "Ventilation rate (optional)"), term: "ventilation_rate", dim: "flow", unit: "m3s", show: "m3min", default: "", optional: true, positive: true },
    { key: "Km", label: tr("혼합 계수 K (선택)", "Mixing factor K (optional)"), term: "mixing_factor", unit: "—", default: 3, min: 1, max: 10, optional: true, hint: tr("1 = 완전 혼합, 보통 3–10", "1 = perfect mixing, typically 3–10") },
    { key: "P", label: tr("실내 압력", "Room pressure"), dim: "pressure", unit: "Pa", show: "atm", default: 1, positive: true },
  ],
  outputs: [
    { key: "Qm", label: tr("증발 속도 Q_m", "Evaporation rate Q_m"), term: "evaporation_rate", dim: "massflow", unit: "kgs", show: "gmin" },
    { key: "K", label: tr("물질전달계수 K", "Mass transfer coefficient K"), term: "mass_transfer_coeff", unit: "cm/s", digits: 4 },
    { key: "Cppm", label: tr("실내 평균 농도", "Average room concentration"), term: "ppm", unit: "ppm", digits: 4 },
    { key: "Cmg", label: tr("실내 평균 농도 (질량)", "Average room concentration (mass)"), term: "mgm3", unit: "mg/m³", digits: 4 },
  ],
  compute(v) {
    const K = CALC_EVAP_K0.K * Math.cbrt(CALC_EVAP_K0.M / v.mw);            // m/s
    const Qm = (v.mw / 1000) * K * v.A * v.psat / (CALC_CONST.R * v.T);    // kg/s
    const warnings = [];
    if (v.psat > 0.1 * v.P) warnings.push(tr("증기압이 주변 압력의 10 % 를 넘습니다. 이 식은 휘발성이 낮은 액체(P_sat ≪ P)를 가정하므로 증발량을 낮게 잡을 수 있습니다.",
      "Vapour pressure exceeds 10 % of ambient pressure. This equation assumes a low-volatility liquid (P_sat ≪ P) and may underestimate evaporation."));
    if (!v.Qv) return { Qm, K: K * 100, warnings };
    const mix = v.Km || 1;
    const Cmg = Qm * 1e6 * mix / v.Qv;                                         // mg/m³
    const Cppm = calcMgm3ToPpm(Cmg, v.mw, calcMolarVolumeL(v.T, v.P));
    return { Qm, K: K * 100, Cppm, Cmg, warnings };
  },
  formula: [
    "Q_m = M · K · A · P_sat / (R_g · T_L)",
    tr("K = K₀ · (M₀ / M)^(1/3),  K₀ = 0.83 cm/s (물, M₀ = 18)", "K = K₀ · (M₀ / M)^(1/3),  K₀ = 0.83 cm/s (water, M₀ = 18)"),
    tr("실내 평균 농도 C = K_mix · Q_m / Q_v,  ppm = C[mg/m³] × R·T / (P·M)", "Average room concentration C = K_mix · Q_m / Q_v,  ppm = C[mg/m³] × R·T / (P·M)"),
  ],
  notes: [
    tr("바람이 없는 실내의 정상상태 어림식입니다. 바람·액온 변화·끓는 액체(증기압 ≥ 주변 압력)·액체가 퍼지는 동안은 다루지 않습니다.",
      "A steady-state estimate for still indoor air. It does not cover wind, changing liquid temperature, boiling liquids (vapour pressure ≥ ambient pressure) or a spreading pool."),
    tr("Crowl & Louvar 의 비이상 혼합 계수 k(0.1–0.5)는 이 계산기의 K_mix(희석 환기 계산기와 같은 ACGIH 계수)의 역수입니다.",
      "The nonideal mixing factor k (0.1–0.5) of Crowl & Louvar is the reciprocal of K_mix used here (the same ACGIH factor as in the dilution ventilation calculator)."),
    tr("실외 누출·대량 누출은 기상 조건을 넣는 확산 모델(EPA ALOHA 등)을 씁니다.",
      "For outdoor or large releases, use a dispersion model that takes weather conditions (e.g. EPA ALOHA)."),
  ],
  reference: [
    tr("Crowl & Louvar, Chemical Process Safety 3판(2011), 3장 산업위생 — 식 3-12 Q_m = M·K·A·P_sat/(R_g·T_L), 식 3-14 K = K₀(M₀/M)^(1/3), 식 3-15 실내 농도",
      "Crowl & Louvar, Chemical Process Safety, 3rd ed. (2011), Ch. 3 Industrial Hygiene — Eq. 3-12 Q_m = M·K·A·P_sat/(R_g·T_L), Eq. 3-14 K = K₀(M₀/M)^(1/3), Eq. 3-15 room concentration"),
    tr("Matthiessen, R.C. (1986). Estimating chemical exposure levels in the workplace. Chem. Eng. Prog. 82(4), 30–34. — 물 기준 K₀ = 0.83 cm/s",
      "Matthiessen, R.C. (1986). Estimating chemical exposure levels in the workplace. Chem. Eng. Prog. 82(4), 30–34. — water reference K₀ = 0.83 cm/s"),
  ],
};

Object.assign(window, { CALC_DEF_EVAPORATION });
