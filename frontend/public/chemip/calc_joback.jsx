// 계산기: Joback 기여도법(Joback & Reid 1987) — 원자단 개수(또는 SMILES) → Tb, Tc, Pc, Vc, ΔHf°, ΔGf°, Cp°(T), Tm, ΔHvap, ΔHfus.
// 원자단 표: calc_joback_groups.jsx(자료), SMILES → 원자단: calc_joback_smiles.jsx(순수, 외부 라이브러리 없음).
// Constantinou–Gani(1994)는 검증용 공개 예제를 직접 확인하지 못해 싣지 않았다(보고: docs 의 미해결 항목).

const CALC_JOBACK_CP_RANGE = [273.15, 1000];   // Joback Cp 다항식을 맞춘 범위(대략 273–1000 K)

// 값 → { counts: {code: n}, atoms, mw } 또는 { error }
function calcJobackCounts(v) {
  if (v.mode === "smiles") {
    const smi = (v.smi || [])[0]?.smiles || "";
    const r = jobackGroupsFromSmiles(smi);
    if (r.error) {
      const why = {
        empty: tr("SMILES 를 넣으십시오.", "Enter a SMILES string."),
        dot: tr("점(.)으로 나뉜 혼합물·염은 계산하지 않습니다.", "Mixtures or salts separated by a dot (.) are not supported."),
        syntax: tr("SMILES 를 읽지 못했습니다(괄호·고리 번호 확인).", "The SMILES could not be read (check brackets and ring numbers)."),
        atom: tr(`읽을 수 없는 원자: ${r.at || ""}`, `Unreadable atom: ${r.at || ""}`),
        element: tr(`Joback 원자단이 없는 원소: ${r.el || ""}. 원자단 개수를 직접 넣으십시오.`, `No Joback group for element ${r.el || ""}. Enter the group counts instead.`),
        group: tr(`원자 ${r.el || ""}(${(r.at ?? 0) + 1}번째)의 결합 모양에 맞는 Joback 원자단이 없습니다. 원자단 개수를 직접 넣으십시오.`,
          `No Joback group fits atom ${r.el || ""} (#${(r.at ?? 0) + 1}). Enter the group counts instead.`),
      };
      return { error: why[r.error] || why.syntax };
    }
    return { counts: r.counts, atoms: r.atoms, mw: calcJobackMw(r.counts) };
  }
  const counts = {};
  for (const [i, row] of (v.groups || []).entries()) {
    const g = jobackFindGroup(row.g);
    if (!g) return { error: tr(`${i + 1}행: 모르는 원자단 "${row.g || ""}". 아래 코드 목록을 보십시오.`, `Row ${i + 1}: unknown group "${row.g || ""}". See the code list below.`) };
    if (!(Number.isInteger(row.n) && row.n > 0)) return { error: tr(`${i + 1}행: 개수는 1 이상의 정수입니다.`, `Row ${i + 1}: the count must be a whole number of 1 or more.`) };
    counts[g.code] = (counts[g.code] || 0) + row.n;
  }
  if (!Object.keys(counts).length) return { error: tr("원자단을 하나 이상 넣으십시오.", "Enter at least one group.") };
  const atoms = Object.entries(counts).reduce((t, [code, n]) => t + n * Object.values(jobackFindGroup(code).atoms).reduce((a, b) => a + b, 0), 0);
  return { counts, atoms, mw: calcJobackMw(counts) };
}

function calcJobackMw(counts) {
  return Object.entries(counts).reduce((t, [code, n]) => t + n * Object.entries(jobackFindGroup(code).atoms)
    .reduce((m, [el, k]) => m + k * JOBACK_ATOMIC_MASS[el], 0), 0);
}

// 원자단 개수 → 합(값이 없는 원자단이 있으면 그 물성은 null)
function calcJobackSum(counts, key) {
  let tot = 0;
  for (const [code, n] of Object.entries(counts)) {
    const x = jobackFindGroup(code)[key];
    if (x == null) return null;
    tot += n * x;
  }
  return tot;
}

// Joback & Reid (1987) 식. nA = 원자 수(H 포함), TbKnown = 실측 끓는점(있으면 Tc 에 쓴다) [K]. 결과 SI(Pa, m³/mol 아님: cm³/mol), kJ/mol
function calcJobackEstimate(counts, nA, TbKnown) {
  const S = k => calcJobackSum(counts, k);
  const sTb = S("Tb"), sTc = S("Tc"), sPc = S("Pc"), sVc = S("Vc"), sTm = S("Tm"), sHf = S("Hf"), sGf = S("Gf");
  const sa = S("a"), sb = S("b"), sc = S("c"), sd = S("d"), sHv = S("Hvap"), sHfus = S("Hfus");
  const Tb = sTb == null ? null : 198.2 + sTb;
  const TbUse = TbKnown > 0 ? TbKnown : Tb;
  const Tc = sTc == null || TbUse == null ? null : TbUse / (0.584 + 0.965 * sTc - sTc * sTc);
  const Pc = sPc == null ? null : Math.pow(0.113 + 0.0032 * nA - sPc, -2) * 1e5;   // bar → Pa
  const cp = [sa, sb, sc, sd].some(x => x == null) ? null : [sa - 37.93, sb + 0.210, sc - 3.91e-4, sd + 2.06e-7];
  return {
    Tb, Tc, Pc, Vc: sVc == null ? null : 17.5 + sVc, Tm: sTm == null ? null : 122.5 + sTm,
    Hf: sHf == null ? null : 68.29 + sHf, Gf: sGf == null ? null : 53.88 + sGf,
    Hvap: sHv == null ? null : 15.30 + sHv, Hfus: sHfus == null ? null : -0.88 + sHfus, cp,
  };
}

function calcJobackCp(cp, T) {
  return cp ? cp[0] + cp[1] * T + cp[2] * T * T + cp[3] * T * T * T : null;
}

function calcJobackChart(v, out) {
  const g = calcJobackCounts(v);
  if (g.error) return null;
  const e = calcJobackEstimate(g.counts, g.atoms, v.TbKnown);
  if (!e.cp) return null;
  const pts = calcChartRange(CALC_JOBACK_CP_RANGE[0], CALC_JOBACK_CP_RANGE[1], 60).map(T => [T, calcJobackCp(e.cp, T)]);
  return {
    x: { label: tr("온도", "Temperature"), unit: "K" },
    y: { label: tr("이상기체 Cp°", "Ideal-gas Cp°"), unit: "J/(mol·K)" },
    series: [{ key: "cp", label: tr("Joback Cp°(T)", "Joback Cp°(T)"), points: pts }],
    markers: out.cp != null && v.T >= CALC_JOBACK_CP_RANGE[0] && v.T <= CALC_JOBACK_CP_RANGE[1] ? [{ x: v.T, y: out.cp, label: tr("계산점", "Result") }] : [],
    ariaLabel: tr("Joback 이상기체 열용량 곡선", "Joback ideal-gas heat capacity curve"),
  };
}

const CALC_JOBACK_CODES = JOBACK_GROUPS.map(g => `${g.code} (${g.sym})`).join(" · ");

const CALC_DEF_JOBACK = {
  key: "joback",
  group: "thermo",
  title: tr("Joback 기여도법 물성 추정", "Joback group-contribution estimate"),
  summary: tr("분자를 Joback 원자단으로 나눈 개수(또는 SMILES)로 정상 끓는점·임계 상수·생성 엔탈피·깁스 에너지·이상기체 열용량을 추정합니다. 실측값이 없을 때의 사전 추정용입니다.",
    "Estimates the normal boiling point, critical constants, enthalpy and Gibbs energy of formation and ideal-gas heat capacity from Joback group counts (or a SMILES string). For first estimates when no measured data exist."),
  inputs: [
    { key: "mode", type: "choice", label: tr("입력 방법", "Input"), default: "groups", term: "group_contribution",
      options: [{ v: "groups", label: tr("원자단 개수", "Group counts") }, { v: "smiles", label: "SMILES" }] },
    { key: "groups", type: "table", label: tr("원자단과 개수", "Groups and counts"), minRows: 1, maxRows: 20, term: "group_contribution",
      when: v => v.mode === "groups",
      columns: [
        { key: "g", label: tr("원자단 코드", "Group code"), text: true },
        { key: "n", label: tr("개수", "Count"), positive: true },
      ],
      rows: [{ g: "CH3", n: 2 }, { g: "C=O", n: 1 }],
      hint: tr(`코드(또는 번호 1–41): ${CALC_JOBACK_CODES}. 앞의 r = 고리 안, ArOH = 페놀성 OH. 기본값은 아세톤.`,
        `Codes (or numbers 1–41): ${CALC_JOBACK_CODES}. A leading r means in a ring; ArOH is a phenolic OH. The default is acetone.`) },
    { key: "smi", type: "table", label: "SMILES", minRows: 1, maxRows: 1, term: "smiles", when: v => v.mode === "smiles",
      columns: [{ key: "smiles", label: "SMILES", text: true }], rows: [{ smiles: "CC(=O)C" }],
      hint: tr("한 분자만(예: CC(=O)C 아세톤, Cc1ccccc1O o-크레졸). 방향족 소문자·고리 번호·괄호 원자를 읽습니다.",
        "One molecule only (e.g. CC(=O)C acetone, Cc1ccccc1O o-cresol). Aromatic lower case, ring numbers and bracket atoms are read.") },
    { key: "TbKnown", label: tr("실측 끓는점(있으면)", "Measured boiling point (optional)"), dim: "temperature", unit: "K", show: "K", default: "", optional: true, positive: true,
      term: "boiling_point", hint: tr("넣으면 Tc 를 이 값으로 구합니다(Joback 권장).", "If given, Tc is computed from it (as Joback recommends).") },
    { key: "T", label: tr("Cp 를 구할 온도", "Temperature for Cp"), dim: "temperature", unit: "K", show: "K", default: 298.15, positive: true, term: "cp" },
  ],
  outputs: [
    { key: "Tb", term: "boiling_point", label: tr("정상 끓는점 Tb", "Normal boiling point Tb"), dim: "temperature", unit: "K", show: "K", digits: 5 },
    { key: "Tc", term: "critical_point", label: tr("임계 온도 Tc", "Critical temperature Tc"), dim: "temperature", unit: "K", show: "K", digits: 5 },
    { key: "Pc", term: "critical_point", label: tr("임계 압력 Pc", "Critical pressure Pc"), dim: "pressure", unit: "Pa", show: "bar", digits: 5 },
    { key: "Vc", term: "critical_point", label: tr("임계 부피 Vc", "Critical volume Vc"), unit: "cm³/mol", digits: 5 },
    { key: "Hf", term: "formation_enthalpy", label: tr("생성 엔탈피 ΔHf°(기체, 298 K)", "Enthalpy of formation ΔHf° (gas, 298 K)"), unit: "kJ/mol", digits: 5 },
    { key: "Gf", term: "formation_gibbs", label: tr("생성 깁스 에너지 ΔGf°(기체, 298 K)", "Gibbs energy of formation ΔGf° (gas, 298 K)"), unit: "kJ/mol", digits: 5 },
    { key: "cp", term: "cp", label: tr("이상기체 Cp°(T)", "Ideal-gas Cp°(T)"), unit: "J/(mol·K)", digits: 5 },
    { key: "Tm", term: "melting_point", label: tr("녹는점 Tm", "Melting point Tm"), dim: "temperature", unit: "K", show: "K", digits: 4 },
    { key: "Hvap", term: "latent_heat", label: tr("증발열 ΔHvap(Tb)", "Heat of vaporization ΔHvap (at Tb)"), unit: "kJ/mol", digits: 4 },
    { key: "Hfus", term: "latent_heat", label: tr("융해열 ΔHfus", "Heat of fusion ΔHfus"), unit: "kJ/mol", digits: 4 },
    { key: "mw", term: "molar_mass", label: tr("분자량(원자단에서)", "Molar mass (from the groups)"), unit: "g/mol", digits: 6 },
    { key: "nA", label: tr("원자 수(H 포함)", "Number of atoms (with H)"), unit: "—", digits: 4 },
    { key: "cpText", label: tr("Cp° 다항식 계수", "Cp° polynomial coefficients"), type: "text" },
    { key: "breakdown", term: "group_contribution", label: tr("원자단별 기여", "Contribution by group"), type: "table" },
  ],
  compute(v) {
    const g = calcJobackCounts(v);
    if (g.error) return { error: g.error };
    const e = calcJobackEstimate(g.counts, g.atoms, v.TbKnown);
    const warnings = [];
    const missing = ["Tb", "Tc", "Pc", "Vc", "Hf", "Gf", "Tm", "Hvap", "Hfus"].filter(k => e[k] == null);
    if (missing.length || !e.cp) warnings.push(tr(`일부 원자단은 논문에 값이 없어 계산하지 않았습니다: ${[...missing, ...(e.cp ? [] : ["Cp"])].join(", ")}`,
      `Some groups have no value in the paper, so these were not computed: ${[...missing, ...(e.cp ? [] : ["Cp"])].join(", ")}`));
    if (v.T < CALC_JOBACK_CP_RANGE[0] || v.T > CALC_JOBACK_CP_RANGE[1]) warnings.push(tr("Cp 다항식은 약 273–1000 K 에서 맞춘 식입니다. 범위 밖 값은 믿기 어렵습니다.",
      "The Cp polynomial was fitted for about 273–1000 K. Values outside that range are unreliable."));
    warnings.push(tr("추정값입니다. 특히 Tb 는 수십 K 까지 틀릴 수 있고, Tc 는 실측 Tb 를 넣으면 훨씬 정확합니다. 실측·평가 자료가 있으면 그 값을 쓰십시오.",
      "These are estimates. Tb in particular can be off by tens of kelvin; Tc is much better with a measured Tb. Use measured or evaluated data when available."));
    const rows = Object.entries(g.counts).map(([code, n]) => {
      const grp = jobackFindGroup(code);
      return { group: `${grp.sym}`, n, Tb: grp.Tb == null ? null : n * grp.Tb, Tc: grp.Tc == null ? null : n * grp.Tc, Hf: grp.Hf == null ? null : n * grp.Hf };
    });
    return {
      Tb: e.Tb, Tc: e.Tc, Pc: e.Pc, Vc: e.Vc, Hf: e.Hf, Gf: e.Gf, Tm: e.Tm, Hvap: e.Hvap, Hfus: e.Hfus,
      cp: calcJobackCp(e.cp, v.T), mw: g.mw, nA: g.atoms,
      cpText: e.cp ? `Cp° = ${e.cp.map((c, i) => `${calcFormatNumber(c, 5)}${["", "·T", "·T²", "·T³"][i]}`).join(" + ").replace(/\+ -/g, "− ")}` : null,
      breakdown: {
        columns: [
          { key: "group", label: tr("원자단", "Group") }, { key: "n", label: tr("개수", "Count") },
          { key: "Tb", label: "ΣΔTb (K)", digits: 5 }, { key: "Tc", label: "ΣΔTc", digits: 4 }, { key: "Hf", label: "ΣΔHf (kJ/mol)", digits: 5 },
        ],
        rows,
      },
      warnings,
    };
  },
  chart: calcJobackChart,
  formula: [
    "Tb = 198.2 + ΣΔTb",
    "Tc = Tb / (0.584 + 0.965 ΣΔTc − (ΣΔTc)²)",
    tr("Pc [bar] = (0.113 + 0.0032 nA − ΣΔPc)⁻², nA = 원자 수(H 포함)", "Pc [bar] = (0.113 + 0.0032 nA − ΣΔPc)⁻², nA = number of atoms (including H)"),
    "Vc [cm³/mol] = 17.5 + ΣΔVc",
    "ΔHf° [kJ/mol] = 68.29 + ΣΔHf ;  ΔGf° = 53.88 + ΣΔGf",
    "Cp° [J/(mol·K)] = (Σa − 37.93) + (Σb + 0.210) T + (Σc − 3.91×10⁻⁴) T² + (Σd + 2.06×10⁻⁷) T³",
    "Tm = 122.5 + ΣΔTm ;  ΔHvap(Tb) = 15.30 + ΣΔHvap ;  ΔHfus = −0.88 + ΣΔHfus",
  ],
  notes: [
    tr("원자단 값은 Joback & Reid(1987) 표 그대로입니다(41개). 값이 없는 칸(예: −N= 비고리의 Vc·Cp, =NH 의 Tc·Pc)은 계산하지 않습니다.",
      "Group values are those of Joback & Reid (1987), 41 groups. Properties for which a group has no value (e.g. Vc and Cp of non-ring −N=, Tc and Pc of =NH) are not computed."),
    tr("SMILES 를 원자단으로 나누는 규칙은 thermo(Caleb Bell, MIT)의 Joback SMARTS 와 같은 뜻입니다. ChemSep 자료의 SMILES 552개 가운데 551개에서 같은 개수가 나오는 것을 시험으로 확인했습니다(오존만 다름).",
      "The rule that splits a SMILES into groups follows the Joback SMARTS of thermo (Caleb Bell, MIT). Tests confirm identical counts for 551 of 552 SMILES in the ChemSep databank (only ozone differs)."),
    tr("Joback 법은 큰 분자·다작용기 분자에서 오차가 커집니다. Tc 는 실측 Tb 를 넣으면 훨씬 정확합니다.",
      "Joback's method loses accuracy for large or multifunctional molecules. Tc is much better with a measured Tb."),
  ],
  reference: [
    "Joback, K.G. & Reid, R.C. (1987). Estimation of pure-component properties from group-contributions. Chem. Eng. Commun. 57, 233–243. doi:10.1080/00986448708960487",
    "Poling, B.E., Prausnitz, J.M. & O'Connell, J.P. (2001). The Properties of Gases and Liquids, 5th ed., McGraw-Hill — Ch. 2–3 (Joback method)",
    "Elliott, J.R., Diky, V., Knotts, T.A. IV & Wilding, W.V. (2023). The Properties of Gases and Liquids, 6th ed., McGraw-Hill — o-cresol example",
    tr("SMILES 원자단 규칙: thermo.group_contribution.joback (Caleb Bell, MIT), J. Biggs SMARTS", "SMILES group rules: thermo.group_contribution.joback (Caleb Bell, MIT), J. Biggs SMARTS"),
  ],
};

Object.assign(window, { CALC_DEF_JOBACK, calcJobackCounts, calcJobackEstimate, calcJobackCp, calcJobackMw, calcJobackChart });
