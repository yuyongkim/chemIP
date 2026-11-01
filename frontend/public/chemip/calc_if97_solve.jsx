// IAPWS-IF97 상태 풀이 — 두 성질로 상태 하나: (p,T)·(p,h)·(p,s)·(T,x)·(p,x). React 없음, 문구 없음(오류는 code 만).
// (p,h)·(p,s) 는 IF97 역방향식 대신 순방향식을 T 에 대해 풀어(거짓 위치법) 순방향식과 어긋남이 없다.
// 상(phase): "liquid"(압축액) · "vapor"(과열 증기) · "wet"(습증기, 4영역) · "super"(초임계, p ≥ p_c·T ≥ T_c).
// 오류 code: "range"(IF97 범위 밖) · "low"/"high"(주어진 h·s 가 그 압력의 범위 아래/위) · "critical"(임계점 바로 옆에서 포화 풀이 실패).
// 성질 단위는 calc_if97.jsx 와 같다(SI 기준값).

const IF97_PTRIPLE = CALC_IF97_RANGE.Pmin;   // 611.213 Pa — 4영역 식의 아래 끝(삼중점 압력 부근)

function if97Tmax(p) {
  return p <= IF97_LIMITS.pmax5 ? IF97_LIMITS.Tmax : IF97_LIMITS.T25;
}

function if97Phase(p, T) {
  if (T >= IF97_TC && p >= IF97_PC) return "super";
  if (T >= IF97_TC) return "vapor";
  if (p >= IF97_PC) return "liquid";
  return p >= calcWaterPsat(T) ? "liquid" : "vapor";
}

function if97WithPhase(st) {
  return st ? { ...st, phase: if97Phase(st.p, st.T) } : null;
}

// 포화 액체·증기 사이 건도 x 의 습증기 상태
function if97Wet(sat, x) {
  const L = sat.liq, V = sat.vap;
  const mix = (k) => L[k] + x * (V[k] - L[k]);
  const v = mix("v");
  return { region: 4, phase: "wet", T: sat.T, p: sat.p, x, v, rho: 1 / v, h: mix("h"), s: mix("s"), u: mix("u"), sat };
}

function if97SolvePT(p, T) {
  const st = if97PT(p, T);
  return st ? { state: if97WithPhase(st) } : { error: "range" };
}

function if97SolveTx(T, x) {
  if (!(T >= IF97_LIMITS.Tmin && T <= IF97_TC) || !(x >= 0 && x <= 1)) return { error: "range" };
  const sat = if97SatPair(T);
  return sat ? { state: if97Wet(sat, x) } : { error: "critical" };
}

function if97SolvePx(p, x) {
  if (!(p >= IF97_PTRIPLE && p <= IF97_PC)) return { error: "range" };
  return if97SolveTx(calcWaterTsat(p), x);
}

// 단상 구간 [Ta, Tb] 에서 성질 key(h 또는 s) 가 target 인 T. 범위 밖이면 "low"/"high".
function if97SolveT(p, key, target, Ta, Tb) {
  const at = (T) => if97PT(p, T);
  const a = at(Ta), b = at(Tb);
  if (!a || !b) return { error: "range" };
  if (target < a[key]) return { error: "low" };
  if (target > b[key]) return { error: "high" };
  const T = if97Root((t) => at(t)[key] - target, Ta, Tb, 1e-14);
  const st = Number.isFinite(T) ? at(T) : null;
  return st ? { state: if97WithPhase(st) } : { error: "range" };
}

// (p, h) 또는 (p, s): p < p_c 면 포화 액체·증기 값과 견주어 압축액·습증기·과열 증기를 고른다.
function if97SolvePY(p, key, target) {
  if (!(p > 0 && p <= IF97_LIMITS.pmax)) return { error: "range" };
  const Tmin = IF97_LIMITS.Tmin, Tmax = if97Tmax(p);
  if (p >= IF97_PC || p < IF97_PTRIPLE) return if97SolveT(p, key, target, Tmin, Tmax);
  const Ts = calcWaterTsat(p);
  const sat = if97SatPair(Ts);
  if (!sat) return { error: "critical" };
  const yl = sat.liq[key], yv = sat.vap[key];
  if (target >= yl && target <= yv) return { state: if97Wet(sat, (target - yl) / (yv - yl)) };
  if (target < yl) return if97SolveT(p, key, target, Tmin, Ts * (1 - 1e-12));
  return if97SolveT(p, key, target, Ts * (1 + 1e-12), Tmax);
}

// 모드 하나로 묶은 입구: mode "pT" | "ph" | "ps" | "Tx" | "px", a·b 는 그 순서의 값(SI)
function if97Solve(mode, a, b) {
  if (mode === "pT") return if97SolvePT(a, b);
  if (mode === "ph") return if97SolvePY(a, "h", b);
  if (mode === "ps") return if97SolvePY(a, "s", b);
  if (mode === "Tx") return if97SolveTx(a, b);
  if (mode === "px") return if97SolvePx(a, b);
  return { error: "range" };
}

// 임계점 부근(cp·w 가 크게 바뀌어 수치가 민감한 곳): |T − T_c| < 5 K 이고 |p − p_c| < 2 MPa
function if97NearCritical(p, T) {
  return Math.abs(T - IF97_TC) < 5 && Math.abs(p - IF97_PC) < 2e6;
}

Object.assign(window, { IF97_PTRIPLE, if97Tmax, if97Phase, if97Wet, if97Solve, if97SolvePY, if97NearCritical });
