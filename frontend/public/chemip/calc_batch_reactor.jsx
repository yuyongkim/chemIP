// 계산기: 반응공학 묶음 — 회분 반응기(n차), 직렬 CSTR 대 PFR, Arrhenius 회귀, 단열 T–X 선·평형 곡선·단열 반응기 크기.
// 수식은 calc_reaction_math.jsx(순수 함수). 단일 CSTR·PFR 1차 크기는 calc_reactor.jsx(key "reactor") — 여기서 겹쳐 만들지 않는다.

const CALC_BATCH_MODES = ["batch", "series", "arrhenius", "adiabatic"];

// 그래프 ① 회분: 시간–전환율 곡선
function calcBatchChart(v, out) {
  const kc = v.b_k * Math.pow(v.b_ca0, v.b_n - 1);
  const tEnd = Math.max(out.t_out || v.b_t, 1e-9) * 1.6;
  const pts = calcChartRange(0, tEnd, 60).map(t => [t / 60, 100 * calcBatchX(v.b_n, kc * t)]);
  const t0 = v.b_solve === "t" ? out.t_out : v.b_t;
  const X0 = v.b_solve === "t" ? v.b_X : out.X_out;
  return {
    x: { label: tr("반응 시간", "Reaction time"), unit: "min", min: 0 },
    y: { label: tr("전환율 X", "Conversion X"), unit: "%", min: 0, max: 100 },
    series: [{ key: "X", label: tr("회분 반응기", "Batch reactor"), points: pts }],
    markers: [{ x: t0 / 60, y: X0, label: tr("계산점", "Result") }],
    ariaLabel: tr("회분 반응기 시간–전환율 곡선", "Batch reactor conversion versus time"),
  };
}

// 그래프 ② 직렬: CSTR 개수–전환율(같은 전체 τ)과 PFR 한계
function calcSeriesChart(v, out) {
  const ktau = v.s_k * v.s_tau;
  const nMax = Math.max(10, Math.min(50, v.s_N * 2));
  const pts = [];
  for (let N = 1; N <= nMax; N++) pts.push([N, 100 * calcSeriesCstrX(N, ktau)]);
  return {
    x: { label: tr("CSTR 개수 N", "Number of CSTRs N"), unit: "", min: 1 },
    y: { label: tr("전환율 X", "Conversion X"), unit: "%" },
    series: [{ key: "cstr", label: tr("N 개 직렬 CSTR", "N CSTRs in series"), points: pts, kind: "scatter" }],
    hlines: [{ y: out.X_pfr, label: tr("PFR (N → ∞)", "PFR (N → ∞)") }],
    markers: [{ x: v.s_N, y: out.X_N, label: `N = ${v.s_N}` }],
    ariaLabel: tr("직렬 CSTR 개수에 따른 전환율과 PFR 비교", "Conversion of CSTRs in series versus PFR"),
  };
}

// 그래프 ③ Arrhenius: k(로그) – 1000/T, 자료점과 회귀선
function calcArrheniusChart(v, out) {
  const pts = calcBatchArrPoints(v);
  const fit = { lnA: Math.log(out.A), Ea: out.Ea * 1000 };
  const xs = pts.map(p => 1000 / p[0]);
  const line = calcChartRange(Math.min(...xs), Math.max(...xs), 20).map(x => [x, calcArrheniusK(fit, 1000 / x)]);
  return {
    x: { label: "1000 / T", unit: "1/K" },
    y: { label: tr("속도 상수 k", "Rate constant k"), unit: tr("입력 단위", "input unit"), log: true },
    series: [
      { key: "data", label: tr("자료", "Data"), points: pts.map(p => [1000 / p[0], p[1]]), kind: "scatter" },
      { key: "fit", label: tr("회귀선", "Fitted line"), points: line, dashed: true },
    ],
    ariaLabel: tr("Arrhenius 그림 (ln k 대 1/T)", "Arrhenius plot (ln k versus 1/T)"),
  };
}

// 그래프 ④ 단열: T–X 에너지 수지 선과 평형 곡선
function calcAdiabaticChart(v, out) {
  const p = calcBatchAdiabaticParams(v);
  const Tend = calcAdiabaticT(p, 1);
  const line = calcChartRange(0, 1, 40).map(X => [calcAdiabaticT(p, X), 100 * X]);
  const series = [{ key: "eb", label: tr("단열 에너지 수지", "Adiabatic energy balance"), points: line }];
  const markers = [];
  if (v.a_eq === "K") {
    const lo = Math.min(p.T0, Tend), hi = Math.max(p.T0, Tend);
    series.push({ key: "eq", label: tr("평형 전환율 Xe(T)", "Equilibrium conversion Xe(T)"), points: calcChartRange(lo, hi, 60).map(T => [T, 100 * calcEquilX(p, T)]), dashed: true });
    if (out.Xe != null) markers.push({ x: out.Te, y: out.Xe, label: tr("단열 평형", "Adiabatic equilibrium") });
  }
  if (out.T_X != null) markers.push({ x: out.T_X, y: v.a_X, label: tr("목표 X", "Target X") });
  return {
    x: { label: tr("온도", "Temperature"), unit: "K" },
    y: { label: tr("전환율 X", "Conversion X"), unit: "%", min: 0, max: 100 },
    series, markers,
    ariaLabel: tr("단열 반응기 온도–전환율 선과 평형 곡선", "Adiabatic reactor temperature–conversion line and equilibrium curve"),
  };
}

function calcBatchArrPoints(v) {
  return (v.a_rows || []).map(r => [v.a_tu === "C" ? r.T + 273.15 : r.T, r.k]);
}
function calcBatchAdiabaticParams(v) {
  return {
    T0: v.a_T0, dH: v.a_dH * 1000, sumCp: v.a_cp, dCp: v.a_dcp || 0,
    K1: v.a_eq === "K" ? v.a_K1 : 0, TK: v.a_TK,
    k1: v.a_k1, Tk: v.a_Tk, Ea: (v.a_Ea || 0) * 1000, v0: v.a_v0,
  };
}

function calcBatchCompute(v) {
  const n = v.b_n;
  const kc = v.b_k * Math.pow(v.b_ca0, n - 1);   // 1/s
  if (v.b_solve === "t") {
    const X = v.b_X / 100;
    const t = calcBatchKt(n, X) / kc;
    return { t_out: t, CA_out: v.b_ca0 * (1 - X), half: calcBatchKt(n, 0.5) / kc };
  }
  const X = calcBatchX(n, kc * v.b_t);
  const warnings = X >= 1 && n < 1 ? [tr("n < 1 이라 이 시간 안에 반응물이 다 없어집니다(X = 100 %).", "With n < 1 the reactant is used up within this time (X = 100 %).")] : [];
  return { X_out: 100 * X, CA_out: v.b_ca0 * (1 - X), half: calcBatchKt(n, 0.5) / kc, warnings };
}

function calcSeriesCompute(v) {
  const ktau = v.s_k * v.s_tau;
  const XN = calcSeriesCstrX(v.s_N, ktau);
  const Xpfr = calcReactorConversion("pfr", 1, ktau, 1);
  return {
    X_N: 100 * XN, X_1: 100 * calcReactorConversion("cstr", 1, ktau, 1), X_pfr: 100 * Xpfr,
    tau_each: v.s_tau / v.s_N, Da: ktau,
    tau_pfr_same: -Math.log(1 - XN) / v.s_k,
  };
}

function calcArrheniusCompute(v) {
  const pts = calcBatchArrPoints(v);
  if (pts.some(p => !(p[0] > 0))) return { error: tr("절대 온도가 0 K 이하인 행이 있습니다. 온도 단위를 확인하십시오.", "A row has an absolute temperature at or below 0 K. Check the temperature unit.") };
  if (new Set(pts.map(p => p[0])).size < 2) return { error: tr("서로 다른 온도의 자료가 2개 이상 있어야 합니다.", "Enter data at two or more different temperatures.") };
  const fit = calcArrheniusFit(pts);
  const warnings = [];
  const Ts = pts.map(p => p[0]);
  if (v.a_Tnew < Math.min(...Ts) - 20 || v.a_Tnew > Math.max(...Ts) + 20)
    warnings.push(tr("새 온도가 자료 범위에서 20 K 넘게 벗어난 외삽입니다.", "The new temperature is extrapolated more than 20 K beyond the data range."));
  if (pts.length > 2 && fit.r2 < 0.98) warnings.push(tr("R² 가 0.98 보다 작습니다. 반응 기구가 온도 범위에서 바뀌었을 수 있습니다.", "R² is below 0.98. The mechanism may change over this temperature range."));
  return { Ea: fit.Ea / 1000, A: fit.A, r2: fit.r2, k_new: calcArrheniusK(fit, v.a_Tnew), warnings };
}

function calcAdiabaticCompute(v) {
  const p = calcBatchAdiabaticParams(v);
  const T1 = calcAdiabaticT(p, 1);
  if (!(T1 > 0) || !(p.sumCp + p.dCp > 0)) return { error: tr("Σθ·Cp + ΔCp 가 0 보다 커야 하고 결과 온도가 0 K 보다 커야 합니다.", "Σθ·Cp + ΔCp must be positive and the resulting temperature above 0 K.") };
  const X = v.a_X / 100;
  const out = { dTad: T1 - p.T0, T_X: calcAdiabaticT(p, X), warnings: [] };
  if (p.dH > 0) out.warnings.push(tr("흡열 반응(ΔH > 0)이라 단열 온도는 내려갑니다.", "Endothermic reaction (ΔH > 0): the adiabatic temperature falls."));
  if (v.a_eq === "K") {
    const eq = calcAdiabaticEquilibrium(p);
    if (eq) { out.Xe = 100 * eq.X; out.Te = eq.T; }
    else out.warnings.push(tr("0–100 % 안에서 단열선과 평형 곡선이 만나지 않습니다.", "The adiabatic line does not meet the equilibrium curve between 0 and 100 %."));
    if (eq && X >= eq.X) out.warnings.push(tr("목표 전환율이 단열 평형 전환율 이상이라 단열 반응기 한 개로는 닿지 않습니다(단간 냉각 필요).", "The target conversion is at or above the adiabatic equilibrium conversion, so one adiabatic reactor cannot reach it (interstage cooling needed)."));
  }
  if (v.a_kin === "yes") {
    const Vp = calcAdiabaticPfrV(p, X);
    const Vc = calcAdiabaticCstrV(p, X);
    if (Vp != null) out.V_pfr = Vp;
    if (Vc != null) out.V_cstr = Vc;
  }
  return out;
}

const CALC_BATCH_TU = ["K", "C"];
const calcBatchIs = (m) => (c) => c.mode === m;

const CALC_DEF_BATCH_REACTOR = {
  key: "batch_reactor",
  group: "reaction",
  title: tr("반응공학: 회분·직렬 반응기 · Arrhenius · 단열 T–X", "Reaction engineering: batch & series reactors · Arrhenius · adiabatic T–X"),
  summary: tr("회분 반응기의 n차 반응 시간, 같은 크기 CSTR 직렬과 PFR 비교, 속도 상수–온도 자료의 Arrhenius 회귀(Ea·A), 발열 반응의 단열 온도–전환율 선과 평형 곡선·단열 반응기 부피를 구합니다.",
    "Batch reactor time for n-th order reactions, CSTRs in series versus a PFR, Arrhenius regression of rate-constant data (Ea, A), and the adiabatic temperature–conversion line with the equilibrium curve and adiabatic reactor volume."),
  inputs: [
    { key: "mode", type: "choice", label: tr("계산", "Calculation"), default: "batch",
      options: [
        { v: "batch", label: tr("회분 반응기 (n차)", "Batch reactor (n-th order)") },
        { v: "series", label: tr("직렬 CSTR 대 PFR", "CSTRs in series vs PFR") },
        { v: "arrhenius", label: tr("Arrhenius 회귀", "Arrhenius fit") },
        { v: "adiabatic", label: tr("단열 T–X · 평형", "Adiabatic T–X · equilibrium") },
      ] },
    // 회분
    { key: "b_solve", type: "choice", label: tr("구할 값", "Solve for"), default: "t", when: calcBatchIs("batch"),
      options: [{ v: "t", label: tr("전환율 → 반응 시간", "Conversion → time") }, { v: "X", label: tr("시간 → 전환율", "Time → conversion") }] },
    { key: "b_n", label: tr("반응 차수 n", "Reaction order n"), term: "rx_order", unit: "—", default: 1, min: 0, max: 5, when: calcBatchIs("batch") },
    { key: "b_k", label: tr("속도 상수 k", "Rate constant k"), term: "rate_constant", dim: "rate", unit: "per_s", show: "per_min", default: 0.1, positive: true, when: calcBatchIs("batch"),
      hint: tr("n ≠ 1 이면 단위는 (mol/L)^(1−n)·시간⁻¹", "For n ≠ 1 the unit is (mol/L)^(1−n)·time⁻¹") },
    { key: "b_ca0", label: tr("초기 농도 C_A0", "Initial concentration C_A0"), unit: "mol/L", default: 1, positive: true, when: calcBatchIs("batch") },
    { key: "b_X", label: tr("목표 전환율 X", "Target conversion X"), term: "conversion", unit: "%", default: 90, positive: true, max: 99.9999, when: c => c.mode === "batch" && c.b_solve === "t" },
    { key: "b_t", label: tr("반응 시간 t", "Reaction time t"), dim: "time", unit: "s", show: "min", default: 30, positive: true, when: c => c.mode === "batch" && c.b_solve === "X" },
    // 직렬
    { key: "s_k", label: tr("1차 속도 상수 k", "First-order rate constant k"), term: "rate_constant", dim: "rate", unit: "per_s", show: "per_min", default: 0.1, positive: true, when: calcBatchIs("series") },
    { key: "s_tau", label: tr("전체 공간 시간 τ", "Total space time τ"), term: "residence_time", dim: "time", unit: "s", show: "min", default: 20, positive: true, when: calcBatchIs("series") },
    { key: "s_N", label: tr("CSTR 개수 N", "Number of CSTRs N"), unit: tr("개", "tanks"), default: 2, min: 1, max: 100, when: calcBatchIs("series") },
    // Arrhenius
    { key: "a_tu", type: "choice", label: tr("표의 온도 단위", "Temperature unit in table"), default: "K", when: calcBatchIs("arrhenius"),
      options: CALC_BATCH_TU.map(u => ({ v: u, label: CALC_UNITS.temperature[u].label })) },
    { key: "a_rows", type: "table", label: tr("온도–속도 상수 자료", "Temperature–rate constant data"), term: "rx_arrhenius_fit", minRows: 2, maxRows: 20, when: calcBatchIs("arrhenius"),
      columns: [
        { key: "T", label: tr("온도 T", "Temperature T") },
        { key: "k", label: tr("속도 상수 k", "Rate constant k"), positive: true },
      ],
      rows: [{ T: 313, k: 0.00043 }, { T: 319, k: 0.00103 }, { T: 323, k: 0.0018 }, { T: 328, k: 0.00355 }, { T: 333, k: 0.00717 }],
      hint: tr("k 단위는 모두 같게(A 도 그 단위로 나옵니다). 기본값은 Fogler 4판 예제 3-1 자료", "Use one unit for all k (A comes out in that unit). Default data: Fogler 4th ed. Example 3-1") },
    { key: "a_Tnew", label: tr("k 를 구할 온도", "Temperature for k"), dim: "temperature", unit: "K", show: "K", default: 340, positive: true, when: calcBatchIs("arrhenius") },
    // 단열
    { key: "a_T0", label: tr("입구 온도 T₀", "Inlet temperature T₀"), dim: "temperature", unit: "K", show: "K", default: 330, positive: true, when: calcBatchIs("adiabatic") },
    { key: "a_dH", label: tr("반응열 ΔH_rx (T₀, A 1 mol 당)", "Heat of reaction ΔH_rx (at T₀, per mol A)"), term: "rx_heat", unit: "kJ/mol", default: -6.9, when: calcBatchIs("adiabatic"),
      hint: tr("발열이면 음수", "Negative if exothermic") },
    { key: "a_cp", label: "Σ θᵢ·Cpᵢ", term: "rx_sum_cp", unit: "J/(mol·K)", default: 159, positive: true, when: calcBatchIs("adiabatic") },
    { key: "a_dcp", label: "ΔCp", unit: "J/(mol·K)", default: 0, when: calcBatchIs("adiabatic") },
    { key: "a_X", label: tr("목표 전환율 X", "Target conversion X"), term: "conversion", unit: "%", default: 50, positive: true, max: 99.9999, when: calcBatchIs("adiabatic") },
    { key: "a_eq", type: "choice", label: tr("평형 (가역 A ⇌ B)", "Equilibrium (reversible A ⇌ B)"), default: "K", when: calcBatchIs("adiabatic"),
      options: [{ v: "none", label: tr("비가역", "Irreversible") }, { v: "K", label: tr("평형상수 K 입력", "Enter equilibrium constant K") }] },
    { key: "a_K1", label: tr("평형상수 K(T₁)", "Equilibrium constant K(T₁)"), term: "rx_equilibrium_k", unit: "—", default: 3.03, positive: true, when: c => c.mode === "adiabatic" && c.a_eq === "K" },
    { key: "a_TK", label: tr("K 의 온도 T₁", "Temperature T₁ for K"), dim: "temperature", unit: "K", show: "K", default: 333, positive: true, when: c => c.mode === "adiabatic" && c.a_eq === "K" },
    { key: "a_kin", type: "choice", label: tr("반응기 부피", "Reactor volume"), default: "yes", when: calcBatchIs("adiabatic"),
      options: [{ v: "none", label: tr("구하지 않음", "Skip") }, { v: "yes", label: tr("속도 자료로 구함 (1차)", "From rate data (first order)") }] },
    { key: "a_k1", label: tr("정반응 속도 상수 k(T_k)", "Forward rate constant k(T_k)"), term: "rate_constant", dim: "rate", unit: "per_s", show: "per_h", default: 31.1, positive: true, when: c => c.mode === "adiabatic" && c.a_kin === "yes" },
    { key: "a_Tk", label: tr("k 의 온도 T_k", "Temperature T_k for k"), dim: "temperature", unit: "K", show: "K", default: 360, positive: true, when: c => c.mode === "adiabatic" && c.a_kin === "yes" },
    { key: "a_Ea", label: tr("활성화 에너지 Ea", "Activation energy Ea"), term: "rx_activation_energy", unit: "kJ/mol", default: 65.7, min: 0, when: c => c.mode === "adiabatic" && c.a_kin === "yes" },
    { key: "a_v0", label: tr("부피 유량 v₀", "Volumetric flow rate v₀"), dim: "flow", unit: "m3s", show: "m3h", default: 15.77, positive: true, when: c => c.mode === "adiabatic" && c.a_kin === "yes" },
  ],
  outputs: [
    { key: "t_out", label: tr("반응 시간 t", "Reaction time t"), dim: "time", unit: "s", show: "min", digits: 5 },
    { key: "X_out", label: tr("전환율 X", "Conversion X"), term: "conversion", unit: "%", digits: 5 },
    { key: "CA_out", label: tr("최종 농도 C_A", "Final concentration C_A"), unit: "mol/L", digits: 4 },
    { key: "half", label: tr("반감기 t½", "Half-life t½"), term: "rx_half_life", dim: "time", unit: "s", show: "min", digits: 4 },
    { key: "X_N", label: tr("N 개 직렬 CSTR 전환율", "Conversion, N CSTRs in series"), term: "conversion", unit: "%", digits: 5 },
    { key: "X_1", label: tr("CSTR 1 개 (같은 전체 τ)", "Single CSTR (same total τ)"), unit: "%", digits: 5 },
    { key: "X_pfr", label: tr("PFR (같은 τ)", "PFR (same τ)"), unit: "%", digits: 5 },
    { key: "tau_each", label: tr("CSTR 한 개의 τ", "τ per CSTR"), term: "residence_time", dim: "time", unit: "s", show: "min", digits: 4 },
    { key: "tau_pfr_same", label: tr("같은 X 에 드는 PFR τ", "PFR τ for the same X"), dim: "time", unit: "s", show: "min", digits: 4 },
    { key: "Da", label: tr("Damköhler 수 k·τ", "Damköhler number k·τ"), term: "damkohler", unit: "—", digits: 4 },
    { key: "Ea", label: tr("활성화 에너지 Ea", "Activation energy Ea"), term: "rx_activation_energy", unit: "kJ/mol", digits: 4 },
    { key: "A", label: tr("빈도 인자 A", "Pre-exponential factor A"), term: "rx_arrhenius_fit", unit: tr("k 의 단위", "unit of k"), digits: 4 },
    { key: "r2", label: tr("결정계수 R² (ln k 대 1/T)", "Coefficient of determination R² (ln k vs 1/T)"), unit: "—", digits: 5 },
    { key: "k_new", label: tr("그 온도의 k", "k at that temperature"), unit: tr("k 의 단위", "unit of k"), digits: 4 },
    { key: "dTad", label: tr("단열 온도 상승 (X = 100 %)", "Adiabatic temperature rise (X = 100 %)"), term: "rx_dtad", unit: "K", digits: 4 },
    { key: "T_X", label: tr("목표 X 에서 온도", "Temperature at target X"), dim: "temperature", unit: "K", show: "K", digits: 5 },
    { key: "Xe", label: tr("단열 평형 전환율 Xe", "Adiabatic equilibrium conversion Xe"), term: "rx_equilibrium_k", unit: "%", digits: 4 },
    { key: "Te", label: tr("단열 평형 온도", "Adiabatic equilibrium temperature"), dim: "temperature", unit: "K", show: "K", digits: 5 },
    { key: "V_pfr", label: tr("단열 PFR 부피", "Adiabatic PFR volume"), dim: "volume", unit: "m3", show: "m3", digits: 4 },
    { key: "V_cstr", label: tr("단열 CSTR 부피", "Adiabatic CSTR volume"), dim: "volume", unit: "m3", show: "m3", digits: 4 },
  ],
  compute(v) {
    if (v.mode === "batch") return calcBatchCompute(v);
    if (v.mode === "series") return calcSeriesCompute(v);
    if (v.mode === "arrhenius") return calcArrheniusCompute(v);
    return calcAdiabaticCompute(v);
  },
  chart(v, out) {
    if (v.mode === "batch") return calcBatchChart(v, out);
    if (v.mode === "series") return calcSeriesChart(v, out);
    if (v.mode === "arrhenius") return calcArrheniusChart(v, out);
    return calcAdiabaticChart(v, out);
  },
  formula: [
    tr("회분(일정 부피): t = [(1 − X)^(1−n) − 1] / ((n − 1) k C_A0^(n−1)),  n = 1 이면 t = (1/k) ln[1/(1 − X)]", "Batch (constant volume): t = [(1 − X)^(1−n) − 1] / ((n − 1) k C_A0^(n−1));  for n = 1, t = (1/k) ln[1/(1 − X)]"),
    tr("직렬 CSTR N 개(1차, 전체 τ): X = 1 − (1 + kτ/N)^(−N),  PFR: X = 1 − e^(−kτ)", "N CSTRs in series (first order, total τ): X = 1 − (1 + kτ/N)^(−N);  PFR: X = 1 − e^(−kτ)"),
    "Arrhenius: ln k = ln A − (Ea/R)(1/T)",
    tr("단열: T = T₀ + (−ΔH_rx)·X / (Σθᵢ·Cpᵢ + X·ΔCp),  K(T) = K(T₁)·exp[(−ΔH_rx/R)(1/T − 1/T₁)],  Xe = K/(1 + K)", "Adiabatic: T = T₀ + (−ΔH_rx)·X / (Σθᵢ·Cpᵢ + X·ΔCp);  K(T) = K(T₁)·exp[(−ΔH_rx/R)(1/T − 1/T₁)];  Xe = K/(1 + K)"),
    tr("단열 부피(액상 A ⇌ B 1차): −r_A = k C_A0 [(1 − X) − X/K],  V_PFR = v₀ ∫ dX/(k[(1 − X) − X/K]),  V_CSTR = v₀ X/(k[(1 − X) − X/K])", "Adiabatic volume (liquid A ⇌ B, first order): −r_A = k C_A0 [(1 − X) − X/K];  V_PFR = v₀ ∫ dX/(k[(1 − X) − X/K]);  V_CSTR = v₀ X/(k[(1 − X) − X/K])"),
  ],
  notes: [
    tr("단일 CSTR·PFR 의 1차 반응 크기(부피 ↔ 전환율)는 \"반응기 크기\" 계산기에서 합니다.", "First-order sizing of a single CSTR or PFR (volume ↔ conversion) is in the \"Reactor sizing\" calculator."),
    tr("회분은 등온·일정 부피, 직렬은 같은 크기 CSTR·1차·일정 밀도 가정입니다.", "Batch assumes isothermal, constant volume; series assumes equal CSTRs, first order, constant density."),
    tr("평형 전환율 Xe = K/(1 + K) 는 액상 A ⇌ B(몰수 변화 없음) 경우입니다. 다른 양론은 Xe 식이 다릅니다(Fogler 11장).", "Xe = K/(1 + K) applies to liquid-phase A ⇌ B (no change in moles). Other stoichiometries need a different Xe expression (Fogler Ch. 11)."),
    tr("Arrhenius 기본 자료(Fogler 4판 예제 3-1)로 이 계산기는 최소제곱 Ea ≈ 121.5 kJ/mol 을 냅니다. Fogler 풀이는 그림에서 10배 구간법으로 읽어 약 116 kJ/mol 이라 몇 % 차이가 납니다.", "With the default Arrhenius data (Fogler 4th ed. Example 3-1) this calculator gives a least-squares Ea ≈ 121.5 kJ/mol. Fogler's solution reads about 116 kJ/mol graphically (decade method), so the values differ by a few %."),
    tr("단열 기본값은 Fogler 5판 예제 11-3(n-부탄 이성화, 단열 액상): T = 330 + 43.4 X, X = 50 % 에서 V_PFR 1.408 m³·V_CSTR 1.368 m³(Michigan ChE 344 강의 14, 2022).", "Adiabatic defaults are Fogler 5th ed. Example 11-3 (n-butane isomerization, adiabatic liquid phase): T = 330 + 43.4 X, and at X = 50 %, V_PFR 1.408 m³ and V_CSTR 1.368 m³ (Michigan ChE 344 Lecture 14, 2022)."),
    tr("발열 반응의 단열 온도 상승은 폭주 위험의 지표이기도 합니다 — \"열폭주 선별\" 계산기 참고.", "The adiabatic temperature rise of an exothermic reaction is also a runaway-severity indicator — see the \"Thermal runaway screening\" calculator."),
  ],
  reference: [
    tr("Fogler, H.S., Elements of Chemical Reaction Engineering 5판(2016) — 2·5장(회분·직렬), 3장(Arrhenius), 11·12장(단열 에너지 수지·평형 전환율, 예제 11-3)", "Fogler, H.S., Elements of Chemical Reaction Engineering, 5th ed. (2016) — Ch. 2, 5 (batch, series), Ch. 3 (Arrhenius), Ch. 11–12 (adiabatic energy balance, equilibrium conversion, Example 11-3)"),
    tr("Fogler, H.S., Elements of Chemical Reaction Engineering 4판(2005), 예제 3-1 염화 벤젠다이아조늄 분해 — Arrhenius 자료(313–333 K)", "Fogler, H.S., Elements of Chemical Reaction Engineering, 4th ed. (2005), Example 3-1 benzene diazonium chloride decomposition — Arrhenius data (313–333 K)"),
    tr("Levenspiel, O., Chemical Reaction Engineering 3판(1999) — 3장(회분 n차 적분형), 6장(같은 크기 혼합 반응기 직렬)", "Levenspiel, O., Chemical Reaction Engineering, 3rd ed. (1999) — Ch. 3 (integrated n-th order batch), Ch. 6 (equal-size mixed reactors in series)"),
    "Michigan ChE 344, Lecture 14 (2022), Non-isothermal reactor design — Fogler Example 11-3 worked solution. https://websites.umich.edu/~elements/7e/powerpoints/2022lectures/",
  ],
};

Object.assign(window, { CALC_DEF_BATCH_REACTOR, CALC_BATCH_MODES });
