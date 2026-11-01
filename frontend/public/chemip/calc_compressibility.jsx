// 계산기: 실제 기체 압축인자 Z — Pitzer 일반화 2차 비리얼 상관식(Abbott), 몰부피·밀도.

function calcPitzerVirial(Tr, Pr, w) {
  const B0 = 0.083 - 0.422 / Math.pow(Tr, 1.6);
  const B1 = 0.139 - 0.172 / Math.pow(Tr, 4.2);
  return { B0, B1, Z: 1 + (B0 + w * B1) * Pr / Tr };
}

const CALC_DEF_COMPRESSIBILITY = {
  key: "compressibility",
  group: "chem",
  title: tr("압축인자 · 기체 밀도 (Pitzer)", "Compressibility factor · gas density (Pitzer)"),
  summary: tr("임계 온도·압력과 이심인자로 실제 기체의 압축인자 Z 를 구하고, 이상기체와 비교한 몰부피·밀도를 냅니다. 낮거나 중간 압력의 기체에 씁니다.", "Estimates the compressibility factor Z of a real gas from its critical temperature, critical pressure and acentric factor, and gives the molar volume and density compared with the ideal gas. For gases at low to moderate pressure."),
  inputs: [
    { key: "T", label: tr("온도", "Temperature"), dim: "temperature", unit: "K", show: "K", default: 510, positive: true },
    { key: "P", label: tr("압력 (절대)", "Pressure (absolute)"), dim: "pressure", unit: "Pa", show: "bar", default: 25, positive: true },
    { key: "Tc", label: tr("임계 온도 T_c", "Critical temperature T_c"), term: "critical_point", dim: "temperature", unit: "K", show: "K", default: 425.1, positive: true, hint: tr("기본값은 n-부탄 (SVNA 부록 B)", "Default is n-butane (SVNA Appendix B)") },
    { key: "Pc", label: tr("임계 압력 P_c", "Critical pressure P_c"), term: "critical_point", dim: "pressure", unit: "Pa", show: "bar", default: 37.96, positive: true },
    { key: "w", label: tr("이심인자 ω", "Acentric factor ω"), term: "acentric_factor", unit: "—", default: 0.2, min: -0.5, max: 2 },
    { key: "mw", label: tr("분자량 (선택)", "Molar mass (optional)"), term: "molar_mass", unit: "g/mol", default: 58.123, optional: true, positive: true },
  ],
  outputs: [
    { key: "Z", label: tr("압축인자 Z", "Compressibility factor Z"), term: "compressibility", unit: "—", digits: 4 },
    { key: "Vm", label: tr("몰부피 V = Z·R·T/P", "Molar volume V = Z·R·T/P"), dim: "volume", unit: "m3", show: "L", digits: 5 },
    { key: "rho", label: tr("기체 밀도 ρ = P·M/(Z·R·T)", "Gas density ρ = P·M/(Z·R·T)"), term: "density", dim: "density", unit: "kgm3", show: "kgm3" },
    { key: "rhoIdeal", label: tr("이상기체 밀도", "Ideal-gas density"), term: "density", dim: "density", unit: "kgm3", show: "kgm3" },
    { key: "Tr", label: tr("환산 온도 T_r", "Reduced temperature T_r"), term: "reduced_property", unit: "—", digits: 4 },
    { key: "Pr", label: tr("환산 압력 P_r", "Reduced pressure P_r"), term: "reduced_property", unit: "—", digits: 4 },
    { key: "B0", label: "B⁰", unit: "—", digits: 4 },
    { key: "B1", label: "B¹", unit: "—", digits: 4 },
  ],
  compute(v) {
    const Tr = v.T / v.Tc, Pr = v.P / v.Pc;
    const { B0, B1, Z } = calcPitzerVirial(Tr, Pr, v.w);
    if (!(Z > 0)) return { error: tr("Z 가 0 이하로 나옵니다. 이 상관식을 쓸 수 없는 조건입니다(액체·임계점 근처).", "Z comes out at or below zero. The correlation does not apply under these conditions (liquid or near the critical point).") };
    const warnings = [];
    if (Tr < 1 && Pr > 0.3) warnings.push(tr("임계 온도 아래에서 압력이 높습니다. 액체이거나 포화 증기에 가까우면 이 식은 맞지 않습니다. 증기압보다 낮은 압력인지 확인하십시오.", "Pressure is high for a temperature below the critical temperature. The correlation does not hold for a liquid or a near-saturated vapor. Check that the pressure is below the vapor pressure."));
    if (Pr > 2 || (Tr < 1.5 && Pr > 1)) warnings.push(tr("2차 비리얼 식은 낮은·중간 압력용입니다(SVNA 그림 3.14 의 선 위쪽, 대략 V_r ≥ 2). 이 조건에서는 Lee–Kesler 표나 3차 상태식을 씁니다.", "The second-virial correlation is for low to moderate pressures (above the line in SVNA Fig. 3.14, roughly V_r ≥ 2). Under these conditions use the Lee–Kesler tables or a cubic equation of state."));
    const Vm = Z * CALC_CONST.R * v.T / v.P;                     // m³/mol
    const kgmol = v.mw ? v.mw / 1000 : null;
    return { Z, Vm, rho: kgmol ? kgmol / Vm : undefined, rhoIdeal: kgmol ? kgmol * v.P / (CALC_CONST.R * v.T) : undefined, Tr, Pr, B0, B1, warnings };
  },
  formula: [
    "Z = 1 + (B⁰ + ω B¹) · P_r / T_r,   T_r = T/T_c,  P_r = P/P_c",
    "B⁰ = 0.083 − 0.422 / T_r^1.6,   B¹ = 0.139 − 0.172 / T_r^4.2",
    "V = Z R T / P,   ρ = P M / (Z R T)",
  ],
  notes: [
    tr("임계 상수와 이심인자는 물성 표(SVNA 부록 B, Poling 부록 A, NIST WebBook)에서 가져옵니다.", "Take critical constants and the acentric factor from property tables (SVNA Appendix B, Poling Appendix A, NIST WebBook)."),
    tr("극성이 강한 기체(물·암모니아 등)나 양자 기체(수소·헬륨)는 오차가 커집니다.", "Errors grow for strongly polar gases (water, ammonia, etc.) and quantum gases (hydrogen, helium)."),
  ],
  reference: [
    tr("Smith, Van Ness & Abbott, Introduction to Chemical Engineering Thermodynamics 7판(2005), 3장 일반화 비리얼 상관식(Abbott 식 B⁰·B¹) — 예제 n-부탄 510 K·25 bar (Z = 0.879)", "Smith, Van Ness & Abbott, Introduction to Chemical Engineering Thermodynamics, 7th ed. (2005), Ch. 3 generalized virial correlation (Abbott equations B⁰·B¹) — example n-butane at 510 K, 25 bar (Z = 0.879)"),
    "Pitzer, K.S. & Curl, R.F. (1957). The volumetric and thermodynamic properties of fluids. III. Empirical equation for the second virial coefficient. J. Am. Chem. Soc. 79, 2369–2370.",
  ],
};

Object.assign(window, { CALC_DEF_COMPRESSIBILITY, calcPitzerVirial });
