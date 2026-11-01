// 반응공학 순수 함수(React 없음) — 회분 반응기 n차, 직렬 CSTR·PFR, Arrhenius 회귀, 단열 T–X 선·평형 곡선·단열 반응기 크기.
// 계산기 정의는 calc_batch_reactor.jsx. 단일 CSTR·PFR 1차 식은 calc_reactor.jsx(calcReactorConversion)를 그대로 쓴다.
// 근거: Fogler, Elements of Chemical Reaction Engineering 5판(2016) 2–5·11–12장, Levenspiel, Chemical Reaction Engineering 3판(1999) 3·5·6장.

// ── 회분 반응기(일정 부피) −dC_A/dt = k C_A^n ──
// kt* = k·C_A0^(n−1)·t. X → 시간(k·C_A0^(n−1) 을 곱한 무차원 시간)
function calcBatchKt(n, X) {
  if (Math.abs(n - 1) < 1e-12) return Math.log(1 / (1 - X));
  return (Math.pow(1 - X, 1 - n) - 1) / (n - 1);
}
// 무차원 시간 → X. n < 1 이면 유한 시간에 다 없어질 수 있다(X = 1).
function calcBatchX(n, kt) {
  if (Math.abs(n - 1) < 1e-12) return 1 - Math.exp(-kt);
  const base = 1 + (n - 1) * kt;
  if (base <= 0) return 1;
  return 1 - Math.pow(base, 1 / (1 - n));
}

// ── 같은 크기 CSTR N 개 직렬(1차) — τ 는 전체 공간 시간 ──
function calcSeriesCstrX(N, ktau) {
  return 1 - Math.pow(1 + ktau / N, -N);
}
// 목표 X 에 필요한 전체 kτ (N 개 직렬)
function calcSeriesCstrKtau(N, X) {
  return N * (Math.pow(1 - X, -1 / N) - 1);
}

// ── Arrhenius: ln k = ln A − (E/R)(1/T) 최소제곱 ── pts: [[T_K, k]] (k > 0)
function calcArrheniusFit(pts) {
  const xs = pts.map(p => 1 / p[0]);
  const ys = pts.map(p => Math.log(p[1]));
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); syy += (ys[i] - my) ** 2; }
  const slope = sxy / sxx;
  const lnA = my - slope * mx;
  const r2 = syy > 0 ? (sxy * sxy) / (sxx * syy) : 1;
  return { Ea: -slope * CALC_CONST.R, lnA, A: Math.exp(lnA), r2, slope };
}
function calcArrheniusK(fit, T) {
  return Math.exp(fit.lnA - fit.Ea / (CALC_CONST.R * T));
}

// ── 단열 반응기 에너지 수지(ΔH 는 T0 기준) — T = T0 + (−ΔH)·X / (Σθ·Cp + X·ΔCp) ──
function calcAdiabaticT(v, X) {
  return v.T0 + (-v.dH) * X / (v.sumCp + X * v.dCp);
}
// T → 에너지 수지 X (역함수)
function calcAdiabaticX(v, T) {
  return v.sumCp * (T - v.T0) / (-v.dH - v.dCp * (T - v.T0));
}
// van't Hoff: K(T) = K1 exp[(−ΔH/R)(1/T − 1/T1)]. 가역 1차 A ⇌ B(액상) 평형 전환율 Xe = K/(1+K)
function calcEquilK(v, T) {
  return v.K1 * Math.exp((-v.dH / CALC_CONST.R) * (1 / T - 1 / v.TK));
}
function calcEquilX(v, T) {
  const K = calcEquilK(v, T);
  return K / (1 + K);
}
// 단열선과 평형 곡선의 교점(단열 평형 전환율·온도) — X 를 0–1 에서 이분법. 발열이면 f(X) = Xe(T(X)) − X 가 한 번 바뀐다.
function calcAdiabaticEquilibrium(v) {
  const f = (X) => calcEquilX(v, calcAdiabaticT(v, X)) - X;
  let a = 0, b = 1 - 1e-12;
  if (!(f(a) > 0) || f(b) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const m = (a + b) / 2;
    if (f(m) > 0) a = m; else b = m;
  }
  const X = (a + b) / 2;
  return { X, T: calcAdiabaticT(v, X) };
}
// 단열 반응기 속도 −r_A / C_A0 = k(T) [(1 − X) − X/K(T)] (가역, K 없으면 비가역)
function calcAdiabaticRate(v, X) {
  const T = calcAdiabaticT(v, X);
  const k = v.k1 * Math.exp((-v.Ea / CALC_CONST.R) * (1 / T - 1 / v.Tk));
  const back = v.K1 > 0 ? X / calcEquilK(v, T) : 0;
  return k * ((1 - X) - back);
}
// 단열 PFR 부피 V = v0 ∫₀^X dX / (−r_A/C_A0) (Simpson 400 구간), CSTR V = v0 X / (−r_A/C_A0)|X
function calcAdiabaticPfrV(v, X) {
  const n = 400;
  const h = X / n;
  let s = 0;
  for (let i = 0; i <= n; i++) {
    const r = calcAdiabaticRate(v, i * h);
    if (!(r > 0)) return null;
    s += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) / r;
  }
  return v.v0 * s * h / 3;
}
function calcAdiabaticCstrV(v, X) {
  const r = calcAdiabaticRate(v, X);
  return r > 0 ? v.v0 * X / r : null;
}

Object.assign(window, {
  calcBatchKt, calcBatchX, calcSeriesCstrX, calcSeriesCstrKtau, calcArrheniusFit, calcArrheniusK,
  calcAdiabaticT, calcAdiabaticX, calcEquilK, calcEquilX, calcAdiabaticEquilibrium, calcAdiabaticRate, calcAdiabaticPfrV, calcAdiabaticCstrV,
});
