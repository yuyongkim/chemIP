// 1차·2차 공정의 계단 응답과 특성값 — React 없음(순수 함수).
// 2차: G(s) = K/(τ²s² + 2ζτs + 1) (Seborg et al. 5장 식 5-48 … 5-57). 데드타임 θ 는 시간을 그만큼 늦춘다.

// 단위 계단 응답 y(t) (θ 포함). ζ 가 없으면 1차.
function ctrlStepValue(p, t) {
  const s = t - (p.theta || 0);
  if (s <= 0) return 0;
  if (p.zeta == null) return p.K * (1 - Math.exp(-s / p.tau));
  const z = p.zeta, tau = p.tau;
  if (z < 1) {
    const q = Math.sqrt(1 - z * z), w = q / tau;
    return p.K * (1 - Math.exp(-z * s / tau) * (Math.cos(w * s) + (z / q) * Math.sin(w * s)));
  }
  if (z === 1) return p.K * (1 - (1 + s / tau) * Math.exp(-s / tau));
  const r = Math.sqrt(z * z - 1), t1 = tau / (z - r), t2 = tau / (z + r);
  return p.K * (1 - (t1 * Math.exp(-s / t1) - t2 * Math.exp(-s / t2)) / (t1 - t2));
}

// 저감쇠(ζ < 1) 2차 특성값 — 오버슈트·감쇠비·주기·첫 정점·상승 시간(최종값에 처음 닿는 시각). θ 는 더하지 않는다.
function ctrlSecondOrderSpecs(tau, z) {
  if (!(z < 1)) return null;
  const q = Math.sqrt(1 - z * z);
  const os = Math.exp(-Math.PI * z / q);
  return { os, decay: os * os, period: 2 * Math.PI * tau / q, tPeak: Math.PI * tau / q, tRise: tau * (Math.PI - Math.acos(z)) / q };
}

// 정착 시간: 최종값의 ±band 안에 머물기 시작하는 시각(θ 포함). 촘촘한 격자에서 마지막으로 벗어난 때를 찾는다.
function ctrlSettlingTime(p, band = 0.05) {
  const slow = p.zeta == null ? p.tau : (p.zeta < 1 ? p.tau / p.zeta : p.tau * (p.zeta + Math.sqrt(p.zeta * p.zeta - 1)));
  const tEnd = (p.theta || 0) + 20 * slow, N = 20000, dt = tEnd / N;
  let last = 0;
  for (let k = 0; k <= N; k++) if (Math.abs(ctrlStepValue(p, k * dt) - p.K) > band * Math.abs(p.K)) last = k * dt;
  // 마지막 이탈 구간을 이분법으로 다듬는다
  const f = (t) => Math.abs(ctrlStepValue(p, t) - p.K) - band * Math.abs(p.K);
  return f(last) > 0 && f(last + dt) <= 0 ? ctrlBisect(f, last, last + dt, 60) : last + dt;
}

// 차트용 점 [[t, y]] — 0 … tEnd
function ctrlStepPoints(p, tEnd, nPts = 400) {
  return Array.from({ length: nPts + 1 }, (_, i) => { const t = tEnd * i / nPts; return [t, ctrlStepValue(p, t)]; });
}

Object.assign(window, { ctrlStepValue, ctrlSecondOrderSpecs, ctrlSettlingTime, ctrlStepPoints });
