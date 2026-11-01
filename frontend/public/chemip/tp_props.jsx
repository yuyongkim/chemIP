// 온도별 물성 · 자료 정의(문구 없음 — 이름은 tp_labels*.jsx 의 TP_LABELS.props/curves/units).
//   TP_PROPS: 그래프 묶음 하나 = 한 줄. curves = 파일 curves[].p 값들(앞에서부터, 같은 묶음 한 그래프), alt = curves 가 없을 때 쓸 p.
//             q = 물리량(TP_UNITS 의 키), log = 세로축 로그. 새 물성 = 한 줄 + 문구 한 쌍.
//   TP_UNITS: 물리량 → 단위 모드별 { u: 단위 key(문구는 TP_LABELS.units), f: 기준 단위 → 표시 배수, mass?: 분자량으로 나눔(g/mol → kg/mol) }.
//             기준 단위(파일과 같음): K · Pa · mol/m³ · J/(mol·K) · J/mol · Pa·s · W/(m·K) · N/m.
//   TP_UNIT_MODES: 단위 고르기 단추(molar = K·몰 기준, mass = °C·질량 기준 — 분자량이 있어야 고를 수 있다).

const TP_PROPS = [
  { k: "psat", curves: ["psat"], alt: ["psat_antoine"], q: "pressure", log: true },
  { k: "rho_l", curves: ["rho_l"], q: "density" },
  { k: "cp", curves: ["cp_ig", "cp_l"], q: "cp" },
  { k: "hvap", curves: ["hvap"], q: "energy" },
  { k: "mu", curves: ["mu_l", "mu_g"], q: "viscosity", log: true },
  { k: "k", curves: ["k_l", "k_g"], q: "conductivity" },
  { k: "sigma", curves: ["sigma"], q: "tension" },
];

const TP_UNIT_MODES = ["molar", "mass"];

const TP_UNITS = {
  temperature: { molar: { u: "K", f: 1, off: 0 }, mass: { u: "C", f: 1, off: -273.15 } },
  pressure: { molar: { u: "kPa", f: 1e-3 }, mass: { u: "kPa", f: 1e-3 } },
  density: { molar: { u: "kmol_m3", f: 1e-3 }, mass: { u: "kg_m3", f: 1e-3, mass: "mul" } },          // mol/m³ × kg/mol
  cp: { molar: { u: "J_molK", f: 1 }, mass: { u: "kJ_kgK", f: 1, mass: "div" } },                      // J/(mol·K) ÷ g/mol = kJ/(kg·K)
  energy: { molar: { u: "kJ_mol", f: 1e-3 }, mass: { u: "kJ_kg", f: 1, mass: "div" } },                // J/mol ÷ g/mol = kJ/kg
  viscosity: { molar: { u: "mPas", f: 1e3 }, mass: { u: "mPas", f: 1e3 } },
  conductivity: { molar: { u: "W_mK", f: 1 }, mass: { u: "W_mK", f: 1 } },
  tension: { molar: { u: "mN_m", f: 1e3 }, mass: { u: "mN_m", f: 1e3 } },
  entropy: { molar: { u: "J_molK", f: 1 }, mass: { u: "kJ_kgK", f: 1, mass: "div" } },
};

// 그래프 기본 묶음 순서(파일에 있는 것만 보인다), 처음 고른 묶음
const TP_DEFAULT_PROP = "psat";
const TP_CHART_POINTS = 60;
const TP_DEFAULT_T = 298.15;   // K (25 °C)

Object.assign(window, { TP_PROPS, TP_UNIT_MODES, TP_UNITS, TP_DEFAULT_PROP, TP_CHART_POINTS, TP_DEFAULT_T });
