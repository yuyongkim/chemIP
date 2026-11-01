// 계산기: 증기운 폭발(VCE) 과압 — TNT 당량(수율 η, Kinney–Graham 맞춤식), Baker–Strehlow–Tang(Pierorazio 2005 화염 속도 표,
// NOAA ALOHA 맞춤식), EPA RMP 식 C-2 1 psi 거리. 거리별 과압 그래프. 공용 식은 calc_blast_curves.jsx·calc_fire_common.jsx.

const CALC_VCE_KG_PER_LB = 0.45359237;

// 입력(기준 단위) → 두 모델의 거리별 과압 함수 [Pa]
function calcVceModel(v) {
  const Pa = CALC_CONST.atm;
  const W = (v.eta / 100) * v.M * v.dHc / CALC_TNT_ENERGY.cl;                 // kg TNT
  const pTnt = r => Pa * calcKinneyGraham(r / Math.cbrt(W));
  const mach = v.mach || calcBstMach(v.conf, v.react, v.cong);
  const E = Number(v.refl) * (v.fc / 100) * v.M * v.dHc;                       // J
  const xbar = r => r * Math.cbrt(Pa / E);
  const pBst = r => Pa * calcBstOverpressure(mach, xbar(r));
  return { W, pTnt, mach, E, xbar, pBst };
}

function calcVceChart(v, out) {
  const m = calcVceModel(v);
  const far = [out.d_tnt_1psi, out.d_bst_1psi, v.R].filter(Number.isFinite);
  const hi = 1.5 * Math.max(...far);
  const lo = hi / 300;
  const pts = f => calcChartRange(lo, hi, 90, true).map(r => [r, f(r) / 1000]).filter(([, p]) => p > 0);
  return {
    x: { label: tr("폭발 중심에서 거리", "Distance from explosion centre"), unit: "m", log: true },
    y: { label: tr("최고 측면 과압", "Peak side-on overpressure"), unit: "kPa", log: true },
    series: [
      { key: "tnt", label: tr(`TNT 당량 (η ${v.eta} %)`, `TNT equivalent (η ${v.eta} %)`), points: pts(m.pTnt) },
      { key: "bst", label: `BST (Mf ${calcFormatNumber(m.mach, 3)})`, points: pts(m.pBst), dashed: true },
    ],
    hlines: CALC_BLAST_LEVELS.map(l => ({ y: l.p, label: l.label })),
    vlines: [{ x: v.R, label: tr("표적", "Target") }],
    ariaLabel: tr("증기운 폭발 거리별 과압", "Vapour cloud explosion overpressure against distance"),
  };
}

const CALC_VCE_LEVEL_OUT = (model, name) => CALC_BLAST_LEVELS.map(l => ({
  key: `d_${model}_${l.key}`, label: tr(`${l.label.split(" · ")[0]} 거리 · ${name}`, `${l.label.split(" · ")[0]} distance · ${name}`),
  term: "blast_threshold", dim: "length", unit: "m", show: "m", digits: 3,
}));

const CALC_DEF_VCE = {
  key: "vce",
  group: "fire",
  title: tr("증기운 폭발 과압 (TNT · BST)", "Vapour cloud explosion overpressure (TNT · BST)"),
  summary: tr("누출된 가연성 증기운이 터질 때 거리별 최고 과압을 TNT 당량법과 Baker–Strehlow–Tang(BST)법으로 구하고, 1 / 3.5 / 8 psi 거리와 EPA RMP 1 psi 거리를 찾습니다. 참고용 스크리닝입니다.",
    "Estimates the peak overpressure against distance for an ignited flammable vapour cloud with the TNT-equivalence and Baker–Strehlow–Tang (BST) methods, and finds the 1 / 3.5 / 8 psi distances and the EPA RMP 1 psi distance. Screening only."),
  inputs: [
    { key: "M", label: tr("증기운 연료 질량", "Fuel mass in the cloud"), term: "mass_quantity", dim: "mass", unit: "kg", show: "kg", default: 1000, positive: true,
      hint: tr("RMP 최악 시나리오는 저장량 전부. 누출량 계산기 결과를 넣을 수 있습니다", "The RMP worst case uses the whole inventory. You can use the result of the release calculator") },
    { key: "dHc", label: tr("연소열 ΔHc", "Heat of combustion ΔHc"), term: "heat_of_combustion", dim: "spenergy", unit: "Jkg", show: "kJkg", default: 46333, positive: true,
      hint: tr("기본값은 프로페인 46 333 kJ/kg (EPA RMP 예제 16)", "Default is propane, 46,333 kJ/kg (EPA RMP Example 16)") },
    { key: "eta", label: tr("TNT 수율 η", "TNT yield η"), term: "explosion_yield", unit: "%", default: 10, min: 0.1, max: 100,
      hint: tr("보통 1–10 %. EPA RMP 최악 시나리오는 10 %", "Typically 1–10 %. The EPA RMP worst case uses 10 %") },
    { key: "conf", type: "choice", label: tr("BST 가둠 정도", "BST confinement"), term: "confinement", default: "3D",
      options: [{ v: "3D", label: tr("3D (열린 공간)", "3D (open)") }, { v: "2.5D", label: "2.5D" }, { v: "2D", label: tr("2D (위·아래 막힘)", "2D (bounded above and below)") }] },
    { key: "react", type: "choice", label: tr("연료 반응성", "Fuel reactivity"), term: "fuel_reactivity", default: "medium",
      options: [{ v: "low", label: tr("낮음 (메테인·CO)", "Low (methane, CO)") }, { v: "medium", label: tr("중간", "Medium") }, { v: "high", label: tr("높음 (수소·아세틸렌·에틸렌 등)", "High (hydrogen, acetylene, ethylene…)") }] },
    { key: "cong", type: "choice", label: tr("장애물 혼잡도", "Obstacle congestion"), term: "congestion", default: "medium",
      options: [{ v: "low", label: tr("낮음", "Low") }, { v: "medium", label: tr("중간", "Medium") }, { v: "high", label: tr("높음", "High") }] },
    { key: "mach", label: tr("화염 마하수 Mf (선택, 직접)", "Flame Mach number Mf (optional override)"), term: "flame_mach", unit: "—", default: "", optional: true, positive: true, max: 5.2,
      hint: tr("비우면 위 세 항목으로 Pierorazio(2005) 표에서 고릅니다", "If blank, taken from the Pierorazio (2005) table using the three choices above") },
    { key: "fc", label: tr("BST 참여 연료 비율", "BST fuel fraction involved"), term: "congested_mass", unit: "%", default: 100, min: 0.1, max: 100,
      hint: tr("혼잡 구역 안 연료만 넣습니다. ALOHA 는 가연 범위 질량의 20 %", "Only fuel inside congested regions. ALOHA uses 20 % of the flammable mass") },
    { key: "refl", type: "choice", label: tr("지면 반사 (BST 에너지)", "Ground reflection (BST energy)"), term: "ground_reflection", default: "2",
      options: [{ v: "2", label: tr("× 2 (지면 증기운)", "× 2 (cloud at ground)") }, { v: "1", label: tr("× 1 (공중)", "× 1 (elevated)") }] },
    { key: "R", label: tr("표적 거리", "Target distance"), term: "target_distance", dim: "length", unit: "m", show: "m", default: 100, positive: true },
  ],
  outputs: [
    { key: "W", label: tr("TNT 당량", "TNT equivalent"), term: "tnt_equivalent", dim: "mass", unit: "kg", show: "kg", digits: 4 },
    { key: "z", label: tr("환산 거리 z (표적)", "Scaled distance z (target)"), term: "scaled_distance", unit: "m/kg^(1/3)", digits: 3 },
    { key: "p_tnt", label: tr("표적 과압 · TNT", "Target overpressure · TNT"), term: "side_on_overpressure", dim: "pressure", unit: "Pa", show: "kPa", digits: 3 },
    ...CALC_VCE_LEVEL_OUT("tnt", "TNT"),
    { key: "d_rmp", label: tr("1 psi 거리 · EPA RMP 식 C-2 (수율 10 %)", "1 psi distance · EPA RMP Eq. C-2 (10 % yield)"), term: "rmp_endpoint", dim: "length", unit: "m", show: "m", digits: 3 },
    { key: "mach_out", label: tr("BST 화염 마하수 Mf", "BST flame Mach number Mf"), term: "flame_mach", unit: "—", digits: 3 },
    { key: "E", label: tr("BST 폭발 에너지", "BST blast energy"), term: "blast_energy", dim: "energy", unit: "J", show: "MJ", digits: 4 },
    { key: "xbar", label: tr("Sachs 환산 거리 (표적)", "Sachs scaled distance (target)"), term: "sachs_scaled_distance", unit: "—", digits: 3 },
    { key: "p_bst", label: tr("표적 과압 · BST", "Target overpressure · BST"), term: "side_on_overpressure", dim: "pressure", unit: "Pa", show: "kPa", digits: 3 },
    ...CALC_VCE_LEVEL_OUT("bst", "BST"),
  ],
  compute(v) {
    const m = calcVceModel(v);
    const warnings = [];
    const out = { W: m.W, z: v.R / Math.cbrt(m.W), p_tnt: m.pTnt(v.R), mach_out: m.mach, E: m.E, xbar: m.xbar(v.R), p_bst: m.pBst(v.R) };
    out.d_rmp = calcRmpVce1psiMiles(v.M / CALC_VCE_KG_PER_LB, v.dHc / 1000) * 1609.344;
    const unreached = [];
    CALC_BLAST_LEVELS.forEach(l => {
      out[`d_tnt_${l.key}`] = calcFiniteOrUndef(calcSolveDistance(m.pTnt, l.p * 1000, 1e-3, 1e6));
      const d = calcSolveDistance(m.pBst, l.p * 1000, 1e-3, 1e6);
      out[`d_bst_${l.key}`] = calcFiniteOrUndef(d);
      if (d == null) unreached.push(l.label.split(" · ")[0]);
    });
    if (unreached.length) warnings.push(tr(`BST(Mf ${calcFormatNumber(m.mach, 3)}) 근거리 최대 과압이 ${unreached.join(" · ")} 보다 낮아 그 거리는 없습니다.`,
      `The BST near-field maximum overpressure (Mf ${calcFormatNumber(m.mach, 3)}) is below ${unreached.join(" · ")}, so that distance does not exist.`));
    if (m.mach < CALC_BST_FITS[0].mach) warnings.push(tr("Mf 가 0.2 보다 작아 0.2 곡선을 썼습니다(과대 = 보수적).", "Mf is below 0.2, so the 0.2 curve is used (overestimate, conservative)."));
    if (out.z < 1) warnings.push(tr("환산 거리 z 가 1 m/kg^(1/3) 보다 작은 근거리는 증기운 안쪽이라 TNT 당량법이 맞지 않습니다.",
      "At scaled distances below 1 m/kg^(1/3) the target is within the cloud, where the TNT-equivalence method is not valid."));
    return { ...out, warnings };
  },
  chart: calcVceChart,
  links: (v, o) => [
    { calc: "probit_harm", values: { kind: "blast", p: o.p_tnt / 1000 }, label: tr("표적 과압(TNT)으로 과압 probit", "Overpressure probits at the target (TNT)") },
    { calc: "probit_harm", values: { kind: "blast", p: o.p_bst / 1000 }, label: tr("표적 과압(BST)으로 과압 probit", "Overpressure probits at the target (BST)") },
  ],
  formula: [
    tr("TNT 당량 W = η · M · ΔHc / E_TNT,  E_TNT = 4 686 kJ/kg;  z = R / W^(1/3)", "TNT equivalent W = η · M · ΔHc / E_TNT,  E_TNT = 4,686 kJ/kg;  z = R / W^(1/3)"),
    "Kinney–Graham p_s/p_a = 1616 [1 + (z/4.5)²] / √{ [1 + (z/0.048)²] [1 + (z/0.32)²] [1 + (z/1.35)²] }",
    tr("EPA RMP 식 C-2: D[mi] = 0.0081 · [0.1 · W_lb · (ΔHc / 4 680)]^(1/3)", "EPA RMP Eq. C-2: D[mi] = 0.0081 · [0.1 · W_lb · (ΔHc / 4,680)]^(1/3)"),
    tr("BST 에너지 E = (지면 반사) · (참여 비율) · M · ΔHc;  Sachs 환산 거리 x = R (P_a / E)^(1/3)", "BST energy E = (ground reflection) · (fraction involved) · M · ΔHc;  Sachs scaled distance x = R (P_a / E)^(1/3)"),
    tr("BST 곡선(ALOHA 맞춤식): x < x₀ 이면 ΔP/P_a = D, 아니면 ΔP/P_a = A · B^(1/x) · x^C (Mf 0.2 · 0.35 · 0.7 · 5.2, 사이는 ln ΔP 직선 보간)",
      "BST curves (ALOHA fits): ΔP/P_a = D for x < x₀, otherwise ΔP/P_a = A · B^(1/x) · x^C (Mf 0.2 · 0.35 · 0.7 · 5.2; ln ΔP interpolated in between)"),
  ],
  notes: [
    CALC_FIRE_NOTES.screening,
    tr("TNT 당량법은 원거리용입니다. 근거리 과압·충격량은 실제 증기운 폭발보다 크게 나오며 수율 η 에 따라 크게 달라집니다.",
      "The TNT-equivalence method is meant for the far field. Near-field overpressure is overpredicted relative to real vapour cloud explosions, and results depend strongly on the yield η."),
    tr("BST 는 혼잡 구역의 화염 가속을 반영합니다. 혼잡 구역이 여러 곳이면 구역마다 따로 계산합니다. DDT(폭굉 전이)는 Mf 5.2 로 둡니다.",
      "BST reflects flame acceleration in congested regions. Calculate each congested region separately. DDT (deflagration-to-detonation transition) is taken as Mf 5.2."),
    tr("TNO 다중에너지법은 공개된 곡선 맞춤식을 확인하지 못해 넣지 않았습니다(곡선 그림은 옮기지 않습니다). 충격량도 확인된 맞춤식이 없어 과압만 냅니다.",
      "The TNO Multi-Energy method is not included because a published curve fit could not be confirmed (its figures are not digitised). Impulse is also omitted for lack of a confirmed fit; only overpressure is given."),
    CALC_FIRE_NOTES.endpoint,
    tr("과압 피해 확률은 '피해 probit' 계산기에 과압을 넣어 구합니다.", "For the probability of harm, enter the overpressure in the 'Harm probits' calculator."),
  ],
  reference: [
    "Kinney, G.F., Graham, K.J. (1985). Explosive Shocks in Air, 2nd ed. Springer.",
    tr("Crowl & Louvar, Chemical Process Safety 3판(2011), 6장 폭발 — TNT 당량법", "Crowl & Louvar, Chemical Process Safety, 3rd ed. (2011), Ch. 6 Explosions — TNT equivalency"),
    tr("U.S. EPA (1999/2009). Risk Management Program Guidance for Offsite Consequence Analysis — 부록 C 식 C-2, 예제 16(프로페인 50 000 lb → 0.3 mi)",
      "U.S. EPA (1999/2009). Risk Management Program Guidance for Offsite Consequence Analysis — Appendix C Eq. C-2, Example 16 (propane 50,000 lb → 0.3 mi)"),
    "Tang, M.J., Baker, Q.A. (1999). A new set of blast curves from vapor cloud explosion. Process Safety Progress 18(4), 235–240.",
    "Pierorazio, A.J., Thomas, J.K., Baker, Q.A., Ketchum, D.E. (2005). An update to the Baker–Strehlow–Tang vapor cloud explosion prediction methodology flame speed table. Process Safety Progress 24(1), 59–65.",
    tr("Jones, R., Lehr, W., Simecek-Beatty, D., Reynolds, M. (2013). ALOHA 5.4.4 Technical Documentation. NOAA Tech. Memo. NOS OR&R 43 — 5.2절 표 14·15 (BST 맞춤식, 미국 정부 저작물)",
      "Jones, R., Lehr, W., Simecek-Beatty, D., Reynolds, M. (2013). ALOHA 5.4.4 Technical Documentation. NOAA Tech. Memo. NOS OR&R 43 — §5.2 Tables 14–15 (BST curve fits, U.S. government work)"),
  ],
};

Object.assign(window, { CALC_DEF_VCE, calcVceModel, calcVceChart });
