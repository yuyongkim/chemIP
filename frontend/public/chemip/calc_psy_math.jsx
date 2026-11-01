// 습공기 순수 함수(ASHRAE Handbook — Fundamentals 2017, 1장) — 상태, 가열·냉각 코일, 두 공기 단열 혼합. React 없음.
// 단위: T [K], p·p_w [Pa], W [kg/kg 건조 공기], h [kJ/kg 건조 공기], v [m³/kg 건조 공기]. 포화 수증기압은 IF97(calc_physics.jsx, 물 위 포화).

const PSY_EPS = CALC_CONST.mWater / CALC_CONST.mAir;   // 0.621945
const PSY_CW = 4.186;                                  // kJ/(kg·K) — 응축수 엔탈피 h_w ≈ 4.186 t (ASHRAE 2017 1장 식 33 근사)

function psyHumidityRatio(pw, P) { return PSY_EPS * pw / (P - pw); }
function psyVaporPressure(W, P) { return W * P / (PSY_EPS + W); }
function psyEnthalpy(T, W) { const t = T - 273.15; return 1.006 * t + W * (2501 + 1.86 * t); }
function psyVolume(T, W, P) { return 0.287042 * T * (1 + 1.607858 * W) / (P / 1000); }
function psyTfromHW(h, W) { return (h - 2501 * W) / (1.006 + 1.86 * W) + 273.15; }
function psySatW(T, P) { return psyHumidityRatio(calcWaterPsat(T), P); }

// 이슬점 — p_w 가 0 °C 포화압 아래면 null(서리점, 얼음 위 식 필요)
function psyDewPoint(pw) {
  return pw >= CALC_IF97_RANGE.Pmin ? calcWaterTsat(pw) : null;
}

// (T, W, P) → 상태. RH 는 % (100 을 넘으면 과포화·안개)
function psyState(T, W, P) {
  const pws = calcWaterPsat(T);
  const pw = psyVaporPressure(W, P);
  return { T, W, P, pw, pws, RH: 100 * pw / pws, h: psyEnthalpy(T, W), v: psyVolume(T, W, P), Td: psyDewPoint(pw) };
}

// (T, RH%, P) → 상태. p_w ≥ P 이면 null
function psyFromRH(T, RH, P) {
  const pw = RH / 100 * calcWaterPsat(T);
  if (pw >= P) return null;
  return psyState(T, psyHumidityRatio(pw, P), P);
}

// 가열·냉각 코일: 나가는 온도 T2. T2 가 들어온 공기의 이슬점보다 낮으면 포화 상태로 나가며 물이 맺힌다.
// q = h2 − h1 + (W1 − W2)·h_w  [kJ/kg 건조 공기, + 가열 / − 냉각],  응축수 = W1 − W2 [kg/kg]
function psyCoil(s1, T2) {
  const Ws2 = psySatW(T2, s1.P);
  const W2 = Math.min(s1.W, Ws2);
  const s2 = psyState(T2, W2, s1.P);
  const cond = s1.W - W2;
  const hw = PSY_CW * (T2 - 273.15);
  return { s2, cond, q: s2.h - s1.h + cond * hw, dehumid: cond > 0 };
}

// 단열 혼합: 건조 공기 질량 유량 m1·m2 [kg/s]. W·h 는 질량 가중 평균, T 는 (h, W) 에서 되찾는다.
function psyMix(s1, m1, s2, m2) {
  const m = m1 + m2;
  const W = (m1 * s1.W + m2 * s2.W) / m;
  const h = (m1 * s1.h + m2 * s2.h) / m;
  const s3 = psyState(psyTfromHW(h, W), W, s1.P);
  return { s3, m, fog: s3.RH > 100 };
}

Object.assign(window, {
  PSY_EPS, PSY_CW, psyHumidityRatio, psyVaporPressure, psyEnthalpy, psyVolume, psyTfromHW, psySatW, psyDewPoint, psyState, psyFromRH,
  psyCoil, psyMix,
});
