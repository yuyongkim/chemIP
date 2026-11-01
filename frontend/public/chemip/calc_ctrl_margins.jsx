// 열린 루프 L = Gc·Gp(FOPDT + PID)의 Bode 자료와 안정 여유 — React 없음(순수 함수, calc_ctrl_fopdt.jsx 의 주파수 응답을 쓴다).
// 이득 교차 ω_c: |L| = 1, 위상 교차 ω_180: ∠L = −180°. 이득여유 GM = 1/|L(jω_180)|, 위상여유 PM = 180° + ∠L(jω_c).
// 교차점이 여럿이면 가장 낮은 주파수의 것을 쓴다(FOPDT + PI·PID 는 보통 하나).

const CTRL_DEG = 180 / Math.PI;

// 로그 격자에서 처음으로 부호가 바뀌는 곳을 이분법으로 → ω 또는 null
function ctrlFirstCrossing(f, wLo, wHi, n = 600) {
  let prevW = wLo, prev = f(wLo);
  for (let i = 1; i <= n; i++) {
    const w = wLo * (wHi / wLo) ** (i / n), v = f(w);
    if ((prev > 0) !== (v > 0)) return ctrlBisect(f, prevW, w, 100);
    prevW = w; prev = v;
  }
  return null;
}

// 그릴 주파수 범위: 공정 시간상수·데드타임·제어기 시간보다 두 자리 넓게
function ctrlFreqRange(m, c) {
  const times = [m.tau, m.theta, c.tI, c.tD].filter(x => x > 0);
  return { wLo: 0.01 / Math.max(...times), wHi: 100 / Math.min(...times) };
}

// → { wc, pm(°), w180, gm, gmDb, arAt180 }. 교차가 없으면 그 값은 null.
function ctrlMargins(m, c) {
  const { wLo, wHi } = ctrlFreqRange(m, c);
  const wc = ctrlFirstCrossing(w => Math.log(ctrlLoopFreq(m, c, w).ar), wLo, wHi);
  const w180 = ctrlFirstCrossing(w => ctrlLoopFreq(m, c, w).ph + Math.PI, wLo, wHi);
  const pm = wc == null ? null : 180 + ctrlLoopFreq(m, c, wc).ph * CTRL_DEG;
  const ar180 = w180 == null ? null : ctrlLoopFreq(m, c, w180).ar;
  return { wc, pm, w180, gm: ar180 == null ? null : 1 / ar180, gmDb: ar180 == null ? null : -20 * Math.log10(ar180) };
}

// 차트용 Bode 점 → { ar: [[ω, AR]], ph: [[ω, °]] }. 데드타임 위상이 끝없이 내려가므로 위쪽은 ω = 4π/θ 까지만.
function ctrlBodePoints(m, c, nPts = 240) {
  const range = ctrlFreqRange(m, c);
  const wLo = range.wLo, wHi = m.theta > 0 ? Math.min(range.wHi, 4 * Math.PI / m.theta) : range.wHi;
  const ar = [], ph = [];
  for (let i = 0; i <= nPts; i++) {
    const w = wLo * (wHi / wLo) ** (i / nPts), L = ctrlLoopFreq(m, c, w);
    ar.push([w, L.ar]); ph.push([w, L.ph * CTRL_DEG]);
  }
  return { ar, ph };
}

Object.assign(window, { CTRL_DEG, ctrlFirstCrossing, ctrlFreqRange, ctrlMargins, ctrlBodePoints });
