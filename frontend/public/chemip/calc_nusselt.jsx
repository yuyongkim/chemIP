// 계산기: 관 안 난류 강제대류 열전달계수 — Re, Pr, Nu (Dittus–Boelter 또는 Gnielinski), h = Nu·k/D.

function calcDittusBoelter(Re, Pr, heating) {
  return 0.023 * Math.pow(Re, 0.8) * Math.pow(Pr, heating ? 0.4 : 0.3);
}

// Gnielinski (1976), 매끈한 관 마찰계수는 Petukhov f = (0.790 ln Re − 1.64)⁻²
function calcGnielinski(Re, Pr) {
  const f = Math.pow(0.790 * Math.log(Re) - 1.64, -2);
  return (f / 8) * (Re - 1000) * Pr / (1 + 12.7 * Math.sqrt(f / 8) * (Math.pow(Pr, 2 / 3) - 1));
}

const CALC_DEF_NUSSELT = {
  key: "nusselt",
  group: "heat",
  title: tr("관 안 대류 열전달계수 (Nu)", "In-tube convection coefficient (Nu)"),
  summary: tr("원관 속 난류에서 레이놀즈·프란틀 수로 누셀트 수와 대류 열전달계수 h 를 구합니다. 열교환기 U 를 어림할 때 씁니다.",
    "Computes the Nusselt number and convective heat transfer coefficient h for turbulent flow in a circular tube from the Reynolds and Prandtl numbers. Useful for estimating an exchanger U."),
  inputs: [
    { key: "rho", label: tr("밀도 ρ", "Density ρ"), term: "density", dim: "density", unit: "kgm3", show: "kgm3", default: 998.2, positive: true, hint: tr("기본값은 20 °C 물", "Default is water at 20 °C") },
    { key: "v", label: tr("평균 유속 v", "Mean velocity v"), term: "mean_velocity", dim: "velocity", unit: "ms", show: "ms", default: 1, positive: true },
    { key: "D", label: tr("관 안지름 D", "Tube inside diameter D"), dim: "length", unit: "m", show: "mm", default: 25, positive: true },
    { key: "mu", label: tr("점도 μ", "Viscosity μ"), term: "viscosity", dim: "viscosity", unit: "Pas", show: "cP", default: 1.002, positive: true },
    { key: "cp", label: tr("비열 cp", "Specific heat cp"), term: "cp", unit: "kJ/(kg·K)", default: 4.182, positive: true },
    { key: "k", label: tr("열전도도 k", "Thermal conductivity k"), term: "thermal_conductivity", unit: "W/(m·K)", default: 0.598, positive: true },
    { key: "corr", type: "choice", label: tr("상관식", "Correlation"), default: "db",
      options: [{ v: "db", label: "Dittus–Boelter" }, { v: "gn", label: "Gnielinski" }] },
    { key: "dir", type: "choice", label: tr("유체가", "Fluid is"), default: "heat", when: c => c.corr === "db",
      options: [{ v: "heat", label: tr("가열됨 (n = 0.4)", "Heated (n = 0.4)") }, { v: "cool", label: tr("냉각됨 (n = 0.3)", "Cooled (n = 0.3)") }] },
  ],
  outputs: [
    { key: "h", label: tr("열전달계수 h", "Heat transfer coefficient h"), term: "convection_coeff", unit: "W/(m²·K)" },
    { key: "Nu", label: tr("누셀트 수 Nu", "Nusselt number Nu"), term: "nusselt", unit: "—" },
    { key: "Re", label: tr("레이놀즈 수 Re", "Reynolds number Re"), term: "reynolds", unit: "—" },
    { key: "Pr", label: tr("프란틀 수 Pr", "Prandtl number Pr"), term: "prandtl", unit: "—", digits: 4 },
  ],
  compute(v) {
    const Re = calcReynolds(v.rho, v.v, v.D, v.mu);
    const Pr = v.cp * 1000 * v.mu / v.k;
    const warnings = [];
    let Nu;
    if (v.corr === "db") {
      Nu = calcDittusBoelter(Re, Pr, v.dir === "heat");
      if (Re < 10000) warnings.push(tr("Dittus–Boelter 는 Re ≥ 10 000 에서 씁니다. 3000–10 000 은 Gnielinski 를 쓰십시오.",
        "Dittus–Boelter applies for Re ≥ 10 000. For 3000–10 000, use Gnielinski."));
      if (Pr < 0.6 || Pr > 160) warnings.push(tr("Dittus–Boelter 의 적용 범위(0.6 ≤ Pr ≤ 160) 밖입니다.", "Outside the Dittus–Boelter range (0.6 ≤ Pr ≤ 160)."));
    } else {
      Nu = calcGnielinski(Re, Pr);
      if (Re < 3000 || Re > 5e6) warnings.push(tr("Gnielinski 의 적용 범위(3000 ≤ Re ≤ 5×10⁶) 밖입니다.", "Outside the Gnielinski range (3000 ≤ Re ≤ 5×10⁶)."));
      if (Pr < 0.5 || Pr > 2000) warnings.push(tr("Gnielinski 의 적용 범위(0.5 ≤ Pr ≤ 2000) 밖입니다.", "Outside the Gnielinski range (0.5 ≤ Pr ≤ 2000)."));
    }
    if (Re < CALC_RE_LAMINAR) return { error: tr("층류입니다(Re < 2100). 이 난류 상관식을 쓸 수 없습니다. 완전 발달 층류는 Nu = 3.66(벽 온도 일정)입니다.",
      "Flow is laminar (Re < 2100), so these turbulent correlations do not apply. For fully developed laminar flow, Nu = 3.66 (constant wall temperature).") };
    return { h: Nu * v.k / v.D, Nu, Re, Pr, warnings };
  },
  formula: [
    "Re = ρ v D / μ,   Pr = cp μ / k,   h = Nu · k / D",
    tr("Dittus–Boelter: Nu = 0.023 Re^0.8 Pr^n  (가열 n = 0.4, 냉각 n = 0.3)", "Dittus–Boelter: Nu = 0.023 Re^0.8 Pr^n  (heating n = 0.4, cooling n = 0.3)"),
    "Gnielinski: Nu = (f/8)(Re − 1000) Pr / [1 + 12.7 (f/8)^½ (Pr^⅔ − 1)],  f = (0.790 ln Re − 1.64)⁻²",
  ],
  notes: [
    tr("매끈한 관, 완전 발달 흐름(L/D ≥ 10) 기준입니다. 물성은 유체의 평균(벌크) 온도 값을 넣습니다.",
      "Assumes a smooth tube and fully developed flow (L/D ≥ 10). Enter properties at the mean (bulk) fluid temperature."),
    tr("벽과 유체 온도 차가 크면 Dittus–Boelter 오차가 커집니다(최대 약 25 %). Gnielinski 가 보통 더 정확합니다(약 10 %).",
      "With a large wall-to-fluid temperature difference, Dittus–Boelter errors grow (up to about 25 %). Gnielinski is usually more accurate (about 10 %)."),
  ],
  reference: [
    tr("Incropera, DeWitt, Bergman & Lavine, Fundamentals of Heat and Mass Transfer 7판(2011), 8.5절 — 식 8.60 Dittus–Boelter, 식 8.62 Gnielinski, 식 8.21 Petukhov 마찰계수",
      "Incropera, DeWitt, Bergman & Lavine, Fundamentals of Heat and Mass Transfer, 7th ed. (2011), Sec. 8.5 — Eq. 8.60 Dittus–Boelter, Eq. 8.62 Gnielinski, Eq. 8.21 Petukhov friction factor"),
    "Dittus, F.W. & Boelter, L.M.K. (1930). Heat transfer in automobile radiators of the tubular type. Univ. Calif. Publ. Eng. 2, 443–461.",
    "Gnielinski, V. (1976). New equations for heat and mass transfer in turbulent pipe and channel flow. Int. Chem. Eng. 16, 359–368.",
  ],
};

Object.assign(window, { CALC_DEF_NUSSELT, calcDittusBoelter, calcGnielinski });
