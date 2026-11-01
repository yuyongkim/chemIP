// 계산기: 열폭주 선별(참고용 스크리닝) — 단열 온도 상승 ΔTad, MTSR, 0차 TMRad·TD24, Stoessel 위험도 등급(criticality class) 1–5.
// 순수 함수(React 없음). 근거: Stoessel(1993, 2008), Townsend & Tou(1980), Keller et al.(1997).

// 0차 근사 TMRad [s] — T [K], q(T) [W/kg] = q0·exp[−Ea/R (1/T − 1/T0)], cp [J/(kg·K)], Ea [J/mol]
function calcRunawayQ(v, T) {
  return v.q0 * Math.exp((-v.Ea / CALC_CONST.R) * (1 / T - 1 / v.Tq));
}
function calcRunawayTmr(v, T) {
  return v.cp * CALC_CONST.R * T * T / (calcRunawayQ(v, T) * v.Ea);
}
// TMRad(T) = target [s] 인 온도(이분법, 200–1500 K). TMRad 는 T 에 대해 줄어든다. 범위 밖이면 null
function calcRunawayTd(v, target) {
  let a = 200, b = 1500;
  if (calcRunawayTmr(v, a) < target || calcRunawayTmr(v, b) > target) return null;
  for (let i = 0; i < 200; i++) {
    const m = (a + b) / 2;
    if (calcRunawayTmr(v, m) > target) a = m; else b = m;
  }
  return (a + b) / 2;
}
// Stoessel 위험도 등급(1993; 2008 3장 그림) — Tp < MTSR 가정, 네 온도의 순서로 정한다
//   MTSR < MTT:  TD24 ≥ MTT → 1,  MTSR < TD24 < MTT → 2,  TD24 ≤ MTSR → 5
//   MTSR ≥ MTT:  TD24 > MTSR → 3,  MTT < TD24 ≤ MTSR → 4,  TD24 ≤ MTT → 5
function calcStoesselClass(mtsr, mtt, td24) {
  if (mtsr < mtt) return td24 >= mtt ? 1 : td24 > mtsr ? 2 : 5;
  return td24 > mtsr ? 3 : td24 > mtt ? 4 : 5;
}

const CALC_RUNAWAY_CLASS_TEXT = {
  1: tr("1등급 — MTSR·MTT 모두 TD24 아래, 냉각 실패해도 분해 반응·기술 한계에 닿지 않음", "Class 1 — MTSR and MTT both below TD24; a cooling failure reaches neither the decomposition nor the technical limit"),
  2: tr("2등급 — MTSR < TD24 < MTT, 분해는 시작되지 않지만 오래 머물면(열 축적) 위험", "Class 2 — MTSR < TD24 < MTT; decomposition is not triggered, but long residence (heat accumulation) is a risk"),
  3: tr("3등급 — MTT < MTSR < TD24, 기술 한계(끓음·압력)에 닿음 — 그 장벽의 설계 확인 필요", "Class 3 — MTT < MTSR < TD24; the technical limit (boiling, pressure) is reached — that barrier must be designed for it"),
  4: tr("4등급 — MTT < TD24 < MTSR, 기술 한계가 막지 못하면 분해 반응이 시작됨 — 장벽 신뢰성 필수", "Class 4 — MTT < TD24 < MTSR; decomposition starts unless the technical limit holds — the barrier must be reliable"),
  5: tr("5등급 — TD24 가 MTSR·MTT 보다 낮음, 기술 한계 전에 분해 반응이 시작됨 — 공정 조건 재검토", "Class 5 — TD24 below MTSR and MTT; decomposition starts before the technical limit — revise the process"),
};

function calcRunawayHours(s) { return s / 3600; }

function calcRunawayChart(v, out) {
  const p = calcRunawayParams(v);
  const lo = Math.max(p.Tp - 30, 200);
  const hi = Math.max(out.MTSR, p.MTT, out.TD24 || 0) + 40;
  const C = (T) => calcConvert("temperature", T, "K", "C");
  const pts = calcChartRange(lo, hi, 60).map(T => [C(T), calcRunawayHours(calcRunawayTmr(p, T))]).filter(([, h]) => h > 1e-3 && h < 1e6);
  const vlines = [
    { x: C(p.Tp), label: "Tp" },
    { x: C(out.MTSR), label: "MTSR" },
    { x: C(p.MTT), label: "MTT" },
  ];
  if (out.TD24) vlines.push({ x: C(out.TD24), label: "TD24" });
  return {
    x: { label: tr("온도", "Temperature"), unit: CALC_UNITS.temperature.C.label },
    y: { label: "TMRad", unit: "h", log: true },
    series: [{ key: "tmr", label: tr("TMRad (0차 근사)", "TMRad (zero-order)"), points: pts }],
    hlines: [{ y: 24, label: "24 h" }, { y: 8, label: "8 h" }],
    vlines,
    ariaLabel: tr("온도에 따른 단열 최대반응속도 도달시간 TMRad 와 공정 온도 수준", "TMRad versus temperature with process temperature levels"),
  };
}

// 화면 값(기준 단위) → 계산용(SI)
function calcRunawayParams(v) {
  return {
    Q: v.Q * 1000, cp: v.cp * 1000, Tp: v.Tp, Xac: v.Xac / 100, MTT: v.MTT,
    q0: v.q0, Tq: v.Tq, Ea: v.Ea * 1000, Qd: v.Qd == null ? null : v.Qd * 1000,
  };
}

const CALC_DEF_RUNAWAY = {
  key: "runaway",
  group: "reaction",
  title: tr("열폭주 선별 (ΔTad · MTSR · TMRad · Stoessel 등급)", "Thermal runaway screening (ΔTad · MTSR · TMRad · Stoessel class)"),
  summary: tr("참고용 스크리닝 / 사전 검토용입니다. 냉각이 끊겼을 때 미반응 축적분이 올리는 온도(MTSR)와, 분해 반응의 단열 최대반응속도 도달시간(TMRad)이 24시간이 되는 온도 TD24 를 어림하고, Stoessel 위험도 등급(1–5)을 보입니다.",
    "Screening only (preliminary review). Estimates the temperature reached by the accumulated, unreacted material after a cooling failure (MTSR) and the temperature TD24 at which the adiabatic time to maximum rate of the decomposition is 24 h, and shows the Stoessel criticality class (1–5)."),
  inputs: [
    { key: "Q", label: tr("주 반응열 Q′r (반응 혼합물 kg 당)", "Heat of main reaction Q′r (per kg of reaction mass)"), term: "rw_reaction_energy", unit: "kJ/kg", default: 200, positive: true,
      hint: tr("반응 열량계(RC1 등) 측정값", "From reaction calorimetry (e.g. RC1)") },
    { key: "cp", label: tr("비열 cp′", "Specific heat cp′"), term: "cp", unit: "kJ/(kg·K)", default: 2, positive: true },
    { key: "Tp", label: tr("공정 온도 Tp", "Process temperature Tp"), dim: "temperature", unit: "K", show: "C", default: 60, positive: true },
    { key: "Xac", label: tr("최대 축적률 X_ac", "Maximum accumulation X_ac"), term: "rw_accumulation", unit: "%", default: 30, min: 0, max: 100,
      hint: tr("회분식(한 번에 투입)은 100 %", "100 % for a batch process (all charged at once)") },
    { key: "MTT", label: tr("기술적 최고 온도 MTT", "Maximum temperature for technical reasons MTT"), term: "rw_mtt", dim: "temperature", unit: "K", show: "C", default: 110, positive: true,
      hint: tr("개방계는 끓는점, 밀폐계는 허용 압력에 닿는 온도", "Boiling point for open systems; temperature at the maximum allowed pressure for closed ones") },
    { key: "q0", label: tr("분해 발열 속도 q₀ (T₀ 에서)", "Decomposition heat release rate q₀ (at T₀)"), term: "rw_heat_release_rate", unit: "W/kg", default: 3, positive: true,
      hint: tr("DSC·단열 열량계 측정값", "From DSC or adiabatic calorimetry") },
    { key: "Tq", label: tr("q₀ 측정 온도 T₀", "Temperature T₀ of q₀"), dim: "temperature", unit: "K", show: "C", default: 150, positive: true },
    { key: "Ea", label: tr("분해 활성화 에너지 Ea", "Activation energy of decomposition Ea"), term: "rx_activation_energy", unit: "kJ/mol", default: 50, positive: true,
      hint: tr("모르면 50 kJ/mol(보수적, Keller 1997)", "If unknown, 50 kJ/mol (conservative, Keller 1997)") },
    { key: "Qd", label: tr("분해열 Q′d (선택)", "Heat of decomposition Q′d (optional)"), unit: "kJ/kg", default: "", optional: true, positive: true,
      hint: tr("넣으면 분해 단열 온도 상승과 최종 온도를 보입니다", "If entered, shows the decomposition adiabatic temperature rise and final temperature") },
  ],
  outputs: [
    { key: "dTad", label: tr("주 반응 단열 온도 상승 ΔTad", "Adiabatic temperature rise ΔTad (main reaction)"), term: "rx_dtad", unit: "K", digits: 4 },
    { key: "dTacc", label: tr("축적분 온도 상승 X_ac·ΔTad", "Rise from accumulation X_ac·ΔTad"), unit: "K", digits: 4 },
    { key: "MTSR", label: "MTSR", term: "rw_mtsr", dim: "temperature", unit: "K", show: "C", digits: 4 },
    { key: "TD24", label: "TD24", term: "rw_td24", dim: "temperature", unit: "K", show: "C", digits: 4 },
    { key: "tmrTp", label: tr("Tp 에서 TMRad", "TMRad at Tp"), term: "rw_tmrad", dim: "time", unit: "s", show: "h", digits: 4 },
    { key: "tmrMtsr", label: tr("MTSR 에서 TMRad", "TMRad at MTSR"), term: "rw_tmrad", dim: "time", unit: "s", show: "h", digits: 4 },
    { key: "tmrBand", label: tr("MTSR 에서 TMRad 구간", "TMRad band at MTSR"), type: "text" },
    { key: "cls", label: tr("Stoessel 위험도 등급", "Stoessel criticality class"), term: "rw_criticality", unit: "—", digits: 1 },
    { key: "clsText", label: tr("등급 뜻", "Meaning"), type: "text" },
    { key: "dTd", label: tr("분해 단열 온도 상승", "Adiabatic temperature rise of decomposition"), unit: "K", digits: 4 },
    { key: "Tend", label: tr("최종 온도 (MTSR + 분해)", "Final temperature (MTSR + decomposition)"), dim: "temperature", unit: "K", show: "C", digits: 4 },
  ],
  compute(v) {
    const p = calcRunawayParams(v);
    const dTad = p.Q / p.cp;
    const MTSR = p.Tp + p.Xac * dTad;
    const TD24 = calcRunawayTd(p, 24 * 3600);
    const warnings = [tr("참고용 스크리닝입니다. 0차 TMRad 는 자가촉매 분해에서 실제보다 길게 나올 수 있어, 반응 열량계·단열 열량계(ARC 등) 측정과 전문가 검토를 대신하지 못합니다.",
      "Screening only. The zero-order TMRad can overestimate the time for autocatalytic decompositions, so it does not replace reaction or adiabatic calorimetry (e.g. ARC) and expert review.")];
    if (p.MTT <= p.Tp) warnings.push(tr("MTT 가 공정 온도 이하입니다. 입력을 확인하십시오.", "MTT is at or below the process temperature. Check the inputs."));
    if (TD24 == null) return { dTad, dTacc: p.Xac * dTad, MTSR, error: tr("200–1500 K 안에서 TMRad = 24 h 인 온도를 찾지 못했습니다. q₀·T₀·Ea 를 확인하십시오.", "No temperature with TMRad = 24 h was found between 200 and 1500 K. Check q₀, T₀ and Ea.") };
    if (TD24 <= p.Tp) warnings.push(tr("TD24 가 공정 온도보다 낮습니다. 정상 운전 중에도 분해가 진행될 수 있습니다.", "TD24 is below the process temperature. Decomposition may proceed even in normal operation."));
    const tmrMtsr = calcRunawayTmr(p, MTSR);
    const h = calcRunawayHours(tmrMtsr);
    const cls = calcStoesselClass(MTSR, p.MTT, TD24);
    const out = {
      dTad, dTacc: p.Xac * dTad, MTSR, TD24, tmrTp: calcRunawayTmr(p, p.Tp), tmrMtsr,
      tmrBand: h < 8 ? tr("8 h 미만 — TD8 보다 높음", "Below 8 h — above TD8") : h < 24 ? tr("8–24 h", "8–24 h") : tr("24 h 이상 — TD24 이하", "24 h or more — at or below TD24"),
      cls, clsText: CALC_RUNAWAY_CLASS_TEXT[cls], warnings,
    };
    if (p.Qd != null) { out.dTd = p.Qd / p.cp; out.Tend = MTSR + out.dTd; }
    return out;
  },
  chart: calcRunawayChart,
  formula: [
    "ΔTad = Q′r / cp′,   MTSR = Tp + X_ac · ΔTad",
    tr("0차 근사: TMRad(T) = cp′ R T² / (q(T) · Ea),  q(T) = q₀ exp[−(Ea/R)(1/T − 1/T₀)]", "Zero-order approximation: TMRad(T) = cp′ R T² / (q(T) · Ea),  q(T) = q₀ exp[−(Ea/R)(1/T − 1/T₀)]"),
    tr("TD24: TMRad(TD24) = 24 h 를 이분법으로 풂", "TD24: solve TMRad(TD24) = 24 h by bisection"),
    tr("등급: Tp, MTSR, MTT, TD24 네 온도의 순서(Stoessel 1993)", "Class: order of the four temperatures Tp, MTSR, MTT and TD24 (Stoessel 1993)"),
  ],
  notes: [
    tr("참고용 스크리닝 / 사전 검토용입니다. 공정 안전 판단(PSM 공정위험성평가 등)에는 실측 열량계 자료와 전문가 검토가 필요합니다.", "Screening / preliminary review only. Process safety decisions (e.g. PSM process hazard analysis) need measured calorimetry data and expert review."),
    tr("Ea 를 모를 때 50 kJ/mol 을 쓰면 낮은 온도 쪽 외삽에서 TD24 가 보수적(낮게)으로 나옵니다(Keller et al. 1997).", "Using Ea = 50 kJ/mol when unknown makes TD24 conservative (lower) when extrapolating to lower temperatures (Keller et al. 1997)."),
    tr("TMRad 8 h·24 h 는 Stoessel 의 확률 평가에서 쓰는 시간 기준(TD8·TD24)입니다. 위 구간 표시는 MTSR 에서의 TMRad 가 그 기준의 어디에 있는지만 보입니다.", "The 8 h and 24 h TMRad levels are the time criteria (TD8, TD24) used in Stoessel's probability assessment. The band shown only says where TMRad at MTSR falls relative to them."),
    tr("등급 판정 순서는 Stoessel 의 2025년 발표(물리적 단위 조작의 위험도 등급)에 실린 예로 시험했습니다: 저장 Tp 25·THmax 50·TSTAB 60·MTT 88 °C → 2등급, 패들 건조기 Tp 50·THmax 160·TSTAB 110·MTT 122 °C → 5등급.", "The class logic is tested against examples in Stoessel's 2025 talk on criticality classes for physical unit operations: storage Tp 25, THmax 50, TSTAB 60, MTT 88 °C → class 2; paddle dryer Tp 50, THmax 160, TSTAB 110, MTT 122 °C → class 5."),
  ],
  reference: [
    "Stoessel, F. (1993). What is your thermal risk? Chem. Eng. Prog. 89(10), 68–75.",
    tr("Stoessel, F., Thermal Safety of Chemical Processes: Risk Assessment and Process Design, Wiley-VCH(2008), 2–3장 — ΔTad·MTSR·TMRad·위험도 등급", "Stoessel, F., Thermal Safety of Chemical Processes: Risk Assessment and Process Design, Wiley-VCH (2008), Ch. 2–3 — ΔTad, MTSR, TMRad, criticality classes"),
    "Townsend, D.I. & Tou, J.C. (1980). Thermal hazard evaluation by an accelerating rate calorimeter. Thermochim. Acta 37, 1–30.",
    "Keller, A., Stark, D., Fierz, H., Heinzle, E. & Hungerbühler, K. (1997). Estimation of the time to maximum rate using dynamic DSC experiments. J. Loss Prev. Process Ind. 10(1), 31–41.",
    "Stoessel, F., Nanchen, A. & Tran-Van, A.-F. (2025). Criticality classes for physical unit operations. STK meeting, Kemptthal, 23–24 Sept 2025 (TÜV SÜD Schweiz).",
  ],
};

Object.assign(window, { CALC_DEF_RUNAWAY, calcRunawayTmr, calcRunawayTd, calcStoesselClass });
