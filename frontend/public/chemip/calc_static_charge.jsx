// 계산기: 정전기 — 액체 전하 완화시간 τ = ε₀·εr / κ, 도전율 등급, 대전 도체의 방전 에너지 W = ½CV² 와 최소점화에너지(MIE) 비교.
// 도전율 등급 경계(50 pS/m, 10⁴ pS/m)는 공개 문헌에 널리 실린 수치만 쓴다(규격 본문은 옮기지 않는다).

const CALC_EPS0 = 8.8541878128e-12;            // F/m — 진공 유전율(CODATA 2018)
const CALC_STATIC_BANDS = [                     // pS/m 경계, 낮은 쪽부터
  { below: 50, label: () => tr("저도전성 (50 pS/m 미만) — 전하가 쌓이기 쉬움", "Low conductivity (below 50 pS/m) — readily accumulates charge") },
  { below: 1e4, label: () => tr("중도전성 (50–10,000 pS/m)", "Medium conductivity (50–10,000 pS/m)") },
];

function calcStaticClass(kappa) {
  const hit = CALC_STATIC_BANDS.find(b => kappa < b.below);
  return hit ? hit.label() : tr("고도전성 (10,000 pS/m 초과) — 접지하면 전하가 빨리 빠짐", "High conductivity (above 10,000 pS/m) — charge drains quickly when grounded");
}

// τ [s] (κ: S/m)
function calcRelaxationTime(epsr, kappaSm) {
  return CALC_EPS0 * epsr / kappaSm;
}

function calcStaticChart(v, out) {
  const tau = out.tau;
  const pts = calcChartRange(0, 5 * tau, 40).map(t => [t, 100 * Math.exp(-t / tau)]);
  return {
    x: { label: tr("시간", "Time"), unit: "s", min: 0 },
    y: { label: tr("남은 전하", "Charge remaining"), unit: "%", log: true },
    series: [{ key: "q", label: tr("전하 완화 Q/Q₀", "Charge relaxation Q/Q₀"), points: pts }],
    hlines: [{ y: 1, label: "1 %" }],
    markers: [{ x: tau, y: 100 / Math.E, label: "τ" }],
    ariaLabel: tr("액체 전하 완화 곡선", "Liquid charge relaxation curve"),
  };
}

const CALC_DEF_STATIC_CHARGE = {
  key: "static_charge",
  group: "flammability",
  title: tr("정전기 완화시간 · 방전 에너지", "Static charge relaxation · spark energy"),
  summary: tr("액체의 유전율과 도전율로 전하 완화시간과 도전율 등급을 구하고, 대전된 도체(사람·용기)의 방전 에너지 ½CV² 를 최소점화에너지와 비교합니다.",
    "Calculates a liquid's charge relaxation time and conductivity class from its permittivity and conductivity, and compares the spark energy ½CV² of a charged conductor (person, container) with the minimum ignition energy."),
  inputs: [
    { key: "epsr", term: "dielectric_constant", label: tr("비유전율 εr", "Relative permittivity εr"), unit: "—", default: 2, min: 1, max: 100,
      hint: tr("탄화수소는 대략 2", "About 2 for hydrocarbons") },
    { key: "kappa", term: "liquid_conductivity", label: tr("액체 도전율 κ", "Liquid conductivity κ"), unit: "pS/m", default: 1, positive: true,
      hint: tr("1 pS/m = 10⁻¹² S/m. 기본값은 정제 탄화수소 수준의 예시", "1 pS/m = 10⁻¹² S/m. The default is an example at the level of a refined hydrocarbon") },
    { key: "C", term: "capacitance", label: tr("도체 정전용량 C", "Conductor capacitance C"), unit: "pF", default: 200, positive: true,
      hint: tr("사람 몸은 흔히 100–200 pF 로 잡습니다", "A human body is often taken as 100–200 pF") },
    { key: "V", term: "static_voltage", label: tr("대전 전위 V", "Charged potential V"), unit: "kV", default: 10, positive: true },
    { key: "mie", term: "mie_ref", label: tr("비교할 MIE", "MIE to compare"), unit: "mJ", default: 0.25, positive: true,
      hint: tr("예: 프로페인 약 0.25 mJ, 수소 약 0.017 mJ(공기 중, 가장 쉬운 농도). 출처가 있는 물질 값을 넣습니다", "e.g. propane about 0.25 mJ, hydrogen about 0.017 mJ (in air, most easily ignited mixture). Enter a sourced value for the substance") },
  ],
  outputs: [
    { key: "tau", term: "relaxation_time", label: tr("전하 완화시간 τ", "Charge relaxation time τ"), dim: "time", unit: "s", show: "s", digits: 4 },
    { key: "t1", term: "relaxation_time", label: tr("1 % 로 줄 때까지 (4.6 τ)", "Time to 1 % (4.6 τ)"), dim: "time", unit: "s", show: "s", digits: 4 },
    { key: "cls", term: "conductivity_class", label: tr("도전율 등급", "Conductivity class"), type: "text" },
    { key: "Q", term: "stored_charge", label: tr("쌓인 전하 Q = CV", "Stored charge Q = CV"), unit: "µC", digits: 4 },
    { key: "W", term: "spark_energy", label: tr("방전 에너지 W = ½CV²", "Spark energy W = ½CV²"), unit: "mJ", digits: 4 },
    { key: "ratio", term: "spark_energy", label: "W / MIE", unit: "—", digits: 4 },
    { key: "verdict", term: "mie_ref", label: tr("비교", "Comparison"), type: "text" },
  ],
  compute(v) {
    const tau = calcRelaxationTime(v.epsr, v.kappa * 1e-12);
    const Cf = v.C * 1e-12, Vv = v.V * 1e3;
    const W = 0.5 * Cf * Vv * Vv * 1e3;     // mJ
    const ratio = W / v.mie;
    const verdict = ratio >= 1
      ? tr("방전 에너지가 MIE 이상 — 그 혼합기를 점화할 수 있는 수준(참고용)", "Spark energy at or above the MIE — enough to ignite that mixture (screening)")
      : tr("방전 에너지가 MIE 미만 — 이 조건만으로는 점화 에너지에 못 미침(참고용)", "Spark energy below the MIE — not enough on its own in these conditions (screening)");
    const warnings = [];
    if (v.kappa < 50) warnings.push(tr("저도전성 액체입니다. 접지해도 액체 안의 전하는 τ 동안 남으므로 투입 뒤 정치 시간, 유속 제한을 함께 검토합니다.", "This is a low-conductivity liquid. Grounding does not remove the charge inside the liquid faster than τ, so also review relaxation (waiting) time and flow-velocity limits."));
    return { tau, t1: tau * Math.log(100), cls: calcStaticClass(v.kappa), Q: Cf * Vv * 1e6, W, ratio, verdict, warnings };
  },
  chart: calcStaticChart,
  formula: [
    "τ = ε₀ · εr / κ,   ε₀ = 8.854 × 10⁻¹² F/m",
    "Q(t) = Q₀ · exp(−t/τ)",
    "W = ½ C V²,   Q = C V",
  ],
  notes: [
    tr("참고용 스크리닝입니다. 완화시간 식은 균일한 액체의 옴 완화를 가정합니다. 아주 낮은 도전율(대략 1 pS/m 미만)에서는 실제 완화가 이 식보다 빠른 쌍곡선형이 될 수 있습니다.",
      "Screening estimate only. The relaxation equation assumes ohmic relaxation in a uniform liquid. At very low conductivity (roughly below 1 pS/m) real relaxation can be faster than this, following a hyperbolic law."),
    tr("W = ½CV² 는 도체에서 한 번에 방전하는 불꽃의 최대 에너지입니다. 절연체 표면의 브러시 방전 등은 이 식으로 나타낼 수 없습니다.",
      "W = ½CV² is the maximum energy of a single spark from a conductor. Brush discharges from insulating surfaces cannot be described this way."),
    tr("도전율 등급 경계(50 pS/m, 10,000 pS/m)는 아래 문헌에 실린 수치만 옮겼습니다. 설계 판단은 해당 규격 원문을 확인하십시오.",
      "Only the conductivity band limits (50 pS/m, 10,000 pS/m) are taken from the sources below. Check the standard itself for design decisions."),
  ],
  reference: [
    tr("Crowl & Louvar, Chemical Process Safety 3판(2011), 7장 정전기 — 완화시간 τ = εr ε₀ / γc, 축전 에너지 J = C V²/2, 물체별 정전용량", "Crowl & Louvar, Chemical Process Safety, 3rd ed. (2011), Ch. 7 Static electricity — relaxation time τ = εr ε₀ / γc, capacitor energy J = C V²/2, capacitance of common objects"),
    "Britton, L.G. (1999). Avoiding Static Ignition Hazards in Chemical Operations. CCPS/AIChE, New York.",
    tr("IEC TS 60079-32-1:2013 및 NFPA 77 — 액체 도전율 등급 경계(수치만 인용, 본문 미수록)", "IEC TS 60079-32-1:2013 and NFPA 77 — liquid conductivity band limits (values cited only; text not reproduced)"),
    tr("CODATA 2018 — 진공 유전율 ε₀", "CODATA 2018 — vacuum permittivity ε₀"),
  ],
};

Object.assign(window, { CALC_DEF_STATIC_CHARGE, calcRelaxationTime, calcStaticClass });
