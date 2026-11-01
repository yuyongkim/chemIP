// 계산기: 용액 희석 C₁V₁ = C₂V₂ — 네 변수 중 하나를 고른다.

const CALC_DEF_DILUTION = {
  key: "dilution",
  group: "chem",
  title: tr("용액 희석 (C₁V₁ = C₂V₂)", "Solution dilution (C₁V₁ = C₂V₂)"),
  summary: tr("진한 용액(원액)을 묽혀 원하는 농도·부피를 만들 때 필요한 원액 부피 등을 구합니다.", "Finds the stock-solution volume (or any one of the four quantities) needed to dilute a concentrated solution to a target concentration and volume."),
  inputs: [
    { key: "solve", term: "dilution", type: "choice", label: tr("구할 값", "Solve for"), default: "V1",
      options: [{ v: "V1", label: tr("원액 부피 V₁", "Stock volume V₁") }, { v: "C2", label: tr("희석 후 농도 C₂", "Diluted concentration C₂") }, { v: "V2", label: tr("희석 후 부피 V₂", "Diluted volume V₂") }, { v: "C1", label: tr("원액 농도 C₁", "Stock concentration C₁") }] },
    { key: "C1", label: tr("원액 농도 C₁", "Stock concentration C₁"), unit: tr("농도 단위", "conc. unit"), default: 12, positive: true, when: v => v.solve !== "C1" },
    { key: "V1", label: tr("원액 부피 V₁", "Stock volume V₁"), dim: "volume", unit: "m3", show: "mL", default: 10, positive: true, when: v => v.solve !== "V1" },
    { key: "C2", label: tr("희석 후 농도 C₂", "Diluted concentration C₂"), unit: tr("농도 단위", "conc. unit"), default: 1, positive: true, when: v => v.solve !== "C2" },
    { key: "V2", label: tr("희석 후 부피 V₂", "Diluted volume V₂"), dim: "volume", unit: "m3", show: "mL", default: 500, positive: true, when: v => v.solve !== "V2" },
  ],
  outputs: [
    { key: "C1_out", label: tr("원액 농도 C₁", "Stock concentration C₁"), unit: tr("농도 단위", "conc. unit") },
    { key: "V1_out", label: tr("원액 부피 V₁", "Stock volume V₁"), dim: "volume", unit: "m3", show: "mL" },
    { key: "C2_out", label: tr("희석 후 농도 C₂", "Diluted concentration C₂"), unit: tr("농도 단위", "conc. unit") },
    { key: "V2_out", label: tr("희석 후 부피 V₂", "Diluted volume V₂"), dim: "volume", unit: "m3", show: "mL" },
    { key: "add", label: tr("더할 용매 부피 V₂ − V₁", "Solvent to add V₂ − V₁"), dim: "volume", unit: "m3", show: "mL" },
  ],
  compute(v) {
    const r = { C1: v.C1, V1: v.V1, C2: v.C2, V2: v.V2 };
    if (v.solve === "V1") r.V1 = v.C2 * v.V2 / v.C1;
    if (v.solve === "C2") r.C2 = v.C1 * v.V1 / v.V2;
    if (v.solve === "V2") r.V2 = v.C1 * v.V1 / v.C2;
    if (v.solve === "C1") r.C1 = v.C2 * v.V2 / v.V1;
    const warnings = r.C2 > r.C1 ? [tr("C₂ 가 C₁ 보다 큽니다. 희석으로는 농도를 높일 수 없습니다.", "C₂ is greater than C₁. Dilution cannot raise the concentration.")] : [];
    return { [`${v.solve}_out`]: r[v.solve], add: r.V2 >= r.V1 ? r.V2 - r.V1 : undefined, warnings };
  },
  formula: ["C₁ · V₁ = C₂ · V₂", tr("더할 용매 = V₂ − V₁ (부피가 더해진다고 가정)", "Solvent to add = V₂ − V₁ (assumes additive volumes)")],
  notes: [
    tr("C₁ 과 C₂ 는 같은 단위(mol/L 끼리, % 끼리 등)로 넣습니다. 부피는 칸마다 단위를 따로 골라도 됩니다.", "Enter C₁ and C₂ in the same unit (both mol/L, both %, etc.). Each volume may use its own unit."),
    tr("진한 산·알코올처럼 섞을 때 부피가 줄어드는 용액은 '더할 용매'가 실제와 다릅니다. 표선까지 채워 맞춥니다.", "For solutions that contract on mixing, such as concentrated acids and alcohols, the 'solvent to add' differs from reality. Make up to the mark instead."),
  ],
  reference: [
    tr("Harris, D.C., Quantitative Chemical Analysis, 9판(2015), 1장 화학 측정 — 희석식 M_conc · V_conc = M_dil · V_dil", "Harris, D.C., Quantitative Chemical Analysis, 9th ed. (2015), Ch. 1 Chemical Measurements — dilution formula M_conc · V_conc = M_dil · V_dil"),
  ],
};

Object.assign(window, { CALC_DEF_DILUTION });
