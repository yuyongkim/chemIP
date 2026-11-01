// 공학 계산기 — 둘 이상의 계산기가 함께 쓰는 순수 물리 함수. 입력·출력은 모두 SI(K, Pa, m, kg, s).
// 상수는 calc_units.jsx 의 CALC_CONST 에서 읽는다.

// 이상기체 몰부피 [L/mol] = R·T/P. 25 °C·101.325 kPa 이면 24.465 L/mol(관례값 24.45 와 0.06 % 차이).
function calcMolarVolumeL(T, P) {
  return CALC_CONST.R * T / P * 1000;
}

// 기체 농도 ppm(부피) ↔ mg/m³: mg/m³ = ppm × M[g/mol] / Vm[L/mol].
function calcPpmToMgm3(ppm, mw, vmL) {
  return ppm * mw / vmL;
}
function calcMgm3ToPpm(mgm3, mw, vmL) {
  return mgm3 * vmL / mw;
}

// 레이놀즈 수 Re = ρ·v·D / μ
function calcReynolds(rho, v, D, mu) {
  return rho * v * D / mu;
}

// 원관 흐름 구분 — 층류 Re < 2100, 난류 Re > 4000, 그 사이 천이(McCabe, Smith & Harriott, Unit Operations 7판 "유체 흐름 현상").
const CALC_RE_LAMINAR = 2100;
const CALC_RE_TURBULENT = 4000;
function calcFlowRegime(Re) {
  if (Re < CALC_RE_LAMINAR) return "laminar";
  if (Re > CALC_RE_TURBULENT) return "turbulent";
  return "transition";
}

// 물의 포화 압력 ↔ 포화 온도 — IAPWS-IF97 4영역(포화선) 명시식. T [K] 273.15–647.096, P [Pa] 611.213 Pa–22.064 MPa.
// 계수 n1–n10: Wagner et al. (2000) J. Eng. Gas Turbines Power 122, 150–182, 식 30·31 / 표 34.
const CALC_IF97_N = [
  0.11670521452767e4, -0.72421316703206e6, -0.17073846940092e2, 0.12020824702470e5, -0.32325550322333e7,
  0.14915108613530e2, -0.48232657361591e4, 0.40511340542057e6, -0.23855557567849, 0.65017534844798e3,
];
const CALC_IF97_RANGE = { Tmin: 273.15, Tmax: 647.096, Pmin: 611.213, Pmax: 22.064e6 };

function calcWaterPsat(T) {
  const n = CALC_IF97_N;
  const th = T + n[8] / (T - n[9]);
  const A = th * th + n[0] * th + n[1];
  const B = n[2] * th * th + n[3] * th + n[4];
  const C = n[5] * th * th + n[6] * th + n[7];
  return Math.pow(2 * C / (-B + Math.sqrt(B * B - 4 * A * C)), 4) * 1e6;
}

function calcWaterTsat(P) {
  const n = CALC_IF97_N;
  const b = Math.pow(P / 1e6, 0.25);
  const E = b * b + n[2] * b + n[5];
  const F = n[0] * b * b + n[3] * b + n[6];
  const G = n[1] * b * b + n[4] * b + n[7];
  const D = 2 * G / (-F - Math.sqrt(F * F - 4 * E * G));
  return (n[9] + D - Math.sqrt((n[9] + D) * (n[9] + D) - 4 * (n[8] + n[9] * D))) / 2;
}

Object.assign(window, {
  calcMolarVolumeL, calcPpmToMgm3, calcMgm3ToPpm, calcReynolds, calcFlowRegime, CALC_RE_LAMINAR, CALC_RE_TURBULENT,
  calcWaterPsat, calcWaterTsat, CALC_IF97_RANGE,
});
