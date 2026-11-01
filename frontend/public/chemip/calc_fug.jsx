// 계산기: Fenske–Underwood–Gilliland 간이 다성분 증류 + Kirkbride 급액 위치. 순수 함수는 calc_shortcut_math.jsx.
// 비핵심 성분은 Fenske 식으로 분배한 뒤 Underwood 의 탑정 조성으로 쓴다(Geankoplis 11.7 절 방식).

// 값 → 풀이 묶음 또는 { error }
function calcFugSolve(v) {
  const rows = v.rows;
  const n = rows.length;
  const iL = v.lk - 1, iH = v.hk - 1;
  if (!(Number.isInteger(v.lk) && Number.isInteger(v.hk) && iL >= 0 && iH >= 0 && iL < n && iH < n && iL !== iH)) {
    return { error: tr(`LK·HK 는 1–${n} 사이의 서로 다른 행 번호여야 합니다.`, `LK and HK must be different row numbers between 1 and ${n}.`) };
  }
  const sumZ = rows.reduce((s, r) => s + r.z, 0);
  const z = rows.map(r => r.z / sumZ);
  const aHKref = rows[iH].alpha;
  const alpha = rows.map(r => r.alpha / aHKref);   // HK 기준
  if (!(alpha[iL] > 1)) return { error: tr("LK 의 α 가 HK 보다 커야 합니다(α 는 휘발도 비).", "The LK must have a larger α than the HK (α is relative volatility).") };
  const Nmin = calcFenskeNmin(v.rLK, v.rHK, alpha[iL]);
  const split = calcFenskeSplit(alpha, v.rHK, Nmin);
  split[iL] = v.rLK;
  split[iH] = 1 - v.rHK;
  const d = z.map((zi, i) => zi * split[i]);
  const D = d.reduce((s, x) => s + x, 0);
  const B = 1 - D;
  const xD = d.map(x => x / D);
  const xB = z.map((zi, i) => (zi - d[i]) / B);
  const { theta, roots } = calcUnderwoodTheta(alpha, z, v.q, alpha[iH], alpha[iL]);
  if (!Number.isFinite(theta)) return { error: tr("Underwood 근 θ 를 찾지 못했습니다. q 와 α 를 확인하십시오.", "Could not find the Underwood root θ. Check q and α.") };
  const Rmin = calcUnderwoodRmin(alpha, xD, theta);
  if (!(Rmin > 0)) return { error: tr("Underwood 최소 환류비가 0 이하입니다. 입력을 확인하십시오.", "The Underwood minimum reflux is zero or negative. Check the inputs.") };
  const R = v.rmode === "mult" ? v.mult * Rmin : v.R;
  if (!(R > Rmin)) return { error: tr(`환류비 R 이 최소 환류비 ${calcFormatNumber(Rmin)} 이하입니다.`, `Reflux ratio R is at or below the minimum ${calcFormatNumber(Rmin)}.`) };
  const g = calcGillilandN(Nmin, Rmin, R);
  const kb = calcKirkbride(g.N, z[iL], z[iH], xB[iL], xD[iH], B / D);
  return { z, alpha, iL, iH, Nmin, xD, xB, D, theta, roots, Rmin, R, ...g, ...kb, names: rows.map(r => r.name) };
}

const CALC_DEF_FUG = {
  key: "fug",
  group: "separation",
  title: tr("간이 증류 (Fenske–Underwood–Gilliland)", "Shortcut distillation (Fenske–Underwood–Gilliland)"),
  summary: tr("다성분 증류탑의 최소 단 수(Fenske), 최소 환류비(Underwood), 실제 환류비에서의 이론단 수(Gilliland–Molokanov), 급액 위치(Kirkbride)를 어림합니다.",
    "Estimates a multicomponent column's minimum stages (Fenske), minimum reflux ratio (Underwood), theoretical stages at the operating reflux (Gilliland–Molokanov) and feed location (Kirkbride)."),
  inputs: [
    { key: "rows", type: "table", label: tr("원료 성분", "Feed components"), minRows: 2, maxRows: 10, term: "relative_volatility",
      columns: [
        { key: "name", label: tr("성분", "Component"), text: true },
        { key: "z", term: "mole_fraction", label: "zF", unit: tr("몰분율", "mol frac."), min: 0 },
        { key: "alpha", term: "relative_volatility", label: "α", positive: true },
      ],
      rows: [
        { name: tr("n-부탄", "n-Butane"), z: 0.40, alpha: 5.2 },
        { name: tr("n-펜탄", "n-Pentane"), z: 0.25, alpha: 2.3 },
        { name: tr("n-헥산", "n-Hexane"), z: 0.20, alpha: 1 },
        { name: tr("n-헵탄", "n-Heptane"), z: 0.15, alpha: 0.4667 },
      ],
      hint: tr("기본 행은 Geankoplis 예제 11.7-3 의 원료와 99.3 °C 의 α(= K/K_HK)입니다. α 는 탑 평균 온도에서 같은 기준 성분으로 나눈 값을 넣습니다.",
        "Default rows are the feed of Geankoplis Example 11.7-3 with α (= K/K_HK) at 99.3 °C. Enter α at the column's average temperature, all relative to the same component.") },
    { key: "lk", term: "key_component", label: tr("경 핵심 성분 LK (행 번호)", "Light key LK (row number)"), unit: "—", default: 2, min: 1 },
    { key: "hk", term: "key_component", label: tr("중 핵심 성분 HK (행 번호)", "Heavy key HK (row number)"), unit: "—", default: 3, min: 1 },
    { key: "rLK", term: "key_component", label: tr("LK 탑정 회수율", "LK recovery in distillate"), unit: tr("분율", "fraction"), default: 0.9, min: 0.5, max: 0.999999 },
    { key: "rHK", term: "key_component", label: tr("HK 탑저 회수율", "HK recovery in bottoms"), unit: tr("분율", "fraction"), default: 0.9, min: 0.5, max: 0.999999 },
    { key: "q", term: "q_feed", label: tr("원료 상태 q", "Feed condition q"), unit: "—", default: 1, min: -10, max: 10 },
    { key: "rmode", type: "choice", label: tr("환류비", "Reflux ratio"), default: "mult", term: "reflux_ratio",
      options: [{ v: "mult", label: tr("Rmin 의 배수", "Multiple of Rmin") }, { v: "R", label: tr("R 직접", "Enter R") }] },
    { key: "mult", label: "R / Rmin", unit: "—", default: 1.5, positive: true, when: v => v.rmode === "mult" },
    { key: "R", term: "reflux_ratio", label: tr("환류비 R = L/D", "Reflux ratio R = L/D"), unit: "—", default: 0.6, positive: true, when: v => v.rmode === "R" },
  ],
  outputs: [
    { key: "Nmin", term: "min_stages", label: tr("최소 단 수 Nmin (Fenske)", "Minimum stages Nmin (Fenske)"), unit: tr("단", "stages"), digits: 4 },
    { key: "theta", term: "min_reflux", label: tr("Underwood 근 θ", "Underwood root θ"), unit: "—", digits: 4 },
    { key: "Rmin", term: "min_reflux", label: tr("최소 환류비 Rmin (Underwood)", "Minimum reflux Rmin (Underwood)"), unit: "—", digits: 4 },
    { key: "R", term: "reflux_ratio", label: tr("쓴 환류비 R", "Reflux ratio used R"), unit: "—", digits: 4 },
    { key: "N", term: "theoretical_stage", label: tr("이론단 수 N (Gilliland, 재비기 포함)", "Theoretical stages N (Gilliland, incl. reboiler)"), unit: tr("단", "stages"), digits: 4 },
    { key: "NR", term: "feed_stage", label: tr("급액단 위 정류부 단 수 (Kirkbride)", "Rectifying stages above the feed (Kirkbride)"), unit: tr("단", "stages"), digits: 3 },
    { key: "NS", term: "feed_stage", label: tr("탈거부 단 수 (Kirkbride)", "Stripping stages (Kirkbride)"), unit: tr("단", "stages"), digits: 3 },
    { key: "DF", term: "cut_fraction", label: tr("탑정 비율 D/F", "Distillate fraction D/F"), unit: "—", digits: 4 },
    { key: "xD", term: "mole_fraction", label: tr("탑정 조성 xD", "Distillate composition xD"), type: "text" },
    { key: "xB", term: "mole_fraction", label: tr("탑저 조성 xB", "Bottoms composition xB"), type: "text" },
  ],
  compute(v) {
    const s = calcFugSolve(v);
    if (s.error) return { error: s.error };
    const warnings = [];
    if (s.roots.length > 1) warnings.push(tr("두 핵심 성분 사이에 다른 성분이 있어 Underwood 근이 여럿입니다. HK 쪽 근만 썼으니 Rmin 은 어림입니다.", "Another component lies between the keys, so Underwood has several roots. Only the root next to the HK was used, so Rmin is approximate."));
    if (s.X < 0.01 || s.X > 0.9) warnings.push(tr("Gilliland 상관식은 X = 0.01–0.9 에서 맞춘 식입니다. 범위 밖입니다.", "The Gilliland correlation was fitted for X = 0.01–0.9; this point is outside that range."));
    return {
      Nmin: s.Nmin, theta: s.theta, Rmin: s.Rmin, R: s.R, N: s.N, NR: s.NR, NS: s.NS, DF: s.D,
      xD: calcSepCompText(s.names, s.xD), xB: calcSepCompText(s.names, s.xB), warnings,
    };
  },
  // Gilliland 선도(Molokanov 식, X 로그 축) + 운전점
  chart(v) {
    const s = calcFugSolve(v);
    if (s.error) return null;
    const pts = [];
    for (let i = 0; i <= 60; i++) { const X = Math.pow(10, -2 + 2 * i / 60); pts.push([X, calcGillilandY(X)]); }
    return {
      x: { label: "X = (R − Rmin)/(R + 1)", unit: "—", min: 0.01, max: 1, log: true },
      y: { label: "Y = (N − Nmin)/(N + 1)", unit: "—", min: 0, max: 1 },
      series: [{ key: "gil", label: tr("Gilliland (Molokanov 식)", "Gilliland (Molokanov form)"), points: pts }],
      markers: [{ x: s.X, y: s.Y, label: `N = ${calcFormatNumber(s.N, 3)}` }],
      ariaLabel: tr("Gilliland 상관 선도와 운전점", "Gilliland correlation with the operating point"),
    };
  },
  formula: [
    "Fenske: Nmin = ln[(d/b)_LK · (b/d)_HK] / ln α_LK,HK",
    tr("비핵심 성분: (d/b)ᵢ = (d/b)_HK · αᵢ,HK^Nmin", "Non-keys: (d/b)ᵢ = (d/b)_HK · αᵢ,HK^Nmin"),
    "Underwood: Σ αᵢ zᵢ / (αᵢ − θ) = 1 − q,   Rmin + 1 = Σ αᵢ xDᵢ / (αᵢ − θ)",
    "Molokanov: Y = 1 − exp[(1 + 54.4X)/(11 + 117.2X) · (X − 1)/√X]",
    "Kirkbride: NR/NS = [(zHK/zLK)(xB,LK/xD,HK)² (B/D)]^0.206",
  ],
  notes: [
    tr("상대 휘발도와 몰 넘침이 일정하다고 봅니다. α 는 탑정·탑저 값의 기하 평균을 쓰는 것이 보통입니다.", "Assumes constant relative volatility and molal overflow. The geometric mean of top and bottom α is the usual choice."),
    tr("Gilliland 은 Molokanov(1972) 식으로 계산합니다. Geankoplis 예제 11.7-3 처럼 Erbar–Maddox 선도를 쓰면 단 수가 조금 적게 나옵니다(그 예제 11.0 단, 같은 원료로 이 계산기 약 12.3 단).",
      "Gilliland uses the Molokanov (1972) equation. The Erbar–Maddox chart used in Geankoplis Example 11.7-3 gives slightly fewer stages (11.0 there, about 12.3 here for the same feed)."),
    tr("Kirkbride 의 NR 은 급액단 위 단 수입니다. Geankoplis 는 NR 을 반올림한 단(5.96 → 6 번째)에 원료를 넣습니다.", "Kirkbride's NR is the number of stages above the feed. Geankoplis feeds at NR rounded (5.96 → stage 6 from the top)."),
    tr("간이 설계·화공기사 실기 학습용입니다. 상세 설계는 단별 계산(모사기)으로 확인하십시오.", "For shortcut design and exam practice. Confirm detailed designs with stage-by-stage calculations (a simulator)."),
  ],
  reference: [
    "Fenske, M.R. (1932). Fractionation of straight-run Pennsylvania gasoline. Industrial & Engineering Chemistry, 24(5), 482–485.",
    "Underwood, A.J.V. (1948). Fractional distillation of multicomponent mixtures. Chemical Engineering Progress, 44, 603–614.",
    "Gilliland, E.R. (1940). Multicomponent rectification — estimation of the number of theoretical plates as a function of the reflux ratio. Industrial & Engineering Chemistry, 32(9), 1220–1223.",
    "Molokanov, Y.K., Korablina, T.P., Mazurina, N.I. & Nikiforov, G.A. (1972). An approximate method for calculating the basic parameters of multicomponent fractionation. International Chemical Engineering, 12(2), 209–212.",
    "Kirkbride, C.G. (1944). Process design procedure for multicomponent fractionators. Petroleum Refiner, 23(9), 87–102.",
    tr("Geankoplis, Transport Processes and Separation Process Principles 4판(2003), 예제 11.7-2·11.7-3(시험 기준값)", "Geankoplis, Transport Processes and Separation Process Principles, 4th ed. (2003), Examples 11.7-2 and 11.7-3 (test values)"),
  ],
};

Object.assign(window, { CALC_DEF_FUG, calcFugSolve });
