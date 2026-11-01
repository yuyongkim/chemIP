// 계산기: 완충 용액 pH — Henderson–Hasselbalch pH = pKa + log₁₀([A⁻]/[HA]).

const CALC_DEF_BUFFER_PH = {
  key: "buffer_ph",
  group: "chem",
  title: tr("완충 용액 pH (Henderson–Hasselbalch)", "Buffer pH (Henderson–Hasselbalch)"),
  summary: tr("약산과 그 짝염기(또는 약염기와 짝산)의 농도로 완충 용액의 pH 를 구하거나, 원하는 pH 에 맞는 농도 비를 구합니다.", "Finds the pH of a buffer from the concentrations of a weak acid and its conjugate base (or a weak base and its conjugate acid), or the concentration ratio for a target pH."),
  inputs: [
    { key: "mode", type: "choice", label: tr("구할 값", "Solve for"), default: "pH",
      options: [{ v: "pH", label: tr("농도 → pH", "Concentrations → pH") }, { v: "ratio", label: tr("목표 pH → 농도 비", "Target pH → concentration ratio") }] },
    { key: "pKa", label: tr("산의 pKa", "Acid pKa"), term: "pka", unit: "—", default: 4.76, min: -2, max: 16, hint: tr("기본값은 아세트산 25 °C (4.76)", "Default: acetic acid at 25 °C (4.76)") },
    { key: "A", label: tr("짝염기 농도 [A⁻]", "Conjugate base [A⁻]"), unit: "mol/L", default: 0.1, positive: true, when: c => c.mode === "pH" },
    { key: "HA", label: tr("약산 농도 [HA]", "Weak acid [HA]"), unit: "mol/L", default: 0.1, positive: true, when: c => c.mode === "pH" },
    { key: "target", label: tr("목표 pH", "Target pH"), term: "ph", unit: "—", default: 5, min: -2, max: 16, when: c => c.mode === "ratio" },
    { key: "total", label: tr("전체 농도 [HA]+[A⁻] (선택)", "Total concentration [HA]+[A⁻] (optional)"), unit: "mol/L", default: 0.1, optional: true, positive: true, when: c => c.mode === "ratio" },
  ],
  outputs: [
    { key: "pH", label: "pH", term: "ph", unit: "—", digits: 4 },
    { key: "ratio", label: tr("농도 비 [A⁻]/[HA]", "Concentration ratio [A⁻]/[HA]"), term: "buffer", unit: "—", digits: 4 },
    { key: "fracA", label: tr("짝염기 몰분율 [A⁻]/전체", "Conjugate base fraction [A⁻]/total"), unit: "—", digits: 4 },
    { key: "Aout", label: tr("짝염기 농도 [A⁻]", "Conjugate base [A⁻]"), unit: "mol/L", digits: 4 },
    { key: "HAout", label: tr("약산 농도 [HA]", "Weak acid [HA]"), unit: "mol/L", digits: 4 },
  ],
  compute(v) {
    const ratio = v.mode === "pH" ? v.A / v.HA : Math.pow(10, v.target - v.pKa);
    const pH = v.mode === "pH" ? v.pKa + Math.log10(ratio) : v.target;
    const frac = ratio / (1 + ratio);
    const warnings = [];
    if (ratio < 0.1 || ratio > 10) warnings.push(tr("농도 비가 0.1–10 밖입니다(pH 가 pKa ± 1 밖). 완충 능력이 약하고 근사식 오차가 커집니다.", "The concentration ratio is outside 0.1–10 (pH outside pKa ± 1). Buffer capacity is weak and the approximation error grows."));
    if (v.mode === "pH" && Math.min(v.A, v.HA) < 1e-3) warnings.push(tr("농도가 1 mmol/L 보다 낮으면 물의 해리를 무시한 이 근사식이 맞지 않을 수 있습니다.", "Below 1 mmol/L this approximation, which neglects the autoionization of water, may not hold."));
    const out = { pH, ratio, fracA: frac, warnings };
    if (v.mode === "ratio" && v.total) { out.Aout = v.total * frac; out.HAout = v.total * (1 - frac); }
    return out;
  },
  formula: [
    "pH = pKa + log₁₀( [A⁻] / [HA] )",
    tr("[A⁻]/[HA] = 10^(pH − pKa),  [A⁻] = 전체 × 비 / (1 + 비)", "[A⁻]/[HA] = 10^(pH − pKa),  [A⁻] = total × ratio / (1 + ratio)"),
    tr("약염기 완충: 짝산의 pKa(= 14 − pKb, 25 °C)를 넣고 [A⁻] 칸에 염기, [HA] 칸에 짝산 농도를 넣습니다", "Weak-base buffer: enter the pKa of the conjugate acid (= 14 − pKb at 25 °C), the base concentration as [A⁻] and the conjugate-acid concentration as [HA]"),
  ],
  notes: [
    tr("활동도 대신 농도를 쓰는 근사식입니다. 이온 세기가 크면(대략 0.1 mol/L 이상) 실제 pH 와 0.1 단위 이상 차이 날 수 있습니다.", "This approximation uses concentrations instead of activities. At high ionic strength (roughly 0.1 mol/L or more) it can differ from the actual pH by 0.1 unit or more."),
    tr("pKa 는 온도에 따라 바뀝니다. 같은 온도의 값을 넣습니다.", "pKa changes with temperature. Use a value at the same temperature."),
  ],
  reference: [
    tr("Harris, D.C., Quantitative Chemical Analysis 9판(2015), 9장 완충 용액 — Henderson–Hasselbalch 식, 아세트산 pKa 4.756", "Harris, D.C., Quantitative Chemical Analysis, 9th ed. (2015), Ch. 9 Buffers — Henderson–Hasselbalch equation, acetic acid pKa 4.756"),
    "Po, H.N. & Senozan, N.M. (2001). The Henderson–Hasselbalch equation: its history and limitations. J. Chem. Educ. 78(11), 1499–1503.",
  ],
};

Object.assign(window, { CALC_DEF_BUFFER_PH });
