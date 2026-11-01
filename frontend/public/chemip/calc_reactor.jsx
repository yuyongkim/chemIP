// 계산기: 1차 반응 등온 액상 반응기 — CSTR·PFR 부피 ↔ 전환율 (일정 밀도).

// 전환율 X → 부피 [m³]. k [1/s], v0 [m³/s]
function calcReactorVolume(type, X, k, v0) {
  return type === "cstr" ? v0 * X / (k * (1 - X)) : (v0 / k) * Math.log(1 / (1 - X));
}
// 부피 → 전환율
function calcReactorConversion(type, V, k, v0) {
  const Da = k * V / v0;
  return type === "cstr" ? Da / (1 + Da) : 1 - Math.exp(-Da);
}

// 그래프: 부피 0 – 3 V 에서 CSTR·PFR 전환율 곡선(L, %), 고른 반응기의 계산점
function calcReactorChart(v, out) {
  const X = v.mode === "V" ? v.X / 100 : out.X_out / 100;
  const V = v.mode === "V" ? out.V_out : v.V;
  const vs = calcChartRange(0, V * 3, 60);
  const curve = (type) => vs.map(Vm => [Vm * 1000, calcReactorConversion(type, Vm, v.k, v.v0) * 100]);
  return {
    x: { label: tr("반응기 부피 V", "Reactor volume V"), unit: "L", min: 0 },
    y: { label: tr("전환율 X", "Conversion X"), unit: "%", min: 0, max: 100 },
    series: [
      { key: "cstr", label: "CSTR", points: curve("cstr") },
      { key: "pfr", label: "PFR", points: curve("pfr"), dashed: true },
    ],
    markers: [{ x: V * 1000, y: X * 100, label: v.type === "cstr" ? "CSTR" : "PFR" }],
    vlines: [{ x: V * 1000 }],
    ariaLabel: tr("반응기 부피에 따른 전환율 — CSTR 과 PFR", "Conversion versus reactor volume — CSTR and PFR"),
  };
}

const CALC_DEF_REACTOR = {
  key: "reactor",
  group: "process",
  title: tr("반응기 크기 (1차 반응 CSTR·PFR)", "Reactor sizing (first-order CSTR · PFR)"),
  summary: tr("1차 반응(A → 생성물)을 연속 교반조(CSTR)나 관형 반응기(PFR)에서 할 때, 목표 전환율에 필요한 부피 또는 주어진 부피의 전환율을 구합니다.",
    "For a first-order reaction (A → products) in a continuous stirred-tank reactor (CSTR) or plug-flow reactor (PFR), computes the volume needed for a target conversion, or the conversion for a given volume."),
  inputs: [
    { key: "type", type: "choice", label: tr("반응기", "Reactor"), term: "reactor_type", default: "cstr",
      options: [{ v: "cstr", label: tr("CSTR (연속 교반조)", "CSTR (stirred tank)") }, { v: "pfr", label: tr("PFR (관형)", "PFR (plug flow)") }] },
    { key: "mode", type: "choice", label: tr("구할 값", "Solve for"), default: "V",
      options: [{ v: "V", label: tr("전환율 → 부피", "Conversion → volume") }, { v: "X", label: tr("부피 → 전환율", "Volume → conversion") }] },
    { key: "k", label: tr("속도 상수 k", "Rate constant k"), term: "rate_constant", dim: "rate", unit: "per_s", show: "per_min", default: 0.1, positive: true },
    { key: "v0", label: tr("부피 유량 v₀", "Volumetric flow rate v₀"), dim: "flow", unit: "m3s", show: "Lmin", default: 100, positive: true },
    { key: "X", label: tr("목표 전환율 X", "Target conversion X"), term: "conversion", unit: "%", default: 90, positive: true, max: 99.9999, when: c => c.mode === "V" },
    { key: "V", label: tr("반응기 부피 V", "Reactor volume V"), dim: "volume", unit: "m3", show: "L", default: 1000, positive: true, when: c => c.mode === "X" },
  ],
  outputs: [
    { key: "V_out", label: tr("필요 부피 V", "Required volume V"), dim: "volume", unit: "m3", show: "L", digits: 5 },
    { key: "X_out", label: tr("전환율 X", "Conversion X"), term: "conversion", unit: "%", digits: 5 },
    { key: "tau", label: tr("공간 시간 τ = V/v₀", "Space time τ = V/v₀"), term: "residence_time", dim: "time", unit: "s", show: "min", digits: 5 },
    { key: "Da", label: tr("Damköhler 수 k·τ", "Damköhler number k·τ"), term: "damkohler", unit: "—", digits: 4 },
    { key: "ratio", label: tr("CSTR ÷ PFR 부피 (같은 X)", "CSTR ÷ PFR volume (same X)"), unit: "—", digits: 4 },
  ],
  compute(v) {
    const X = v.mode === "V" ? v.X / 100 : calcReactorConversion(v.type, v.V, v.k, v.v0);
    const V = v.mode === "V" ? calcReactorVolume(v.type, X, v.k, v.v0) : v.V;
    const tau = V / v.v0;
    return {
      V_out: v.mode === "V" ? V : undefined, X_out: v.mode === "X" ? X * 100 : undefined,
      tau, Da: v.k * tau, ratio: calcReactorVolume("cstr", X, v.k, v.v0) / calcReactorVolume("pfr", X, v.k, v.v0),
    };
  },
  chart: calcReactorChart,
  formula: [
    "CSTR: V = v₀ X / (k (1 − X)),   X = kτ / (1 + kτ)",
    "PFR: V = (v₀ / k) ln( 1 / (1 − X) ),   X = 1 − e^(−kτ)",
    tr("τ = V / v₀,  Damköhler 수 Da = k τ", "τ = V / v₀,  Damköhler number Da = k τ"),
  ],
  notes: [
    tr("등온·일정 밀도(액상)·비가역 1차 반응 가정입니다. 기체 반응에서 몰수가 바뀌면 부피 변화 계수 ε 를 넣은 식을 씁니다(Fogler 5장).",
      "Assumes an isothermal, constant-density (liquid-phase), irreversible first-order reaction. For gas-phase reactions with a change in moles, use the equations with the volume change factor ε (Fogler Ch. 5)."),
    tr("같은 전환율에서 CSTR 은 PFR 보다 큰 부피가 필요합니다(X = 90 % 에서 약 3.9 배).",
      "For the same conversion a CSTR needs a larger volume than a PFR (about 3.9 times at X = 90 %)."),
  ],
  reference: [
    tr("Fogler, H.S., Elements of Chemical Reaction Engineering 5판(2016), 2장 전환율과 반응기 크기, 5장 등온 반응기 설계 — 1차 반응 CSTR·PFR 식",
      "Fogler, H.S., Elements of Chemical Reaction Engineering, 5th ed. (2016), Ch. 2 Conversion and Reactor Sizing, Ch. 5 Isothermal Reactor Design — first-order CSTR and PFR equations"),
    tr("Levenspiel, O., Chemical Reaction Engineering 3판(1999), 5장 단일 이상 반응기 — 1차 반응 성능식 kτ = X/(1−X), kτ = −ln(1−X)",
      "Levenspiel, O., Chemical Reaction Engineering, 3rd ed. (1999), Ch. 5 Ideal Reactors for a Single Reaction — first-order performance equations kτ = X/(1−X), kτ = −ln(1−X)"),
  ],
};

Object.assign(window, { CALC_DEF_REACTOR, calcReactorVolume, calcReactorConversion, calcReactorChart });
