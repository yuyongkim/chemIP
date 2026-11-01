// 계산기: PID 튜닝 — FOPDT 모델(직접 입력 또는 계단 시험 두 점 맞춤) → 방법별 P·PI·PID 설정 비교표.
// 규칙은 calc_ctrl_tuning.jsx(CTRL_TUNING_RULES), 모델 수식은 calc_ctrl_fopdt.jsx.

// 입력 → { m: { K, tau, theta, tc, Ku, Pu }, fitted, kuFromModel } 또는 { error }
function ctrlPidTuningModel(v) {
  const base = v.src === "smith" ? ctrlSmithFit(v.du, v.dy, v.t28, v.t63) : { K: v.K, tau: v.tau, theta: v.theta };
  if (v.src === "smith" && !(v.t63 > v.t28)) return { error: tr("63.2 % 시각이 28.3 % 시각보다 늦어야 합니다.", "The 63.2 % time must be later than the 28.3 % time.") };
  if (v.src === "smith" && base.theta < -1e-9 * base.tau) return { error: tr("두 시각으로 구한 데드타임이 음수입니다(t₆₃ > 3·t₂₈ 이 아님). 1차+지연 모델로 맞지 않는 응답입니다.", "The fitted dead time is negative (t₆₃ is less than 3·t₂₈). The response does not fit a first-order-plus-dead-time model.") };
  if (!(base.K > 0)) return { error: tr("공정 이득이 0보다 커야 합니다. 역작용 공정은 크기 |K| 를 넣고 제어기 작용 방향을 바꾸십시오.", "The process gain must be positive. For a reverse-acting process, enter |K| and set the controller to the opposite action.") };
  const theta = Math.max(0, base.theta);
  const tc = ctrlDefaultTc(theta, v.tc);
  const measured = v.Ku != null && v.Pu != null;
  const ult = measured ? { Ku: v.Ku, Pu: v.Pu } : ctrlUltimate({ ...base, theta });
  return { m: { K: base.K, tau: base.tau, theta, tc, Ku: ult?.Ku, Pu: ult?.Pu }, fitted: v.src === "smith", kuFromModel: !measured && Boolean(ult) };
}

// 방법별 설정 → 결과 표
function ctrlTuningTable(list, m, tu) {
  return {
    columns: [
      { key: "method", label: tr("방법", "Method") },
      { key: "form", label: tr("형식", "Form") },
      { key: "Kc", label: "Kc" },
      { key: "tI", label: `τI (${tu})` },
      { key: "tD", label: `τD (${tu})` },
      { key: "KKc", label: "K·Kc" },
    ],
    rows: list.map(c => ({ method: c.label, form: c.form, Kc: c.Kc, tI: c.tI ?? null, tD: c.tD ?? null, KKc: m.K * c.Kc })),
  };
}

const CALC_DEF_PID_TUNING = {
  key: "pid_tuning",
  group: "control",
  title: tr("PID 튜닝 (ZN·Cohen–Coon·IMC·SIMC·ITAE)", "PID tuning (ZN · Cohen–Coon · IMC · SIMC · ITAE)"),
  summary: tr("1차+데드타임(FOPDT) 공정 모델이나 계단 시험 두 점에서 P·PI·PID 제어기 설정(Kc, τI, τD)을 방법별로 구해 한 표에 비교합니다. 화공기사 실기 공정제어 연습에도 씁니다.",
    "Computes P, PI or PID controller settings (Kc, τI, τD) by several tuning rules from a first-order-plus-dead-time (FOPDT) model or two points of a step test, and compares them in one table. Also useful for chemical engineering exam practice."),
  inputs: [
    { key: "src", type: "choice", label: tr("공정 모델", "Process model"), term: "two_point_fit", default: "fopdt",
      options: [{ v: "fopdt", label: tr("K·τ·θ 직접 입력", "Enter K, τ, θ") }, { v: "smith", label: tr("계단 시험 두 점 (28.3 %·63.2 %)", "Step test, two points (28.3 % · 63.2 %)") }] },
    { key: "ctype", type: "choice", label: tr("제어기", "Controller"), term: "pid_controller", default: "PI",
      options: [{ v: "P", label: "P" }, { v: "PI", label: "PI" }, { v: "PID", label: "PID" }] },
    ctrlTimeUnitInput(),
    { key: "K", label: tr("공정 이득 K", "Process gain K"), term: "process_gain", unit: "—", default: 1, positive: true, when: c => c.src === "fopdt" },
    { key: "tau", label: tr("시간상수 τ", "Time constant τ"), term: "time_constant", unit: CTRL_TIME_TEXT, default: 10, positive: true, when: c => c.src === "fopdt" },
    { key: "theta", label: tr("데드타임 θ", "Dead time θ"), term: "dead_time", unit: CTRL_TIME_TEXT, default: 2, min: 0, when: c => c.src === "fopdt" },
    { key: "du", label: tr("조작변수 계단 크기 Δu", "Controller output step Δu"), unit: tr("%·단위", "% or units"), default: 13, when: c => c.src === "smith",
      hint: tr("수동 모드에서 바꾼 제어기 출력(예: 30 → 43 % 이면 13).", "Change in controller output in manual mode (e.g. 30 → 43 % gives 13).") },
    { key: "dy", label: tr("측정값 최종 변화 Δy", "Final change in measurement Δy"), unit: tr("%·단위", "% or units"), default: 20, when: c => c.src === "smith" },
    { key: "t28", label: tr("28.3 % 도달 시각 t₂₈", "Time to 28.3 % t₂₈"), term: "two_point_fit", unit: CTRL_TIME_TEXT, default: 3.04, positive: true, when: c => c.src === "smith",
      hint: tr("계단을 준 순간을 0 으로 잰 시각입니다.", "Measured from the moment the step was applied.") },
    { key: "t63", label: tr("63.2 % 도달 시각 t₆₃", "Time to 63.2 % t₆₃"), term: "two_point_fit", unit: CTRL_TIME_TEXT, default: 7.0, positive: true, when: c => c.src === "smith" },
    { key: "tc", label: tr("폐루프 시간상수 τc (λ, 선택)", "Closed-loop time constant τc (λ, optional)"), term: "closed_loop_tc", unit: CTRL_TIME_TEXT, default: "", positive: true, optional: true,
      hint: tr("IMC·SIMC 에만 씁니다. 비우면 τc = θ (Skogestad 권장, 빠르고 견고한 쪽). 크게 하면 느리고 부드러워집니다.", "Used by IMC and SIMC only. Blank means τc = θ (Skogestad's recommendation for fast, robust control). Larger values give slower, smoother control.") },
    { key: "Ku", label: tr("한계 이득 Ku (선택, 시험값)", "Ultimate gain Ku (optional, measured)"), term: "ultimate_gain", unit: "—", default: "", positive: true, optional: true,
      hint: tr("연속 진동 시험값이 있으면 Ku·Pu 를 함께 넣습니다. 비우면 모델에서 계산합니다.", "If you have continuous-cycling test results, enter both Ku and Pu. Leave blank to compute them from the model.") },
    { key: "Pu", label: tr("한계 주기 Pu (선택, 시험값)", "Ultimate period Pu (optional, measured)"), term: "ultimate_period", unit: CTRL_TIME_TEXT, default: "", positive: true, optional: true },
  ],
  outputs: [
    { key: "table", type: "table", label: tr("방법별 제어기 설정 (이상형 PID)", "Controller settings by method (ideal PID form)"), term: "tuning_rules" },
    { key: "K_fit", label: tr("맞춘 공정 이득 K", "Fitted process gain K"), term: "process_gain", unit: "—", digits: 4 },
    { key: "tau_fit", label: tr("맞춘 시간상수 τ", "Fitted time constant τ"), term: "time_constant", unit: CTRL_TIME_TEXT, digits: 4 },
    { key: "theta_fit", label: tr("맞춘 데드타임 θ", "Fitted dead time θ"), term: "dead_time", unit: CTRL_TIME_TEXT, digits: 4 },
    { key: "ratio", label: tr("θ/τ (클수록 제어가 어려움)", "θ/τ (higher is harder to control)"), unit: "—", digits: 3 },
    { key: "tc_used", label: tr("쓴 τc (IMC·SIMC)", "τc used (IMC · SIMC)"), term: "closed_loop_tc", unit: CTRL_TIME_TEXT, digits: 4 },
    { key: "Ku", label: tr("한계 이득 Ku", "Ultimate gain Ku"), term: "ultimate_gain", unit: "—", digits: 4 },
    { key: "Pu", label: tr("한계 주기 Pu", "Ultimate period Pu"), term: "ultimate_period", unit: CTRL_TIME_TEXT, digits: 4 },
  ],
  compute(v) {
    const mod = ctrlPidTuningModel(v);
    if (mod.error) return { error: mod.error };
    const { m } = mod;
    const list = ctrlTuneAll(v.ctype, m);
    if (!list.length) return { error: tr("이 조건에서 쓸 수 있는 튜닝 규칙이 없습니다. θ > 0 이거나 τc 를 넣으십시오.", "No tuning rule applies to these inputs. Use θ > 0 or enter τc.") };
    const warnings = [];
    const r = m.theta / m.tau;
    if (!(m.theta > 0)) warnings.push(tr("θ = 0 이라 데드타임이 필요한 규칙(ZN·Cohen–Coon·ITAE)과 한계 이득은 계산하지 않았습니다.", "θ = 0, so rules that need a dead time (ZN, Cohen–Coon, ITAE) and the ultimate gain are not calculated."));
    else if (r < 0.1 || r > 1) warnings.push(tr("ZN·Cohen–Coon·ITAE 상관식은 대략 0.1 ≤ θ/τ ≤ 1 범위의 자료로 만들어졌습니다. 범위 밖에서는 IMC·SIMC 를 우선 보십시오.", "The ZN, Cohen–Coon and ITAE correlations were fitted for roughly 0.1 ≤ θ/τ ≤ 1. Outside that range, prefer IMC or SIMC."));
    if (v.ctype === "PID" && list.some(c => c.key === "simc")) warnings.push(tr("SIMC 는 FOPDT 에 PID 규칙을 따로 두지 않아(τD 는 2차 모델의 두 번째 시간상수) PI 값을 보였습니다.", "SIMC has no separate PID rule for an FOPDT model (τD is the second time constant of a second-order model), so its PI settings are shown."));
    if (v.ctype === "P") warnings.push(tr("IMC·SIMC·ITAE 는 이 표에서 P 제어 규칙을 두지 않습니다. P 제어는 정상상태 오프셋이 남습니다.", "IMC, SIMC and ITAE have no P-only rule in this table. P-only control leaves a steady-state offset."));
    if (mod.kuFromModel) warnings.push(tr("Ku·Pu 는 FOPDT 모델의 위상 −180° 조건에서 계산했습니다. 실제 연속 진동 시험값이 있으면 그 값을 넣으십시오.", "Ku and Pu were computed from the FOPDT model at the −180° phase condition. Enter measured continuous-cycling values if you have them."));
    if (m.tc == null) warnings.push(tr("θ = 0 이라 IMC·SIMC 에 쓸 τc 를 정할 수 없습니다. τc 를 넣으십시오.", "θ = 0, so τc for IMC and SIMC cannot be set automatically. Enter τc."));
    return {
      table: ctrlTuningTable(list, m, v.tu),
      K_fit: mod.fitted ? m.K : undefined, tau_fit: mod.fitted ? m.tau : undefined, theta_fit: mod.fitted ? m.theta : undefined,
      ratio: m.theta / m.tau, tc_used: m.tc ?? undefined, Ku: m.Ku, Pu: m.Pu, warnings,
    };
  },
  formula: [
    "G(s) = K·e^(−θs) / (τs + 1),   Gc(s) = Kc (1 + 1/(τI s) + τD s)",
    tr("두 점 맞춤: τ = 1.5 (t₆₃ − t₂₈),  θ = t₆₃ − τ,  K = Δy/Δu", "Two-point fit: τ = 1.5 (t₆₃ − t₂₈),  θ = t₆₃ − τ,  K = Δy/Δu"),
    tr("ZN 반응 곡선 PID: Kc = 1.2τ/(Kθ), τI = 2θ, τD = 0.5θ  ·  PI: Kc = 0.9τ/(Kθ), τI = 3.33θ", "ZN reaction curve PID: Kc = 1.2τ/(Kθ), τI = 2θ, τD = 0.5θ  ·  PI: Kc = 0.9τ/(Kθ), τI = 3.33θ"),
    tr("ZN 한계 감도 PID: Kc = 0.6Ku, τI = Pu/2, τD = Pu/8  ·  PI: 0.45Ku, Pu/1.2  ·  ω_u: atan(τω) + θω = π", "ZN ultimate gain PID: Kc = 0.6Ku, τI = Pu/2, τD = Pu/8  ·  PI: 0.45Ku, Pu/1.2  ·  ω_u: atan(τω) + θω = π"),
    "Cohen–Coon PI: Kc = (τ/Kθ)(0.9 + θ/12τ),  τI = θ(30 + 3θ/τ)/(9 + 20θ/τ)",
    "IMC PI: Kc = τ/(K(τc + θ)), τI = τ  ·  PID: Kc = (τ + θ/2)/(K(τc + θ/2)), τI = τ + θ/2, τD = τθ/(2τ + θ)",
    "SIMC PI: Kc = τ/(K(τc + θ)),  τI = min(τ, 4(τc + θ))",
    "ITAE: K·Kc = A (θ/τ)^B,  τ/τI = A (θ/τ)^B  (setpoint: τ/τI = A + B θ/τ),  τD/τ = A (θ/τ)^B",
  ],
  notes: [
    tr("모든 값은 이상(ISA 병렬) 형식 기준입니다. 직렬(상호작용) 형식 제어기에 넣을 때는 변환이 필요합니다.", "All settings are for the ideal (ISA parallel) form. Convert them before entering into a series (interacting) form controller."),
    tr("Kc 의 단위는 K 의 역수입니다(예: K 가 %/% 이면 Kc 도 %/%). 시간 값은 고른 시간 단위 하나로 통일해 넣으십시오.", "Kc has the inverse units of K (e.g. %/% if K is %/%). Enter all times in the one time unit selected."),
    tr("ZN·Cohen–Coon 은 감쇠비 1/4 을 노린 규칙이라 진동이 큽니다. 폐루프 모의(loop_sim)에서 응답을 비교해 보십시오.", "ZN and Cohen–Coon aim at a quarter decay ratio and give oscillatory responses. Compare the responses in the closed-loop simulator (loop_sim)."),
  ],
  reference: [
    "Ziegler, J.G. & Nichols, N.B. (1942). Optimum settings for automatic controllers. Trans. ASME, 64, 759–768.",
    "Cohen, G.H. & Coon, G.A. (1953). Theoretical consideration of retarded control. Trans. ASME, 75, 827–834.",
    "Skogestad, S. (2003). Simple analytic rules for model reduction and PID controller tuning. J. Process Control, 13, 291–309.",
    tr("Seborg, Edgar, Mellichamp & Doyle, Process Dynamics and Control 3판(2011), 12장 — 표 12.1 IMC 설정(Chien & Fruehauf 1990), ITAE 상관식(Lopez et al. 1967, Rovira et al. 1969), 예제 12.4",
      "Seborg, Edgar, Mellichamp & Doyle, Process Dynamics and Control, 3rd ed. (2011), Ch. 12 — Table 12.1 IMC settings (Chien & Fruehauf 1990), ITAE correlations (Lopez et al. 1967, Rovira et al. 1969), Example 12.4"),
    tr("Smith, C.A. & Corripio, A.B., Principles and Practice of Automatic Process Control 3판(2005), 7장 — 두 점(28.3 %·63.2 %) FOPDT 맞춤",
      "Smith, C.A. & Corripio, A.B., Principles and Practice of Automatic Process Control, 3rd ed. (2005), Ch. 7 — two-point (28.3 % · 63.2 %) FOPDT fit"),
  ],
};

Object.assign(window, { CALC_DEF_PID_TUNING, ctrlPidTuningModel, ctrlTuningTable });
