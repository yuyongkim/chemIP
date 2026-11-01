// 계산기: 고정지붕 탱크 증발 손실(정치 손실 + 작업 손실) — US EPA AP-42 5판 7.1절(2026-06판) 식 1-1 ~ 1-43.
// 계산은 AP-42 의 야드파운드 단위(ft·°R·psia·lb·Btu)로 하고, 칸·결과는 기준 단위(SI)로 주고받는다.
// 증기압: 성분 표(Antoine log₁₀ mmHg·°C, AP-42 식 1-28 + Raoult) 또는 물질 하나의 증기압 1점 + 끓는점(Clausius–Clapeyron, 식 1-27 꼴).
// 기본값 = AP-42 7.1.7 예제 1(덴버, 벤젠·톨루엔·사이클로헥산 혼합물, 6 ft × 12 ft 세운 원뿔 지붕 탱크).

const TANK_R = 10.731;                 // psia·ft³/(lb-mol·°R), AP-42 식 1-24
const TANK_BTU_FT2_MJ_M2 = 0.011356526682; // 1 Btu/ft² = 0.011357 MJ/m² (1055.056 J/Btu ÷ 0.09290304 m²/ft²)

const tankFt = (m) => calcConvert("length", m, "m", "ft");
const tankR = (K) => calcConvert("temperature", K, "K", "R");
const tankPsi = (Pa) => calcConvert("pressure", Pa, "Pa", "psi");

// 순성분 증기압 [psia] 함수 목록과 몰분율·분자량. mode = "antoine" | "cc"
function tankLiquid(v) {
  if (v.vp === "cc") {
    const Pa = tankPsi(CALC_CONST.atm);
    const T1 = tankR(v.Tref), Tb = tankR(v.Tb), P1 = tankPsi(v.Pref);
    if (!(Tb > T1)) return { error: tr("끓는점은 기준 온도보다 높아야 합니다.", "The boiling point must be above the reference temperature.") };
    const B = Math.log(Pa / P1) / (1 / T1 - 1 / Tb);   // ln P = A − B/T  (P psia, T °R)
    const A = Math.log(Pa) + B / Tb;
    return { comps: [{ name: "", x: 1, M: v.M, P: T => Math.exp(A - B / T) }], A, B };
  }
  const rows = v.rows || [];
  const conv = { base: v.base, pu: v.pu, tu: v.tu };
  const moles = rows.map(r => r.m / r.M);
  const total = moles.reduce((s, n) => s + n, 0);
  if (!(total > 0)) return { error: tr("성분 양을 넣으십시오.", "Enter the component amounts.") };
  return {
    comps: rows.map((r, i) => ({
      name: r.name || `#${i + 1}`,
      x: moles[i] / total,
      M: r.M,
      // AP-42 식 1-28 꼴(기본 log₁₀·mmHg·°C) — 상수 꼴은 calc_vle.jsx 의 base·pu·tu 선택
      P: T => tankPsi(calcAntoinePsat(r, conv, calcConvert("temperature", T, "R", "K"))),
    })),
  };
}

// Raoult: 온도 T[°R] → { P 혼합 증기압 psia, y 증기 몰분율, Mv }
function tankMixture(comps, T) {
  const parts = comps.map(c => c.x * c.P(T));
  const P = parts.reduce((s, p) => s + p, 0);
  const y = parts.map(p => p / P);
  return { P, y, Mv: comps.reduce((s, c, i) => s + y[i] * c.M, 0) };
}

// 지붕 높이 환산(roof outage) H_RO [ft] — 식 1-19 ~ 1-22
function tankRoofOutage(roof, RS, SR, RRft) {
  if (roof === "flat") return 0;
  if (roof === "dome") {
    const RR = RRft > 0 ? RRft : 2 * RS;
    if (RR < RS) return null;
    const HR = RR - Math.sqrt(RR * RR - RS * RS);
    return HR * (0.5 + (HR / RS) ** 2 / 6);
  }
  return (SR * RS) / 3;
}

// 온도: 식 1-6 · 1-29 · 1-33 · 1-34(세운 탱크), 1-7 · 1-30 · 1-35(눕힌 탱크, α 하나), 단열 탱크는 T_LA = T_V = T_B, ΔT_V = 0
function tankTemperatures(g) {
  const { TAA, dTA, I, aR, aS, HD, TBgiven, insul, shape } = g;
  const TB = TBgiven != null ? TBgiven : TAA + 0.003 * aS * I;
  if (insul === "full") return { TB, TLA: TB, TV: TB, dTV: 0 };
  if (shape === "horizontal") {
    const a = aS;
    return { TB, TLA: 0.4 * TAA + 0.6 * TB + 0.005 * a * I, TV: 0.7 * TAA + 0.3 * TB + 0.009 * a * I, dTV: 0.7 * dTA + 0.02 * a * I };
  }
  const k = 4.4 * HD + 3.8;
  const TLA = (0.5 - 0.8 / k) * TAA + (0.5 + 0.8 / k) * TB + (0.021 * aR * I + 0.013 * HD * aS * I) / k;
  const m = 2.2 * HD + 1.9;
  const TV = ((2.2 * HD + 1.1) * TAA + 0.8 * TB + 0.021 * aR * I + 0.013 * HD * aS * I) / m;
  const dTV = (1 - 0.8 / m) * dTA + (0.042 * aR * I + 0.026 * HD * aS * I) / m;
  return { TB, TLA, TV, dTV };
}

function calcTankLosses(v) {
  const liq = tankLiquid(v);
  if (liq.error) return liq;
  const warnings = [];
  const horizontal = v.shape === "horizontal";
  const D = tankFt(v.D);
  // 지름·기상 공간 높이(outage)
  let Deff, HVO, HD;
  if (horizontal) {
    const L = tankFt(v.L);
    Deff = Math.sqrt((L * D) / (Math.PI / 4));       // 식 1-14
    HVO = ((Math.PI / 4) * D) / 2;                    // 식 1-15 의 H_E/2
    HD = 0.5;
  } else {
    const HS = tankFt(v.HS), HL = tankFt(v.HL);
    if (HL >= HS) return { error: tr("액위가 동체 높이보다 낮아야 합니다.", "The liquid height must be below the shell height.") };
    const HRO = tankRoofOutage(v.roof, D / 2, v.SR, v.RR != null ? tankFt(v.RR) : null);
    if (HRO == null) return { error: tr("돔 지붕 반지름은 탱크 반지름 이상이어야 합니다.", "The dome roof radius must be at least the tank radius.") };
    Deff = D;
    HVO = HS - HL + HRO;                              // 식 1-18
    HD = HS / D;
  }
  const VV = (Math.PI / 4) * Deff * Deff * HVO;      // 식 1-3, ft³

  // 기상·온도
  const TAX = tankR(v.TAX), TAN = tankR(v.TAN);
  if (!(TAX >= TAN)) return { error: tr("일 최고 기온이 일 최저 기온보다 낮습니다.", "The daily maximum temperature is below the daily minimum.") };
  const I = v.Iu === "mj" ? v.I / TANK_BTU_FT2_MJ_M2 : v.I;  // Btu/(ft²·d)
  const t = tankTemperatures({
    TAA: (TAX + TAN) / 2, dTA: TAX - TAN, I, aR: v.aR, aS: v.aS, HD, insul: v.insul, shape: v.shape,
    TBgiven: v.TB != null ? tankR(v.TB) : null,
  });
  if (v.insul === "full" && v.TB == null) warnings.push(tr("단열 탱크인데 액체 온도를 넣지 않아 기온·일사로 추정했습니다(식 1-33). 실제 저장 온도를 넣으십시오.", "The tank is insulated but no liquid temperature was given, so it was estimated from ambient data (Eq. 1-33). Enter the actual storage temperature."));

  // 증기압(Raoult)
  const mid = tankMixture(liq.comps, t.TLA);
  const PA = tankPsi(v.PA);
  if (!(mid.P < PA)) return { error: tr("액면 온도의 증기압이 대기압 이상입니다(끓는 상태). 이 식은 끓는 저장물에 쓰지 않습니다.", "The vapor pressure at the liquid surface temperature is at or above atmospheric pressure (boiling stock). These equations do not apply.") };
  const PVX = tankMixture(liq.comps, t.TLA + 0.25 * t.dTV).P;   // 그림 7.1-17
  const PVN = tankMixture(liq.comps, t.TLA - 0.25 * t.dTV).P;
  const dPV = PVX - PVN;                                       // 식 1-9
  const PBP = tankPsi(v.PBP), PBV = tankPsi(v.PBV);
  const dPB = v.vent === "open" ? 0 : PBP - PBV;               // 식 1-10, 볼트·리벳 지붕(기밀 아님)은 0

  // 정치 손실(standing) — 식 1-2, 1-5, 1-23, 1-24
  let KE = t.dTV / t.TLA + (dPV - dPB) / (PA - mid.P);
  if (KE < 0) KE = 0;
  if (KE >= 1) { KE = 1; warnings.push(tr("팽창 계수 K_E 가 1 이상이라 1 로 두었습니다(기상부 전체 배출). 입력을 확인하십시오.", "The expansion factor K_E came out at 1 or more and was capped at 1 (whole vapor space expelled). Check the inputs.")); }
  const KS = 1 / (1 + 0.053 * mid.P * HVO);
  const WV = (mid.Mv * mid.P) / (TANK_R * t.TV);               // lb/ft³
  const LS = horizontal && v.buried === "yes" ? 0 : 365 * VV * WV * KE * KS;

  // 작업 손실(working) — 식 1-37 ~ 1-43
  const VQ = calcConvert("volume", v.Q, "m3", "ft3");          // 식 1-40/1-41: 순 처리량 부피(ft³/년)
  const HLX = v.HLX != null ? tankFt(v.HLX) : (horizontal ? (Math.PI / 4) * D : tankFt(v.HS) - 1);
  const HLN = v.HLN != null ? tankFt(v.HLN) : (horizontal ? 0 : 1);
  if (!(HLX > HLN)) return { error: tr("최고 액위가 최저 액위보다 높아야 합니다.", "The maximum liquid height must be above the minimum.") };
  const sumHQI = VQ / ((Math.PI / 4) * Deff * Deff);           // 식 1-39
  const N = sumHQI / (HLX - HLN);                              // 식 1-38
  const KN = N > 36 ? (180 + N) / (6 * N) : 1;
  const KP = v.product === "crude" ? 0.75 : 1;
  let KB = 1;
  if (v.vent !== "open" && PBP > tankPsi(calcConvert("pressure", 0.03, "psi", "Pa")) + 1e-12 && (KN * (PBP + PA)) / PA > 1) {
    KB = (PA / KN - mid.P) / (PBP + PA - mid.P);               // 식 1-42·1-43(P_I = 0, 대기압 운전)
  }
  const LW = VQ * KN * KP * WV * KB;

  if (N > 36) warnings.push(tr(`연간 회전수 N = ${calcFormatNumber(N, 3)} > 36 이라 K_N = (180 + N)/(6N) 을 썼습니다.`, `Turnovers N = ${calcFormatNumber(N, 3)} > 36, so K_N = (180 + N)/(6N) was used.`));
  if (mid.P < 0.1 && v.vp === "cc") warnings.push(tr("증기압이 매우 낮아(0.1 psia 미만) 1점 근사의 상대 오차가 커질 수 있습니다.", "The vapor pressure is very low (below 0.1 psia), so the one-point estimate may have a large relative error."));

  const lbToKg = (lb) => calcConvert("mass", lb, "lb", "kg");
  const vaporMass = liq.comps.map((c, i) => mid.y[i] * c.M);
  const vmSum = vaporMass.reduce((s, x) => s + x, 0);
  const species = liq.comps.length > 1
    ? liq.comps.map((c, i) => `${c.name} ${calcFormatNumber(lbToKg((LS + LW) * vaporMass[i] / vmSum), 3)} kg (${calcFormatNumber((100 * vaporMass[i]) / vmSum, 3)} %)`).join(" · ")
    : null;

  return {
    LT: lbToKg(LS + LW), LS: lbToKg(LS), LW: lbToKg(LW), species,
    TLA: calcConvert("temperature", t.TLA, "R", "K"),
    TV: calcConvert("temperature", t.TV, "R", "K"),
    dTV: calcConvert("tempdiff", t.dTV, "F", "K"),
    PVA: calcConvert("pressure", mid.P, "psi", "Pa"),
    dPV: calcConvert("pressure", dPV, "psi", "Pa"),
    Mv: mid.Mv,
    WV: calcConvert("density", WV, "lbft3", "kgm3"),
    VV: calcConvert("volume", VV, "ft3", "m3"),
    KE, KS, N, KN,
    warnings,
    // 시험·그래프용 중간값(야드파운드)
    _us: { D: Deff, HVO, VV, TB: t.TB, TLA: t.TLA, TV: t.TV, dTV: t.dTV, PVA: mid.P, PVX, PVN, dPV, dPB, Mv: mid.Mv, WV, KE, KS, LS, LW, N, KN, KB, VQ },
  };
}

// 그래프: 액면 온도 범위 둘레의 혼합 증기압 곡선(°C, kPa)과 T_LN·T_LA·T_LX 세로선
function calcTankLossesChart(v, out) {
  const liq = tankLiquid(v);
  if (liq.error) return null;
  const us = calcTankLosses(v)._us;
  const lo = us.TLA - 0.25 * us.dTV - 18, hi = us.TLA + 0.25 * us.dTV + 18;   // ±10 °C 여유
  const pts = calcChartRange(lo, hi, 40).map(T => [calcConvert("temperature", T, "R", "C"), calcConvert("pressure", tankMixture(liq.comps, T).P, "psi", "kPa")]);
  const c = (T) => calcConvert("temperature", T, "R", "C");
  return {
    x: { label: tr("액면 온도", "Liquid surface temperature"), unit: CALC_UNITS.temperature.C.label },
    y: { label: tr("증기압", "Vapor pressure"), unit: "kPa" },
    series: [{ key: "pv", label: tr("저장물 증기압", "Stock vapor pressure"), points: pts }],
    vlines: [
      { x: c(us.TLA - 0.25 * us.dTV), label: "T_LN" },
      { x: c(us.TLA), label: "T_LA" },
      { x: c(us.TLA + 0.25 * us.dTV), label: "T_LX" },
    ],
    markers: [{ x: c(us.TLA), y: calcConvert("pressure", us.PVA, "psi", "kPa"), label: "P_VA" }],
    ariaLabel: tr("액면 온도에 따른 저장물 증기압", "Stock vapor pressure against liquid surface temperature"),
  };
}

const CALC_DEF_TANK_LOSSES = {
  key: "tank_losses",
  group: "env",
  title: tr("저장탱크 증발 손실 (AP-42 7.1, 고정지붕)", "Storage tank losses (AP-42 7.1, fixed roof)"),
  summary: tr("고정지붕 탱크의 정치(호흡) 손실과 작업(입·출하) 손실을 US EPA AP-42 7.1절 식으로 추정합니다. 기본값은 AP-42 7.1.7 예제 1(덴버) 입력입니다. 배출량 산정 참고용입니다.",
    "Estimates standing (breathing) and working (filling) losses of a fixed-roof tank with the US EPA AP-42 Section 7.1 equations. The defaults are the inputs of AP-42 7.1.7 Example 1 (Denver). For emission-estimate reference only."),
  inputs: [
    { key: "shape", type: "choice", label: tr("탱크 형태", "Tank shape"), default: "vertical",
      options: [{ v: "vertical", label: tr("세운 원통", "Vertical") }, { v: "horizontal", label: tr("눕힌 원통", "Horizontal") }] },
    { key: "D", label: tr("탱크 지름", "Tank diameter"), dim: "length", unit: "m", show: "ft", default: 6, positive: true },
    { key: "HS", label: tr("동체 높이 H_S", "Shell height H_S"), dim: "length", unit: "m", show: "ft", default: 12, positive: true, when: v => v.shape === "vertical" },
    { key: "HL", term: "liquid_level", label: tr("평균 액위 H_L", "Average liquid height H_L"), dim: "length", unit: "m", show: "ft", default: 8, min: 0, when: v => v.shape === "vertical",
      hint: tr("모르면 동체 높이의 절반", "Half the shell height if unknown") },
    { key: "L", label: tr("탱크 길이", "Tank length"), dim: "length", unit: "m", show: "ft", default: 12, positive: true, when: v => v.shape === "horizontal" },
    { key: "buried", type: "choice", label: tr("지하 매설", "Underground"), default: "no", when: v => v.shape === "horizontal",
      options: [{ v: "no", label: tr("지상", "Above ground") }, { v: "yes", label: tr("지하(정치 손실 0)", "Underground (no standing loss)") }] },
    { key: "roof", type: "choice", label: tr("지붕", "Roof"), default: "cone", when: v => v.shape === "vertical",
      options: [{ v: "cone", label: tr("원뿔", "Cone") }, { v: "dome", label: tr("돔", "Dome") }, { v: "flat", label: tr("평지붕", "Flat") }] },
    { key: "SR", label: tr("원뿔 지붕 기울기 S_R", "Cone roof slope S_R"), unit: "ft/ft", default: 0.0625, min: 0, max: 1, when: v => v.shape === "vertical" && v.roof === "cone",
      hint: tr("모르면 0.0625", "0.0625 if unknown") },
    { key: "RR", label: tr("돔 지붕 반지름 R_R", "Dome roof radius R_R"), dim: "length", unit: "m", show: "ft", default: "", optional: true, positive: true, when: v => v.shape === "vertical" && v.roof === "dome",
      hint: tr("비우면 탱크 지름", "Blank = tank diameter") },
    { key: "HLX", label: tr("최고 액위 H_LX", "Maximum liquid height H_LX"), dim: "length", unit: "m", show: "ft", default: 11.5, optional: true, min: 0,
      hint: tr("비우면 세운 탱크 H_S − 1 ft, 눕힌 탱크 (π/4)D", "Blank = H_S − 1 ft (vertical), (π/4)D (horizontal)") },
    { key: "HLN", label: tr("최저 액위 H_LN", "Minimum liquid height H_LN"), dim: "length", unit: "m", show: "ft", default: 4.5, optional: true, min: 0,
      hint: tr("비우면 세운 탱크 1 ft, 눕힌 탱크 0", "Blank = 1 ft (vertical), 0 (horizontal)") },
    { key: "Q", term: "tank_throughput", label: tr("연간 처리량(입고 기준)", "Annual net throughput (filling)"), dim: "volume", unit: "m3", show: "gal", default: 8450, min: 0 },
    { key: "product", type: "choice", label: tr("저장물 종류", "Stock type"), default: "other",
      options: [{ v: "other", label: tr("원유 외 유기 액체 (K_P = 1)", "Other organic liquids (K_P = 1)") }, { v: "crude", label: tr("원유 (K_P = 0.75)", "Crude oil (K_P = 0.75)") }] },
    { key: "vp", type: "choice", label: tr("증기압 입력", "Vapor pressure input"), default: "antoine", term: "vapor_pressure",
      options: [{ v: "antoine", label: tr("성분 표(Antoine)", "Component table (Antoine)") }, { v: "cc", label: tr("물질 하나: 증기압 1점 + 끓는점", "Single substance: one vapor pressure + boiling point") }] },
    ...calcAntoineConvInputs(v => v.vp === "antoine"),
    { key: "rows", type: "table", label: tr("액체 성분 (Antoine: log P = A − B/(T + C))", "Liquid components (Antoine: log P = A − B/(T + C))"),
      when: v => v.vp === "antoine", minRows: 1, maxRows: 8, term: "antoine_constants", rowFill: "antoine",
      hint: tr("기본 행은 AP-42 예제 1 의 질량·Antoine 상수(log₁₀, mmHg, °C)입니다. 성분 칸에 물질 이름이나 CAS 를 넣고 돋보기를 누르면 ChemIP 물성으로 맞춘 상수를 채웁니다(분자량은 직접 넣습니다).",
        "Default rows are the masses and Antoine constants (log₁₀, mmHg, °C) of AP-42 Example 1. Type a substance name or CAS in the Component cell and press the magnifier to fill constants fitted to ChemIP data (enter the molar mass yourself)."),
      columns: [
        { key: "name", label: tr("성분", "Component"), text: true },
        { key: "m", label: tr("질량(비율)", "Mass (ratio)"), positive: true },
        { key: "M", label: tr("분자량", "Molar mass"), unit: "g/mol", positive: true },
        { key: "A", label: "A" },
        { key: "B", label: "B" },
        { key: "C", label: "C" },
      ],
      rows: [
        { name: tr("벤젠", "Benzene"), m: 2812, M: 78.11, A: 6.906, B: 1211.0, C: 220.79 },
        { name: tr("톨루엔", "Toluene"), m: 258, M: 92.14, A: 7.017, B: 1377.6, C: 222.64 },
        { name: tr("사이클로헥산", "Cyclohexane"), m: 101, M: 84.16, A: 6.845, B: 1203.5, C: 222.86 },
      ] },
    { key: "M", label: tr("분자량", "Molar mass"), unit: "g/mol", default: 78.11, positive: true, when: v => v.vp === "cc" },
    { key: "Pref", term: "vapor_pressure", label: tr("증기압(기준 온도에서)", "Vapor pressure (at reference temperature)"), dim: "pressure", unit: "Pa", show: "kPa", default: 10, positive: true, when: v => v.vp === "cc" },
    { key: "Tref", label: tr("증기압 기준 온도", "Reference temperature"), dim: "temperature", unit: "K", show: "C", default: 20, positive: true, when: v => v.vp === "cc" },
    { key: "Tb", term: "boiling_point", label: tr("끓는점(1 atm)", "Normal boiling point"), dim: "temperature", unit: "K", show: "C", default: 80.1, positive: true, when: v => v.vp === "cc" },
    { key: "TAX", term: "ambient_daily_range", label: tr("일 최고 기온(연평균)", "Average daily maximum ambient temperature"), dim: "temperature", unit: "K", show: "F", default: 63.5, positive: true },
    { key: "TAN", term: "ambient_daily_range", label: tr("일 최저 기온(연평균)", "Average daily minimum ambient temperature"), dim: "temperature", unit: "K", show: "F", default: 37.9, positive: true },
    { key: "Iu", type: "choice", label: tr("일사량 단위", "Insolation unit"), default: "btu",
      options: [{ v: "btu", label: "Btu/(ft²·d)" }, { v: "mj", label: "MJ/(m²·d)" }] },
    { key: "I", term: "solar_insolation", label: tr("일평균 수평면 일사량", "Average daily total insolation (horizontal)"), unit: "", default: 1491, positive: true,
      hint: tr("기상청 관측소 평년값 등 지역 자료를 넣습니다. 1 MJ/(m²·d) = 88.06 Btu/(ft²·d)", "Use local climate normals. 1 MJ/(m²·d) = 88.06 Btu/(ft²·d)") },
    { key: "PA", label: tr("대기압", "Atmospheric pressure"), dim: "pressure", unit: "Pa", show: "psi", default: 12.08, positive: true },
    { key: "aR", term: "solar_absorptance", label: tr("지붕 일사 흡수율 α_R", "Roof solar absorptance α_R"), unit: "—", default: 0.25, min: 0, max: 1, when: v => v.shape === "vertical",
      hint: tr("AP-42 표 7.1-6: 흰색 보통 상태 0.25, 밝은 회색 0.58", "AP-42 Table 7.1-6: white, average condition 0.25; light gray 0.58") },
    { key: "aS", term: "solar_absorptance", label: tr("동체 일사 흡수율 α_S", "Shell solar absorptance α_S"), unit: "—", default: 0.58, min: 0, max: 1 },
    { key: "insul", type: "choice", label: tr("단열", "Insulation"), default: "none",
      options: [{ v: "none", label: tr("단열 없음", "Uninsulated") }, { v: "full", label: tr("지붕·동체 모두 단열(일정 온도)", "Roof and shell insulated (constant temperature)") }] },
    { key: "TB", label: tr("액체(벌크) 온도", "Liquid bulk temperature"), dim: "temperature", unit: "K", show: "C", default: "", optional: true, positive: true,
      hint: tr("비우면 기온·일사로 추정(식 1-33)", "Blank = estimated from ambient data (Eq. 1-33)") },
    { key: "vent", type: "choice", label: tr("통기 장치", "Vent"), default: "pv",
      options: [{ v: "pv", label: tr("압력·진공 밸브", "Pressure/vacuum vent") }, { v: "open", label: tr("개방 통기·기밀 아님", "Open vent / not vapor-tight") }] },
    { key: "PBP", term: "breather_vent", label: tr("호흡 밸브 압력 설정", "Breather vent pressure setting"), dim: "pressure", unit: "Pa", show: "psi", default: 0.03, min: 0, when: v => v.vent === "pv" },
    { key: "PBV", term: "breather_vent", label: tr("호흡 밸브 진공 설정(음수)", "Breather vent vacuum setting (negative)"), dim: "pressure", unit: "Pa", show: "psi", default: -0.03, max: 0, when: v => v.vent === "pv" },
  ],
  outputs: [
    { key: "LT", term: "tank_total_loss", label: tr("총 손실 L_T (1년)", "Total loss L_T (per year)"), dim: "mass", unit: "kg", show: "kg", digits: 3 },
    { key: "LS", term: "standing_loss", label: tr("정치(호흡) 손실 L_S (1년)", "Standing loss L_S (per year)"), dim: "mass", unit: "kg", show: "kg", digits: 3 },
    { key: "LW", term: "working_loss", label: tr("작업 손실 L_W (1년)", "Working loss L_W (per year)"), dim: "mass", unit: "kg", show: "kg", digits: 3 },
    { key: "species", type: "text", label: tr("성분별 배출(증기 질량분율)", "Emissions by component (vapor mass fraction)") },
    { key: "TLA", label: tr("평균 액면 온도 T_LA", "Average liquid surface temperature T_LA"), dim: "temperature", unit: "K", show: "C", digits: 4 },
    { key: "PVA", term: "vapor_pressure", label: tr("액면 온도의 증기압 P_VA", "Vapor pressure at T_LA, P_VA"), dim: "pressure", unit: "Pa", show: "kPa", digits: 4 },
    { key: "Mv", label: tr("증기 분자량 M_V", "Vapor molar mass M_V"), unit: "g/mol", digits: 4 },
    { key: "WV", label: tr("증기 밀도 W_V", "Stock vapor density W_V"), dim: "density", unit: "kgm3", show: "kgm3", digits: 3 },
    { key: "VV", label: tr("기상부 부피 V_V", "Vapor space volume V_V"), dim: "volume", unit: "m3", show: "m3", digits: 4 },
    { key: "dTV", label: tr("기상부 일 온도 변화 ΔT_V", "Daily vapor temperature range ΔT_V"), dim: "tempdiff", unit: "K", show: "K", digits: 3 },
    { key: "dPV", label: tr("일 증기압 변화 ΔP_V", "Daily vapor pressure range ΔP_V"), dim: "pressure", unit: "Pa", show: "kPa", digits: 3 },
    { key: "KE", term: "vapor_expansion_factor", label: tr("기상부 팽창 계수 K_E", "Vapor space expansion factor K_E"), unit: tr("1/일", "1/day"), digits: 3 },
    { key: "KS", term: "vapor_saturation_factor", label: tr("배출 증기 포화 계수 K_S", "Vented vapor saturation factor K_S"), unit: "—", digits: 3 },
    { key: "N", term: "tank_turnovers", label: tr("연간 회전수 N", "Turnovers per year N"), unit: tr("회/년", "1/yr"), digits: 3 },
    { key: "KN", label: tr("회전 계수 K_N", "Turnover factor K_N"), unit: "—", digits: 3 },
  ],
  compute: calcTankLosses,
  chart: calcTankLossesChart,
  formula: [
    "L_T = L_S + L_W",
    "L_S = 365 · V_V · W_V · K_E · K_S,  V_V = (π/4) D² H_VO,  H_VO = H_S − H_L + H_RO",
    "K_E = ΔT_V / T_LA + (ΔP_V − ΔP_B) / (P_A − P_VA),  K_S = 1 / (1 + 0.053 · P_VA · H_VO)",
    "W_V = M_V · P_VA / (R · T_V),  R = 10.731 psia·ft³/(lb-mol·°R)",
    "T_LA = (0.5 − 0.8/(4.4 H_S/D + 3.8)) T_AA + (0.5 + 0.8/(4.4 H_S/D + 3.8)) T_B + (0.021 α_R I + 0.013 (H_S/D) α_S I)/(4.4 H_S/D + 3.8)",
    "T_B = T_AA + 0.003 α_S I,  T_LX/LN = T_LA ± 0.25 ΔT_V",
    "L_W = V_Q · K_N · K_P · W_V · K_B,  N = ΣH_QI / (H_LX − H_LN),  K_N = (180 + N)/(6N)  (N > 36)",
    tr("단위: ft · °R · psia · lb · Btu/(ft²·d). 화면 값은 SI 로 바꿔 보입니다.", "Units: ft, °R, psia, lb, Btu/(ft²·d). Values on screen are converted to SI."),
  ],
  notes: [
    tr("참고용 배출량 추정입니다. 사업장 배출량 신고(PRTR 등)는 해당 제도가 정한 산정 방법을 따르십시오.", "Reference estimate only. For official reporting (PRTR etc.) follow the method the scheme prescribes."),
    tr("고정지붕(세운·눕힌) 탱크만 다룹니다. 부상 지붕, 가열 주기, 끓는 저장물, 플래싱, 압력 탱크는 AP-42 7.1 의 다른 절을 보십시오.", "Covers fixed-roof (vertical and horizontal) tanks only. For floating roofs, cyclic heating, boiling stocks, flashing and pressure tanks see the other parts of AP-42 7.1."),
    tr("눕힌 탱크는 AP-42 의 유효 지름(식 1-14)과 간이 온도식(1-7·1-30·1-35)을 쓰고, 일사 흡수율은 동체 값 α_S 하나를 씁니다(예제 2 와 같은 방식).", "Horizontal tanks use the AP-42 effective diameter (Eq. 1-14) and the simplified temperature equations (1-7, 1-30, 1-35) with the single shell absorptance α_S (as in Example 2)."),
    tr("증기압 1점 + 끓는점 방식은 ln P = A − B/T 를 두 점으로 맞춘 근사입니다. 성분의 Antoine 상수가 있으면 성분 표를 쓰십시오. 물질 화면·HAZOP 작성기의 '탱크 손실' 링크는 ChemIP 물성(MSDS 9항 증기압·끓는점·분자량)을 채워 엽니다.", "The one-point + boiling point option fits ln P = A − B/T through two points. Use the component table when Antoine constants are available. The 'tank losses' link in the HAZOP worksheet fills ChemIP properties (MSDS §9 vapor pressure, boiling point, molar mass)."),
    tr("기상 자료(일 최고·최저 기온, 일사량)는 직접 넣습니다. AP-42 표 7.1-7 은 미국 도시만 있고, 국내 기상청 평년값은 이용 조건 확인 전이라 싣지 않았습니다.", "Enter the climate data (daily maximum and minimum temperature, insolation) yourself. AP-42 Table 7.1-7 covers US cities only, and KMA normals are not bundled until their terms of use are confirmed."),
    tr("호흡 밸브 설정이 ±0.03 psig 를 넘으면 K_B(식 1-42·1-43)를 대기압 운전(P_I = 0)으로 계산합니다.", "When the breather vent setting exceeds ±0.03 psig, K_B (Eqs. 1-42, 1-43) is computed for atmospheric operation (P_I = 0)."),
  ],
  links: [
    { href: "?view=prtr", label: tr("취급 사업장 지도(PRTR) — 물질별 신고 배출량 보기", "Facility map (PRTR) — reported releases by substance") },
  ],
  reference: [
    tr("US EPA, AP-42 Compilation of Air Emission Factors, 5판 1권 7.1절 Organic Liquid Storage Tanks(2026-06판), 식 1-1~1-43·7.1.7 예제 1·2. 식은 API 가 개발했고 비상업 공개 이용이 허용됩니다(7.1.1 머리말).",
      "US EPA, AP-42 Compilation of Air Emission Factors, 5th ed. Vol. I, Section 7.1 Organic Liquid Storage Tanks (June 2026), Eqs. 1-1 to 1-43 and 7.1.7 Examples 1 and 2. The equations were developed by API; non-commercial public use is permitted (introduction to 7.1.1)."),
    "https://gaftp.epa.gov/ap42/ch07/s01/final/c7s1_2026.pdf",
    tr("API MPMS 19.1 Evaporative Loss from Fixed-Roof Tanks — AP-42 식의 원 출처(원문은 싣지 않음)", "API MPMS Chapter 19.1, Evaporative Loss from Fixed-Roof Tanks — the original source of the AP-42 equations (text not reproduced)"),
  ],
};

Object.assign(window, { CALC_DEF_TANK_LOSSES, calcTankLosses, tankLiquid, tankMixture, tankRoofOutage, tankTemperatures });
