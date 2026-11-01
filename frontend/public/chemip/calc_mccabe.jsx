// 계산기: McCabe–Thiele 2성분 증류 — 평형(α 또는 Raoult 쌍), q 선, Rmin·Nmin, 이론단 수·최적 급액단, 계단 그래프.
// 작도 순수 함수는 calc_mccabe_steps.jsx, Raoult 평형은 calc_sep_vle.jsx, Antoine 행 채우기는 rowFill "antoine".

// 값 → { eq, Rmin, pinch, R, steps, total } 또는 { error }
function calcMcCabeSolve(v) {
  if (!(v.xB < v.xF && v.xF < v.xD)) return { error: tr("xB < xF < xD 여야 합니다(경 성분 몰분율).", "Need xB < xF < xD (light-key mole fractions).") };
  let eq;
  if (v.eqmode === "alpha") {
    if (!(v.alpha > 1)) return { error: tr("상대 휘발도 α 는 1 보다 커야 합니다.", "Relative volatility α must be greater than 1.") };
    eq = calcMcCabeAlphaEq(v.alpha);
  } else {
    if (v.pair.length !== 2) return { error: tr("Raoult 쌍은 성분 두 개(경 성분 먼저)를 넣습니다.", "A Raoult pair needs exactly two components (light component first).") };
    const model = calcSepRaoultModel(v.pair, { base: v.base, pu: v.pu, tu: v.tu });
    const ts = model.tsat(v.P);
    if (!ts.every(t => t > 0)) return { error: tr("이 압력에서 끓는 온도를 구하지 못했습니다. Antoine 상수와 단위를 확인하십시오.", "Could not find boiling temperatures at this pressure. Check the Antoine constants and units.") };
    if (!(ts[0] < ts[1])) return { error: tr("1행이 경 성분(끓는점이 낮은 쪽)이어야 합니다. 행 순서를 바꾸십시오.", "Row 1 must be the light component (lower boiling point). Swap the rows.") };
    eq = calcMcCabeRaoultEq(model, v.P);
  }
  const { Rmin, pinch } = calcMcCabeRmin(eq, v.xF, v.q, v.xD);
  if (!(Rmin > 0) || !Number.isFinite(Rmin)) return { error: tr("최소 환류비를 구하지 못했습니다. q 와 조성을 확인하십시오.", "Could not find the minimum reflux ratio. Check q and the compositions.") };
  const R = v.rmode === "mult" ? v.mult * Rmin : v.R;
  if (!(R > Rmin)) return { error: tr(`환류비 R 이 최소 환류비 ${calcFormatNumber(Rmin)} 이하라 단 수가 무한합니다.`, `Reflux ratio R is at or below the minimum ${calcFormatNumber(Rmin)}, so the number of stages is infinite.`) };
  const steps = calcMcCabeSteps(eq, { xD: v.xD, xB: v.xB, xF: v.xF, q: v.q, R });
  const total = calcMcCabeSteps(eq, { xD: v.xD, xB: v.xB, xF: v.xF, q: v.q, R: Infinity });
  if (steps.error || total.error) return { error: tr("계단 작도가 끝나지 않았습니다(핀치 또는 300단 초과). R 을 키우거나 조성을 확인하십시오.", "The staircase did not finish (pinch or more than 300 stages). Increase R or check the compositions.") };
  return { eq, Rmin, pinch, R, steps, total };
}

const CALC_DEF_MCCABE = {
  key: "mccabe",
  group: "separation",
  title: tr("McCabe–Thiele 증류", "McCabe–Thiele distillation"),
  summary: tr("2성분 연속 증류탑의 평형 곡선·q 선·조작선을 그리고 계단을 밟아 이론단 수·최적 급액단·최소 환류비·전환류 최소 단 수를 구합니다(화공기사 실기 증류).",
    "Draws the equilibrium curve, q-line and operating lines of a binary distillation column and steps off stages to find the theoretical stage count, optimal feed stage, minimum reflux ratio and the minimum stages at total reflux."),
  inputs: [
    { key: "eqmode", type: "choice", label: tr("평형", "Equilibrium"), default: "alpha", term: "relative_volatility",
      options: [{ v: "alpha", label: tr("상대 휘발도 α (일정)", "Constant relative volatility α") }, { v: "raoult", label: tr("Raoult 쌍 (Antoine)", "Raoult pair (Antoine)") }] },
    { key: "alpha", term: "relative_volatility", label: tr("상대 휘발도 α", "Relative volatility α"), unit: "—", default: 2.5, positive: true, when: v => v.eqmode === "alpha" },
    ...calcAntoineConvInputs(v => v.eqmode === "raoult"),
    { key: "pair", type: "table", label: tr("성분 쌍 (1행 = 경 성분)", "Component pair (row 1 = light)"), minRows: 2, maxRows: 2, rowFill: "antoine",
      when: v => v.eqmode === "raoult", term: "antoine_constants",
      columns: [
        { key: "name", label: tr("성분", "Component"), text: true },
        { key: "A", term: "antoine_constants", label: "A" },
        { key: "B", term: "antoine_constants", label: "B" },
        { key: "C", term: "antoine_constants", label: "C" },
      ],
      rows: [
        { name: tr("벤젠", "Benzene"), A: 6.90565, B: 1211.033, C: 220.79 },
        { name: tr("톨루엔", "Toluene"), A: 6.95464, B: 1344.8, C: 219.482 },
      ],
      hint: tr("기본 행은 벤젠·톨루엔 예시 상수(log₁₀, mmHg, °C)입니다. 성분 칸에 이름이나 CAS 를 넣고 돋보기를 누르면 ChemIP 물성으로 추정 상수를 채웁니다.",
        "Default rows are example benzene–toluene constants (log₁₀, mmHg, °C). Type a name or CAS in the Component cell and press the magnifier to fill estimated constants from ChemIP data.") },
    { key: "P", term: "absolute_pressure", label: tr("탑 압력 (절대)", "Column pressure (absolute)"), dim: "pressure", unit: "Pa", show: "kPa", default: 101.325, positive: true, when: v => v.eqmode === "raoult" },
    { key: "xF", term: "mole_fraction", label: tr("원료 조성 xF", "Feed composition xF"), unit: tr("몰분율", "mol frac."), default: 0.5, min: 0.0001, max: 0.9999 },
    { key: "q", term: "q_feed", label: tr("원료 상태 q", "Feed condition q"), unit: "—", default: 1, min: -10, max: 10,
      hint: tr("포화 액체 1, 포화 증기 0, 과냉 액체 > 1", "Saturated liquid 1, saturated vapour 0, subcooled liquid > 1") },
    { key: "xD", term: "mole_fraction", label: tr("탑정 제품 xD", "Distillate xD"), unit: tr("몰분율", "mol frac."), default: 0.95, min: 0.0001, max: 0.9999 },
    { key: "xB", term: "mole_fraction", label: tr("탑저 제품 xB", "Bottoms xB"), unit: tr("몰분율", "mol frac."), default: 0.05, min: 0.0001, max: 0.9999 },
    { key: "rmode", type: "choice", label: tr("환류비", "Reflux ratio"), default: "mult", term: "reflux_ratio",
      options: [{ v: "mult", label: tr("Rmin 의 배수", "Multiple of Rmin") }, { v: "R", label: tr("R 직접", "Enter R") }] },
    { key: "mult", label: "R / Rmin", unit: "—", default: 1.3, positive: true, when: v => v.rmode === "mult" },
    { key: "R", term: "reflux_ratio", label: tr("환류비 R = L/D", "Reflux ratio R = L/D"), unit: "—", default: 1.5, positive: true, when: v => v.rmode === "R" },
  ],
  outputs: [
    { key: "Rmin", term: "min_reflux", label: tr("최소 환류비 Rmin", "Minimum reflux ratio Rmin"), unit: "—", digits: 4 },
    { key: "R", term: "reflux_ratio", label: tr("쓴 환류비 R", "Reflux ratio used R"), unit: "—", digits: 4 },
    { key: "N", term: "theoretical_stage", label: tr("이론단 수 (재비기 포함)", "Theoretical stages (incl. reboiler)"), unit: tr("단", "stages"), digits: 3 },
    { key: "trays", term: "theoretical_stage", label: tr("탑 안 이론단 (재비기 제외)", "Theoretical trays (excl. reboiler)"), unit: tr("단", "stages"), digits: 3 },
    { key: "feed", term: "feed_stage", label: tr("최적 급액단 (위에서 몇 번째)", "Optimal feed stage (number from top)"), unit: "—", digits: 3 },
    { key: "Nmin", term: "min_stages", label: tr("전환류 최소 단 수 Nmin", "Minimum stages at total reflux Nmin"), unit: tr("단", "stages"), digits: 3 },
    { key: "DF", term: "cut_fraction", label: tr("탑정 비율 D/F", "Distillate fraction D/F"), unit: "—", digits: 4 },
  ],
  compute(v) {
    const s = calcMcCabeSolve(v);
    if (s.error) return { error: s.error };
    const warnings = [];
    if (v.eqmode === "raoult") warnings.push(tr("Raoult 쌍은 이상 용액 가정입니다. 공비점이 있는 계(에탄올–물 등)는 맞지 않습니다.", "The Raoult pair assumes an ideal solution. It fails for azeotropic systems such as ethanol–water."));
    warnings.push(tr("일정 몰 넘침(CMO) 가정입니다. 분수 단은 마지막 계단의 수평 길이 비율입니다.", "Assumes constant molal overflow. The fractional stage is the horizontal fraction of the last step."));
    return {
      Rmin: s.Rmin, R: s.R, N: s.steps.N, trays: s.steps.N - 1, feed: s.steps.feed, Nmin: s.total.N,
      DF: (v.xF - v.xB) / (v.xD - v.xB), warnings,
    };
  },
  chart(v) {
    const s = calcMcCabeSolve(v);
    if (s.error) return null;
    const curve = [];
    for (let i = 0; i <= 50; i++) curve.push([i / 50, s.eq.y(i / 50)]);
    const int = s.steps.int;
    return {
      x: { label: tr("액상 경 성분 몰분율 x", "Liquid light-key mole fraction x"), unit: "—", min: 0, max: 1 },
      y: { label: tr("기상 경 성분 몰분율 y", "Vapour light-key mole fraction y"), unit: "—", min: 0, max: 1 },
      series: [
        { key: "eq", label: tr("평형 곡선", "Equilibrium curve"), points: curve },
        { key: "diag", label: "y = x", points: [[0, 0], [1, 1]], dashed: true },
        { key: "rect", label: tr("정류부 조작선", "Rectifying line"), points: [[v.xD, v.xD], [int.x, int.y]] },
        { key: "strip", label: tr("탈거부 조작선", "Stripping line"), points: [[v.xB, v.xB], [int.x, int.y]] },
        { key: "qline", label: tr("q 선", "q-line"), points: [[v.xF, v.xF], [int.x, int.y]], dashed: true },
        { key: "steps", label: tr(`계단 ${calcFormatNumber(s.steps.N, 3)}단`, `Steps (${calcFormatNumber(s.steps.N, 3)})`), points: s.steps.path },
      ],
      markers: [
        { x: v.xD, y: v.xD, label: "xD" }, { x: v.xF, y: v.xF, label: "xF" }, { x: v.xB, y: v.xB, label: "xB" },
      ],
      height: 340,
      ariaLabel: tr("McCabe–Thiele 계단 선도", "McCabe–Thiele staircase diagram"),
    };
  },
  formula: [
    tr("평형: y = α x / [1 + (α − 1) x]  또는 Raoult: y = x P₁ˢᵃᵗ(T) / P, x P₁ˢᵃᵗ + (1 − x) P₂ˢᵃᵗ = P", "Equilibrium: y = α x / [1 + (α − 1) x]  or Raoult: y = x P₁ˢᵃᵗ(T) / P, x P₁ˢᵃᵗ + (1 − x) P₂ˢᵃᵗ = P"),
    tr("정류부: y = R/(R + 1) · x + xD/(R + 1)", "Rectifying: y = R/(R + 1) · x + xD/(R + 1)"),
    tr("q 선: y = q/(q − 1) · x − xF/(q − 1)", "q-line: y = q/(q − 1) · x − xF/(q − 1)"),
    tr("탈거부: (xB, xB) 와 두 선의 교점을 잇는 직선", "Stripping: the line through (xB, xB) and the intersection of the two lines"),
    "Rmin = (xD − y′) / (y′ − x′),  (x′, y′) = q-line ∩ equilibrium curve",
  ],
  notes: [
    tr("탑정에서 (xD, xD) 부터 평형 곡선과 조작선 사이를 계단으로 밟습니다. 계단이 두 조작선 교점을 넘는 단이 최적 급액단이고, 그 뒤로 탈거부 조작선을 씁니다.",
      "Steps start at (xD, xD) at the top and run between the equilibrium curve and the operating lines. The step that crosses the operating-line intersection is the optimal feed stage; the stripping line is used after it."),
    tr("전부 응축기(total condenser)와 부분 재비기를 가정합니다. 재비기는 평형단 하나로 셉니다.", "Assumes a total condenser and a partial reboiler; the reboiler counts as one equilibrium stage."),
    tr("Rmin 은 q 선과 평형 곡선의 교점 핀치로 구합니다. 평형 곡선이 오목하지 않은 비이상 계(접선 핀치)에서는 더 큽니다.", "Rmin comes from the pinch where the q-line meets the equilibrium curve. For non-ideal curves with a tangent pinch it is larger."),
    tr("탑 효율(Murphree 등)은 반영하지 않은 이론단입니다. 학습·사전 검토용입니다.", "These are theoretical stages without tray efficiency (Murphree etc.). For learning and screening."),
  ],
  reference: [
    "McCabe, W.L. & Thiele, E.W. (1925). Graphical design of fractionating columns. Industrial & Engineering Chemistry, 17(6), 605–611.",
    tr("Geankoplis, Transport Processes and Separation Process Principles 4판(2003), 11.4절 — 예제 11.4-1·11.4-2 벤젠–톨루엔(시험 기준값)", "Geankoplis, Transport Processes and Separation Process Principles, 4th ed. (2003), §11.4 — Examples 11.4-1 and 11.4-2, benzene–toluene (test values)"),
    tr("McCabe, Smith & Harriott, Unit Operations of Chemical Engineering 7판, 21장", "McCabe, Smith & Harriott, Unit Operations of Chemical Engineering, 7th ed., Ch. 21"),
    tr("Wankat, Separation Process Engineering 3판, 4장", "Wankat, Separation Process Engineering, 3rd ed., Ch. 4"),
  ],
};

Object.assign(window, { CALC_DEF_MCCABE, calcMcCabeSolve });
