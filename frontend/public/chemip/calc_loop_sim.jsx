// 계산기: 폐루프 모의 — FOPDT 공정 + PI·PID, 설정값 계단(t = 0)과 부하 계단(중간)을 튜닝 방법별로 한 그래프에 비교.
// 모의는 calc_ctrl_sim.jsx, 튜닝 규칙은 calc_ctrl_tuning.jsx. 그래프는 chart(values) 가 같은 모의를 다시 돌려 만든다.

// 비교 묶음 — 색이 6개라 설정값 선 + 방법 4개 + 직접 입력 1개까지
const CTRL_SIM_SETS = {
  main: ["zn_open", "cohen_coon", "imc", "simc"],
  itae: ["itae_load", "itae_sp", "imc", "simc"],
  zn: ["zn_open", "zn_ult", "simc"],
};

// 입력 → { m, o(모의 설정), runs: [{ key, label, c, sim, met }] } 또는 { error }
function ctrlLoopRuns(v) {
  const m = { K: v.K, tau: v.tau, theta: v.theta };
  const tc = ctrlDefaultTc(v.theta, v.tc);
  if (tc == null) return { error: tr("θ = 0 이면 τc 를 넣으십시오.", "With θ = 0, enter τc.") };
  const ult = ctrlUltimate(m);
  const model = { ...m, tc, Ku: ult?.Ku, Pu: ult?.Pu };
  const seg = v.tEnd != null ? v.tEnd / 2 : 4 * v.tau + 10 * v.theta + 4 * tc;
  const o = { tEnd: 2 * seg, sp: v.sp, load: v.load || 0, tLoad: seg };
  const tuned = ctrlTuneAll(v.ctype, model, CTRL_SIM_SETS[v.cmp]);
  if (v.Kc_m != null) tuned.push({ key: "manual", label: tr("직접 입력", "Manual"), form: v.tD_m ? "PID" : v.tI_m ? "PI" : "P", Kc: v.Kc_m, tI: v.tI_m ?? undefined, tD: v.tD_m ?? undefined });
  // 설정이 같은 방법(예: τ ≤ 4(τc+θ) 이면 IMC = SIMC)은 한 줄로 합쳐 이름을 잇는다 — 겹친 선이 가려지지 않게
  const merged = [];
  for (const c of tuned) {
    const same = merged.find(x => x.Kc === c.Kc && x.tI === c.tI && x.tD === c.tD);
    if (same) same.label = `${same.label} = ${c.label}`; else merged.push({ ...c });
  }
  const runs = merged.map(c => {
    const sim = ctrlSimulate(m, c, o);
    return { ...c, sim, met: sim.unstable ? null : ctrlLoopMetrics(sim, o) };
  });
  return { m, o, tc, runs };
}

function ctrlLoopTable(runs, tu) {
  const unstable = tr("불안정", "unstable");
  return {
    columns: [
      { key: "method", label: tr("방법", "Method") },
      { key: "Kc", label: "Kc" },
      { key: "tI", label: `τI (${tu})` },
      { key: "tD", label: `τD (${tu})` },
      { key: "os", label: tr("오버슈트 %", "Overshoot %"), digits: 3 },
      { key: "ts", label: tr(`정착 ±2 % (${tu})`, `Settling ±2 % (${tu})`), digits: 3 },
      { key: "iaeSp", label: tr("IAE 설정값", "IAE setpoint"), digits: 3 },
      { key: "iaeLoad", label: tr("IAE 부하", "IAE load"), digits: 3 },
      { key: "uPeak", label: tr("최대 |u|", "Peak |u|"), digits: 3 },
    ],
    rows: runs.map(r => ({
      method: r.label, Kc: r.Kc, tI: r.tI ?? null, tD: r.tD ?? null,
      os: r.met ? r.met.overshoot : unstable, ts: r.met ? (r.met.settle ?? tr("안 됨", "not settled")) : unstable,
      iaeSp: r.met ? r.met.iaeSp : unstable, iaeLoad: r.met ? r.met.iaeLoad : unstable, uPeak: r.met ? r.met.uPeak : unstable,
    })),
  };
}

// 가장 작은 지표의 방법 → "이름 (값)"
function ctrlLoopBest(runs, field) {
  const ok = runs.filter(r => r.met && r.met[field] != null);
  if (!ok.length) return undefined;
  const best = ok.reduce((a, b) => (b.met[field] < a.met[field] ? b : a));
  return `${best.label} (${calcFormatNumber(best.met[field], 3)})`;
}

const CALC_DEF_LOOP_SIM = {
  key: "loop_sim",
  group: "control",
  title: tr("폐루프 응답 모의 (PI·PID 튜닝 비교)", "Closed-loop simulation (PI · PID tuning comparison)"),
  summary: tr("1차+데드타임 공정을 PI·PID 로 제어할 때 설정값 계단과 부하 계단 응답을 튜닝 방법별로 같은 그래프에 그리고, 오버슈트·정착 시간·IAE 를 비교합니다(브라우저 안 이산 시간 모의).",
    "Simulates setpoint-step and load-step responses of a first-order-plus-dead-time process under PI or PID control, plotting several tuning methods on one chart and comparing overshoot, settling time and IAE (discrete-time simulation in the browser)."),
  inputs: [
    { key: "ctype", type: "choice", label: tr("제어기", "Controller"), term: "pid_controller", default: "PI",
      options: [{ v: "PI", label: "PI" }, { v: "PID", label: "PID" }] },
    { key: "cmp", type: "choice", label: tr("비교할 튜닝", "Tunings to compare"), term: "ziegler_nichols", default: "main",
      options: [
        { v: "main", label: tr("ZN·Cohen–Coon·IMC·SIMC", "ZN · Cohen–Coon · IMC · SIMC") },
        { v: "itae", label: tr("ITAE 두 가지·IMC·SIMC", "Both ITAE · IMC · SIMC") },
        { v: "zn", label: tr("ZN 두 가지·SIMC", "Both ZN · SIMC") },
      ] },
    { key: "show", type: "choice", label: tr("그래프", "Chart"), default: "pv",
      options: [{ v: "pv", label: tr("측정값 PV·설정값", "PV and setpoint") }, { v: "mv", label: tr("제어기 출력 u", "Controller output u") }] },
    ctrlTimeUnitInput(),
    { key: "K", label: tr("공정 이득 K", "Process gain K"), term: "process_gain", unit: "—", default: 1, positive: true },
    { key: "tau", label: tr("시간상수 τ", "Time constant τ"), term: "time_constant", unit: CTRL_TIME_TEXT, default: 10, positive: true },
    { key: "theta", label: tr("데드타임 θ", "Dead time θ"), term: "dead_time", unit: CTRL_TIME_TEXT, default: 2, min: 0 },
    { key: "tc", label: tr("폐루프 시간상수 τc (선택)", "Closed-loop time constant τc (optional)"), term: "closed_loop_tc", unit: CTRL_TIME_TEXT, default: "", positive: true, optional: true,
      hint: tr("IMC·SIMC 에 씁니다. 비우면 τc = θ.", "Used by IMC and SIMC. Blank means τc = θ.") },
    { key: "sp", label: tr("설정값 계단 크기", "Setpoint step size"), term: "setpoint", unit: "—", default: 1 },
    { key: "load", label: tr("부하 계단 크기 (공정 입력에 더함)", "Load step size (added at process input)"), term: "disturbance", unit: "—", default: 1,
      hint: tr("모의 시간 절반에 들어갑니다. 0 이면 부하 계단 없음.", "Applied at half the simulation time. 0 means no load step.") },
    { key: "tEnd", label: tr("모의 시간 (선택)", "Simulation time (optional)"), unit: CTRL_TIME_TEXT, default: "", positive: true, optional: true,
      hint: tr("비우면 2 × (4τ + 10θ + 4τc).", "Blank means 2 × (4τ + 10θ + 4τc).") },
    { key: "Kc_m", label: tr("직접 입력 Kc (선택)", "Manual Kc (optional)"), term: "proportional_action", unit: "—", default: "", optional: true,
      hint: tr("넣으면 이 설정도 함께 그립니다.", "If entered, this setting is plotted too.") },
    { key: "tI_m", label: tr("직접 입력 τI (선택)", "Manual τI (optional)"), term: "integral_action", unit: CTRL_TIME_TEXT, default: "", positive: true, optional: true },
    { key: "tD_m", label: tr("직접 입력 τD (선택)", "Manual τD (optional)"), term: "derivative_action", unit: CTRL_TIME_TEXT, default: "", positive: true, optional: true },
  ],
  outputs: [
    { key: "table", type: "table", label: tr("방법별 응답 성능", "Response performance by method"), term: "iae" },
    { key: "best_sp", label: tr("설정값 IAE 최소", "Lowest setpoint IAE"), term: "setpoint", type: "text" },
    { key: "best_load", label: tr("부하 IAE 최소", "Lowest load IAE"), term: "disturbance", type: "text" },
    { key: "tLoad", label: tr("부하 계단 시각", "Load step time"), unit: CTRL_TIME_TEXT, digits: 4 },
    { key: "dt", label: tr("모의 시간 간격 Δt", "Simulation time step Δt"), unit: CTRL_TIME_TEXT, digits: 3 },
  ],
  compute(v) {
    const res = ctrlLoopRuns(v);
    if (res.error) return { error: res.error };
    if (!res.runs.length) return { error: tr("이 조건에서 비교할 튜닝이 없습니다. θ > 0 이거나 다른 비교 묶음을 고르십시오.", "No tuning applies to these inputs. Use θ > 0 or choose another comparison set.") };
    const warnings = [];
    if (res.runs.some(r => !r.met)) warnings.push(tr("불안정한 설정이 있습니다. 그 응답은 발산하기 시작한 곳까지만 그렸습니다.", "Some settings are unstable. Their responses are drawn only until they start to diverge."));
    if (!(v.theta > 0)) warnings.push(tr("θ = 0 이라 데드타임이 필요한 규칙은 빠졌습니다.", "θ = 0, so rules that need a dead time are left out."));
    return {
      table: ctrlLoopTable(res.runs, v.tu), best_sp: ctrlLoopBest(res.runs, "iaeSp"), best_load: v.load ? ctrlLoopBest(res.runs, "iaeLoad") : undefined,
      tLoad: v.load ? res.o.tLoad : undefined, dt: ctrlSimDt(res.m, res.o.tEnd), warnings,
    };
  },
  chart(v) {
    const res = ctrlLoopRuns(v);
    if (res.error || !res.runs.length) return null;
    const field = v.show === "mv" ? "u" : "y";
    const cap = 5 * (Math.abs(v.sp) + Math.abs(v.K * (v.load || 0)) + 1e-12);
    const series = res.runs.map(r => ({
      key: r.key, label: r.met ? r.label : `${r.label} (${tr("불안정", "unstable")})`,
      points: ctrlSimPoints(r.sim, field, 240).filter(([, y]) => field === "u" || Math.abs(y) <= cap),
    }));
    if (field === "y") series.unshift({ key: "sp", label: tr("설정값", "Setpoint"), kind: "step", dashed: true, points: ctrlSimPoints(res.runs[0].sim, "r", 240) });
    return {
      x: { label: tr("시간", "Time"), unit: v.tu, min: 0, max: res.o.tEnd },
      y: field === "u" ? { label: tr("제어기 출력 u", "Controller output u"), unit: "" } : { label: tr("측정값 PV", "Measurement PV"), unit: "" },
      series,
      vlines: v.load ? [{ x: res.o.tLoad, label: tr("부하 계단", "Load step") }] : [],
      height: 300,
      ariaLabel: tr("튜닝 방법별 폐루프 응답 그래프", "Closed-loop responses by tuning method"),
    };
  },
  formula: [
    "G(s) = K e^(−θs)/(τs + 1),   y[k+1] = a·y[k] + K(1 − a)·(u + d)[k − n],   a = e^(−Δt/τ),  n = round(θ/Δt)",
    tr("u = Kc ( e + (1/τI)∫e dt − τD dy_f/dt ),  미분은 측정값에, 필터 τf = 0.1 τD", "u = Kc ( e + (1/τI)∫e dt − τD dy_f/dt ),  derivative on measurement, filter τf = 0.1 τD"),
    tr("IAE = ∫|e| dt,  오버슈트 = (y_max − r)/r,  정착 시간: |y − r| ≤ 2 % 에 머물기 시작한 시각", "IAE = ∫|e| dt,  overshoot = (y_max − r)/r,  settling time: when |y − r| stays within 2 %"),
  ],
  notes: [
    tr("모델이 정확하고(공정 = 모델) 출력 제한·밸브 비선형이 없다고 본 비교입니다. 실제 공정은 모델 오차만큼 더 진동하거나 느려집니다.", "Assumes a perfect model (process = model) with no output limits or valve nonlinearity. A real process will be more oscillatory or slower in proportion to the model error."),
    tr("부하 외란은 공정 입력에 더해지는 것으로 봅니다(Gd = Gp). 설정값 IAE 는 부하 계단 전까지, 부하 IAE 는 그 뒤 구간입니다.", "The load disturbance enters at the process input (Gd = Gp). Setpoint IAE covers the time before the load step and load IAE the time after it."),
  ],
  reference: [
    tr("Seborg, Edgar, Mellichamp & Doyle, Process Dynamics and Control 3판(2011), 12장 — 적분 오차 기준(IAE, 식 12-35), 예제 12.4 비교 방식(Gd = G)",
      "Seborg, Edgar, Mellichamp & Doyle, Process Dynamics and Control, 3rd ed. (2011), Ch. 12 — integral error criteria (IAE, Eq. 12-35), comparison as in Example 12.4 (Gd = G)"),
    "Skogestad, S. (2003). Simple analytic rules for model reduction and PID controller tuning. J. Process Control, 13, 291–309.",
    "Åström, K.J. & Hägglund, T. (2006). Advanced PID Control. ISA — derivative filtering and derivative on measurement.",
  ],
};

Object.assign(window, { CALC_DEF_LOOP_SIM, CTRL_SIM_SETS, ctrlLoopRuns, ctrlLoopTable, ctrlLoopBest });
