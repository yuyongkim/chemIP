// 공학 단위 변환기(calc_units_converter.jsx)의 기체 유량·기체 농도 환산 — 기준 조건·분자량이 필요해 선형 표(calc_units.jsx)로 못 쓰는 것.
// 순수 함수 + 데이터만(React 없음). 기준은 몰 유량 kmol/h(기체 유량)와 ppm(부피, 농도). 이상기체 n = P·V / (Z·R·T).

// 표준 체적의 기준 조건 [K, Pa]. Nm³ = DIN 1343(0 °C, 101.325 kPa), Sm³ 는 고를 수 있다, SCF 는 60 °F·14.696 psia(GPSA).
const CALC_GAS_REFS = {
  normal: { T: 273.15, P: 101325 },
  s15: { T: 288.15, P: 101325, label: tr("15 °C, 101.325 kPa (ISO 13443)", "15 °C, 101.325 kPa (ISO 13443)") },
  s20: { T: 293.15, P: 101325, label: tr("20 °C, 101.325 kPa", "20 °C, 101.325 kPa") },
  s60f: { T: (60 + 459.67) * 5 / 9, P: 101325, label: tr("60 °F, 14.696 psia (미국 가스 업계)", "60 °F, 14.696 psia (US gas industry)") },
  scf: { T: (60 + 459.67) * 5 / 9, P: 101325 },
};

const CALC_FT3 = 0.028316846592;   // m³ (NIST SP 811)

// 기체 유량 단위: 1 단위 = 몇 m³/h(체적, 기준 조건 ref) 또는 kg/h·kmol/h. 화면 순서 그대로.
const CALC_GAS_FLOW_UNITS = [
  { v: "Nm3h", label: "Nm³/h", ref: "normal", m3h: 1, term: "normal_m3" },
  { v: "Sm3h", label: "Sm³/h", ref: "std", m3h: 1, term: "standard_m3" },
  { v: "Am3h", label: tr("m³/h (실제 조건)", "Am³/h (actual)"), ref: "actual", m3h: 1, term: "actual_m3" },
  { v: "scfm", label: "SCFM", ref: "scf", m3h: CALC_FT3 * 60, term: "standard_cubic_feet" },
  { v: "mmscfd", label: "MMSCFD", ref: "scf", m3h: 1e6 * CALC_FT3 / 24, term: "standard_cubic_feet" },
  { v: "kgh", label: "kg/h", mass: true, term: "mass_flow" },
  { v: "kmolh", label: "kmol/h", molar: true, term: "molar_flow" },
];

// 체적 기준 조건 → { T, P, Z }. p: { sref, Tg, Pg, Z } (기준 단위)
function calcGasBasis(unit, p) {
  if (unit.ref === "actual") return { T: p.Tg, P: p.Pg, Z: p.Z || 1 };
  const r = CALC_GAS_REFS[unit.ref === "std" ? p.sref : unit.ref];
  return { T: r.T, P: r.P, Z: 1 };
}

// 기체 몰부피 [m³/kmol] = Z·R·T/P × 1000 (R 은 J/(mol·K))
function calcGasMolarVolume(b) {
  return b.Z * CALC_CONST.R * b.T / b.P * 1000;
}

function calcGasUnit(v) {
  return CALC_GAS_FLOW_UNITS.find(u => u.v === v);
}

// 값(unit) → kmol/h. p: { mw [g/mol], sref, Tg [K], Pg [Pa], Z }
function calcGasToKmolh(value, unitKey, p) {
  const u = calcGasUnit(unitKey);
  if (u.molar) return value;
  if (u.mass) return value / p.mw;
  return value * u.m3h / calcGasMolarVolume(calcGasBasis(u, p));
}

// kmol/h → 값(unit)
function calcGasFromKmolh(n, unitKey, p) {
  const u = calcGasUnit(unitKey);
  if (u.molar) return n;
  if (u.mass) return n * p.mw;
  return n * calcGasMolarVolume(calcGasBasis(u, p)) / u.m3h;
}

// 기체 농도 단위: 1 단위 = ppm 몇(부피 기준), 또는 질량 농도 mg/m³ 몇(분자량·몰부피 필요). 화면 순서 그대로.
const CALC_GAS_CONC_UNITS = [
  { v: "ppm", label: "ppm", ppm: 1, term: "ppm" },
  { v: "ppb", label: "ppb", ppm: 1e-3, term: "ppm" },
  { v: "pct", label: "vol%", ppm: 1e4, term: "ppm" },
  { v: "mgm3", label: "mg/m³", mgm3: 1, term: "mgm3" },
  { v: "ugm3", label: "µg/m³", mgm3: 1e-3, term: "mgm3" },
  { v: "gm3", label: "g/m³", mgm3: 1e3, term: "mgm3" },
];

// 값(unit) → ppm. mw [g/mol], vmL [L/mol] (calcMolarVolumeL, calc_physics.jsx)
function calcConcToPpm(value, unitKey, mw, vmL) {
  const u = CALC_GAS_CONC_UNITS.find(x => x.v === unitKey);
  return u.ppm ? value * u.ppm : calcMgm3ToPpm(value * u.mgm3, mw, vmL);
}

function calcConcFromPpm(ppm, unitKey, mw, vmL) {
  const u = CALC_GAS_CONC_UNITS.find(x => x.v === unitKey);
  return u.ppm ? ppm / u.ppm : calcPpmToMgm3(ppm, mw, vmL) / u.mgm3;
}

Object.assign(window, {
  CALC_GAS_REFS, CALC_GAS_FLOW_UNITS, CALC_GAS_CONC_UNITS, calcGasBasis, calcGasMolarVolume, calcGasToKmolh, calcGasFromKmolh,
  calcConcToPpm, calcConcFromPpm,
});
