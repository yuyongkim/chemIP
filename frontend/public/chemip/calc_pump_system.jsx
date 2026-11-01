// 계산기: 펌프 곡선 × 계통 곡선 운전점 + 상사법칙(회전수·임펠러 지름 변경).
// 펌프 곡선 H = a + bQ + cQ² 는 사용자 점 3–5개 최소제곱(3개면 정확히 지남). 계통 곡선 H = H_static + 마찰(직접 k 또는 Darcy–Colebrook + ΣK).
// 곡선 안의 Q 는 m³/h, H 는 m 로 계산하고 출력만 기준 단위(m³/s)로 바꾼다. 공용 함수: calc_sizing_common.jsx.

const CALC_PUMP_SCAN = 400;          // 운전점 찾을 때 나누는 칸 수(부호 바뀜 찾은 뒤 이분법)

// 회전수·지름 비 s 에서의 펌프 곡선: H_s(Q) = s²·H(Q/s)  (상사법칙 Q ∝ s, H ∝ s²)
function calcPumpHead(coef, Q, s = 1) {
  const q = Q / s;
  return s * s * (coef[0] + coef[1] * q + coef[2] * q * q);
}

// 계통 곡선 [m] — Q [m³/h]
function calcSystemHead(v, Q) {
  if (v.sys === "k") return v.Hs + v.k * Q * Q;
  const A = Math.PI * v.D * v.D / 4;
  const vel = Q / 3600 / A;
  if (vel === 0) return v.Hs;
  const Re = calcReynolds(v.rho, vel, v.D, v.mu);
  const f = calcDarcyF(Re, v.eps / v.D);
  return v.Hs + (f * v.L / v.D + (v.Ksum || 0)) * vel * vel / (2 * CALC_CONST.g);
}

// 펌프 곡선이 0 이 되는 유량(차단 끝) — 없으면 자료 최대 유량의 10 배까지 본다. Q [m³/h]
function calcPumpQEnd(coef, qMaxData, s) {
  const top = 10 * qMaxData * s;
  const step = top / CALC_PUMP_SCAN;
  for (let q = step; q <= top; q += step) if (calcPumpHead(coef, q, s) <= 0) return q;
  return top;
}

// 운전점 — 펌프 H_s(Q) = 계통 H(Q) 인 Q [m³/h]. 없으면 null.
function calcPumpOperatingPoint(coef, v, s, qEnd) {
  const g = Q => calcPumpHead(coef, Q, s) - calcSystemHead(v, Q);
  if (g(0) <= 0) return null;
  const step = qEnd / CALC_PUMP_SCAN;
  for (let i = 0; i < CALC_PUMP_SCAN; i++) {
    const a = i * step, b = (i + 1) * step;
    if (g(a) * g(b) <= 0) {
      const Q = calcBisect(g, a, b, 1e-13);
      return Q == null ? null : { Q, H: calcPumpHead(coef, Q, s) };
    }
  }
  return null;
}

function calcPumpRatio(v) {
  if (v.change === "speed") return v.N1 / v.N0;
  if (v.change === "trim") return v.Dimp1 / v.Dimp0;
  return 1;
}

const CALC_PUMP_Q_UNIT = "m³/h";
const CALC_PUMP_K_UNIT = "m/(m³/h)²";

const CALC_DEF_PUMP_SYSTEM = {
  key: "pump_system",
  group: "sizing",
  title: tr("펌프 운전점 · 상사법칙", "Pump operating point · affinity laws"),
  summary: tr("펌프 특성곡선(점 3–5개를 2차식으로 맞춤)과 계통 곡선(정수두 + 마찰)이 만나는 운전점을 구하고, 회전수나 임펠러 지름을 바꿨을 때의 새 운전점을 상사법칙으로 구합니다.",
    "Finds the operating point where the pump curve (a quadratic fitted through 3–5 points) meets the system curve (static head plus friction), then the new operating point after a speed or impeller-diameter change using the affinity laws."),
  inputs: [
    { key: "pts", type: "table", label: tr("펌프 특성곡선 점 (정격)", "Pump curve points (rated)"), minRows: 3, maxRows: 5,
      columns: [
        { key: "Q", label: tr("유량 Q", "Flow Q"), unit: CALC_PUMP_Q_UNIT, min: 0 },
        { key: "H", term: "total_head", label: tr("양정 H", "Head H"), unit: "m" },
      ],
      rows: [{ Q: 0, H: 50 }, { Q: 50, H: 45 }, { Q: 100, H: 30 }],
      hint: tr("제조사 곡선에서 차단점 근처·정격점·최대 유량 근처를 고르십시오. 3점이면 정확히 지나고, 4–5점이면 최소제곱으로 맞춥니다.",
        "Pick points near shut-off, at the rated point and near maximum flow from the vendor curve. Three points are matched exactly; four or five are least-squares fitted.") },
    { key: "Hs", term: "static_head", label: tr("정수두 H_static", "Static head H_static"), dim: "length", unit: "m", show: "m", default: 20,
      hint: tr("토출 액면 − 흡입 액면 + (토출 압력 − 흡입 압력)/(ρg)", "Discharge level − suction level + (discharge − suction pressure)/(ρg)") },
    { key: "sys", type: "choice", term: "system_curve", label: tr("마찰 손실", "Friction loss"), default: "k",
      options: [{ v: "k", label: tr("계수 k 직접 (H_f = k·Q²)", "Coefficient k (H_f = k·Q²)") }, { v: "pipe", label: tr("배관으로 계산 (Darcy + ΣK)", "From piping (Darcy + ΣK)") }] },
    { key: "k", label: tr("마찰 계수 k", "Friction coefficient k"), unit: CALC_PUMP_K_UNIT, default: 0.001, min: 0, when: v => v.sys === "k" },
    { key: "D", label: tr("관 안지름 D", "Pipe inside diameter D"), dim: "length", unit: "m", show: "mm", default: 102.3, positive: true, when: v => v.sys === "pipe" },
    { key: "L", label: tr("관 길이 L", "Pipe length L"), dim: "length", unit: "m", show: "m", default: 200, positive: true, when: v => v.sys === "pipe" },
    { key: "eps", term: "roughness", label: tr("절대 조도 ε", "Absolute roughness ε"), dim: "length", unit: "m", show: "mm", default: 0.046, min: 0, when: v => v.sys === "pipe" },
    { key: "Ksum", term: "loss_coefficient", label: tr("부속 손실계수 합 ΣK", "Sum of fitting loss coefficients ΣK"), unit: "—", default: 5, min: 0, when: v => v.sys === "pipe",
      hint: tr("피팅 손실 계산기(2-K·3-K)에서 구한 ΣK 를 넣을 수 있습니다.", "You can use the ΣK from the fitting-loss calculator (2-K / 3-K).") },
    { key: "mu", term: "viscosity", label: tr("점도 μ", "Viscosity μ"), dim: "viscosity", unit: "Pas", show: "cP", default: 1.002, positive: true, when: v => v.sys === "pipe" },
    { key: "rho", term: "density", label: tr("밀도 ρ", "Density ρ"), dim: "density", unit: "kgm3", show: "kgm3", default: 998.2, positive: true },
    { key: "eta", term: "pump_efficiency", label: tr("운전점 펌프 효율 η", "Pump efficiency at the operating point η"), unit: "%", default: 70, positive: true, max: 100, optional: true },
    { key: "change", type: "choice", term: "affinity_ratio", label: tr("상사법칙 변경", "Affinity-law change"), default: "speed",
      options: [{ v: "none", label: tr("없음", "None") }, { v: "speed", label: tr("회전수", "Speed") }, { v: "trim", label: tr("임펠러 지름", "Impeller diameter") }] },
    { key: "N0", label: tr("정격 회전수 N₀", "Rated speed N₀"), unit: "rpm", default: 1450, positive: true, when: v => v.change === "speed" },
    { key: "N1", label: tr("새 회전수 N₁", "New speed N₁"), unit: "rpm", default: 1750, positive: true, when: v => v.change === "speed" },
    { key: "Dimp0", label: tr("정격 임펠러 지름 D₀", "Rated impeller diameter D₀"), dim: "length", unit: "m", show: "mm", default: 250, positive: true, when: v => v.change === "trim" },
    { key: "Dimp1", label: tr("새 임펠러 지름 D₁", "New impeller diameter D₁"), dim: "length", unit: "m", show: "mm", default: 230, positive: true, when: v => v.change === "trim" },
  ],
  outputs: [
    { key: "Q_op", label: tr("운전점 유량 Q", "Operating-point flow Q"), dim: "flow", unit: "m3s", show: "m3h" },
    { key: "H_op", term: "total_head", label: tr("운전점 양정 H", "Operating-point head H"), dim: "length", unit: "m", show: "m" },
    { key: "P_op", term: "shaft_power", label: tr("운전점 축동력", "Shaft power at the operating point"), dim: "power", unit: "W", show: "kW" },
    { key: "ratio", term: "affinity_ratio", label: tr("상사비 s (N₁/N₀ 또는 D₁/D₀)", "Affinity ratio s (N₁/N₀ or D₁/D₀)"), unit: "—" },
    { key: "Q_new", label: tr("변경 후 운전점 유량", "New operating-point flow"), dim: "flow", unit: "m3s", show: "m3h" },
    { key: "H_new", label: tr("변경 후 운전점 양정", "New operating-point head"), dim: "length", unit: "m", show: "m" },
    { key: "P_new", label: tr("변경 후 축동력 (효율 같다고 봄)", "New shaft power (same efficiency assumed)"), dim: "power", unit: "W", show: "kW" },
    { key: "H0", label: tr("차단 양정 (Q = 0)", "Shut-off head (Q = 0)"), dim: "length", unit: "m", show: "m" },
    { key: "fit", label: tr("맞춘 펌프 곡선", "Fitted pump curve"), type: "text" },
  ],
  compute(v) {
    const pts = (v.pts || []).filter(r => r.Q != null && r.H != null).map(r => [r.Q, r.H]);
    if (pts.length < 3) return { error: tr("펌프 곡선 점이 3개 이상 필요합니다.", "At least three pump-curve points are needed.") };
    if (new Set(pts.map(p => p[0])).size < 3) return { error: tr("펌프 곡선 점의 유량이 서로 달라야 합니다(3개 이상).", "The pump-curve points need at least three different flow rates.") };
    const coef = calcQuadFit(pts);
    if (!coef) return { error: tr("펌프 곡선을 맞출 수 없습니다. 점을 확인하십시오.", "The pump curve could not be fitted. Check the points.") };
    const warnings = [];
    if (coef[2] >= 0) warnings.push(tr("맞춘 곡선이 아래로 볼록하지 않습니다(c ≥ 0). 원심펌프 곡선 점이 맞는지 확인하십시오.", "The fitted curve is not concave (c ≥ 0). Check that the points describe a centrifugal pump curve."));
    const qMaxData = Math.max(...pts.map(p => p[0]));
    const op = calcPumpOperatingPoint(coef, v, 1, calcPumpQEnd(coef, qMaxData, 1));
    if (!op) return { error: tr("운전점이 없습니다. 정수두가 차단 양정보다 크거나 계통 저항이 너무 큽니다.", "No operating point: the static head exceeds the shut-off head or the system resistance is too high.") };
    if (op.Q > qMaxData * 1.0001) warnings.push(tr("운전점이 입력한 곡선 점의 최대 유량 밖입니다(외삽). 제조사 곡선 범위를 확인하십시오.", "The operating point lies beyond the largest entered flow (extrapolated). Check the vendor curve range."));
    const P = (Q, H) => (v.eta ? v.rho * CALC_CONST.g * (Q / 3600) * H / (v.eta / 100) : null);
    const out = {
      Q_op: op.Q / 3600, H_op: op.H, P_op: P(op.Q, op.H), H0: coef[0], warnings,
      fit: `H = ${calcFormatNumber(coef[0], 5)} ${coef[1] < 0 ? "−" : "+"} ${calcFormatNumber(Math.abs(coef[1]), 5)}·Q ${coef[2] < 0 ? "−" : "+"} ${calcFormatNumber(Math.abs(coef[2]), 5)}·Q²  (Q: ${CALC_PUMP_Q_UNIT}, H: m)`,
    };
    if (v.change !== "none") {
      const s = calcPumpRatio(v);
      const op2 = calcPumpOperatingPoint(coef, v, s, calcPumpQEnd(coef, qMaxData, s));
      out.ratio = s;
      if (!op2) warnings.push(tr("변경 후에는 운전점이 없습니다(정수두가 새 차단 양정보다 큼).", "No operating point after the change (static head exceeds the new shut-off head)."));
      else { out.Q_new = op2.Q / 3600; out.H_new = op2.H; out.P_new = P(op2.Q, op2.H); }
      if (v.change === "trim" && (s < 0.8 || s > 1)) warnings.push(tr("임펠러 지름 상사법칙은 가공(트림) 약 20 % 이내에서만 대략 맞습니다.", "The impeller-diameter affinity law is only approximate, and only for trims within about 20 %."));
    }
    return out;
  },
  chart(v, o) {
    const coef = calcQuadFit((v.pts || []).filter(r => r.Q != null && r.H != null).map(r => [r.Q, r.H]));
    if (!coef) return null;
    const qMaxData = Math.max(...v.pts.map(r => r.Q));
    const s = o.ratio || 1;
    const qTop = Math.max(calcPumpQEnd(coef, qMaxData, 1), o.Q_new ? calcPumpQEnd(coef, qMaxData, s) : 0);
    const qs = calcLinspace(0, qTop, 81);
    const curve = (fn) => qs.map(q => [q, fn(q)]).filter(([, h]) => h >= 0);
    const series = [
      { key: "pump", label: tr("펌프 (정격)", "Pump (rated)"), points: curve(q => calcPumpHead(coef, q, 1)) },
      { key: "sys", label: tr("계통 곡선", "System curve"), points: qs.map(q => [q, calcSystemHead(v, q)]) },
      { key: "data", label: tr("입력 점", "Entered points"), kind: "scatter", points: v.pts.map(r => [r.Q, r.H]) },
    ];
    if (o.ratio) series.splice(1, 0, { key: "pump2", label: tr("펌프 (변경 후)", "Pump (after change)"), dashed: true, points: curve(q => calcPumpHead(coef, q, s)) });
    const markers = [{ x: o.Q_op * 3600, y: o.H_op, label: tr("운전점", "Operating point") }];
    if (o.Q_new) markers.push({ x: o.Q_new * 3600, y: o.H_new, label: tr("변경 후", "After change") });
    return {
      x: { label: tr("유량 Q", "Flow Q"), unit: CALC_PUMP_Q_UNIT, min: 0 },
      y: { label: tr("양정 H", "Head H"), unit: "m", min: 0 },
      series, markers,
      ariaLabel: tr("펌프 곡선과 계통 곡선, 운전점", "Pump curve, system curve and operating point"),
    };
  },
  formula: [
    tr("펌프: H = a + b·Q + c·Q² (점 3–5개 최소제곱)", "Pump: H = a + b·Q + c·Q² (least squares through 3–5 points)"),
    tr("계통: H = H_static + k·Q²  또는  H_static + (f·L/D + ΣK)·v²/(2g)", "System: H = H_static + k·Q²  or  H_static + (f·L/D + ΣK)·v²/(2g)"),
    tr("운전점: H_pump(Q) = H_system(Q) (이분법)", "Operating point: H_pump(Q) = H_system(Q) (bisection)"),
    tr("상사법칙: Q₁/Q₀ = s, H₁/H₀ = s², P₁/P₀ = s³ (s = N₁/N₀ 또는 D₁/D₀)", "Affinity laws: Q₁/Q₀ = s, H₁/H₀ = s², P₁/P₀ = s³ (s = N₁/N₀ or D₁/D₀)"),
    tr("새 펌프 곡선: H_s(Q) = s²·H(Q/s)", "New pump curve: H_s(Q) = s²·H(Q/s)"),
  ],
  notes: [
    tr("상사법칙은 효율이 같다고 보는 근사입니다. 회전수를 크게 바꾸거나 임펠러를 많이 깎으면 효율·NPSHr 이 달라집니다. NPSHa 는 NPSHa 계산기로 따로 확인하십시오.",
      "The affinity laws assume unchanged efficiency. Large speed changes or impeller trims also change efficiency and NPSHr. Check NPSHa separately with the NPSHa calculator."),
    tr("배관 방식은 같은 유체·같은 관경 한 줄로 봅니다. 마찰계수는 Q 마다 다시 구합니다(층류 64/Re, 그 밖은 Colebrook).",
      "The piping option treats the line as one fluid and one diameter. The friction factor is recomputed at every Q (64/Re when laminar, Colebrook otherwise)."),
    tr("곡선 점 범위 밖의 운전점은 외삽입니다.", "Operating points outside the range of the entered points are extrapolated."),
  ],
  reference: [
    "Karassik, I.J., Messina, J.P., Cooper, P. & Heald, C.C. (2008). Pump Handbook, 4th ed. McGraw-Hill — affinity laws, system curves.",
    tr("McCabe, W.L., Smith, J.C. & Harriott, P. (2005). Unit Operations of Chemical Engineering, 7판, 8장 유체 수송", "McCabe, W.L., Smith, J.C. & Harriott, P. (2005). Unit Operations of Chemical Engineering, 7th ed., Ch. 8 Transportation and metering of fluids"),
    "Colebrook, C.F. (1939). J. Inst. Civil Eng. 11(4), 133–156.",
  ],
};

Object.assign(window, { CALC_DEF_PUMP_SYSTEM, calcPumpHead, calcSystemHead, calcPumpOperatingPoint });
