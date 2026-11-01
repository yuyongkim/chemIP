// PID 튜닝 규칙 — FOPDT 모델(K, τ, θ)·폐루프 시간상수 τc·한계 이득 Ku·주기 Pu → 방법별 { Kc, tI, tD }. React 없음.
// 규칙 하나 = CTRL_TUNING_RULES 한 항목(방법 이름 + 제어기 형식별 식). 표·모의는 이 목록만 읽는다.
// 식은 이상(ISA 병렬) 형식 Gc = Kc(1 + 1/(τI s) + τD s) 기준. tI·tD 가 없으면 그 동작이 없다.
// m = { K, tau, theta, tc, Ku, Pu }. 식이 성립하지 않는 조건(θ = 0, Ku 없음)이면 null.

const ctrlR = (m) => m.theta / m.tau;   // θ/τ

// ITAE 상관식 Y = A·(θ/τ)^B (Seborg et al. 표 12.3, Lopez et al. 1967 부하·Rovira et al. 1969 설정값)
const CTRL_ITAE = {
  load: { PI: { kc: [0.859, -0.977], ti: [0.674, -0.680] }, PID: { kc: [1.357, -0.947], ti: [0.842, -0.738], td: [0.381, 0.995] } },
  sp: { PI: { kc: [0.586, -0.916], ti: [1.03, -0.165] }, PID: { kc: [0.965, -0.85], ti: [0.796, -0.1465], td: [0.308, 0.929] } },
};
function ctrlItae(kind, form, m) {
  const c = CTRL_ITAE[kind][form];
  if (!c || !(m.theta > 0)) return null;
  const r = ctrlR(m);
  const tauOverTi = kind === "sp" ? c.ti[0] + c.ti[1] * r : c.ti[0] * r ** c.ti[1];   // 설정값 τI 식은 선형
  return { Kc: c.kc[0] * r ** c.kc[1] / m.K, tI: m.tau / tauOverTi, tD: c.td ? m.tau * c.td[0] * r ** c.td[1] : undefined };
}

const CTRL_TUNING_RULES = [
  { key: "zn_open", label: tr("Ziegler–Nichols 반응 곡선", "Ziegler–Nichols reaction curve"), needs: "delay",
    rules: {
      P: m => ({ Kc: m.tau / (m.K * m.theta) }),
      PI: m => ({ Kc: 0.9 * m.tau / (m.K * m.theta), tI: m.theta / 0.3 }),
      PID: m => ({ Kc: 1.2 * m.tau / (m.K * m.theta), tI: 2 * m.theta, tD: 0.5 * m.theta }),
    } },
  { key: "zn_ult", label: tr("Ziegler–Nichols 한계 감도", "Ziegler–Nichols ultimate gain"), needs: "ultimate",
    rules: {
      P: m => ({ Kc: 0.5 * m.Ku }),
      PI: m => ({ Kc: 0.45 * m.Ku, tI: m.Pu / 1.2 }),
      PID: m => ({ Kc: 0.6 * m.Ku, tI: m.Pu / 2, tD: m.Pu / 8 }),
    } },
  { key: "cohen_coon", label: "Cohen–Coon", needs: "delay",
    rules: {
      P: m => ({ Kc: (m.tau / (m.K * m.theta)) * (1 + ctrlR(m) / 3) }),
      PI: m => ({ Kc: (m.tau / (m.K * m.theta)) * (0.9 + ctrlR(m) / 12), tI: m.theta * (30 + 3 * ctrlR(m)) / (9 + 20 * ctrlR(m)) }),
      PID: m => ({ Kc: (m.tau / (m.K * m.theta)) * (4 / 3 + ctrlR(m) / 4), tI: m.theta * (32 + 6 * ctrlR(m)) / (13 + 8 * ctrlR(m)),
        tD: 4 * m.theta / (11 + 2 * ctrlR(m)) }),
    } },
  { key: "imc", label: tr("IMC (λ)", "IMC (λ)"), needs: "tc",
    rules: {
      PI: m => ({ Kc: m.tau / (m.K * (m.tc + m.theta)), tI: m.tau }),
      PID: m => ({ Kc: (m.tau + m.theta / 2) / (m.K * (m.tc + m.theta / 2)), tI: m.tau + m.theta / 2, tD: m.tau * m.theta / (2 * m.tau + m.theta) }),
    } },
  { key: "simc", label: "SIMC (Skogestad)", needs: "tc", piOnly: true,
    rules: {
      PI: m => ({ Kc: m.tau / (m.K * (m.tc + m.theta)), tI: Math.min(m.tau, 4 * (m.tc + m.theta)) }),
    } },
  { key: "itae_load", label: tr("ITAE (부하 외란)", "ITAE (load disturbance)"), needs: "delay",
    rules: { PI: m => ctrlItae("load", "PI", m), PID: m => ctrlItae("load", "PID", m) } },
  { key: "itae_sp", label: tr("ITAE (설정값 변경)", "ITAE (setpoint change)"), needs: "delay",
    rules: { PI: m => ctrlItae("sp", "PI", m), PID: m => ctrlItae("sp", "PID", m) } },
];

// 규칙을 쓸 수 있는지
function ctrlRuleUsable(rule, m) {
  if (rule.needs === "delay") return m.theta > 0;
  if (rule.needs === "ultimate") return m.Ku > 0 && m.Pu > 0;
  if (rule.needs === "tc") return m.tc > 0;
  return true;
}

// 방법 하나 → { key, label, form(실제 쓴 형식), Kc, tI, tD } 또는 null.
// SIMC 는 FOPDT 에 PID 규칙이 없어(τD 는 2차 모델의 τ2) PID 를 고르면 PI 값을 낸다(form = "PI").
function ctrlTuneOne(rule, form, m) {
  if (!ctrlRuleUsable(rule, m)) return null;
  const use = rule.rules[form] ? form : (rule.piOnly && form === "PID" ? "PI" : null);
  if (!use) return null;
  const c = rule.rules[use](m);
  return c ? { key: rule.key, label: rule.label, form: use, Kc: c.Kc, tI: c.tI, tD: c.tD } : null;
}

// 여러 방법 → 계산된 것만
function ctrlTuneAll(form, m, keys) {
  return CTRL_TUNING_RULES.filter(r => !keys || keys.includes(r.key)).map(r => ctrlTuneOne(r, form, m)).filter(Boolean);
}

Object.assign(window, { CTRL_TUNING_RULES, CTRL_ITAE, ctrlItae, ctrlRuleUsable, ctrlTuneOne, ctrlTuneAll });

// 폐루프 시간상수 τc(λ): 비우면 SIMC 권장값 τc = θ. θ = 0 이고 비우면 null(사용자가 넣어야 한다).
function ctrlDefaultTc(theta, tc) {
  if (tc != null) return tc;
  return theta > 0 ? theta : null;
}

Object.assign(window, { ctrlDefaultTc });
