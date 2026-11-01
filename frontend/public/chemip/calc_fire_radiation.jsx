// 열복사 공용 순수 함수(React 없음) — 연소 속도·화염 높이·방사 강도·형태계수·대기 투과율·점원 복사열. 단위는 SI(m, kg, s, W).
// 근거는 각 함수 위 주석. 계산기 정의(calc_pool_fire.jsx·calc_bleve.jsx)가 reference 에 같은 문헌을 적는다.

// 대기 투과율 τ — 수증기 분압 Pw [Pa], 경로 길이 x [m]. 1 을 넘지 않게 자른다.
//   pietersen: τ = 2.02 (Pw·x)^−0.09 — Pietersen & Huerta (1985) TNO 보고서 85-0222, CCPS(1999) 식으로 인용
//   cook:      τ = 1.389 − 0.135 log10(Pw·x) — Cook, Bahrami & Whitehouse (1990), NOAA ALOHA 5.4.4 기술 문서 6.3.3
//   one:       τ = 1 (보수적)
const CALC_TRANSMISSIVITY = {
  pietersen: (Pw, x) => 2.02 * Math.pow(Pw * x, -0.09),
  cook: (Pw, x) => 1.389 - 0.135 * Math.log10(Pw * x),
  one: () => 1,
};
function calcTransmissivity(model, Pw, x) {
  if (!(Pw * x > 0)) return 1;
  const t = (CALC_TRANSMISSIVITY[model] || CALC_TRANSMISSIVITY.one)(Pw, x);
  return Math.max(0, Math.min(1, t));
}

// Burgess(1961)/Zabetakis 연소 속도 m″ [kg/(m²·s)] = 1e-3 · ΔHc / (ΔHv + cp·(Tb − Ta)). 끓는점이 주위보다 낮으면(액화가스) 현열 항은 0.
//   ΔHc·ΔHv [J/kg], cp [J/(kg·K)], T [K]. Mudan (1984) Prog. Energy Combust. Sci. 10:59 가 넓은 연료에 맞는다고 정리.
function calcBurgessRate(dHc, dHv, cp, Tb, Ta) {
  return 1e-3 * dHc / (dHv + cp * Math.max(0, Tb - Ta));
}

// Thomas(1963) 무풍 화염 높이 H [m] = 42 D (m″ / (ρa √(g D)))^0.61
function calcThomasHeight(mpp, D, rhoA) {
  return 42 * D * Math.pow(mpp / (rhoA * Math.sqrt(CALC_CONST.g * D)), 0.61);
}

// 풀 화재 표면 방사 강도 E [W/m²]
//   shokri: E = 58 · 10^(−0.00823 D) kW/m² — Shokri & Beyler (1989) J. Fire Prot. Eng. 1(4):141
//   mudan:  E = 140 e^(−0.12 D) + 20 (1 − e^(−0.12 D)) kW/m² — Mudan (1984), 그을음 가림 모델
const CALC_POOL_EMISSIVE = {
  shokri: D => 58e3 * Math.pow(10, -0.00823 * D),
  mudan: D => 140e3 * Math.exp(-0.12 * D) + 20e3 * (1 - Math.exp(-0.12 * D)),
};

// 지면 표적에서 본 수직 원통(지름 D, 높이 H) 최대 형태계수 — Shokri & Beyler (1989) 닫힌 식(NUREG-1805 5장에도 실림).
//   L: 원통 중심 ~ 표적 수평 거리. L ≤ D/2(화염 안)이면 null.
function calcCylinderViewFactor(L, D, H) {
  const S = 2 * L / D, h = 2 * H / D;
  if (!(S > 1) || !(h > 0)) return null;
  const A = (h * h + S * S + 1) / (2 * S);
  const B = (1 + S * S) / (2 * S);
  const atA = Math.atan(Math.sqrt((A + 1) * (S - 1) / ((A - 1) * (S + 1))));
  const atB = Math.atan(Math.sqrt((B + 1) * (S - 1) / ((B - 1) * (S + 1))));
  const Fv = Math.atan(h / Math.sqrt(S * S - 1)) / (Math.PI * S)
    - h / (Math.PI * S) * Math.atan(Math.sqrt((S - 1) / (S + 1)))
    + A * h / (Math.PI * S * Math.sqrt(A * A - 1)) * atA;
  const Fh = (B - 1 / S) / (Math.PI * Math.sqrt(B * B - 1)) * atB
    - (A - 1 / S) / (Math.PI * Math.sqrt(A * A - 1)) * atA;
  return { Fv, Fh, F: Math.sqrt(Fv * Fv + Fh * Fh) };
}

// 구(지름 D) 중심에서 X 떨어진, 구를 바라보는 면의 형태계수 F = (D/2)² / X² — CCPS(1994) 화구 식. X ≤ D/2 이면 1.
function calcSphereViewFactor(D, X) {
  return X > D / 2 ? (D * D) / (4 * X * X) : 1;
}

// 점원 복사열 q [W/m²] = τ · X_r · Q / (4π x²), Q = 연소 열방출률 [W]
function calcPointSourceFlux(tau, Xr, Q, x) {
  return tau * Xr * Q / (4 * Math.PI * x * x);
}

// 1 atm 건조 공기 밀도 [kg/m³] = P M / (R T)
function calcAirDensity(T) {
  return CALC_CONST.atm * (CALC_CONST.mAir / 1000) / (CALC_CONST.R * T);
}

Object.assign(window, {
  CALC_TRANSMISSIVITY, CALC_POOL_EMISSIVE, calcTransmissivity, calcBurgessRate, calcThomasHeight,
  calcCylinderViewFactor, calcSphereViewFactor, calcPointSourceFlux, calcAirDensity,
});
