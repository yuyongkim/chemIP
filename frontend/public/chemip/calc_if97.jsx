// IAPWS-IF97 물·수증기 성질(순방향 식) — 1·2·3·5영역 기본식, 영역 고르기, 3영역 밀도 풀이, 포화 액체·증기. React 없음.
// 단위는 SI 기준값: T [K], p [Pa], v [m³/kg], ρ [kg/m³], h·u [J/kg], s·cp·cv [J/(kg·K)], w [m/s].
// 계수는 calc_if97_coef.jsx, 포화선(4영역) p_sat(T)·T_sat(p)는 calc_physics.jsx 의 calcWaterPsat·calcWaterTsat 을 그대로 쓴다.
// 풀이 모드((p,h)·(p,s)·(T,x)·(p,x))는 calc_if97_solve.jsx.

const IF97_LIMITS = { Tmin: 273.15, T13: 623.15, T25: 1073.15, Tmax: 2273.15, pmax: 100e6, pmax5: 50e6 };

// 정수 지수 거듭제곱표: k = lo..hi 의 x^k (곱셈만, Math.pow 보다 빠름)
function if97Powers(x, lo, hi) {
  const out = new Array(hi - lo + 1);
  const z = 0 - lo;
  out[z] = 1;
  for (let k = 1; k <= hi; k++) out[z + k] = out[z + k - 1] * x;
  for (let k = -1; k >= lo; k--) out[z + k] = out[z + k + 1] / x;
  return { at: (k) => out[z + k] };
}

// 항 목록의 지수 범위(미분 차수 2까지) — 계수표마다 한 번만 센다
const IF97_SPAN = new Map();
function if97Span(terms) {
  if (!IF97_SPAN.has(terms)) {
    const Is = terms.map(t => t[0]), Js = terms.map(t => t[1]);
    IF97_SPAN.set(terms, { iLo: Math.min(0, ...Is) - 2, iHi: Math.max(0, ...Is), jLo: Math.min(0, ...Js) - 2, jHi: Math.max(0, ...Js) });
  }
  return IF97_SPAN.get(terms);
}

// Σ n x^I y^J 와 x·y 편미분(1·2차). 0 제곱 항(I = 0, J = 0)의 미분은 만들지 않는다.
function if97Poly(terms, x, y) {
  const sp = if97Span(terms);
  const X = if97Powers(x, sp.iLo, sp.iHi), Y = if97Powers(y, sp.jLo, sp.jHi);
  let g = 0, gx = 0, gxx = 0, gy = 0, gyy = 0, gxy = 0;
  for (const [I, J, n] of terms) {
    const xi = X.at(I), yj = Y.at(J);
    g += n * xi * yj;
    if (I !== 0) {
      const xi1 = X.at(I - 1);
      gx += n * I * xi1 * yj;
      gxx += n * I * (I - 1) * X.at(I - 2) * yj;
      if (J !== 0) gxy += n * I * xi1 * J * Y.at(J - 1);
    }
    if (J !== 0) {
      gy += n * xi * J * Y.at(J - 1);
      gyy += n * xi * J * (J - 1) * Y.at(J - 2);
    }
  }
  return { g, gx, gxx, gy, gyy, gxy };
}

// 깁스 자유에너지식(1·2·5영역) 미분 → 성질. G = { g, gp, gpp, gt, gtt, gpt } (π·τ 미분), R·T 무차원
function if97FromGibbs(G, p, T, pi, tau, region) {
  const R = IF97_R;
  const v = pi * G.gp * R * T / p;
  const h = R * T * tau * G.gt;
  const u = R * T * (tau * G.gt - pi * G.gp);
  const s = R * (tau * G.gt - G.g);
  const cp = -R * tau * tau * G.gtt;
  const a = G.gp - tau * G.gpt;
  const cv = R * (-tau * tau * G.gtt + a * a / G.gpp);
  const w = Math.sqrt(R * T * G.gp * G.gp / (a * a / (tau * tau * G.gtt) - G.gpp));
  return { region, T, p, v, rho: 1 / v, h, u, s, cp, cv, w };
}

// 1영역: 압축액(273.15–623.15 K, p_sat(T) ≤ p ≤ 100 MPa)
function if97Region1(p, T) {
  const pi = p / 16.53e6, tau = 1386 / T;
  const P = if97Poly(IF97_R1, 7.1 - pi, tau - 1.222);
  return if97FromGibbs({ g: P.g, gp: -P.gx, gpp: P.gxx, gt: P.gy, gtt: P.gyy, gpt: -P.gxy }, p, T, pi, tau, 1);
}

// 이상기체 부분 γ° = ln π + Σ n° τ^J° 의 τ 미분
function if97Ideal(terms, pi, tau) {
  let g = Math.log(pi), gt = 0, gtt = 0;
  for (const [J, n] of terms) {
    g += n * Math.pow(tau, J);
    if (J !== 0) { gt += n * J * Math.pow(tau, J - 1); gtt += n * J * (J - 1) * Math.pow(tau, J - 2); }
  }
  return { g, gt, gtt };
}

function if97GibbsGas(ideal, resid, p, T, pi, tau, tauShift, region) {
  const I = if97Ideal(ideal, pi, tau);
  const P = if97Poly(resid, pi, tau - tauShift);
  return if97FromGibbs({
    g: I.g + P.g, gp: 1 / pi + P.gx, gpp: -1 / (pi * pi) + P.gxx, gt: I.gt + P.gy, gtt: I.gtt + P.gyy, gpt: P.gxy,
  }, p, T, pi, tau, region);
}

// 2영역: 과열 증기(273.15–1073.15 K, 0 < p ≤ p_sat(T) 또는 B23 아래)
function if97Region2(p, T) {
  return if97GibbsGas(IF97_R2_0, IF97_R2_R, p, T, p / 1e6, 540 / T, 0.5, 2);
}

// 5영역: 고온 증기(1073.15–2273.15 K, p ≤ 50 MPa)
function if97Region5(p, T) {
  return if97GibbsGas(IF97_R5_0, IF97_R5_R, p, T, p / 1e6, 1000 / T, 0, 5);
}

// 3영역: 헬름홀츠 자유에너지식 f(ρ, T) → 성질(p 도 여기서 나온다)
function if97Region3(rho, T) {
  const R = IF97_R;
  const d = rho / IF97_RHOC, tau = IF97_TC / T;
  const P = if97Poly(IF97_R3, d, tau);
  const n1 = IF97_R3_N1;
  const f = n1 * Math.log(d) + P.g;
  const fd = n1 / d + P.gx, fdd = -n1 / (d * d) + P.gxx;
  const ft = P.gy, ftt = P.gyy, fdt = P.gxy;
  const p = rho * R * T * d * fd;
  const a = d * fd - d * tau * fdt;
  const b = 2 * d * fd + d * d * fdd;
  return {
    region: 3, T, p, rho, v: 1 / rho,
    h: R * T * (tau * ft + d * fd),
    u: R * T * tau * ft,
    s: R * (tau * ft - f),
    cv: -R * tau * tau * ftt,
    cp: R * (-tau * tau * ftt + a * a / b),
    w: Math.sqrt(R * T * (b - a * a / (tau * tau * ftt))),
  };
}

// B23 경계: T → p [Pa], p → T [K]
function if97B23p(T) {
  const n = IF97_B23;
  return (n[0] + n[1] * T + n[2] * T * T) * 1e6;
}
function if97B23T(p) {
  const n = IF97_B23;
  return n[3] + Math.sqrt((p / 1e6 - n[4]) / n[2]);
}

// 구간 [a, b] 에서 f 의 근(f(a)·f(b) ≤ 0) — Illinois 거짓 위치법. 상대 허용 tol.
function if97Root(f, a, b, tol = 1e-13) {
  let fa = f(a), fb = f(b), side = 0;
  if (fa === 0) return a;
  if (fb === 0) return b;
  if (!(fa * fb < 0)) return NaN;
  for (let k = 0; k < 200; k++) {
    const c = (a * fb - b * fa) / (fb - fa);
    const fc = f(c);
    if (fc === 0 || Math.abs(b - a) <= tol * Math.abs(c)) return c;
    if (fc * fb > 0) { b = c; fb = fc; if (side === -1) fa /= 2; side = -1; }
    else { a = c; fa = fc; if (side === 1) fb /= 2; side = 1; }
  }
  return (a + b) / 2;
}

// 3영역 밀도 풀이: [lo, hi] 안에서 p(ρ, T) = p 인 ρ. 단상 쪽 구간(포화 밀도 ~ 끝)에서는 p 가 ρ 에 대해 단조라 바로 근을 다듬고,
// 부호가 같으면 거친 격자로 부호 바뀌는 칸을 찾는다(fromHigh 이면 높은 밀도 쪽부터). 못 찾으면 NaN.
const IF97_R3_RHO = { lo: 30, hi: 800 };   // 3영역 밀도는 이 안(623.15 K·100 MPa 압축액 약 700 kg/m³)
function if97Region3Rho(p, T, lo = IF97_R3_RHO.lo, hi = IF97_R3_RHO.hi, fromHigh = false) {
  const g = (rho) => if97Region3(rho, T).p - p;
  const glo = g(lo), ghi = g(hi);
  if (glo <= 0 && ghi >= 0) return if97Root(g, lo, hi);
  const steps = 400, dr = (hi - lo) / steps;
  for (let k = 0; k < steps; k++) {
    const a = fromHigh ? hi - (k + 1) * dr : lo + k * dr;
    const b = a + dr;
    if (g(a) <= 0 && g(b) >= 0) return if97Root(g, a, b);
  }
  return NaN;
}

// 포화 밀도 보조식(초기값용) — IAPWS SR1-86(1992) 포화 액체·증기 밀도 식. τ = 1 − T/T_c
function if97SatRhoGuess(T) {
  const t = 1 - T / IF97_TC;
  const c = (e) => Math.pow(t, e);
  const rl = 1 + 1.99274064 * c(1 / 3) + 1.09965342 * c(2 / 3) - 0.510839303 * c(5 / 3) - 1.75493479 * c(16 / 3)
    - 45.5170352 * c(43 / 3) - 6.74694450e5 * c(110 / 3);
  const rv = -2.03150240 * c(2 / 6) - 2.68302940 * c(4 / 6) - 5.38626492 * c(8 / 6) - 17.2991605 * c(18 / 6)
    - 44.7586581 * c(37 / 6) - 63.9201063 * c(71 / 6);
  return { liq: IF97_RHOC * rl, vap: IF97_RHOC * Math.exp(rv) };
}

// 3영역 포화 밀도 하나(가지 liq | vap): 보조식 값에서 뉴턴, 안 되면 격자 찾기. dp/dρ = R T (2δφ_δ + δ²φ_δδ) 는 이 식의 p 를 수치 미분.
function if97Region3SatRho(p, T, branch) {
  const guess = if97SatRhoGuess(T)[branch];
  let rho = guess;
  for (let k = 0; k < 30; k++) {
    const d = Math.max(1e-6 * rho, 1e-9);
    const f = if97Region3(rho, T).p - p;
    const df = (if97Region3(rho + d, T).p - if97Region3(rho - d, T).p) / (2 * d);
    if (!(df > 0)) { rho = NaN; break; }
    const step = f / df;
    rho -= step;
    if (Math.abs(step) <= 1e-13 * rho) break;
  }
  const ok = Number.isFinite(rho) && (branch === "liq" ? rho > IF97_RHOC : rho < IF97_RHOC) && Math.abs(rho - guess) < 0.2 * IF97_RHOC;
  if (ok) return rho;
  return branch === "liq" ? if97Region3Rho(p, T, IF97_RHOC, IF97_R3_RHO.hi, true) : if97Region3Rho(p, T, IF97_R3_RHO.lo, IF97_RHOC);
}

// 포화 액체·증기(4영역 T, p_sat). 623.15 K 아래는 1·2영역, 위는 3영역 밀도 풀이. T > T_c 이면 null. 같은 T 는 기억해 둔다.
const IF97_SAT_MEMO = new Map();
function if97SatPair(T) {
  if (!(T >= IF97_LIMITS.Tmin && T <= IF97_TC)) return null;
  if (IF97_SAT_MEMO.has(T)) return IF97_SAT_MEMO.get(T);
  const p = calcWaterPsat(T);
  let out = null;
  if (T <= IF97_LIMITS.T13) out = { T, p, liq: if97Region1(p, T), vap: if97Region2(p, T) };
  else {
    const rl = if97Region3SatRho(p, T, "liq");
    const rv = if97Region3SatRho(p, T, "vap");
    if (Number.isFinite(rl) && Number.isFinite(rv) && rl > rv) out = { T, p, liq: { ...if97Region3(rl, T), p }, vap: { ...if97Region3(rv, T), p } };
  }
  if (IF97_SAT_MEMO.size > 2000) IF97_SAT_MEMO.clear();
  IF97_SAT_MEMO.set(T, out);
  return out;
}

// (p, T) 가 속한 영역: 1·2·3·5, 또는 0(범위 밖). 포화선 위(p = p_sat)는 액체(1)로 본다.
function if97RegionPT(p, T) {
  const L = IF97_LIMITS;
  if (!(p > 0) || !(T >= L.Tmin) || T > L.Tmax) return 0;
  if (T > L.T25) return p <= L.pmax5 ? 5 : 0;
  if (p > L.pmax) return 0;
  if (T <= L.T13) return p >= calcWaterPsat(T) ? 1 : 2;
  if (p <= if97B23p(T) || T > if97B23T(Math.min(p, L.pmax))) return 2;
  return 3;
}

// (p, T) → 성질, 범위 밖이면 null
function if97PT(p, T) {
  const reg = if97RegionPT(p, T);
  if (reg === 1) return if97Region1(p, T);
  if (reg === 2) return if97Region2(p, T);
  if (reg === 5) return if97Region5(p, T);
  if (reg !== 3) return null;
  let rho;
  if (T < IF97_TC && p < calcWaterPsat(T)) {
    const sat = if97SatPair(T);
    rho = if97Region3Rho(p, T, IF97_R3_RHO.lo, sat ? sat.vap.rho : IF97_RHOC);
  } else if (T < IF97_TC) {
    const sat = if97SatPair(T);
    rho = if97Region3Rho(p, T, sat ? sat.liq.rho : IF97_RHOC, IF97_R3_RHO.hi, true);
  } else {
    rho = if97Region3Rho(p, T);
  }
  return Number.isFinite(rho) ? { ...if97Region3(rho, T), p } : null;
}

Object.assign(window, {
  IF97_LIMITS, if97Poly, if97Region1, if97Region2, if97Region3, if97Region5, if97B23p, if97B23T, if97Root,
  if97Region3Rho, if97SatRhoGuess, if97SatPair, if97RegionPT, if97PT,
});
