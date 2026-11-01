// 계산기: 압축기 동력 — 등엔트로피·폴리트로픽, 토출 온도, 다단 압축(단마다 같은 압력비, 중간 냉각).
// 이상기체 + 입구 압축인자 Z 보정(w = Z·R·T/M·…)으로 단마다 일을 더한다. 기체 상수 R 은 CALC_CONST.

const CALC_COMP_MAX_STAGES = 8;
const CALC_COMP_T_WARN = 423.15;   // K — 토출 150 °C 이상이면 검토 안내(윤활유·밀봉재 한계; 문헌마다 150–180 °C)

// 단 하나: 입구 온도 Tin [K], 압력비 r → { w [J/kg], T2 [K] }.  p = { method, k, Rs(=Z·R/M) [J/(kg·K)], etaS, poly, etaP, n }
function calcCompStage(p, Tin, r) {
  if (p.method === "isentropic") {
    const m = (p.k - 1) / p.k;
    const ideal = Math.pow(r, m) - 1;
    return { w: p.Rs * Tin / m * ideal / p.etaS, T2: Tin * (1 + ideal / p.etaS), m };
  }
  // 폴리트로픽: n 직접(가역 폴리트로픽 일) 또는 ηp 에서 (n−1)/n = (k−1)/(k·ηp), 실제 일 = 폴리트로픽 수두 / ηp
  const m = p.poly === "n" ? (p.n - 1) / p.n : (p.k - 1) / (p.k * p.etaP);
  const head = p.Rs * Tin / m * (Math.pow(r, m) - 1);
  return { w: p.poly === "n" ? head : head / p.etaP, T2: Tin * Math.pow(r, m), m };
}

// N 단 — 첫 단 입구 T1, 다음 단은 중간 냉각 출구 Tic. → { w, T2max, T2last, rStage, Qic(J/kg 합), m }
function calcCompMultistage(p, T1, Tic, rTotal, N) {
  const rStage = Math.pow(rTotal, 1 / N);
  let w = 0, T2max = 0, T2last = T1, Qic = 0, m = null;
  for (let i = 0; i < N; i++) {
    const s = calcCompStage(p, i === 0 ? T1 : Tic, rStage);
    w += s.w; T2max = Math.max(T2max, s.T2); T2last = s.T2; m = s.m;
    if (i < N - 1) Qic += p.cp * (s.T2 - Tic);
  }
  return { w, T2max, T2last, rStage, Qic, m };
}

const CALC_COMP_WORK_UNIT = "kJ/kg";

function calcCompParams(v) {
  const Rs = v.Z * CALC_CONST.R / (v.M / 1000);
  return { method: v.method, k: v.k, Rs, cp: Rs * v.k / (v.k - 1), etaS: v.etaS / 100, poly: v.poly, etaP: v.etaP / 100, n: v.n };
}

const CALC_DEF_COMPRESSOR = {
  key: "compressor",
  group: "sizing",
  title: tr("압축기 동력 · 토출 온도", "Compressor power · discharge temperature"),
  summary: tr("기체 압축에 드는 일과 동력, 토출 온도를 등엔트로피 또는 폴리트로픽 모델로 구합니다. 다단 압축은 단마다 같은 압력비로 나누고 단 사이를 중간 냉각합니다.",
    "Computes the specific work, power and discharge temperature of gas compression with an isentropic or polytropic model. Multistage compression splits the ratio equally per stage with intercooling between stages."),
  inputs: [
    { key: "method", type: "choice", term: "isentropic_efficiency", label: tr("모델", "Model"), default: "isentropic",
      options: [{ v: "isentropic", label: tr("등엔트로피 + ηs", "Isentropic + ηs") }, { v: "polytropic", label: tr("폴리트로픽", "Polytropic") }] },
    { key: "M", term: "molar_mass", label: tr("분자량 M", "Molar mass M"), unit: "g/mol", default: 28.966, positive: true, hint: tr("공기 28.966", "Air 28.966") },
    { key: "k", term: "heat_capacity_ratio", label: tr("비열비 k = Cp/Cv", "Heat capacity ratio k = Cp/Cv"), unit: "—", default: 1.4, min: 1.0001, max: 1.8,
      hint: tr("이상기체 근삿값: 단원자 1.67, 이원자(공기·N₂·O₂) 1.40, CO₂ 1.29, CH₄ 1.31 (25 °C)", "Ideal-gas approximations: monatomic 1.67, diatomic (air, N₂, O₂) 1.40, CO₂ 1.29, CH₄ 1.31 (25 °C)") },
    { key: "Z", term: "compressibility", label: tr("입구 압축인자 Z", "Inlet compressibility factor Z"), unit: "—", default: 1, positive: true },
    { key: "T1", term: "absolute_temperature", label: tr("흡입 온도 T₁", "Suction temperature T₁"), dim: "temperature", unit: "K", show: "C", default: 26.85, positive: true },
    { key: "P1", term: "absolute_pressure", label: tr("흡입 압력 P₁ (절대)", "Suction pressure P₁ (absolute)"), dim: "pressure", unit: "Pa", show: "bar", default: 1, positive: true },
    { key: "P2", label: tr("토출 압력 P₂ (절대)", "Discharge pressure P₂ (absolute)"), dim: "pressure", unit: "Pa", show: "bar", default: 5, positive: true },
    { key: "mdot", term: "mass_flow", label: tr("질량 유량", "Mass flow"), dim: "massflow", unit: "kgs", show: "kgh", default: 3600, positive: true },
    { key: "etaS", term: "isentropic_efficiency", label: tr("등엔트로피 효율 ηs", "Isentropic efficiency ηs"), unit: "%", default: 75, positive: true, max: 100, when: v => v.method === "isentropic" },
    { key: "poly", type: "choice", term: "polytropic_efficiency", label: tr("폴리트로픽 입력", "Polytropic input"), default: "eta", when: v => v.method === "polytropic",
      options: [{ v: "eta", label: tr("효율 ηp", "Efficiency ηp") }, { v: "n", label: tr("지수 n", "Exponent n") }] },
    { key: "etaP", term: "polytropic_efficiency", label: tr("폴리트로픽 효율 ηp", "Polytropic efficiency ηp"), unit: "%", default: 78, positive: true, max: 100, when: v => v.method === "polytropic" && v.poly === "eta" },
    { key: "n", term: "polytropic_efficiency", label: tr("폴리트로픽 지수 n", "Polytropic exponent n"), unit: "—", default: 1.3, min: 1.0001, max: 3, when: v => v.method === "polytropic" && v.poly === "n" },
    { key: "N", term: "intercooling", label: tr("단 수 N", "Number of stages N"), unit: tr("단", "stages"), default: 1, min: 1, max: CALC_COMP_MAX_STAGES },
    { key: "Tic", term: "intercooling", label: tr("중간 냉각 후 온도", "Temperature after intercooler"), dim: "temperature", unit: "K", show: "C", default: "", positive: true, optional: true,
      hint: tr("비우면 흡입 온도까지 냉각(완전 중간 냉각)으로 봅니다.", "Leave blank for perfect intercooling back to the suction temperature.") },
    { key: "etaM", label: tr("기계 효율 ηm", "Mechanical efficiency ηm"), unit: "%", default: 98, positive: true, max: 100 },
  ],
  outputs: [
    { key: "w", label: tr("비일 (기체가 받는 일)", "Specific work (to the gas)"), unit: CALC_COMP_WORK_UNIT, digits: 4 },
    { key: "Pgas", label: tr("기체 동력", "Gas power"), dim: "power", unit: "W", show: "kW" },
    { key: "Pshaft", term: "shaft_power", label: tr("축동력", "Shaft power"), dim: "power", unit: "W", show: "kW" },
    { key: "T2", term: "discharge_temperature", label: tr("최고 토출 온도", "Highest discharge temperature"), dim: "temperature", unit: "K", show: "C" },
    { key: "rStage", term: "compression_ratio", label: tr("단당 압력비", "Pressure ratio per stage"), unit: "—" },
    { key: "nOut", term: "polytropic_efficiency", label: tr("폴리트로픽 지수 n", "Polytropic exponent n"), unit: "—" },
    { key: "Qic", label: tr("중간 냉각기 열량 합", "Total intercooler duty"), dim: "power", unit: "W", show: "kW" },
    { key: "w1", label: tr("1단 압축과 비교한 일", "Work compared with single stage"), unit: "%" },
  ],
  compute(v) {
    if (!(v.P2 > v.P1)) return { error: tr("토출 압력은 흡입 압력보다 높아야 합니다.", "The discharge pressure must be higher than the suction pressure.") };
    if (!Number.isInteger(v.N)) return { error: tr("단 수는 정수여야 합니다.", "The number of stages must be an integer.") };
    const p = calcCompParams(v);
    const Tic = v.Tic || v.T1;
    const r = v.P2 / v.P1;
    const res = calcCompMultistage(p, v.T1, Tic, r, v.N);
    const warnings = [];
    if (res.T2max > CALC_COMP_T_WARN) warnings.push(tr("토출 온도가 150 °C 를 넘습니다. 윤활·밀봉·자연발화 한계를 검토하고 단 수를 늘리는 것을 고려하십시오.", "The discharge temperature exceeds 150 °C. Check lubricant, seal and autoignition limits and consider more stages."));
    if (res.rStage > 4) warnings.push(tr("단당 압력비가 4 를 넘습니다. 왕복동·원심 압축기의 통상 단당 압력비보다 큽니다.", "The pressure ratio per stage exceeds 4, higher than usual for reciprocating or centrifugal stages."));
    if (Tic > v.T1 + 1e-9 && v.N === 1) warnings.push(tr("단이 하나라 중간 냉각 온도는 쓰지 않았습니다.", "With one stage the intercooler temperature is not used."));
    const out = {
      w: res.w / 1000, Pgas: res.w * v.mdot, Pshaft: res.w * v.mdot / (v.etaM / 100), T2: res.T2max, rStage: res.rStage,
      Qic: v.N > 1 ? res.Qic * v.mdot : null, warnings,
    };
    if (v.method === "polytropic") out.nOut = 1 / (1 - res.m);
    if (v.N > 1) out.w1 = 100 * res.w / calcCompMultistage(p, v.T1, Tic, r, 1).w;
    return out;
  },
  chart(v, o) {
    const p = calcCompParams(v);
    const Tic = v.Tic || v.T1;
    const r = v.P2 / v.P1;
    const ns = Array.from({ length: CALC_COMP_MAX_STAGES }, (_, i) => i + 1);
    return {
      x: { label: tr("단 수 N", "Number of stages N"), unit: "—", min: 1, max: CALC_COMP_MAX_STAGES },
      y: { label: tr("비일", "Specific work"), unit: CALC_COMP_WORK_UNIT, min: 0 },
      series: [
        { key: "w", label: tr("중간 냉각 다단 압축의 비일", "Specific work with intercooling"), kind: "scatter", points: ns.map(n => [n, calcCompMultistage(p, v.T1, Tic, r, n).w / 1000]) },
        { key: "iso", label: tr("등온 압축 한계 (Z·R·T₁/M·ln r)", "Isothermal limit (Z·R·T₁/M·ln r)"), dashed: true, points: [[1, p.Rs * v.T1 * Math.log(r) / 1000], [CALC_COMP_MAX_STAGES, p.Rs * v.T1 * Math.log(r) / 1000]] },
      ],
      markers: [{ x: v.N, y: o.w, label: tr("현재", "Current") }],
      ariaLabel: tr("단 수에 따른 압축 비일", "Compression work versus number of stages"),
    };
  },
  formula: [
    tr("등엔트로피: w = Z·(R/M)·T₁·k/(k−1)·(r^((k−1)/k) − 1) / ηs,  T₂ = T₁·[1 + (r^((k−1)/k) − 1)/ηs]", "Isentropic: w = Z·(R/M)·T₁·k/(k−1)·(r^((k−1)/k) − 1) / ηs, T₂ = T₁·[1 + (r^((k−1)/k) − 1)/ηs]"),
    tr("폴리트로픽: (n−1)/n = (k−1)/(k·ηp),  w = Z·(R/M)·T₁·n/(n−1)·(r^((n−1)/n) − 1) / ηp,  T₂ = T₁·r^((n−1)/n)", "Polytropic: (n−1)/n = (k−1)/(k·ηp), w = Z·(R/M)·T₁·n/(n−1)·(r^((n−1)/n) − 1) / ηp, T₂ = T₁·r^((n−1)/n)"),
    tr("n 을 직접 넣으면 가역 폴리트로픽 일(ηp 로 나누지 않음)", "With n entered directly: reversible polytropic work (not divided by ηp)"),
    tr("다단: r_단 = (P₂/P₁)^(1/N), 2단부터 입구 온도 = 중간 냉각 후 온도", "Multistage: r_stage = (P₂/P₁)^(1/N); from stage 2 the inlet temperature is the intercooler outlet"),
    tr("동력 = ṁ·w,  축동력 = ṁ·w / ηm", "Power = ṁ·w, shaft power = ṁ·w / ηm"),
  ],
  notes: [
    tr("이상기체에 입구 Z 를 곱한 근사입니다. 고압·실기체는 상태방정식이나 몰리에 선도로 다시 계산하십시오. k 는 평균 온도의 값을 쓰십시오.",
      "This is an ideal-gas model scaled by the inlet Z. For high pressures or real gases, recalculate with an equation of state or a Mollier chart. Use k at the mean temperature."),
    tr("단 사이 압력 손실과 중간 냉각기에서 응축되는 수분은 셈하지 않습니다.", "Interstage pressure losses and moisture condensed in the intercoolers are not included."),
  ],
  reference: [
    tr("Çengel, Y.A. & Boles, M.A. Thermodynamics: An Engineering Approach, 7장 — 예제 7-13 압축 일(등엔트로피·폴리트로픽·2단)", "Çengel, Y.A. & Boles, M.A. Thermodynamics: An Engineering Approach, Ch. 7 — Example 7-13 work of compression (isentropic, polytropic, two-stage)"),
    tr("Towler, G. & Sinnott, R. (2013). Chemical Engineering Design, 2판, 20장 압축기", "Towler, G. & Sinnott, R. (2013). Chemical Engineering Design, 2nd ed., Ch. 20 Compressors"),
    tr("McCabe, W.L., Smith, J.C. & Harriott, P. (2005). Unit Operations of Chemical Engineering, 7판, 8장", "McCabe, W.L., Smith, J.C. & Harriott, P. (2005). Unit Operations of Chemical Engineering, 7th ed., Ch. 8"),
  ],
};

Object.assign(window, { CALC_DEF_COMPRESSOR, calcCompStage, calcCompMultistage });
