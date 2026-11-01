// 폐루프 모의 — FOPDT 공정 + PID 제어기, 이산 시간. React 없음(순수 함수).
// 공정: 영차 유지(ZOH) 정확 이산화 y[k+1] = a·y[k] + K(1−a)·v[k−n], a = e^(−Δt/τ), n = round(θ/Δt) (데드타임 = 고리 버퍼).
// 제어기: 이상형 PID, 미분은 측정값에만(설정값 계단에 튀지 않게) + 1차 필터 τf = 0.1·τD. 출력 제한 없음(선형 비교용).
// 부하 외란 d 는 공정 입력에 더한다(Gd = Gp, Seborg 예제 12.4 와 같은 가정). 편차 변수(초기 정상 상태 0).

const CTRL_SIM_MAX_STEPS = 20000;
const CTRL_DERIV_FILTER = 0.1;

// 시간 간격: min(τ, θ)/50, 단 전체 걸음 수가 상한을 넘지 않게
function ctrlSimDt(m, tEnd) {
  const base = Math.min(m.tau, m.theta > 0 ? m.theta : m.tau) / 50;
  return Math.max(base, tEnd / CTRL_SIM_MAX_STEPS);
}

// m = { K, tau, theta }, c = { Kc, tI?, tD? } 또는 null(열린 루프: 조작변수 = 설정값 계단 크기),
// o = { tEnd, sp, tSp?, load?, tLoad?, dt? } → { t, y, u, r, unstable }
function ctrlSimulate(m, c, o) {
  const dt = o.dt || ctrlSimDt(m, o.tEnd);
  const steps = Math.ceil(o.tEnd / dt);
  const n = Math.round(m.theta / dt);
  const a = Math.exp(-dt / m.tau);
  const buf = new Array(n + 1).fill(0);
  const out = { t: [], y: [], u: [], r: [], unstable: false };
  const limit = 1e6 * (Math.abs(o.sp || 0) + Math.abs(o.load || 0) + 1);
  let y = 0, integ = 0, yf = 0;
  for (let k = 0; k <= steps; k++) {
    const t = k * dt;
    const r = t >= (o.tSp || 0) ? o.sp : 0;
    const d = o.load && t >= o.tLoad ? o.load : 0;
    let u;
    if (!c) u = r;
    else {
      const e = r - y;
      if (c.tI) integ += e * dt;
      let dterm = 0;
      if (c.tD) {
        const yfNew = yf + (dt / (CTRL_DERIV_FILTER * c.tD + dt)) * (y - yf);
        dterm = -c.Kc * c.tD * (yfNew - yf) / dt;
        yf = yfNew;
      }
      u = c.Kc * (e + (c.tI ? integ / c.tI : 0)) + dterm;
    }
    out.t.push(t); out.y.push(y); out.u.push(u); out.r.push(r);
    buf[k % (n + 1)] = u + d;
    const vDelayed = buf[(k - n + (n + 1)) % (n + 1)];
    y = a * y + m.K * (1 - a) * vDelayed;
    if (!Number.isFinite(y) || Math.abs(y) > limit) { out.unstable = true; break; }
  }
  return out;
}

// 구간 [t0, t1) 의 성능 — 설정값 sp 기준 오버슈트 %, 정착 시간(±band), IAE, 최대 편차
function ctrlSegmentMetrics(sim, t0, t1, sp, band = 0.02) {
  let iae = 0, peak = -Infinity, maxDev = 0, lastOut = null, dt = sim.t[1] - sim.t[0];
  const tol = band * Math.abs(sp || 1);
  for (let k = 0; k < sim.t.length; k++) {
    const t = sim.t[k];
    if (t < t0 || t >= t1) continue;
    const e = sim.r[k] - sim.y[k];
    iae += Math.abs(e) * dt;
    peak = Math.max(peak, sp >= 0 ? sim.y[k] : -sim.y[k]);
    maxDev = Math.max(maxDev, Math.abs(sim.y[k] - sp));
    if (Math.abs(sim.y[k] - sp) > tol) lastOut = t;
  }
  const lastT = sim.t[sim.t.length - 1];
  const settled = lastOut === null ? 0 : (lastOut + dt < Math.min(t1, lastT) - 1e-9 ? lastOut + dt - t0 : null);
  const overshoot = sp ? Math.max(0, (peak - Math.abs(sp)) / Math.abs(sp) * 100) : null;
  return { iae, overshoot, settle: settled, maxDev };
}

// 설정값 계단(0 에서)과 부하 계단(tLoad 에서)을 함께 돌린 모의의 요약
function ctrlLoopMetrics(sim, o) {
  const spSeg = ctrlSegmentMetrics(sim, 0, o.load ? o.tLoad : o.tEnd + 1, o.sp);
  const ldSeg = o.load ? ctrlSegmentMetrics(sim, o.tLoad, o.tEnd + 1, o.sp) : null;
  return {
    overshoot: spSeg.overshoot, settle: spSeg.settle, iaeSp: spSeg.iae,
    iaeLoad: ldSeg ? ldSeg.iae : null, maxDevLoad: ldSeg ? ldSeg.maxDev : null,
    uPeak: Math.max(...sim.u.map(Math.abs)),
  };
}

// 모의 결과 → 차트 점 [[t, v]]. 점이 많으면 고르게 줄인다(그리기용).
function ctrlSimPoints(sim, field, maxPts = 600) {
  const nPts = sim.t.length, step = Math.max(1, Math.ceil(nPts / maxPts));
  const pts = [];
  for (let k = 0; k < nPts; k += step) pts.push([sim.t[k], sim[field][k]]);
  if ((nPts - 1) % step) pts.push([sim.t[nPts - 1], sim[field][nPts - 1]]);
  return pts;
}

Object.assign(window, { ctrlSimDt, ctrlSimulate, ctrlSegmentMetrics, ctrlLoopMetrics, ctrlSimPoints });
