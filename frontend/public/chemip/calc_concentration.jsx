// 계산기: 몰농도 ↔ 질량 백분율(+ 몰랄농도). M = 10·w·ρ / MW (w: 질량 %, ρ: g/mL).

const CALC_DEF_CONCENTRATION = {
  key: "concentration",
  group: "chem",
  title: tr("몰농도 ↔ 질량 %", "Molarity ↔ mass %"),
  summary: tr("용액 밀도와 용질 분자량으로 질량 백분율(w/w %)과 몰농도(mol/L)를 서로 바꿉니다.", "Converts between mass percent (w/w %) and molarity (mol/L) using the solution density and the solute molar mass."),
  inputs: [
    { key: "dir", type: "choice", label: tr("방향", "Direction"), default: "w2M",
      options: [{ v: "w2M", label: tr("질량 % → 몰농도", "Mass % → molarity") }, { v: "M2w", label: tr("몰농도 → 질량 %", "Molarity → mass %") }] },
    { key: "w", term: "mass_percent", label: tr("질량 백분율", "Mass percent"), unit: "% (w/w)", default: 37, positive: true, max: 100, when: v => v.dir === "w2M" },
    { key: "M", term: "molarity", label: tr("몰농도", "Molarity"), unit: "mol/L", default: 1, positive: true, when: v => v.dir === "M2w" },
    { key: "rho", term: "density", label: tr("용액 밀도", "Solution density"), dim: "density", unit: "kgm3", show: "gcm3", default: 1.19, positive: true, hint: tr("용액의 밀도(물의 밀도가 아님)", "Density of the solution (not of water)") },
    { key: "mw", term: "molar_mass", label: tr("용질 분자량", "Solute molar mass"), unit: "g/mol", default: 36.46, positive: true, hint: tr("기본값은 진한 염산 37 % 예시", "Default: concentrated hydrochloric acid, 37 %") },
  ],
  outputs: [
    { key: "M_out", term: "molarity", label: tr("몰농도", "Molarity"), unit: "mol/L" },
    { key: "w_out", term: "mass_percent", label: tr("질량 백분율", "Mass percent"), unit: "% (w/w)" },
    { key: "b", term: "molality", label: tr("몰랄농도", "Molality"), unit: tr("mol/kg 용매", "mol/kg solvent") },
  ],
  compute(v) {
    const rhoGmL = v.rho / 1000;
    const w = v.dir === "w2M" ? v.w : v.M * v.mw / (10 * rhoGmL);
    if (w >= 100) return { error: tr("질량 % 가 100 이상이 됩니다. 밀도·분자량·몰농도를 확인하십시오.", "Mass percent comes out at 100 or more. Check the density, molar mass and molarity.") };
    const b = w * 1000 / (v.mw * (100 - w));
    return v.dir === "w2M" ? { M_out: 10 * w * rhoGmL / v.mw, b } : { w_out: w, b };
  },
  formula: [
    "M [mol/L] = 10 × w[%] × ρ[g/mL] / MW",
    "w [%] = M × MW / (10 × ρ[g/mL])",
    "b [mol/kg] = 1000 × w / (MW × (100 − w))",
  ],
  notes: [tr("밀도는 그 농도 용액의 값입니다. 온도에 따라 밀도가 바뀌므로 같은 온도의 값을 씁니다.", "Use the density of the solution at that concentration. Density changes with temperature, so use a value at the same temperature.")],
  reference: [
    tr("Harris, D.C., Quantitative Chemical Analysis, 9판(2015), 1장 — 몰농도·몰랄농도·질량 백분율 정의와 환산", "Harris, D.C., Quantitative Chemical Analysis, 9th ed. (2015), Ch. 1 — definitions and conversion of molarity, molality and mass percent"),
  ],
};

Object.assign(window, { CALC_DEF_CONCENTRATION });
