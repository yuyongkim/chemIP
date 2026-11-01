// 계산기: 기체 흡수·탈거 — Kremser 이론단 수, 최소 L/G, 묽은 계 이동 단위(Colburn NTU·HTU·충전 높이).
// 평형선 y* = m x(직선), 몰 유량 일정(묽은 계) 가정. 순수 함수는 이 파일 위쪽(calcKremser*).

// Kremser: 인자 A(흡수 L/mV, 탈거 S = mV/L), 상대 회수율 φ = (A^(N+1) − A)/(A^(N+1) − 1), A = 1 이면 N/(N+1)
function calcKremserFraction(A, N) {
  if (Math.abs(A - 1) < 1e-9) return N / (N + 1);
  const p = Math.pow(A, N + 1);
  return (p - A) / (p - 1);
}

// 들어오는 쪽 추진력 비 r = (들어옴 − 평형)/(나감 − 평형) → 이론단 수. 불가능(A < 1 로 회수 한계 넘음)이면 NaN
function calcKremserN(A, r) {
  if (Math.abs(A - 1) < 1e-9) return r - 1;
  const arg = r * (1 - 1 / A) + 1 / A;
  return arg > 0 ? Math.log(arg) / Math.log(A) : NaN;
}

// Colburn 이동 단위 수 NOG(흡수, A) 또는 NOL(탈거, S)
function calcColburnNTU(A, r) {
  if (Math.abs(A - 1) < 1e-9) return r - 1;
  const arg = (1 - 1 / A) * r + 1 / A;
  return arg > 0 ? Math.log(arg) / (1 - 1 / A) : NaN;
}

// 값 → 결과(흡수·탈거 공통 모양) 또는 { error }
function calcAbsorptionSolve(v) {
  const absorb = v.proc === "absorb";
  const F = absorb ? v.LV / v.m : v.m / v.LV;                  // A 또는 S
  const cin = absorb ? v.yin : v.xin;                          // 처리할 상의 들어오는 조성
  const ceq = absorb ? v.m * v.xin : v.yin / v.m;              // 다른 상 입구와 평형인 조성(한계)
  if (!(cin > ceq)) return { error: absorb
    ? tr("기체 입구 y 가 액 입구와 평형인 m·x 보다 커야 흡수됩니다.", "Inlet gas y must exceed m·x of the inlet liquid for absorption to occur.")
    : tr("액 입구 x 가 기체 입구와 평형인 y/m 보다 커야 탈거됩니다.", "Inlet liquid x must exceed y/m of the inlet gas for stripping to occur.") };
  let N, cout;
  if (v.solve === "N") {
    cout = absorb ? v.yout : v.xout;
    if (!(cout > ceq && cout < cin)) return { error: tr("목표 출구 조성은 평형 한계와 입구 조성 사이여야 합니다.", "The target outlet composition must lie between the equilibrium limit and the inlet composition.") };
    N = calcKremserN(F, (cin - ceq) / (cout - ceq));
    if (!Number.isFinite(N)) return { error: tr(`${absorb ? "흡수 인자 A" : "탈거 인자 S"} = ${calcFormatNumber(F)} < 1 이라 이 회수율은 단 수를 늘려도 얻을 수 없습니다(최대 상대 회수율 = ${calcFormatNumber(F)}).`,
      `${absorb ? "Absorption factor A" : "Stripping factor S"} = ${calcFormatNumber(F)} < 1, so this recovery cannot be reached with any number of stages (maximum relative recovery = ${calcFormatNumber(F)}).`) };
  } else {
    N = v.N;
    cout = cin - calcKremserFraction(F, N) * (cin - ceq);
  }
  const r = (cin - ceq) / (cout - ceq);
  const ntu = calcColburnNTU(F, r);
  const other = absorb ? v.xin + (v.yin - cout) / v.LV : v.yin + v.LV * (v.xin - cout);   // 다른 상 출구(물질 수지)
  const ratioMin = absorb ? (v.yin - cout) / (v.yin / v.m - v.xin) : (v.xin - cout) / (v.m * v.xin - v.yin);   // (L/V)min 또는 (V/L)min
  const ratio = absorb ? v.LV : 1 / v.LV;
  const htu = v.flux != null && v.Ka != null ? v.flux / v.Ka : null;
  return { absorb, F, N, cout, other, ratioMin, ratio, ntu, htu, phi: (cin - cout) / (cin - ceq), removed: (cin - cout) / cin };
}

const CALC_DEF_ABSORPTION = {
  key: "absorption",
  group: "separation",
  title: tr("흡수·탈거 (Kremser·HTU/NTU)", "Absorption & stripping (Kremser, HTU/NTU)"),
  summary: tr("평형선이 직선(y* = m x)인 묽은 계에서 흡수탑·탈거탑의 이론단 수(Kremser), 최소 액기비, 이동 단위 수 NTU·높이 HTU·충전 높이를 구합니다.",
    "For dilute systems with a straight equilibrium line (y* = m x), finds absorber or stripper theoretical stages (Kremser), the minimum liquid-to-gas ratio, and the number and height of transfer units and packed height."),
  inputs: [
    { key: "proc", type: "choice", label: tr("공정", "Process"), default: "absorb", term: "absorption_factor",
      options: [{ v: "absorb", label: tr("흡수 (기체 → 액)", "Absorption (gas → liquid)") }, { v: "strip", label: tr("탈거 (액 → 기체)", "Stripping (liquid → gas)") }] },
    { key: "solve", type: "choice", label: tr("구할 값", "Solve for"), default: "N",
      options: [{ v: "N", label: tr("목표 출구 → 단 수", "Target outlet → stages") }, { v: "out", label: tr("단 수 → 출구 조성", "Stages → outlet") }] },
    { key: "m", term: "henry_slope", label: tr("평형선 기울기 m (y* = m x)", "Equilibrium slope m (y* = m x)"), unit: "—", default: 2.53, positive: true },
    { key: "LV", term: "liquid_gas_ratio", label: tr("액기비 L/V (몰)", "Liquid-to-gas ratio L/V (molar)"), unit: "—", default: 3, positive: true },
    { key: "yin", term: "mole_fraction", label: tr("기체 입구 조성 y_in", "Inlet gas y_in"), unit: tr("몰분율", "mol frac."), default: 0.01, min: 0, max: 1 },
    { key: "xin", term: "mole_fraction", label: tr("액 입구 조성 x_in", "Inlet liquid x_in"), unit: tr("몰분율", "mol frac."), default: 0, min: 0, max: 1,
      hint: tr("흡수는 보통 깨끗한 용제(0), 탈거는 처리할 액의 조성", "Usually 0 (clean solvent) for absorption; the feed liquid composition for stripping") },
    { key: "yout", term: "mole_fraction", label: tr("목표 기체 출구 y_out", "Target outlet gas y_out"), unit: tr("몰분율", "mol frac."), default: 0.00101, min: 0, max: 1,
      when: v => v.solve === "N" && v.proc === "absorb" },
    { key: "xout", term: "mole_fraction", label: tr("목표 액 출구 x_out", "Target outlet liquid x_out"), unit: tr("몰분율", "mol frac."), default: 0.0005, min: 0, max: 1,
      when: v => v.solve === "N" && v.proc === "strip" },
    { key: "N", term: "theoretical_stage", label: tr("이론단 수 N", "Theoretical stages N"), unit: tr("단", "stages"), default: 5, positive: true, when: v => v.solve === "out" },
    { key: "flux", term: "htu", label: tr("기준 상 몰 플럭스 (흡수 G, 탈거 L) — 선택", "Molar flux of the reference phase (G absorbing, L stripping) — optional"), unit: "kmol/(m²·s)", default: "", positive: true, optional: true },
    { key: "Ka", term: "htu", label: tr("총괄 용량 계수 (Kya 또는 Kxa) — 선택", "Overall capacity coefficient (Kya or Kxa) — optional"), unit: "kmol/(m³·s)", default: "", positive: true, optional: true },
  ],
  outputs: [
    { key: "A", term: "absorption_factor", label: tr("흡수 인자 A = L/(mV)", "Absorption factor A = L/(mV)"), unit: "—", digits: 4 },
    { key: "S", term: "absorption_factor", label: tr("탈거 인자 S = mV/L", "Stripping factor S = mV/L"), unit: "—", digits: 4 },
    { key: "N", term: "theoretical_stage", label: tr("이론단 수 N (Kremser)", "Theoretical stages N (Kremser)"), unit: tr("단", "stages"), digits: 4 },
    { key: "yout", term: "mole_fraction", label: tr("기체 출구 y_out", "Outlet gas y_out"), unit: tr("몰분율", "mol frac."), digits: 4 },
    { key: "xout", term: "mole_fraction", label: tr("액 출구 x_out", "Outlet liquid x_out"), unit: tr("몰분율", "mol frac."), digits: 4 },
    { key: "phi", term: "absorption_factor", label: tr("상대 회수율 (최대 대비)", "Relative recovery (of the maximum)"), unit: "—", digits: 4 },
    { key: "removed", label: tr("입구 대비 제거율", "Fraction removed from the inlet"), unit: "—", digits: 4 },
    { key: "LVmin", term: "liquid_gas_ratio", label: tr("최소 액기비 (L/V)min", "Minimum liquid-to-gas ratio (L/V)min"), unit: "—", digits: 4 },
    { key: "VLmin", term: "liquid_gas_ratio", label: tr("최소 기액비 (V/L)min", "Minimum gas-to-liquid ratio (V/L)min"), unit: "—", digits: 4 },
    { key: "ratioMult", term: "liquid_gas_ratio", label: tr("운전 비 ÷ 최소 비", "Operating ratio ÷ minimum"), unit: "—", digits: 3 },
    { key: "NTU", term: "ntu", label: tr("이동 단위 수 (흡수 NOG, 탈거 NOL)", "Transfer units (NOG absorbing, NOL stripping)"), unit: "—", digits: 4 },
    { key: "HTU", term: "htu", label: tr("이동 단위 높이 (HOG 또는 HOL)", "Height of a transfer unit (HOG or HOL)"), dim: "length", unit: "m", digits: 4 },
    { key: "Z", term: "htu", label: tr("충전 높이 Z = HTU × NTU", "Packed height Z = HTU × NTU"), dim: "length", unit: "m", digits: 4 },
  ],
  compute(v) {
    const s = calcAbsorptionSolve(v);
    if (s.error) return { error: s.error };
    const out = { N: s.N, phi: s.phi, removed: s.removed, NTU: s.ntu, ratioMult: s.ratio / s.ratioMin, warnings: [] };
    if (s.absorb) Object.assign(out, { A: s.F, yout: s.cout, xout: s.other, LVmin: s.ratioMin });
    else Object.assign(out, { S: s.F, xout: s.cout, yout: s.other, VLmin: s.ratioMin });
    if (s.htu != null) { out.HTU = s.htu; out.Z = s.htu * s.ntu; }
    if (s.ratio / s.ratioMin < 1) out.warnings.push(tr("운전 비가 최소 비보다 작아 실제로는 이 분리가 되지 않습니다(평형선과 조작선이 교차).", "The operating ratio is below the minimum, so this separation is not feasible (the operating line crosses the equilibrium line)."));
    if (Math.max(v.yin, v.xin) > 0.1) out.warnings.push(tr("입구 조성이 10 % 를 넘습니다. 묽은 계(유량 일정) 가정의 오차가 커집니다.", "An inlet mole fraction above 10 % strains the dilute (constant-flow) assumption."));
    return out;
  },
  // Kremser 선도: 상대 회수율 φ 대 단 수 N, 지금 인자와 기준 인자 몇 개
  chart(v, o) {
    const F = o.A != null ? o.A : o.S;
    if (!(F > 0) || !(o.N > 0)) return null;
    const nMax = Math.max(10, Math.ceil(o.N * 1.5));
    const curve = (a) => { const p = []; for (let i = 0; i <= 50; i++) { const n = nMax * i / 50; p.push([n, calcKremserFraction(a, n)]); } return p; };
    const refs = [0.8, 1, 1.4, 2].filter(a => Math.abs(a - F) > 0.05);
    const name = o.A != null ? "A" : "S";
    return {
      x: { label: tr("이론단 수 N", "Theoretical stages N"), unit: "—", min: 0, max: nMax },
      y: { label: tr("상대 회수율 φ", "Relative recovery φ"), unit: "—", min: 0, max: 1 },
      series: [
        { key: "now", label: `${name} = ${calcFormatNumber(F, 3)}`, points: curve(F) },
        ...refs.map(a => ({ key: `r${a}`, label: `${name} = ${a}`, points: curve(a), dashed: true })),
      ],
      markers: [{ x: o.N, y: o.phi, label: `N = ${calcFormatNumber(o.N, 3)}` }],
      ariaLabel: tr("Kremser 선도 — 인자별 회수율과 단 수", "Kremser chart — recovery against stages for several factors"),
    };
  },
  formula: [
    tr("흡수 인자 A = L/(mV), 탈거 인자 S = mV/L = 1/A", "Absorption factor A = L/(mV), stripping factor S = mV/L = 1/A"),
    "(y_in − y_out)/(y_in − m x_in) = (A^(N+1) − A)/(A^(N+1) − 1)",
    "N = ln[(y_in − m x_in)/(y_out − m x_in) · (1 − 1/A) + 1/A] / ln A",
    "NOG = ln[(1 − 1/A)(y_in − m x_in)/(y_out − m x_in) + 1/A] / (1 − 1/A),   HOG = G/(Kya),   Z = HOG · NOG",
    "(L/V)min = (y_in − y_out) / (y_in/m − x_in)",
    tr("탈거는 x 와 y/m 을 바꾸고 A 대신 S (NOL, HOL = L/Kxa)", "Stripping swaps x with y/m and uses S in place of A (NOL, HOL = L/Kxa)"),
  ],
  notes: [
    tr("기본값은 Geankoplis 예제 10.3-2·10.3-3(아세톤–공기를 물로 흡수, y = 2.53x, 기체 100·물 300 kmol/h, 회수 90 %)과 같은 조건입니다. 책은 탑 위·아래 A 의 기하 평균 1.193 으로 N = 5.05 를 얻습니다.",
      "The defaults match Geankoplis Examples 10.3-2 and 10.3-3 (acetone from air into water, y = 2.53x, 100 kmol/h gas, 300 kmol/h water, 90 % recovery). The book uses the geometric mean A of 1.193 between top and bottom and gets N = 5.05."),
    tr("A 가 탑 위·아래에서 다르면 두 값의 기하 평균을 L/V 로 넣으십시오(L/V = A·m).", "If A differs between top and bottom, enter their geometric mean as L/V (L/V = A·m)."),
    tr("평형선이 휘거나 농도가 높으면 Kremser·Colburn 식은 맞지 않습니다. 이때는 조작선–평형선 도식 또는 수치 적분을 쓰십시오.", "Kremser and Colburn do not apply when the equilibrium line curves or the gas is concentrated; use a graphical or numerical integration instead."),
  ],
  reference: [
    "Kremser, A. (1930). Theoretical analysis of absorption process. National Petroleum News, 22(21), 43–49.",
    "Colburn, A.P. (1939). The simplified calculation of diffusional processes. Transactions of the AIChE, 35, 211–236.",
    tr("Geankoplis, Transport Processes and Separation Process Principles 4판(2003), 예제 10.3-3(Kremser)·10.6-3(HOG·NOG) — 시험 기준값", "Geankoplis, Transport Processes and Separation Process Principles, 4th ed. (2003), Examples 10.3-3 (Kremser) and 10.6-3 (HOG, NOG) — test values"),
    tr("Seader, Henley & Roper, Separation Process Principles 3판(2011), 6장", "Seader, Henley & Roper, Separation Process Principles, 3rd ed. (2011), Ch. 6"),
    tr("Treybal, Mass-Transfer Operations 3판(1980), 8장", "Treybal, Mass-Transfer Operations, 3rd ed. (1980), Ch. 8"),
  ],
};

Object.assign(window, { CALC_DEF_ABSORPTION, calcKremserFraction, calcKremserN, calcColburnNTU, calcAbsorptionSolve });
