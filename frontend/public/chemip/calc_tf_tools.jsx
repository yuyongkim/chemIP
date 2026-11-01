// 계산기: 전달함수 도구(화공기사 실기 연습) — ① 1차·2차 계단 응답과 특성값 ② Routh–Hurwitz 안정도·한계 이득 ③ FOPDT + PI·PID 의 Bode 자료와 이득·위상 여유.
// 수식은 calc_ctrl_step.jsx · calc_ctrl_routh.jsx · calc_ctrl_margins.jsx(+ calc_ctrl_fopdt.jsx). 도구마다 compute·chart 를 아래 작은 함수로 나눈다.

const CTRL_RAD_TEXT = tr("rad/시간 단위", "rad/time unit");

function ctrlStepProcess(v) {
  return { K: v.K, tau: v.tau, theta: v.theta, zeta: v.order === "2" ? v.zeta : undefined };
}

function ctrlTfStep(v) {
  const p = ctrlStepProcess(v), th = v.theta;
  if (v.order === "1") {
    return { t63: th + v.tau, t95: th + 3 * v.tau, t98: th + 4 * v.tau, ts: ctrlSettlingTime(p), yInf: v.K };
  }
  const s = ctrlSecondOrderSpecs(v.tau, v.zeta);
  const out = { ts: ctrlSettlingTime(p), yInf: v.K, verdict: v.zeta < 1 ? tr("저감쇠 (진동하며 수렴)", "Underdamped (oscillates while settling)")
    : v.zeta === 1 ? tr("임계 감쇠 (가장 빠른 비진동)", "Critically damped (fastest without oscillation)") : tr("과감쇠 (진동 없음)", "Overdamped (no oscillation)") };
  if (s) Object.assign(out, { os: s.os * 100, decay: s.decay, period: s.period, tPeak: th + s.tPeak, tRise: th + s.tRise });
  return out;
}

// Routh 배열 → 결과 표(행 이름 s^n)
function ctrlRouthTable(arr) {
  const sup = (k) => String(k).split("").map(ch => CALC_SUPERSCRIPT[ch]).join("");
  const width = arr.rows[0].length;
  return {
    columns: [{ key: "p", label: tr("행", "Row") }, ...Array.from({ length: width }, (_, i) => ({ key: `c${i}`, label: tr(`${i + 1}열`, `Col ${i + 1}`) }))],
    rows: arr.rows.map((row, i) => ({
      p: `s${sup(arr.powers[i])}${arr.epsRows.includes(i) ? " (ε)" : ""}${arr.zeroRows.includes(i) ? " (dA/ds)" : ""}`,
      ...Object.fromEntries(row.map((x, j) => [`c${j}`, x])),
    })),
  };
}

function ctrlRootsText(roots) {
  return roots.map(r => (r.im === 0 ? calcFormatNumber(r.re, 4) : `${calcFormatNumber(r.re, 4)} ${r.im < 0 ? "−" : "+"} ${calcFormatNumber(Math.abs(r.im), 4)}j`)).join(",  ");
}

function ctrlTfRouth(v) {
  const a = v.poly.map(r => r.a), b = v.poly.map(r => r.b ?? 0);
  while (a.length > 1 && a[0] === 0 && b[0] === 0) { a.shift(); b.shift(); }
  if (a.length < 2) return { error: tr("1차 이상의 다항식을 넣으십시오(계수 2개 이상).", "Enter a polynomial of degree 1 or more (at least two coefficients).") };
  const hasGain = b.some(x => x !== 0);
  const Kc = hasGain ? (v.Kc ?? 1) : 0;
  const coeffs = ctrlPolyWithGain(a, b, Kc);
  if (coeffs[0] === 0) return { error: tr("최고차 계수가 0 입니다. 맨 윗행을 지우거나 고치십시오.", "The leading coefficient is zero. Delete or fix the top row.") };
  const arr = ctrlRouthArray(coeffs);
  const stable = arr.signChanges === 0 && !arr.epsRows.length && !arr.zeroRows.length;
  const out = {
    routh: ctrlRouthTable(arr), rhp: arr.signChanges,
    verdict: stable ? tr("안정 (모든 근이 왼쪽 반평면)", "Stable (all roots in the left half-plane)")
      : arr.signChanges ? tr(`불안정 — 오른쪽 반평면 근 ${arr.signChanges}개`, `Unstable — ${arr.signChanges} right-half-plane root(s)`)
        : tr("임계 안정 또는 판정 보류 — 허수축 위 근이 있습니다", "Marginally stable — roots on the imaginary axis"),
    roots: ctrlRootsText(ctrlPolyRoots(coeffs)), KcUsed: hasGain ? Kc : undefined, warnings: [],
  };
  if (arr.epsRows.length) out.warnings.push(tr("첫 열에 0 이 생겨 작은 양수 ε 로 바꿔 계속했습니다.", "A zero appeared in the first column; it was replaced by a small positive ε."));
  if (arr.zeroRows.length) out.warnings.push(tr("한 행이 모두 0 이라 위 행의 보조 다항식을 미분한 계수로 바꿨습니다(원점 대칭 근).", "A whole row was zero; it was replaced by the derivative of the auxiliary polynomial from the row above (roots symmetric about the origin)."));
  if (hasGain) {
    const crit = ctrlCriticalGain(a, b);
    if (!crit) out.warnings.push(tr("Kc > 0 범위에서 안정한 구간을 찾지 못했습니다.", "No stable range was found for Kc > 0."));
    else if (crit.Ku === Infinity) out.warnings.push(tr("Kc 를 크게 해도(10⁶ 까지) 불안정해지지 않습니다 — 한계 이득이 없습니다.", "The loop stays stable for all Kc up to 10⁶ — there is no ultimate gain."));
    else {
      const wu = ctrlCrossFreq(a, b, crit.Ku);
      Object.assign(out, { Ku: crit.Ku, KcLo: crit.lo > 0 ? crit.lo : undefined, wu: wu ?? undefined, Pu: wu ? 2 * Math.PI / wu : undefined });
    }
  }
  return out;
}

function ctrlTfController(v) {
  return { Kc: v.Kc_b, tI: v.tI ?? undefined, tD: v.tD ?? undefined };
}

function ctrlTfModel(v) {
  return { K: v.K_b, tau: v.tau_b, theta: v.theta_b };
}

function ctrlTfBode(v) {
  const m = ctrlTfModel(v), c = ctrlTfController(v);
  const g = ctrlMargins(m, c);
  const stable = g.gm != null ? g.gm > 1 && (g.pm == null || g.pm > 0) : g.pm == null || g.pm > 0;
  const out = { wc: g.wc ?? undefined, pm: g.pm ?? undefined, w180: g.w180 ?? undefined, gm: g.gm ?? undefined, gmDb: g.gmDb ?? undefined,
    verdict: stable ? tr("폐루프 안정 (GM > 1, PM > 0)", "Closed loop stable (GM > 1, PM > 0)") : tr("폐루프 불안정 (GM ≤ 1 또는 PM ≤ 0)", "Closed loop unstable (GM ≤ 1 or PM ≤ 0)"), warnings: [] };
  if (g.wc == null) out.warnings.push(tr("|L| = 1 인 이득 교차 주파수가 없습니다(루프 이득이 늘 1 보다 작거나 큼).", "There is no gain crossover (|L| never equals 1)."));
  if (g.w180 == null) out.warnings.push(tr("위상이 −180° 를 지나지 않아 이득여유가 무한대입니다(데드타임 0).", "The phase never reaches −180°, so the gain margin is infinite (zero dead time)."));
  if (stable && g.gm != null && (g.gm < 1.7 || g.pm < 30)) out.warnings.push(tr("여유가 작습니다. 흔한 설계 기준은 GM 1.7–2.0 이상, PM 30–45° 이상입니다(Seborg 14장).", "Margins are small. Common design guidelines are GM ≥ 1.7–2.0 and PM ≥ 30–45° (Seborg Ch. 14)."));
  return out;
}

function ctrlTfChart(v) {
  if (v.tool === "step") {
    const p = ctrlStepProcess(v), ts = ctrlSettlingTime(p), tEnd = Math.max(ts * 1.4, v.theta + 5 * v.tau);
    return {
      x: { label: tr("시간", "Time"), unit: v.tu, min: 0, max: tEnd }, y: { label: "y(t)", unit: "" },
      series: [{ key: "y", label: tr("계단 응답", "Step response"), points: ctrlStepPoints(p, tEnd, 240) }],
      hlines: [{ y: v.K, label: tr("최종값 K", "Final value K") }], height: 260,
      ariaLabel: tr("계단 응답 그래프", "Step response chart"),
    };
  }
  if (v.tool === "bode") {
    const m = ctrlTfModel(v), c = ctrlTfController(v), pts = ctrlBodePoints(m, c), g = ctrlMargins(m, c);
    const ar = v.bshow !== "phase";
    const vl = ar ? (g.wc ? [{ x: g.wc, label: "ω_c" }] : []) : (g.w180 ? [{ x: g.w180, label: "ω₁₈₀" }] : []);
    return {
      x: { label: "ω", unit: CTRL_RAD_TEXT, log: true },
      y: ar ? { label: tr("진폭비 |L|", "Amplitude ratio |L|"), unit: "", log: true } : { label: tr("위상 ∠L", "Phase ∠L"), unit: "°" },
      series: [{ key: ar ? "ar" : "ph", label: ar ? "|L(jω)|" : "∠L(jω)", points: ar ? pts.ar : pts.ph }],
      hlines: ar ? [{ y: 1, label: "|L| = 1" }] : [{ y: -180, label: "−180°" }], vlines: vl, height: 280,
      ariaLabel: tr("열린 루프 Bode 선도", "Open-loop Bode plot"),
    };
  }
  return null;
}

const CTRL_TF_WHEN = { notRouth: c => c.tool !== "routh", step: c => c.tool === "step", step2: c => c.tool === "step" && c.order === "2", bode: c => c.tool === "bode" };

const CALC_DEF_TF_TOOLS = {
  key: "tf_tools",
  group: "control",
  title: tr("전달함수 도구 (계단 응답·Routh·Bode)", "Transfer-function tools (step response · Routh · Bode)"),
  summary: tr("화공기사 실기 공정제어 연습용입니다. 1차·2차 공정의 계단 응답 특성값(오버슈트·감쇠비·주기), 특성 방정식의 Routh–Hurwitz 안정도와 P 제어 한계 이득 Ku, 1차+데드타임 공정과 PI·PID 의 Bode 선도·이득여유·위상여유를 구합니다.",
    "For chemical engineering exam practice: step-response characteristics of first- and second-order processes (overshoot, decay ratio, period), Routh–Hurwitz stability of a characteristic equation with the ultimate gain Ku for P control, and the Bode plot, gain margin and phase margin of a first-order-plus-dead-time process with a PI or PID controller."),
  inputs: [
    { key: "tool", type: "choice", label: tr("도구", "Tool"), term: "transfer_function", default: "step",
      options: [{ v: "step", label: tr("계단 응답", "Step response") }, { v: "routh", label: "Routh–Hurwitz" }, { v: "bode", label: tr("Bode 선도·안정 여유", "Bode plot · margins") }] },
    { key: "order", type: "choice", label: tr("공정 차수", "Process order"), term: "second_order_system", default: "2", when: c => c.tool === "step",
      options: [{ v: "1", label: tr("1차 K/(τs+1)", "First order K/(τs+1)") }, { v: "2", label: tr("2차 K/(τ²s²+2ζτs+1)", "Second order K/(τ²s²+2ζτs+1)") }] },
    { key: "bshow", type: "choice", label: tr("그래프", "Chart"), term: "bode_plot", default: "ar", when: c => c.tool === "bode",
      options: [{ v: "ar", label: tr("진폭비", "Amplitude ratio") }, { v: "phase", label: tr("위상", "Phase") }] },
    { ...ctrlTimeUnitInput(), when: CTRL_TF_WHEN.notRouth },
    { key: "K", label: tr("공정 이득 K", "Process gain K"), term: "process_gain", unit: "—", default: 1, positive: true, when: CTRL_TF_WHEN.step },
    { key: "tau", label: tr("시간상수 τ", "Time constant τ"), term: "time_constant", unit: CTRL_TIME_TEXT, default: 1, positive: true, when: CTRL_TF_WHEN.step },
    { key: "zeta", label: tr("감쇠계수 ζ", "Damping ratio ζ"), term: "damping_coefficient", unit: "—", default: 0.5, positive: true, max: 100, when: CTRL_TF_WHEN.step2 },
    { key: "theta", label: tr("데드타임 θ", "Dead time θ"), term: "dead_time", unit: CTRL_TIME_TEXT, default: 0, min: 0, when: CTRL_TF_WHEN.step },
    // Bode 는 기본값이 다르다(SIMC 확인 예: K = 1, τ = 10, θ = 2, Kc = 2.5, τI = 10 → GM 3.14, PM 61.4°)
    { key: "K_b", label: tr("공정 이득 K", "Process gain K"), term: "process_gain", unit: "—", default: 1, positive: true, when: CTRL_TF_WHEN.bode },
    { key: "tau_b", label: tr("시간상수 τ", "Time constant τ"), term: "time_constant", unit: CTRL_TIME_TEXT, default: 10, positive: true, when: CTRL_TF_WHEN.bode },
    { key: "theta_b", label: tr("데드타임 θ", "Dead time θ"), term: "dead_time", unit: CTRL_TIME_TEXT, default: 2, min: 0, when: CTRL_TF_WHEN.bode },
    { key: "Kc_b", label: tr("제어기 이득 Kc", "Controller gain Kc"), term: "proportional_action", unit: "—", default: 2.5, positive: true, when: c => c.tool === "bode" },
    { key: "tI", label: tr("적분 시간 τI (비우면 P)", "Integral time τI (blank = P only)"), term: "integral_action", unit: CTRL_TIME_TEXT, default: 10, positive: true, optional: true, when: c => c.tool === "bode" },
    { key: "tD", label: tr("미분 시간 τD (선택)", "Derivative time τD (optional)"), term: "derivative_action", unit: CTRL_TIME_TEXT, default: "", positive: true, optional: true, when: c => c.tool === "bode" },
    { key: "poly", type: "table", label: tr("특성 방정식 a(s) + Kc·b(s) = 0 의 계수", "Coefficients of the characteristic equation a(s) + Kc·b(s) = 0"), term: "routh_hurwitz",
      minRows: 2, maxRows: 11, when: c => c.tool === "routh",
      columns: [
        { key: "a", label: tr("a (상수 부분)", "a (constant part)") },
        { key: "b", label: tr("b (Kc 에 곱하는 부분, 선택)", "b (multiplies Kc, optional)"), optional: true },
      ],
      rows: [{ a: 10, b: 0 }, { a: 17, b: 0 }, { a: 8, b: 0 }, { a: 1, b: 1 }],
      hint: tr("가장 높은 차수 sⁿ 부터 s⁰ 까지 한 행에 하나씩 넣습니다. 기본값은 10s³ + 17s² + 8s + 1 + Kc = 0 (3차 루프 P 제어, Ku = 12.6).",
        "One row per power, from the highest sⁿ down to s⁰. The default is 10s³ + 17s² + 8s + 1 + Kc = 0 (third-order loop with P control, Ku = 12.6).") },
    { key: "Kc", label: tr("판정할 Kc (b 가 있을 때)", "Kc to test (when b is given)"), term: "proportional_action", unit: "—", default: 5, min: 0, optional: true, when: c => c.tool === "routh" },
  ],
  outputs: [
    // 계단 응답
    { key: "verdict_step", label: tr("응답 형태", "Response type"), type: "text" },
    { key: "t63", label: tr("63.2 % 도달 (θ + τ)", "63.2 % reached (θ + τ)"), term: "time_constant", unit: CTRL_TIME_TEXT, digits: 4 },
    { key: "t95", label: tr("95 % 도달 (θ + 3τ)", "95 % reached (θ + 3τ)"), unit: CTRL_TIME_TEXT, digits: 4 },
    { key: "t98", label: tr("98.2 % 도달 (θ + 4τ)", "98.2 % reached (θ + 4τ)"), unit: CTRL_TIME_TEXT, digits: 4 },
    { key: "os", label: tr("오버슈트", "Overshoot"), term: "control_overshoot", unit: "%", digits: 4 },
    { key: "decay", label: tr("감쇠비 (오버슈트²)", "Decay ratio (overshoot²)"), term: "decay_ratio", unit: "—", digits: 4 },
    { key: "period", label: tr("진동 주기 P", "Period of oscillation P"), term: "oscillation_period", unit: CTRL_TIME_TEXT, digits: 4 },
    { key: "tPeak", label: tr("첫 정점 시각 t_p", "Time to first peak t_p"), unit: CTRL_TIME_TEXT, digits: 4 },
    { key: "tRise", label: tr("상승 시간 t_r (처음 최종값 도달)", "Rise time t_r (first reaches final value)"), unit: CTRL_TIME_TEXT, digits: 4 },
    { key: "ts", label: tr("정착 시간 t_s (±5 %)", "Settling time t_s (±5 %)"), term: "rise_time_settling_time", unit: CTRL_TIME_TEXT, digits: 4 },
    // Routh
    { key: "routh", type: "table", label: tr("Routh 배열", "Routh array"), term: "routh_hurwitz" },
    { key: "verdict_routh", label: tr("판정", "Assessment"), type: "text" },
    { key: "rhp", label: tr("오른쪽 반평면 근 수 (첫 열 부호 변화)", "Right-half-plane roots (first-column sign changes)"), term: "rhp_roots", unit: tr("개", "roots"), digits: 2 },
    { key: "KcUsed", label: tr("판정에 쓴 Kc", "Kc used"), unit: "—", digits: 4 },
    { key: "roots", label: tr("근 (수치 풀이)", "Roots (numerical)"), type: "text" },
    { key: "Ku", label: tr("한계 이득 Ku (P 제어)", "Ultimate gain Ku (P control)"), term: "ultimate_gain", unit: "—", digits: 5 },
    { key: "KcLo", label: tr("안정 구간 하한 Kc", "Lower stable limit of Kc"), unit: "—", digits: 5 },
    { key: "wu", label: tr("한계 주파수 ω_u", "Ultimate frequency ω_u"), term: "crossover_freq", unit: CTRL_RAD_TEXT, digits: 4 },
    { key: "Pu", label: tr("한계 주기 Pu = 2π/ω_u", "Ultimate period Pu = 2π/ω_u"), term: "ultimate_period", unit: CTRL_TIME_TEXT, digits: 4 },
    // Bode
    { key: "verdict_bode", label: tr("판정", "Assessment"), type: "text" },
    { key: "gm", label: tr("이득여유 GM", "Gain margin GM"), term: "gain_margin", unit: "—", digits: 4 },
    { key: "gmDb", label: tr("이득여유 (dB)", "Gain margin (dB)"), unit: "dB", digits: 4 },
    { key: "pm", label: tr("위상여유 PM", "Phase margin PM"), term: "phase_margin", unit: "°", digits: 4 },
    { key: "wc", label: tr("이득 교차 주파수 ω_c", "Gain crossover frequency ω_c"), term: "crossover_freq", unit: CTRL_RAD_TEXT, digits: 4 },
    { key: "w180", label: tr("위상 교차 주파수 ω₁₈₀", "Phase crossover frequency ω₁₈₀"), unit: CTRL_RAD_TEXT, digits: 4 },
  ],
  compute(v) {
    if (v.tool === "step") { const r = ctrlTfStep(v); return { ...r, verdict_step: r.verdict, yInf: undefined }; }
    if (v.tool === "routh") { const r = ctrlTfRouth(v); return r.error ? r : { ...r, verdict_routh: r.verdict }; }
    const r = ctrlTfBode(v);
    return { ...r, verdict_bode: r.verdict };
  },
  chart: ctrlTfChart,
  formula: [
    tr("1차: y(t) = K(1 − e^(−(t−θ)/τ)),  t = θ + τ 에서 63.2 %", "First order: y(t) = K(1 − e^(−(t−θ)/τ)),  63.2 % at t = θ + τ"),
    tr("2차(ζ < 1): 오버슈트 = exp(−πζ/√(1−ζ²)),  감쇠비 = 오버슈트²,  P = 2πτ/√(1−ζ²),  t_p = πτ/√(1−ζ²),  t_r = τ(π − cos⁻¹ζ)/√(1−ζ²)",
      "Second order (ζ < 1): overshoot = exp(−πζ/√(1−ζ²)),  decay ratio = overshoot²,  P = 2πτ/√(1−ζ²),  t_p = πτ/√(1−ζ²),  t_r = τ(π − cos⁻¹ζ)/√(1−ζ²)"),
    tr("Routh: b₁ = (a₁a₂ − a₀a₃)/a₁ …  첫 열 부호 변화 수 = 오른쪽 반평면 근 수", "Routh: b₁ = (a₁a₂ − a₀a₃)/a₁ …  number of first-column sign changes = number of right-half-plane roots"),
    "L(jω) = Kc(1 + 1/(jωτI) + jωτD) · K e^(−jωθ)/(jωτ + 1)",
    tr("GM = 1/|L(jω₁₈₀)| (∠L = −180°),  PM = 180° + ∠L(jω_c) (|L| = 1)", "GM = 1/|L(jω₁₈₀)| (∠L = −180°),  PM = 180° + ∠L(jω_c) (|L| = 1)"),
  ],
  notes: [
    tr("Routh 판정은 다항식 계수만 봅니다. 데드타임 e^(−θs) 가 있는 루프는 Routh 로 정확히 판정할 수 없으니 Bode(주파수 응답)를 쓰십시오.", "The Routh test works on polynomial coefficients only. A loop with dead time e^(−θs) cannot be tested exactly by Routh; use the Bode (frequency response) tool."),
    tr("ζ ≥ 1 이면 오버슈트·주기가 없습니다. 정착 시간은 응답 식에서 수치로 찾습니다.", "For ζ ≥ 1 there is no overshoot or period. The settling time is found numerically from the response."),
    tr("Bode 의 PID 는 이상형(미분 필터 없음)입니다. 근은 Durand–Kerner 반복으로 구한 수치 값입니다.", "The PID in the Bode tool is the ideal form (no derivative filter). Roots are numerical values from Durand–Kerner iteration."),
  ],
  reference: [
    tr("Seborg, Edgar, Mellichamp & Doyle, Process Dynamics and Control 3판(2011), 5장 2차 공정 응답(식 5-48 … 5-57), 11장 Routh 안정도(Gv = 1/(2s+1), Gp = 1/(5s+1), Gm = 1/(s+1) 루프 예제), 14장 주파수 응답·이득·위상 여유",
      "Seborg, Edgar, Mellichamp & Doyle, Process Dynamics and Control, 3rd ed. (2011), Ch. 5 second-order responses (Eqs. 5-48 … 5-57), Ch. 11 Routh stability (loop example with Gv = 1/(2s+1), Gp = 1/(5s+1), Gm = 1/(s+1)), Ch. 14 frequency response, gain and phase margins"),
    tr("Nise, N.S., Control Systems Engineering 7판(2015), 6장 — Routh 특수한 경우(예제 6.2 첫 열 0, 예제 6.4 0 행)",
      "Nise, N.S., Control Systems Engineering, 7th ed. (2015), Ch. 6 — Routh special cases (Example 6.2 zero in the first column, Example 6.4 row of zeros)"),
    "Skogestad, S., TKP4140 Process Control lecture \"Stability\" (NTNU, 2024), Example 3 — Routh array for 10s³ + 17s² + 8s + 1 + Kc: Kc < 12.6. https://skoge.folk.ntnu.no/prosessregulering/lectures/2024/SiS10Stability.pdf",
    "Skogestad, S. (2003). Simple analytic rules for model reduction and PID controller tuning. J. Process Control, 13, 291–309 — SIMC margins (τc = θ: GM 3.14, PM 61.4°).",
  ],
};

Object.assign(window, { CALC_DEF_TF_TOOLS, ctrlTfStep, ctrlTfRouth, ctrlTfBode, ctrlTfChart, ctrlRouthTable, ctrlRootsText });
