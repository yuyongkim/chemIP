// 누출원 모델(source term) 순수 함수 — 구멍으로 새는 액체(Bernoulli)·기체(막힘/아음속, 등엔트로피)와 탱크가 비는 시간.
// React 없음. SI 단위(kg, m, s, Pa, K). 계산기 정의는 calc_release.jsx. 식의 근거:
//   Crowl & Louvar, Chemical Process Safety 3판(2011) 4장 — 4-3절(탱크 구멍 액체 누출·배출 시간), 4-6절(구멍 기체 누출)
//   EPA RMP OCA Guidance 부록 D — 식 D-13(탱크 구멍 액체), D-7(아음속 기체), D-8(막힘 기체)

// 액체: ṁ = C_d · A · √(2ρ(ΔP + ρ g h))
function calcSrcLiquidRate(cd, areaM2, rho, pg, h) {
  const head = pg + rho * CALC_CONST.g * Math.max(h, 0);
  return cd * areaM2 * Math.sqrt(2 * rho * Math.max(head, 0));
}

// 세운 원통 탱크가 구멍 높이까지 비는 동안(덮개 압력 P_g 일정). u = P_g/ρ + g·h 로 두면 √u 가 시간에 대해 직선으로 준다:
//   √u(t) = √u₀ − g·k·t/√2,  k = C_d·A_h/A_t   →   t_e = √2 (√u₀ − √(P_g/ρ)) / (g·k)
// 반환: { tEmpty, mass, rate(t) } (rate 는 kg/s, t 는 s)
function calcSrcDrain(cd, holeM2, tankM2, rho, pg, h0) {
  const g = CALC_CONST.g;
  const k = cd * holeM2 / tankM2;
  const u0 = pg / rho + g * h0;
  const uEnd = Math.max(pg / rho, 0);
  const tEmpty = Math.SQRT2 * (Math.sqrt(u0) - Math.sqrt(uEnd)) / (g * k);
  const rate = (t) => {
    const s = Math.max(Math.sqrt(u0) - g * k * Math.min(t, tEmpty) / Math.SQRT2, Math.sqrt(uEnd));
    return rho * cd * holeM2 * Math.SQRT2 * s;
  };
  return { tEmpty, mass: rho * tankM2 * h0, rate };
}

// 막힘(임계) 압력비 P*/P₀ = (2/(k+1))^(k/(k−1))
function calcSrcCriticalRatio(k) {
  return (2 / (k + 1)) ** (k / (k - 1));
}

// 기체: 막힘이면 ṁ = C_d A P₀ √( (k M/(R T₀)) (2/(k+1))^((k+1)/(k−1)) ),
//       아니면 ṁ = C_d A P₀ √( (2 M/(R T₀)) (k/(k−1)) [ r^(2/k) − r^((k+1)/k) ] ), r = P_a/P₀.  M 은 kg/mol.
function calcSrcGasRate(cd, areaM2, p0, t0, k, mKgMol, pa) {
  const R = CALC_CONST.R;
  const r = pa / p0;
  if (r >= 1) return { rate: 0, choked: false, ratio: r };
  const choked = r <= calcSrcCriticalRatio(k);
  const rate = choked
    ? cd * areaM2 * p0 * Math.sqrt(k * mKgMol / (R * t0) * (2 / (k + 1)) ** ((k + 1) / (k - 1)))
    : cd * areaM2 * p0 * Math.sqrt(2 * mKgMol / (R * t0) * (k / (k - 1)) * (r ** (2 / k) - r ** ((k + 1) / k)));
  return { rate, choked, ratio: r };
}

// 용기 감압(등온 — 용기 안 기체 온도를 T₀ 로 둔다): dP/dt = −ṁ(P)·R·T₀/(M·V). 4차 Runge–Kutta.
// 누출률이 처음의 1 % 아래로 떨어지거나 압력이 대기압의 1.001 배에 닿으면 멈춘다. 반환 { points: [[t, ṁ]], t10, mass, released(t) }
function calcSrcBlowdown(cd, areaM2, p0, t0, k, mKgMol, pa, volM3) {
  const R = CALC_CONST.R;
  const rateAt = (p) => calcSrcGasRate(cd, areaM2, p, t0, k, mKgMol, pa).rate;
  const dpdt = (p) => -rateAt(p) * R * t0 / (mKgMol * volM3);
  const m0 = rateAt(p0);
  const tau = p0 / Math.max(-dpdt(p0), 1e-30);       // 처음 감압 속도로 본 시간 척도
  const dt = tau / 200;
  const pts = [[0, m0]];
  let t = 0, p = p0, t10 = null;
  for (let i = 0; i < 20000 && p > pa * 1.001; i++) {
    const k1 = dpdt(p), k2 = dpdt(p + dt * k1 / 2), k3 = dpdt(p + dt * k2 / 2), k4 = dpdt(p + dt * k3);
    p = Math.max(p + dt * (k1 + 2 * k2 + 2 * k3 + k4) / 6, pa);
    t += dt;
    const m = rateAt(p);
    if (i % 4 === 3) pts.push([t, m]);
    if (t10 == null && m <= 0.1 * m0) t10 = t;
    if (m < 0.01 * m0) break;
  }
  const mass = (p0 - pa) * mKgMol * volM3 / (R * t0);   // 대기압까지 나갈 수 있는 양
  return { points: pts, t10, tEnd: t, mass };
}

Object.assign(window, { calcSrcLiquidRate, calcSrcDrain, calcSrcCriticalRatio, calcSrcGasRate, calcSrcBlowdown });
