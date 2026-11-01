// 계산기: 기체·증기 농도 ppm ↔ mg/m³. 물질 상세의 "이 물질로 계산하기"가 여는 계산기(분자량 mw 를 채운다).

const CALC_DEF_PPM_MGM3 = {
  key: "ppm_mgm3",
  group: "safety",
  title: tr("ppm ↔ mg/m³ 환산", "ppm ↔ mg/m³ conversion"),
  summary: tr("공기 중 기체·증기 농도를 부피 기준(ppm)과 질량 기준(mg/m³) 사이에서 바꿉니다. 노출기준 단위를 맞출 때 씁니다.",
    "Converts an airborne gas or vapour concentration between a volume basis (ppm) and a mass basis (mg/m³). Use it to match the units of an exposure limit."),
  inputs: [
    { key: "dir", type: "choice", label: tr("방향", "Direction"), default: "ppm2mg",
      options: [{ v: "ppm2mg", label: "ppm → mg/m³" }, { v: "mg2ppm", label: "mg/m³ → ppm" }] },
    { key: "ppm", term: "ppm", label: tr("농도", "Concentration"), unit: "ppm", default: 1, min: 0, when: v => v.dir === "ppm2mg" },
    { key: "mgm3", term: "mgm3", label: tr("농도", "Concentration"), unit: "mg/m³", default: 1, min: 0, when: v => v.dir === "mg2ppm" },
    { key: "mw", term: "molar_mass", label: tr("분자량(몰질량)", "Molecular weight (molar mass)"), unit: "g/mol", default: 78.11, positive: true, hint: tr("기본값은 벤젠(78.11) 예시", "Default is benzene (78.11) as an example") },
    { key: "basis", term: "molar_volume", type: "choice", label: tr("몰부피 기준", "Molar volume basis"), default: "conv",
      options: [{ v: "conv", label: tr("관례값 24.45 L/mol (25 °C, 1 atm)", "Conventional 24.45 L/mol (25 °C, 1 atm)") }, { v: "tp", label: tr("온도·압력으로 계산", "Calculate from T and P") }] },
    { key: "T", label: tr("온도", "Temperature"), dim: "temperature", unit: "K", show: "C", default: 25, positive: true, when: v => v.basis === "tp" },
    { key: "P", label: tr("압력", "Pressure"), dim: "pressure", unit: "Pa", show: "atm", default: 1, positive: true, when: v => v.basis === "tp" },
  ],
  outputs: [
    { key: "mgm3_out", term: "mgm3", label: tr("질량 농도", "Mass concentration"), unit: "mg/m³" },
    { key: "ppm_out", term: "ppm", label: tr("부피 농도", "Volume concentration"), unit: "ppm" },
    { key: "vm", term: "molar_volume", label: tr("사용한 몰부피 Vm", "Molar volume used, Vm"), unit: "L/mol" },
  ],
  compute(v) {
    const vm = v.basis === "tp" ? calcMolarVolumeL(v.T, v.P) : CALC_CONST.vm25;
    return v.dir === "ppm2mg"
      ? { mgm3_out: calcPpmToMgm3(v.ppm, v.mw, vm), vm }
      : { ppm_out: calcMgm3ToPpm(v.mgm3, v.mw, vm), vm };
  },
  formula: ["mg/m³ = ppm × M / Vm", "ppm = mg/m³ × Vm / M", tr("Vm = 24.45 L/mol (25 °C, 1 atm) 또는 Vm = R·T / P", "Vm = 24.45 L/mol (25 °C, 1 atm) or Vm = R·T / P")],
  notes: [
    tr("ppm 은 부피(몰) 분율 × 10⁶ 이라 기체·증기에만 씁니다. 분진·흄·미스트는 mg/m³ 그대로 씁니다.",
      "ppm is the volume (mole) fraction × 10⁶, so it applies only to gases and vapours. Dusts, fumes and mists are expressed in mg/m³ only."),
    tr("관례값 24.45 L/mol 과 이상기체 계산값(25 °C·1 atm 에서 24.465 L/mol)은 0.06 % 다릅니다.",
      "The conventional 24.45 L/mol differs by 0.06 % from the ideal-gas value (24.465 L/mol at 25 °C and 1 atm)."),
  ],
  reference: [
    tr("ACGIH, TLVs and BEIs (연간 발행) — ppm ↔ mg/m³ 환산식(25 °C, 760 torr, 24.45)",
      "ACGIH, TLVs and BEIs (published annually) — ppm ↔ mg/m³ conversion (25 °C, 760 torr, 24.45)"),
    tr("NIOSH Pocket Guide to Chemical Hazards (DHHS/NIOSH Pub. No. 2005-149), 서문 — 환산 계수(25 °C, 1 atm)",
      "NIOSH Pocket Guide to Chemical Hazards (DHHS/NIOSH Pub. No. 2005-149), Introduction — conversion factors (25 °C, 1 atm)"),
    tr("Crowl, D.A. & Louvar, J.F., Chemical Process Safety: Fundamentals with Applications, 3판(2011), 3장 산업위생 — 이상기체 농도 환산",
      "Crowl, D.A. & Louvar, J.F., Chemical Process Safety: Fundamentals with Applications, 3rd ed. (2011), Ch. 3 Industrial Hygiene — ideal-gas concentration conversion"),
  ],
};

Object.assign(window, { CALC_DEF_PPM_MGM3 });
