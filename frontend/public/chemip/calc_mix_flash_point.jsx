// 계산기: 액체 혼합물의 인화점 — Liaw 식(Le Chatelier 규칙 + 기액 평형), 1판은 이상 용액(Raoult, γ = 1).
// Σ xᵢ·Pᵢˢᵃᵗ(T) / Pᵢˢᵃᵗ(T_fp,i) = 1 을 T 로 푼다. Antoine 식 log₁₀P = A − B/(C + t[°C]) 를 넣으면 A·압력 단위는 비에서 지워진다.
// 인화점이 빈 성분(물 등 불연성)은 몰분율로만 묽힌다. 행 채우기: rowFill "flash_point"(api_calc_fill_flam.jsx, 순수 함수 calc_flam_fill.jsx).

const CALC_FP_T_MAX = 500;      // °C — 이 온도까지 근을 찾는다
const CALC_FP_GHS = [           // UN GHS Rev.10 표 2.6.1 인화성 액체 — 인화점 기준(°C, 미만)
  { below: 23, cat: () => tr("구분 1 또는 2 (초기 끓는점 35 °C 이하면 1)", "Category 1 or 2 (1 if initial boiling point ≤ 35 °C)") },
  { below: 60, cat: () => tr("구분 3", "Category 3") },
  { below: 93, cat: () => tr("구분 4", "Category 4") },
];

// 성분 i 의 Pˢᵃᵗ(T)/Pˢᵃᵗ(T_fp,i)  (T·T_fp: °C, Antoine B·C: °C 기준 log₁₀)
function calcFpRatio(c, t) {
  return Math.pow(10, c.B / (c.C + c.Tfp) - c.B / (c.C + t));
}

// [{ x(몰분율 합 1), Tfp|null, B, C }] → 혼합물 인화점 °C, 없으면 null. 이상 용액에서는 가장 낮은 순성분 인화점 이상이다.
function calcMixFlashPoint(comps) {
  const flam = comps.filter(c => c.Tfp != null && c.x > 0);
  if (!flam.length) return null;
  const f = (t) => flam.reduce((s, c) => s + c.x * calcFpRatio(c, t), 0) - 1;
  let lo = Math.min(...flam.map(c => c.Tfp));
  if (f(lo) >= 0) return lo;
  let hi = lo;
  while (f(hi) < 0) { hi += 25; if (hi > CALC_FP_T_MAX) return null; }
  for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (f(m) < 0) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

// 표 행 → 몰분율(합 1). basis "mass" 면 wᵢ/Mᵢ 로 바꾼다
function calcFpMoleFractions(rows, basis) {
  const n = rows.map(r => (basis === "mass" ? r.x / r.M : r.x));
  const total = n.reduce((s, v) => s + v, 0);
  return n.map(v => v / total);
}

function calcFpGhs(t) {
  const hit = CALC_FP_GHS.find(g => t < g.below);
  return hit ? hit.cat() : tr("해당 없음 (인화점 93 °C 이상)", "Not classified (flash point ≥ 93 °C)");
}

// 그래프: 2성분이면 성분 1 조성 0–1 에 따른 혼합물 인화점(이상 용액)과 지금 조성
function calcMixFlashPointChart(v, out) {
  if (v.rows.length !== 2) return null;
  const [a, b] = v.rows;
  const pts = calcChartRange(0, 1, 40).map(z => {
    const x = calcFpMoleFractions([{ ...a, x: z }, { ...b, x: 1 - z }], v.basis);
    const t = calcMixFlashPoint([{ ...a, x: x[0] }, { ...b, x: x[1] }]);
    return [z, t];
  }).filter(([, t]) => t != null);
  const z0 = a.x / (a.x + b.x);
  const name = a.name || tr("성분 1", "Component 1");
  const xLabel = v.basis === "mass" ? tr(`${name} 질량분율`, `${name} mass fraction`) : tr(`${name} 몰분율`, `${name} mole fraction`);
  return {
    x: { label: xLabel, unit: "—", min: 0, max: 1 },
    y: { label: tr("혼합물 인화점", "Mixture flash point"), unit: CALC_UNITS.temperature.C.label },
    series: [{ key: "fp", label: tr("이상 용액 (Raoult)", "Ideal solution (Raoult)"), points: pts }],
    markers: [{ x: z0, y: out.Tmix - 273.15, label: tr("지금 조성", "This mixture") }],
    ariaLabel: tr("조성에 따른 혼합물 인화점", "Mixture flash point against composition"),
  };
}

const CALC_DEF_MIX_FLASH_POINT = {
  key: "mix_flash_point",
  group: "flammability",
  title: tr("액체 혼합물 인화점 (Liaw)", "Liquid mixture flash point (Liaw)"),
  summary: tr("성분별 인화점과 Antoine 상수로 액체 혼합물의 인화점을 어림합니다(이상 용액, Raoult 법칙). 물질 이름이나 CAS 를 넣고 행의 채우기 단추를 누르면 ChemIP 물성(MSDS 9항)으로 칸을 채웁니다.",
    "Estimates the flash point of a liquid mixture from each component's flash point and Antoine constants (ideal solution, Raoult's law). Enter a substance name or CAS and press the row's fill button to fill it from ChemIP property data (SDS Section 9)."),
  inputs: [
    { key: "basis", type: "choice", term: "composition_basis", label: tr("조성 기준", "Composition basis"), default: "mol",
      options: [{ v: "mol", label: tr("몰분율", "Mole fraction") }, { v: "mass", label: tr("질량분율 (분자량 필요)", "Mass fraction (needs M)") }] },
    { key: "rows", term: "liaw_rule", type: "table", label: tr("액체 성분", "Liquid components"), minRows: 1, maxRows: 8,
      columns: [
        { key: "name", label: tr("물질 (이름 또는 CAS)", "Substance (name or CAS)"), text: true },
        { key: "x", term: "liquid_mole_fraction", label: tr("조성", "Fraction"), unit: "—", positive: true },
        { key: "Tfp", term: "pure_flash_point", label: tr("인화점 (불연성은 빈칸)", "Flash point (blank if non-flammable)"), unit: "°C", min: -150, max: 400, optional: true },
        { key: "B", term: "antoine_constants", label: "Antoine B", unit: "°C", positive: true, optional: true },
        { key: "C", term: "antoine_constants", label: "Antoine C", unit: "°C", optional: true },
        { key: "M", term: "molar_mass", label: tr("분자량", "M"), unit: "g/mol", positive: true, optional: true },
      ],
      rows: [
        { name: tr("메탄올", "Methanol"), x: 0.5001, Tfp: 10.3, B: 1582.27, C: 239.726, M: 32.04 },
        { name: tr("1-부탄올", "1-Butanol"), x: 0.4999, Tfp: 35.5, B: 1617.52, C: 203.296, M: 74.12 },
      ],
      rowFill: "flash_point",
      hint: tr("기본 행은 Oh & In(2015) 표 2·4 의 메탄올 + 1-부탄올 예시입니다. Antoine 상수는 log₁₀, 온도 °C 기준(A·압력 단위는 필요 없음)이며, K 기준 상수는 C 에 273.15 를 더해 넣습니다.",
        "Default rows are the methanol + 1-butanol example of Oh & In (2015), Tables 2 and 4. Antoine constants are log₁₀ with temperature in °C (A and the pressure unit are not needed). For constants in K, add 273.15 to C.") },
  ],
  outputs: [
    { key: "Tmix", term: "mix_flash_point", label: tr("혼합물 인화점 (이상 용액)", "Mixture flash point (ideal solution)"), dim: "temperature", unit: "K", show: "C", digits: 4 },
    { key: "ghs", term: "ghs_flam_liquid", label: tr("GHS 인화성 액체 (인화점 기준)", "GHS flammable liquid (by flash point)"), type: "text" },
    { key: "Tmin", term: "pure_flash_point", label: tr("가장 낮은 성분 인화점", "Lowest component flash point"), dim: "temperature", unit: "K", show: "C", digits: 4 },
    { key: "xFlam", term: "liquid_mole_fraction", label: tr("가연성 성분 몰분율 합", "Total mole fraction of flammables"), unit: "—", digits: 4 },
  ],
  compute(v) {
    const rows = v.rows;
    const E = [];
    rows.forEach((r, i) => {
      if (r.Tfp != null && (r.B == null || r.C == null)) E.push(tr(`${i + 1}행: 인화점이 있는 성분은 Antoine B·C 가 있어야 합니다.`, `Row ${i + 1}: a component with a flash point needs Antoine B and C.`));
      if (v.basis === "mass" && r.M == null) E.push(tr(`${i + 1}행: 질량분율 기준에는 분자량이 있어야 합니다.`, `Row ${i + 1}: mass-fraction basis needs the molar mass.`));
    });
    if (E.length) return { error: E[0] };
    if (!rows.some(r => r.Tfp != null)) return { error: tr("인화점이 있는 성분이 하나 이상 있어야 합니다.", "At least one component must have a flash point.") };
    const x = calcFpMoleFractions(rows, v.basis);
    const comps = rows.map((r, i) => ({ x: x[i], Tfp: r.Tfp, B: r.B, C: r.C }));
    const flam = comps.filter(c => c.Tfp != null);
    const Tmin = Math.min(...flam.map(c => c.Tfp));
    if (flam.some(c => c.C + Tmin <= 0)) return { error: tr("C + T 가 0 이하인 성분이 있습니다. Antoine 상수의 온도 기준(°C)을 확인하십시오.", "C + T is zero or negative for a component. Check that the Antoine constants use °C.") };
    const t = calcMixFlashPoint(comps);
    if (t == null) return { error: tr(`${CALC_FP_T_MAX} °C 까지 인화점을 찾지 못했습니다(가연성 성분이 너무 적음).`, `No flash point found up to ${CALC_FP_T_MAX} °C (too little flammable material).`) };
    const warnings = [];
    const sum = rows.reduce((s, r) => s + r.x, 0);
    if (Math.abs(sum - 1) > 0.01) warnings.push(tr(`조성 합이 ${sum.toPrecision(4)} 이라 합 1 로 맞춰 계산했습니다.`, `Fractions add up to ${sum.toPrecision(4)}, so they were normalized to 1.`));
    if (flam.length < comps.length) warnings.push(tr("불연성 성분(물 등)이 있습니다. 이상 용액 가정은 물–알코올처럼 양의 편차가 큰 계에서 인화점을 높게 어림합니다(실제는 더 낮을 수 있음).",
      "A non-flammable component (such as water) is present. The ideal-solution assumption overestimates the flash point of systems with strong positive deviation such as water–alcohol (the real value can be lower)."));
    return { Tmix: t + 273.15, ghs: calcFpGhs(t), Tmin: Tmin + 273.15, xFlam: flam.reduce((s, c) => s + c.x, 0), warnings };
  },
  chart: calcMixFlashPointChart,
  formula: [
    "Σ xᵢ γᵢ Pᵢˢᵃᵗ(T) / Pᵢˢᵃᵗ(T_fp,i) = 1   (γᵢ = 1: Raoult)",
    "Pᵢˢᵃᵗ(T) / Pᵢˢᵃᵗ(T_fp,i) = 10^[ Bᵢ/(Cᵢ + T_fp,i) − Bᵢ/(Cᵢ + T) ]",
    tr("불연성 성분: 인화점 없음 → 합에서 빠지고 xᵢ 로만 묽힘", "Non-flammable component: no flash point → left out of the sum, dilutes only through xᵢ"),
    tr("질량분율이면 xᵢ = (wᵢ/Mᵢ) / Σ(wⱼ/Mⱼ)", "For mass fractions, xᵢ = (wᵢ/Mᵢ) / Σ(wⱼ/Mⱼ)"),
  ],
  notes: [
    tr("참고용 스크리닝입니다. 이상 용액 가정이라 활동도 계수가 1 에서 크게 벗어나는 계(물–유기물, 극성–비극성)는 오차가 큽니다. 위험물 분류·표시에는 밀폐식 실측 인화점을 씁니다.",
      "Screening estimate only. It assumes an ideal solution, so errors are large where activity coefficients depart far from 1 (water–organic, polar–non-polar). Use a measured closed-cup flash point for classification and labelling."),
    tr("행 채우기: 인화점·분자량은 MSDS 9항 값, Antoine B·C 는 사전 설정 물질(CoolProp 맞춤)이 있으면 그 값, 없으면 증기압 한 점과 끓는점으로 맞춘 어림(C = 273.15), 끓는점만 있으면 Kistiakowsky 어림입니다. 출처가 있는 상수가 있으면 그것으로 바꾸십시오.",
      "Row fill: the flash point and molar mass are SDS Section 9 values; Antoine B and C come from a preset substance (CoolProp fit) when available, otherwise a fit through one vapour-pressure point and the boiling point (C = 273.15), or a Kistiakowsky estimate from the boiling point alone. Replace them with sourced constants when available."),
    tr("GHS 구분 1·2 는 초기 끓는점으로 가르므로 여기서는 함께 보입니다.", "GHS Categories 1 and 2 are separated by the initial boiling point, so they are shown together here."),
  ],
  reference: [
    "Liaw, H.-J., Lee, Y.-H., Tang, C.-L., Hsu, H.-H. & Liu, J.-H. (2002). A mathematical model for predicting the flash point of binary solutions. J. Loss Prev. Process Ind. 15(6), 429–438. doi:10.1016/S0950-4230(02)00068-2",
    tr("Oh, I.S. & In, S.J. (2015). Methanol, Ethanol, 2-Propanol 그리고 1-Butanol 이성분 혼합계에 대한 101.3 kPa 에서의 인화점 측정 및 예측. 한국화재소방학회 논문지 29(5), 1–6. doi:10.7731/KIFSE.2015.29.5.001 — 표 2 Antoine 상수, 표 4 Raoult 계산치(검증 사례)",
      "Oh, I.S. & In, S.J. (2015). Measurement and prediction of flash point for binary mixtures of methanol, ethanol, 2-propanol and 1-butanol at 101.3 kPa. Fire Sci. Eng. 29(5), 1–6. doi:10.7731/KIFSE.2015.29.5.001 — Table 2 Antoine constants, Table 4 Raoult values (validation cases)"),
    tr("UN GHS 개정 10판(2023), 2.6장 인화성 액체 표 2.6.1", "UN GHS Rev. 10 (2023), Ch. 2.6 Flammable liquids, Table 2.6.1"),
    "Kistiakowsky, W. (1923). Über die Verdampfungswärme und einige Gleichungen, welche die Eigenschaften der unassoziierten Flüssigkeiten bestimmen. Z. Phys. Chem. 107, 65–73.",
    tr("Poling, Prausnitz & O'Connell, The Properties of Gases and Liquids 5판(2001), 7장 — Clausius–Clapeyron 식",
      "Poling, Prausnitz & O'Connell, The Properties of Gases and Liquids, 5th ed. (2001), Ch. 7 — Clausius–Clapeyron equation"),
  ],
};

Object.assign(window, { CALC_DEF_MIX_FLASH_POINT, calcMixFlashPoint, calcFpMoleFractions, calcFpGhs });
