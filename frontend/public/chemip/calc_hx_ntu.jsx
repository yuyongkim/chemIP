// 계산기: 열교환기 ε-NTU — 향류·병류·셸앤튜브(셸 n 개, 관 짝수 패스)·직교류 3종. 성능 평가(UA → 출구 온도)와 설계(목표 출구 → 면적).
// 총괄 U 는 직접 넣거나 막 계수 + 오염 저항 + 관벽으로 쌓는다(바깥 면적 기준). 식: Incropera 11장 표 11.3·11.4.

const CALC_HX_ARR = ["counter", "parallel", "shell", "cross_uu", "cross_cmax_mixed", "cross_cmin_mixed"];
const CALC_HX_CR_FAMILY = [0, 0.25, 0.5, 0.75, 1];
const CALC_HX_NTU_MAX = 1e3;

// ε(NTU, Cr) — arr 은 CALC_HX_ARR 의 하나, shells 는 셸앤튜브 셸 수
function calcHxEffectiveness(arr, N, Cr, shells = 1) {
  if (N <= 0) return 0;
  if (Cr < 1e-9) return 1 - Math.exp(-N);
  switch (arr) {
    case "counter":
      if (Math.abs(1 - Cr) < 1e-9) return N / (1 + N);
      return (1 - Math.exp(-N * (1 - Cr))) / (1 - Cr * Math.exp(-N * (1 - Cr)));
    case "parallel":
      return (1 - Math.exp(-N * (1 + Cr))) / (1 + Cr);
    case "shell": {
      const n1 = N / shells;
      const s = Math.sqrt(1 + Cr * Cr);
      const e = Math.exp(-n1 * s);
      const e1 = 2 / (1 + Cr + s * (1 + e) / (1 - e));
      if (shells === 1) return e1;
      if (Math.abs(1 - Cr) < 1e-9) return shells * e1 / (1 + (shells - 1) * e1);
      const t = Math.pow((1 - e1 * Cr) / (1 - e1), shells);
      return (t - 1) / (t - Cr);
    }
    case "cross_uu":
      return 1 - Math.exp((1 / Cr) * Math.pow(N, 0.22) * (Math.exp(-Cr * Math.pow(N, 0.78)) - 1));
    case "cross_cmax_mixed":
      return (1 / Cr) * (1 - Math.exp(-Cr * (1 - Math.exp(-N))));
    case "cross_cmin_mixed":
      return 1 - Math.exp(-(1 / Cr) * (1 - Math.exp(-Cr * N)));
    default:
      return NaN;
  }
}

// NTU(ε, Cr) — 모든 배치를 같은 방법(로그 NTU 이분법)으로 뒤집는다. 닿을 수 없는 ε 이면 null.
function calcHxNtu(arr, eps, Cr, shells = 1) {
  if (eps <= 0) return 0;
  const f = lnN => calcHxEffectiveness(arr, Math.exp(lnN), Cr, shells) - eps;
  const lnN = calcBisect(f, Math.log(1e-8), Math.log(CALC_HX_NTU_MAX), 1e-13);
  return lnN == null ? null : Math.exp(lnN);
}

// 총괄 U (바깥 면적 기준) — 1/Uo = 1/ho + Rfo + Do·ln(Do/Di)/(2kw) + Rfi·Do/Di + Do/(Di·hi)
function calcHxOverallU(v) {
  const ratio = v.Do / v.Di;
  const wall = v.kw ? v.Do * Math.log(ratio) / (2 * v.kw) : 0;
  return 1 / (1 / v.ho + (v.Rfo || 0) + wall + (v.Rfi || 0) * ratio + ratio / v.hi);
}

const CALC_HX_U_UNIT = "W/(m²·K)";
const CALC_HX_RF_UNIT = "m²·K/W";
const CALC_HX_CP_UNIT = "J/(kg·K)";
const CALC_HX_ARR_LABEL = () => ({
  counter: tr("향류", "Counterflow"),
  parallel: tr("병류", "Parallel flow"),
  shell: tr("셸앤튜브 (셸 1개당 관 2·4… 패스)", "Shell-and-tube (2, 4… tube passes per shell)"),
  cross_uu: tr("직교류 — 두 유체 모두 비혼합", "Crossflow — both fluids unmixed"),
  cross_cmax_mixed: tr("직교류 — C_max 혼합, C_min 비혼합", "Crossflow — C_max mixed, C_min unmixed"),
  cross_cmin_mixed: tr("직교류 — C_min 혼합, C_max 비혼합", "Crossflow — C_min mixed, C_max unmixed"),
});

const CALC_DEF_HX_NTU = {
  key: "hx_ntu",
  group: "sizing",
  title: tr("열교환기 ε-NTU · 면적", "Heat exchanger ε-NTU · area"),
  summary: tr("유효도-NTU 법으로 열교환기를 평가(면적을 알 때 출구 온도)하거나 설계(목표 출구 온도에 필요한 면적)합니다. 총괄 전열계수 U 는 직접 넣거나 막 계수·오염 저항·관벽으로 쌓습니다.",
    "Rates a heat exchanger (outlet temperatures for a known area) or sizes it (area for a target outlet temperature) with the effectiveness–NTU method. The overall coefficient U is entered directly or built from film coefficients, fouling resistances and the tube wall."),
  inputs: [
    { key: "arr", type: "choice", term: "flow_arrangement", label: tr("흐름 배치", "Flow arrangement"), default: "counter",
      options: CALC_HX_ARR.map(k => ({ v: k, label: CALC_HX_ARR_LABEL()[k] })) },
    { key: "shells", label: tr("셸 수 n", "Number of shells n"), unit: "—", default: 1, min: 1, max: 6, when: v => v.arr === "shell" },
    { key: "mode", type: "choice", label: tr("구할 것", "Solve for"), default: "rating",
      options: [{ v: "rating", label: tr("평가: 면적 → 출구 온도", "Rating: area → outlet temperatures") }, { v: "sizing", label: tr("설계: 목표 출구 → 면적", "Sizing: target outlet → area") }] },
    { key: "mh", term: "mass_flow", label: tr("고온 유체 질량 유량", "Hot fluid mass flow"), dim: "massflow", unit: "kgs", show: "kgs", default: 0.1, positive: true },
    { key: "cph", term: "cp", label: tr("고온 유체 비열 cp", "Hot fluid specific heat cp"), unit: CALC_HX_CP_UNIT, default: 2131, positive: true },
    { key: "Thi", label: tr("고온 유체 입구", "Hot fluid inlet"), dim: "temperature", unit: "K", show: "C", default: 100, positive: true },
    { key: "mc", term: "mass_flow", label: tr("저온 유체 질량 유량", "Cold fluid mass flow"), dim: "massflow", unit: "kgs", show: "kgs", default: 0.2, positive: true },
    { key: "cpc", term: "cp", label: tr("저온 유체 비열 cp", "Cold fluid specific heat cp"), unit: CALC_HX_CP_UNIT, default: 4178, positive: true },
    { key: "Tci", label: tr("저온 유체 입구", "Cold fluid inlet"), dim: "temperature", unit: "K", show: "C", default: 30, positive: true },
    { key: "A", term: "heat_transfer_area", label: tr("전열 면적 A", "Heat transfer area A"), dim: "area", unit: "m2", show: "m2", default: 5, positive: true, when: v => v.mode === "rating" },
    { key: "target", type: "choice", label: tr("목표 출구", "Target outlet"), default: "Tho", when: v => v.mode === "sizing",
      options: [{ v: "Tho", label: tr("고온 유체 출구", "Hot fluid outlet") }, { v: "Tco", label: tr("저온 유체 출구", "Cold fluid outlet") }] },
    { key: "Tt", label: tr("목표 출구 온도", "Target outlet temperature"), dim: "temperature", unit: "K", show: "C", default: 60, positive: true, when: v => v.mode === "sizing" },
    { key: "ubuild", type: "choice", term: "overall_u", label: tr("총괄 전열계수 U", "Overall coefficient U"), default: "direct",
      options: [{ v: "direct", label: tr("직접 입력", "Enter directly") }, { v: "films", label: tr("막 계수 + 오염 + 관벽", "Films + fouling + wall") }] },
    { key: "U", term: "overall_u", label: tr("총괄 전열계수 U", "Overall coefficient U"), unit: CALC_HX_U_UNIT, default: 38.1, positive: true, when: v => v.ubuild === "direct" },
    { key: "hi", term: "convection_coeff", label: tr("관 안 막 계수 h_i", "Tube-side film coefficient h_i"), unit: CALC_HX_U_UNIT, default: 2250, positive: true, when: v => v.ubuild === "films" },
    { key: "ho", term: "convection_coeff", label: tr("관 밖 막 계수 h_o", "Outside film coefficient h_o"), unit: CALC_HX_U_UNIT, default: 40, positive: true, when: v => v.ubuild === "films" },
    { key: "Rfi", label: tr("관 안 오염 저항 R_f,i", "Tube-side fouling resistance R_f,i"), unit: CALC_HX_RF_UNIT, default: 0.0002, min: 0, when: v => v.ubuild === "films",
      hint: tr("교재 대표값 예: 해수·처리 보일러 급수(50 °C 초과) 0.0002, 연료유 0.0009 m²·K/W (Incropera 표 11.1)", "Representative textbook values, e.g. seawater or treated boiler feedwater above 50 °C 0.0002, fuel oil 0.0009 m²·K/W (Incropera Table 11.1)") },
    { key: "Rfo", label: tr("관 밖 오염 저항 R_f,o", "Outside fouling resistance R_f,o"), unit: CALC_HX_RF_UNIT, default: 0.0002, min: 0, when: v => v.ubuild === "films" },
    { key: "Do", label: tr("관 바깥 지름 D_o", "Tube outside diameter D_o"), dim: "length", unit: "m", show: "mm", default: 25.4, positive: true, when: v => v.ubuild === "films" },
    { key: "Di", label: tr("관 안지름 D_i", "Tube inside diameter D_i"), dim: "length", unit: "m", show: "mm", default: 21.2, positive: true, when: v => v.ubuild === "films" },
    { key: "kw", term: "thermal_conductivity", label: tr("관벽 열전도도 k_w", "Wall thermal conductivity k_w"), unit: "W/(m·K)", default: 45, positive: true, optional: true, when: v => v.ubuild === "films",
      hint: tr("비우면 관벽 저항을 뺍니다. 탄소강 약 45, 스테인리스 약 15 W/(m·K)", "Leave blank to ignore the wall. Carbon steel about 45, stainless steel about 15 W/(m·K)") },
  ],
  outputs: [
    { key: "eps", term: "hx_effectiveness", label: tr("유효도 ε", "Effectiveness ε"), unit: "—" },
    { key: "NTU", term: "ntu", label: "NTU = UA/C_min", unit: "—" },
    { key: "Cr", term: "capacity_ratio", label: tr("열용량 비 C_r = C_min/C_max", "Capacity ratio C_r = C_min/C_max"), unit: "—" },
    { key: "q", label: tr("열량 q", "Heat duty q"), dim: "power", unit: "W", show: "kW" },
    { key: "Tho", label: tr("고온 유체 출구", "Hot fluid outlet"), dim: "temperature", unit: "K", show: "C" },
    { key: "Tco", label: tr("저온 유체 출구", "Cold fluid outlet"), dim: "temperature", unit: "K", show: "C" },
    { key: "A_out", term: "heat_transfer_area", label: tr("필요 전열 면적 A", "Required heat transfer area A"), dim: "area", unit: "m2", show: "m2" },
    { key: "U_out", term: "overall_u", label: tr("총괄 전열계수 U (바깥 면적 기준)", "Overall coefficient U (outside-area basis)"), unit: CALC_HX_U_UNIT },
    { key: "epsMax", label: tr("이 배치·C_r 의 최대 유효도 (NTU → ∞)", "Maximum effectiveness for this arrangement and C_r (NTU → ∞)"), unit: "—" },
  ],
  compute(v) {
    if (!(v.Thi > v.Tci)) return { error: tr("고온 유체 입구가 저온 유체 입구보다 높아야 합니다.", "The hot inlet must be hotter than the cold inlet.") };
    const shells = v.arr === "shell" ? v.shells : 1;
    if (!Number.isInteger(shells)) return { error: tr("셸 수는 정수여야 합니다.", "The number of shells must be an integer.") };
    if (v.ubuild === "films" && !(v.Do >= v.Di)) return { error: tr("관 바깥 지름이 안지름보다 작습니다.", "The tube outside diameter is smaller than the inside diameter.") };
    const U = v.ubuild === "films" ? calcHxOverallU(v) : v.U;
    const Ch = v.mh * v.cph, Cc = v.mc * v.cpc;
    const Cmin = Math.min(Ch, Cc), Cmax = Math.max(Ch, Cc);
    const Cr = Cmin / Cmax;
    const qmax = Cmin * (v.Thi - v.Tci);
    const epsMax = calcHxEffectiveness(v.arr, CALC_HX_NTU_MAX, Cr, shells);
    const warnings = [];
    let eps, NTU, A;
    if (v.mode === "rating") {
      A = v.A;
      NTU = U * A / Cmin;
      eps = calcHxEffectiveness(v.arr, NTU, Cr, shells);
    } else {
      const q = v.target === "Tho" ? Ch * (v.Thi - v.Tt) : Cc * (v.Tt - v.Tci);
      if (!(q > 0)) return { error: tr("목표 출구 온도가 열을 주고받는 방향과 맞지 않습니다.", "The target outlet temperature is inconsistent with the direction of heat transfer.") };
      eps = q / qmax;
      if (eps >= epsMax - 1e-9) return { error: tr(`이 배치로는 닿을 수 없는 목표입니다(필요 ε = ${calcFormatNumber(eps)} ≥ 최대 ${calcFormatNumber(epsMax)}). 향류나 셸 수를 늘리십시오.`,
        `This target cannot be reached with this arrangement (required ε = ${calcFormatNumber(eps)} ≥ maximum ${calcFormatNumber(epsMax)}). Use counterflow or more shells.`) };
      NTU = calcHxNtu(v.arr, eps, Cr, shells);
      if (NTU == null) return { error: tr("NTU 를 찾지 못했습니다.", "NTU could not be found.") };
      A = NTU * Cmin / U;
    }
    const q = eps * qmax;
    const out = { eps, NTU, Cr, q, Tho: v.Thi - q / Ch, Tco: v.Tci + q / Cc, U_out: U, epsMax, warnings };
    if (v.mode === "sizing") out.A_out = A;
    if (v.arr === "cross_uu") warnings.push(tr("두 유체 비혼합 직교류 식은 근사식입니다(C_r = 1 부근 오차 약 1–2 %).", "The both-unmixed crossflow formula is an approximation (about 1–2 % off near C_r = 1)."));
    if (v.arr === "shell" && eps > 0.9 * epsMax && shells === 1) warnings.push(tr("최대 유효도에 가깝습니다. 셸 1개 배치는 온도 교차가 생기기 쉬우니 셸 수를 늘리는 것을 검토하십시오.", "Close to the maximum effectiveness. A single shell is prone to temperature cross; consider more shells."));
    return out;
  },
  chart(v, o) {
    const shells = v.arr === "shell" ? v.shells : 1;
    const ns = calcLinspace(0, 5, 51);
    const series = CALC_HX_CR_FAMILY.map(cr => ({
      key: `cr${cr}`, label: `C_r = ${cr}`, dashed: cr === 0, points: ns.map(n => [n, calcHxEffectiveness(v.arr, n, cr, shells)]),
    }));
    return {
      x: { label: "NTU", unit: "—", min: 0, max: Math.max(5, Math.ceil(o.NTU)) },
      y: { label: tr("유효도 ε", "Effectiveness ε"), unit: "—", min: 0, max: 1 },
      series,
      markers: [{ x: o.NTU, y: o.eps, label: `ε = ${calcFormatNumber(o.eps, 3)}` }],
      ariaLabel: tr("NTU 에 따른 유효도 곡선(C_r 별)과 현재 점", "Effectiveness versus NTU for several C_r, with the current point"),
    };
  },
  formula: [
    "C = ṁ·c_p,  C_r = C_min/C_max,  NTU = U·A/C_min,  q = ε·C_min·(T_h,i − T_c,i)",
    tr("향류: ε = [1 − e^(−NTU(1−C_r))] / [1 − C_r·e^(−NTU(1−C_r))]  (C_r = 1: NTU/(1+NTU))", "Counterflow: ε = [1 − e^(−NTU(1−C_r))] / [1 − C_r·e^(−NTU(1−C_r))] (C_r = 1: NTU/(1+NTU))"),
    tr("병류: ε = [1 − e^(−NTU(1+C_r))] / (1 + C_r)", "Parallel flow: ε = [1 − e^(−NTU(1+C_r))] / (1 + C_r)"),
    tr("셸 1개: ε₁ = 2·{1 + C_r + √(1+C_r²)·(1 + e^(−N₁√(1+C_r²)))/(1 − e^(−N₁√(1+C_r²)))}⁻¹,  셸 n개: N₁ = NTU/n, ε = [((1−ε₁C_r)/(1−ε₁))ⁿ − 1] / [((1−ε₁C_r)/(1−ε₁))ⁿ − C_r]",
      "One shell: ε₁ = 2·{1 + C_r + √(1+C_r²)·(1 + e^(−N₁√(1+C_r²)))/(1 − e^(−N₁√(1+C_r²)))}⁻¹; n shells: N₁ = NTU/n, ε = [((1−ε₁C_r)/(1−ε₁))ⁿ − 1] / [((1−ε₁C_r)/(1−ε₁))ⁿ − C_r]"),
    tr("직교류 비혼합: ε ≈ 1 − exp[(1/C_r)·NTU^0.22·(e^(−C_r·NTU^0.78) − 1)];  C_max 혼합: ε = (1/C_r)(1 − e^(−C_r(1 − e^(−NTU))));  C_min 혼합: ε = 1 − exp[−(1/C_r)(1 − e^(−C_r·NTU))]",
      "Crossflow unmixed: ε ≈ 1 − exp[(1/C_r)·NTU^0.22·(e^(−C_r·NTU^0.78) − 1)]; C_max mixed: ε = (1/C_r)(1 − e^(−C_r(1 − e^(−NTU)))); C_min mixed: ε = 1 − exp[−(1/C_r)(1 − e^(−C_r·NTU))]"),
    tr("C_r = 0 (응축·비등): ε = 1 − e^(−NTU).  설계는 ε(NTU) 를 수치로 뒤집어 NTU 를 구한다.", "C_r = 0 (condensing or boiling): ε = 1 − e^(−NTU). Sizing inverts ε(NTU) numerically."),
    "1/U_o = 1/h_o + R_f,o + D_o·ln(D_o/D_i)/(2k_w) + R_f,i·D_o/D_i + D_o/(D_i·h_i)",
  ],
  notes: [
    tr("비열·U 는 일정하다고 봅니다. 상변화가 있는 쪽은 C → ∞(C_r → 0)로 두려면 그쪽 질량 유량이나 비열을 아주 크게 넣으십시오.",
      "Specific heats and U are taken as constant. For a phase-change stream (C → ∞, C_r → 0), enter a very large mass flow or specific heat for that side."),
    tr("오염 저항은 TEMA·교재 표의 대표값 범위를 참고해 사용자가 고릅니다. 표 자체는 옮기지 않았습니다.", "Choose fouling resistances from the representative ranges in TEMA or textbooks; the tables themselves are not reproduced."),
    tr("LMTD 계산기와 같은 결과가 나옵니다(향류·병류). 셸앤튜브 패스 배치·관 수 설계는 하지 않습니다.", "Gives the same result as the LMTD calculator for counterflow and parallel flow. Tube-count and pass-layout design is not included."),
  ],
  reference: [
    tr("Incropera, F.P., DeWitt, D.P., Bergman, T.L. & Lavine, A.S. Fundamentals of Heat and Mass Transfer, 11장 — 표 11.3·11.4(ε-NTU 식), 예제 11.1", "Incropera, F.P., DeWitt, D.P., Bergman, T.L. & Lavine, A.S. Fundamentals of Heat and Mass Transfer, Ch. 11 — Tables 11.3 and 11.4 (ε-NTU relations), Example 11.1"),
    "Kays, W.M. & London, A.L. (1984). Compact Heat Exchangers, 3rd ed. McGraw-Hill.",
    tr("Bell, C. ht — ht.hx.effectiveness_from_NTU (MIT) 대조", "Bell, C. ht — ht.hx.effectiveness_from_NTU (MIT), cross-check"),
  ],
};

Object.assign(window, { CALC_DEF_HX_NTU, calcHxEffectiveness, calcHxNtu, calcHxOverallU });
