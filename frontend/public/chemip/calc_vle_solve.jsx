// 2성분 기액평형 풀이(수정 Raoult 식 y_i·P = x_i·γ_i·P_i^sat) — 기포점·이슬점(P 또는 T), Txy·Pxy 곡선, 공비점, 액액 분리 검사. React 없음.
// sys = { c1, c2: { psat(T) [Pa], tsat(P) [K] }, gamma(x1, T) → [γ1, γ2] }. 기상은 이상기체(저압), 포인팅 보정은 넣지 않는다.
// 풀이: 기포점 P 는 바로, 기포점 T 는 이분법, 이슬점은 x 를 되풀이 대입(감쇠)하고 T 는 이분법. 근거: Smith, Van Ness & Abbott 7판 10·14장.

const CALC_VLE_X_GRID = [0, 0.005, 0.01, 0.02, 0.035, 0.05, 0.075, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7,
  0.75, 0.8, 0.85, 0.875, 0.9, 0.925, 0.95, 0.965, 0.98, 0.99, 0.995, 1];

function calcVleBisect(f, lo, hi, iters = 100) {
  let flo = f(lo);
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2, fm = f(mid);
    if (!Number.isFinite(fm)) return null;
    if ((fm > 0) === (flo > 0)) { lo = mid; flo = fm; } else hi = mid;
    if (hi - lo < 1e-10 * Math.max(1, Math.abs(hi))) break;
  }
  return (lo + hi) / 2;
}

// f(T) 가 T 에 대해 늘어나는 함수일 때 부호가 바뀌는 구간 [lo, hi] 를 찾는다(끓는점 근처에서 넓혀 감)
function calcVleBracketT(sys, P, f) {
  const t1 = sys.c1.tsat(P), t2 = sys.c2.tsat(P);
  if (!(t1 > 0 && t2 > 0)) return null;
  let lo = Math.min(t1, t2) - 2, hi = Math.max(t1, t2) + 2;
  for (let i = 0; i < 30 && !(f(lo) < 0); i++) lo -= 8;
  for (let i = 0; i < 30 && !(f(hi) > 0); i++) hi += 8;
  return f(lo) < 0 && f(hi) > 0 && lo > 0 ? [lo, hi] : null;
}

function calcVleBubbleP(sys, x1, T) {
  const P1 = sys.c1.psat(T), P2 = sys.c2.psat(T);
  const [g1, g2] = sys.gamma(x1, T);
  const P = x1 * g1 * P1 + (1 - x1) * g2 * P2;
  return { P, T, x1, y1: x1 * g1 * P1 / P, g1, g2, P1, P2 };
}

function calcVleBubbleT(sys, x1, P) {
  const f = (T) => calcVleBubbleP(sys, x1, T).P - P;
  const br = calcVleBracketT(sys, P, f);
  if (!br) return null;
  const T = calcVleBisect(f, br[0], br[1]);
  return T == null ? null : calcVleBubbleP(sys, x1, T);
}

// 이슬점의 액 조성: 주어진 T·P 에서 x_i = y_i·P/(γ_i·P_i^sat) 를 되풀이. 돌려주는 s = Σ(정규화 전 x) − 1
function calcVleDewInner(sys, y1, T, P, x0) {
  const P1 = sys.c1.psat(T), P2 = sys.c2.psat(T);
  let x1 = x0 != null ? x0 : y1 * P / P1 / (y1 * P / P1 + (1 - y1) * P / P2), k1 = 0, k2 = 0, g = [1, 1];
  for (let i = 0; i < 300; i++) {
    g = sys.gamma(x1, T);
    k1 = y1 * P / (g[0] * P1);
    k2 = (1 - y1) * P / (g[1] * P2);
    const nx = k1 / (k1 + k2);
    if (Math.abs(nx - x1) < 1e-11) { x1 = nx; break; }
    x1 = i < 50 ? nx : 0.5 * (x1 + nx);
  }
  return { x1, s: k1 + k2 - 1, g1: g[0], g2: g[1], P1, P2 };
}

function calcVleDewP(sys, y1, T) {
  const P1 = sys.c1.psat(T), P2 = sys.c2.psat(T);
  let P = 1 / (y1 / P1 + (1 - y1) / P2), x1 = y1 * P / P1;
  for (let i = 0; i < 300; i++) {
    const [g1, g2] = sys.gamma(x1, T);
    P = 1 / (y1 / (g1 * P1) + (1 - y1) / (g2 * P2));
    const nx = Math.min(1, Math.max(0, y1 * P / (g1 * P1)));
    if (Math.abs(nx - x1) < 1e-11) { x1 = nx; break; }
    x1 = i < 50 ? nx : 0.5 * (x1 + nx);
  }
  return { P, T, x1, y1 };
}

function calcVleDewT(sys, y1, P) {
  let x0 = null;
  const f = (T) => { const r = calcVleDewInner(sys, y1, T, P, x0); x0 = r.x1; return -r.s; };   // −s 는 T 에 대해 늘어난다
  const br = calcVleBracketT(sys, P, f);
  if (!br) return null;
  const T = calcVleBisect(f, br[0], br[1]);
  if (T == null) return null;
  return { T, P, x1: calcVleDewInner(sys, y1, T, P, null).x1, y1 };
}

// 기포점 한 점: basis "P"(등압, T 를 구함) 또는 "T"(등온, P 를 구함)
function calcVleBubble(sys, basis, x1, fixed) {
  return basis === "P" ? calcVleBubbleT(sys, x1, fixed) : calcVleBubbleP(sys, x1, fixed);
}
function calcVleDew(sys, basis, y1, fixed) {
  return basis === "P" ? calcVleDewT(sys, y1, fixed) : calcVleDewP(sys, y1, fixed);
}

// 곡선: 격자 x 마다 기포점 → [{ x1, y1, T, P, g1, g2 }]
function calcVleCurve(sys, basis, fixed) {
  return CALC_VLE_X_GRID.map(x => calcVleBubble(sys, basis, x, fixed)).filter(Boolean);
}

// 공비점: 안쪽 격자에서 y1 − x1 의 부호가 바뀌는 곳을 이분법으로. 없으면 null
function calcVleAzeotrope(sys, basis, fixed, curve) {
  const inner = curve.filter(p => p.x1 > 0 && p.x1 < 1);
  for (let i = 1; i < inner.length; i++) {
    const a = inner[i - 1], b = inner[i];
    const da = a.y1 - a.x1, db = b.y1 - b.x1;
    if (da === 0 || (da > 0) !== (db > 0)) {
      const d = (x) => { const r = calcVleBubble(sys, basis, x, fixed); return r ? r.y1 - x : NaN; };
      const x = da === 0 ? a.x1 : calcVleBisect(d, a.x1, b.x1, 80);
      const r = x == null ? null : calcVleBubble(sys, basis, x, fixed);
      if (!r) return null;
      const ends = curve.filter(p => p.x1 === 0 || p.x1 === 1);
      const key = basis === "P" ? "T" : "P";
      const extreme = ends.every(e => r[key] < e[key]) ? "min" : ends.every(e => r[key] > e[key]) ? "max" : "mid";
      // 등압 T 최소 = 최저 공비(양의 편차), 등온 P 최대 = 같은 종류
      const kind = basis === "P" ? (extreme === "min" ? "minBoiling" : extreme === "max" ? "maxBoiling" : "other")
        : (extreme === "max" ? "minBoiling" : extreme === "min" ? "maxBoiling" : "other");
      return { x1: r.x1, T: r.T, P: r.P, kind };
    }
  }
  return null;
}

// 액액 분리(불안정) 검사: ΔG_mix/RT = Σ x_i ln(x_i γ_i) 의 2차 미분이 음수인 x 가 있으면 true. T 는 곡선의 기포점 T 를 쓴다.
function calcVleSplits(sys, curve) {
  const g = (x, T) => { const [g1, g2] = sys.gamma(x, T); return x * Math.log(x * g1) + (1 - x) * Math.log((1 - x) * g2); };
  const h = 0.004;
  for (let x = 0.02; x <= 0.98 + 1e-9; x += 0.02) {
    const near = curve.reduce((best, p) => (Math.abs(p.x1 - x) < Math.abs(best.x1 - x) ? p : best), curve[0]);
    const T = near.T;
    if (g(x + h, T) - 2 * g(x, T) + g(x - h, T) < 0) return true;
  }
  return false;
}

Object.assign(window, {
  calcVleBubbleP, calcVleBubbleT, calcVleDewP, calcVleDewT, calcVleBubble, calcVleDew, calcVleCurve, calcVleAzeotrope, calcVleSplits,
});
