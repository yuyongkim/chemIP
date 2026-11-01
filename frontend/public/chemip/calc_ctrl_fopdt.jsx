// 공정제어 공용 수식 — 1차+데드타임(FOPDT) 모델 G(s) = K·e^(−θs)/(τs+1) 과 PID 제어기의 주파수 응답, 두 점 맞춤(Smith),
// 한계 이득·주기. React 없음(순수 함수). 쓰는 곳: calc_pid_tuning·calc_loop_sim·calc_tf_tools.
// 시간은 단위 없는 수(사용자가 고른 시간 단위 하나로 통일), 각속도는 rad/(그 시간 단위).
// 제어기 c = { Kc, tI?, tD? } — 이상(ISA 병렬) 형식 Gc = Kc(1 + 1/(τI s) + τD s). tI 가 없으면 적분 없음.

// 시간 단위 선택 칸 — 계산기 셋이 같은 칸을 쓴다(값은 표시 글자에만 쓰고 계산에는 영향 없음).
const CTRL_TIME_UNITS = ["s", "min", "h"];
function ctrlTimeUnitInput() {
  return { key: "tu", type: "choice", label: tr("시간 단위", "Time unit"), default: "min",
    options: CTRL_TIME_UNITS.map(u => ({ v: u, label: u })) };
}
const CTRL_TIME_TEXT = tr("시간 단위", "time unit");

// 이분법 — f(lo)·f(hi) ≤ 0 인 구간에서 근
function ctrlBisect(f, lo, hi, iter = 200) {
  let flo = f(lo);
  for (let i = 0; i < iter; i++) {
    const mid = 0.5 * (lo + hi), fm = f(mid);
    if ((fm <= 0) === (flo <= 0)) { lo = mid; flo = fm; } else hi = mid;
  }
  return 0.5 * (lo + hi);
}

// 계단 시험 두 점 맞춤(Smith 1972; Smith & Corripio): 최종 변화의 28.3 %·63.2 % 에 닿은 시각 → K, τ, θ
function ctrlSmithFit(du, dy, t28, t63) {
  const tau = 1.5 * (t63 - t28);
  return { K: dy / du, tau, theta: t63 - tau };
}

// FOPDT 주파수 응답 → { ar, ph(rad) }
function ctrlFopdtFreq(m, w) {
  return { ar: m.K / Math.sqrt(1 + (m.tau * w) ** 2), ph: -Math.atan(m.tau * w) - m.theta * w };
}

// 이상형 PID 주파수 응답 → { ar, ph(rad) }. 적분이 있으면 위상은 −90° … +90° 사이.
function ctrlPidFreq(c, w) {
  const im = (c.tD ? w * c.tD : 0) - (c.tI ? 1 / (w * c.tI) : 0);
  return { ar: Math.abs(c.Kc) * Math.hypot(1, im), ph: Math.atan(im) };
}

// 열린 루프 L = Gc·Gp → { ar, ph(rad) }
function ctrlLoopFreq(m, c, w) {
  const p = ctrlFopdtFreq(m, w), q = ctrlPidFreq(c, w);
  return { ar: p.ar * q.ar, ph: p.ph + q.ph };
}

// P 제어 한계: 위상 −180° 인 ω_u(atan(τω) + θω = π)에서 Ku = 1/AR_p, Pu = 2π/ω_u. θ = 0 이면 한계가 없다(null).
function ctrlUltimate(m) {
  if (!(m.theta > 0)) return null;
  const wu = ctrlBisect(w => Math.atan(m.tau * w) + m.theta * w - Math.PI, 1e-12, Math.PI / m.theta);
  return { wu, Ku: Math.sqrt(1 + (m.tau * wu) ** 2) / m.K, Pu: 2 * Math.PI / wu };
}

Object.assign(window, {
  CTRL_TIME_UNITS, CTRL_TIME_TEXT, ctrlTimeUnitInput, ctrlBisect, ctrlSmithFit, ctrlFopdtFreq, ctrlPidFreq, ctrlLoopFreq, ctrlUltimate,
});
