// 계산기: 다성분 기포점·이슬점·등온 플래시(Rachford–Rice). K 값은 Raoult(Antoine)·Wilson·직접 입력.
// 풀이는 calc_sep_vle.jsx(순수 함수), Antoine 행 채우기는 rowFill "antoine"(api_calc_fill.jsx). 2성분이면 T–x–y·P–x–y 그래프.

const CALC_FLASH_SOLVES = ["flash", "bubbleT", "dewT", "bubbleP", "dewP"];
const CALC_FLASH_NEEDS_T = ["flash", "bubbleP", "dewP"];
const CALC_FLASH_NEEDS_P = ["flash", "bubbleT", "dewT"];
const CALC_FLASH_TABLE = { raoult: "rows", wilson: "rowsW", k: "rowsK" };

// 값 → { names, z, model | K } (K 모형 또는 직접 K)
function calcFlashSystem(v) {
  const rows = v[CALC_FLASH_TABLE[v.kmodel]] || [];
  const names = rows.map(r => r.name);
  const z = calcSepNormalize(rows.map(r => r.z));
  if (v.kmodel === "k") return { names, z, K: rows.map(r => r.K), sumZ: calcSepSum(rows.map(r => r.z)) };
  const model = v.kmodel === "wilson"
    ? calcSepWilsonModel(rows.map(r => ({ Tc: r.Tc, Pc: r.Pc * 1e5, w: r.w })))
    : calcSepRaoultModel(rows, { base: v.base, pu: v.pu, tu: v.tu });
  return { names, z, model, sumZ: calcSepSum(rows.map(r => r.z)) };
}

function calcFlashPhaseText(phase) {
  if (phase === "liquid") return tr("과냉 액체 — 기포점 아래(증기 없음)", "Subcooled liquid — below the bubble point (no vapour)");
  if (phase === "vapor") return tr("과열 증기 — 이슬점 위(액체 없음)", "Superheated vapour — above the dew point (no liquid)");
  return tr("두 상(기액 공존)", "Two phases (vapour–liquid)");
}

const CALC_DEF_FLASH = {
  key: "flash",
  group: "separation",
  title: tr("기포점·이슬점·플래시", "Bubble point, dew point & flash"),
  summary: tr("다성분 혼합물의 기포점·이슬점(온도 또는 압력)과 등온 플래시(Rachford–Rice)의 증기 분율·액상·기상 조성을 구합니다. K 값은 Raoult(Antoine), Wilson 상관식 또는 직접 넣은 값입니다.",
    "Finds the bubble and dew point (temperature or pressure) of a multicomponent mixture and the vapour fraction and phase compositions of an isothermal flash (Rachford–Rice). K-values come from Raoult's law (Antoine), the Wilson correlation, or values you enter."),
  inputs: [
    { key: "solve", type: "choice", label: tr("구할 값", "Solve for"), default: "flash", term: "flash_vle",
      options: [
        { v: "flash", label: tr("플래시 (T, P)", "Flash (T, P)") },
        { v: "bubbleT", label: tr("기포점 온도", "Bubble T") },
        { v: "dewT", label: tr("이슬점 온도", "Dew T") },
        { v: "bubbleP", label: tr("기포점 압력", "Bubble P") },
        { v: "dewP", label: tr("이슬점 압력", "Dew P") },
      ] },
    { key: "kmodel", type: "choice", label: tr("K 값", "K-values"), default: "raoult", term: "k_value",
      options: [
        { v: "raoult", label: tr("Raoult (Antoine)", "Raoult (Antoine)") },
        { v: "wilson", label: tr("Wilson 상관식", "Wilson correlation") },
        { v: "k", label: tr("직접 입력", "Enter K") },
      ] },
    ...calcAntoineConvInputs(v => v.kmodel === "raoult"),
    { key: "rows", type: "table", label: tr("성분 (Antoine 상수)", "Components (Antoine constants)"), minRows: 1, maxRows: 10, rowFill: "antoine",
      when: v => v.kmodel === "raoult", term: "mole_fraction",
      columns: [
        { key: "name", label: tr("성분", "Component"), text: true },
        { key: "z", term: "mole_fraction", label: "z", unit: tr("몰분율", "mol frac."), min: 0 },
        { key: "A", term: "antoine_constants", label: "A" },
        { key: "B", term: "antoine_constants", label: "B" },
        { key: "C", term: "antoine_constants", label: "C" },
      ],
      rows: [
        { name: tr("벤젠", "Benzene"), z: 0.5, A: 6.90565, B: 1211.033, C: 220.79 },
        { name: tr("톨루엔", "Toluene"), z: 0.5, A: 6.95464, B: 1344.8, C: 219.482 },
      ],
      hint: tr("기본 행은 벤젠·톨루엔 예시 상수(log₁₀, mmHg, °C)입니다. 성분 칸에 물질 이름이나 CAS 를 넣고 돋보기를 누르면 ChemIP 물성(증기압 한 점 + 끓는점)으로 맞춘 추정 상수를 채웁니다.",
        "Default rows are example benzene–toluene constants (log₁₀, mmHg, °C). Type a substance name or CAS in the Component cell and press the magnifier to fill estimated constants fitted to ChemIP data (one vapour-pressure point + the boiling point).") },
    { key: "rowsW", type: "table", label: tr("성분 (임계 상수)", "Components (critical constants)"), minRows: 1, maxRows: 10,
      when: v => v.kmodel === "wilson", term: "mole_fraction",
      columns: [
        { key: "name", label: tr("성분", "Component"), text: true },
        { key: "z", term: "mole_fraction", label: "z", unit: tr("몰분율", "mol frac."), min: 0 },
        { key: "Tc", term: "critical_point", label: "Tc", unit: "K", positive: true },
        { key: "Pc", term: "critical_point", label: "Pc", unit: "bar", positive: true },
        { key: "w", term: "acentric_factor", label: "ω", min: -0.5, max: 2 },
      ],
      rows: [
        { name: tr("프로판", "Propane"), z: 0.5, Tc: 369.8, Pc: 42.48, w: 0.152 },
        { name: tr("n-부탄", "n-Butane"), z: 0.5, Tc: 425.1, Pc: 37.96, w: 0.2 },
      ],
      hint: tr("Wilson 식은 낮은 압력의 탄화수소에 맞습니다. 기본 행 상수는 Poling 외(2001) 부록 값입니다.",
        "The Wilson correlation suits hydrocarbons at low pressure. Default constants are from Poling et al. (2001), appendix.") },
    { key: "rowsK", type: "table", label: tr("성분 (K 값)", "Components (K-values)"), minRows: 2, maxRows: 10,
      when: v => v.kmodel === "k", term: "k_value",
      columns: [
        { key: "name", label: tr("성분", "Component"), text: true },
        { key: "z", term: "mole_fraction", label: "z", unit: tr("몰분율", "mol frac."), min: 0 },
        { key: "K", term: "k_value", label: "K", positive: true },
      ],
      rows: [{ name: "1", z: 0.3, K: 2.0 }, { name: "2", z: 0.3, K: 1.0 }, { name: "3", z: 0.4, K: 0.5 }],
      hint: tr("DePriester 선도 등에서 읽은 그 T·P 의 K 값을 넣습니다(플래시만 풉니다).", "Enter K-values read at this T and P, e.g. from a DePriester chart (flash only).") },
    { key: "T", label: tr("온도", "Temperature"), dim: "temperature", unit: "K", show: "C", default: 95, positive: true,
      when: v => CALC_FLASH_NEEDS_T.includes(v.solve) },
    { key: "P", term: "absolute_pressure", label: tr("압력 (절대)", "Pressure (absolute)"), dim: "pressure", unit: "Pa", show: "kPa", default: 101.325, positive: true,
      when: v => CALC_FLASH_NEEDS_P.includes(v.solve) },
  ],
  outputs: [
    { key: "T_out", term: "bubble_point", label: tr("온도", "Temperature"), dim: "temperature", unit: "K", show: "C", digits: 5 },
    { key: "P_out", term: "bubble_point", label: tr("압력", "Pressure"), dim: "pressure", unit: "Pa", show: "kPa", digits: 5 },
    { key: "beta", term: "vapor_fraction", label: tr("증기 분율 V/F", "Vapour fraction V/F"), unit: "—", digits: 4 },
    { key: "phase", label: tr("상태", "State"), type: "text" },
    { key: "x", term: "mole_fraction", label: tr("액상 조성 x", "Liquid composition x"), type: "text" },
    { key: "y", term: "mole_fraction", label: tr("기상 조성 y", "Vapour composition y"), type: "text" },
    { key: "K", term: "k_value", label: tr("K 값", "K-values"), type: "text" },
  ],
  compute(v) {
    const sys = calcFlashSystem(v);
    const warnings = [];
    if (!(sys.sumZ > 0)) return { error: tr("몰분율 z 합계가 0 입니다.", "The mole fractions z sum to zero.") };
    if (Math.abs(sys.sumZ - 1) > 1e-6) warnings.push(tr(`z 합계가 ${calcFormatNumber(sys.sumZ)} 이라 합 1 로 나눠 계산했습니다.`, `The z values sum to ${calcFormatNumber(sys.sumZ)}, so they were normalised to 1.`));
    if (v.kmodel === "k" && v.solve !== "flash") return { error: tr("직접 넣은 K 는 그 T·P 에서만 맞아 플래시만 풉니다. 기포점·이슬점은 Raoult 나 Wilson 을 고르십시오.", "Entered K-values hold only at one T and P, so only the flash is solved. Choose Raoult or Wilson for bubble and dew points.") };
    const out = { warnings };
    const fail = { error: tr("풀지 못했습니다. 상수·단위와 T·P 범위를 확인하십시오(Antoine 은 C + T > 0, A − log P > 0 이어야 합니다).", "No solution found. Check the constants, units and the T, P range (Antoine needs C + T > 0 and A − log P > 0).") };
    let T = v.T, P = v.P, x = null, y = null, K = sys.K;
    if (v.solve === "bubbleT" || v.solve === "dewT") {
      T = v.solve === "bubbleT" ? calcSepBubbleT(sys.model, sys.z, P) : calcSepDewT(sys.model, sys.z, P);
      if (!Number.isFinite(T)) return fail;
      out.T_out = T;
    } else if (v.solve === "bubbleP" || v.solve === "dewP") {
      P = v.solve === "bubbleP" ? calcSepBubbleP(sys.model, sys.z, T) : calcSepDewP(sys.model, sys.z, T);
      if (!(P > 0)) return fail;
      out.P_out = P;
    }
    if (sys.model) K = sys.model.s(T).map(s => s / P);
    if (K.some(k => !(k > 0))) return fail;
    if (v.solve === "bubbleT" || v.solve === "bubbleP") {
      x = sys.z;
      y = sys.z.map((zi, i) => zi * K[i]);
    } else if (v.solve === "dewT" || v.solve === "dewP") {
      y = sys.z;
      x = sys.z.map((zi, i) => zi / K[i]);
    } else {
      const rr = calcRachfordRice(sys.z, K);
      if (!rr || !Number.isFinite(rr.beta)) return fail;
      x = rr.x; y = rr.y;
      out.beta = rr.beta;
      out.phase = calcFlashPhaseText(rr.phase);
    }
    out.x = calcSepCompText(sys.names, calcSepNormalize(x));
    out.y = calcSepCompText(sys.names, calcSepNormalize(y));
    out.K = calcSepCompText(sys.names, K);
    if (v.kmodel === "raoult") warnings.push(tr("Raoult 식은 이상 용액·낮은 압력 가정입니다. 에탄올–물처럼 공비점이 있는 계는 맞지 않습니다(활동도 계수 필요).", "Raoult's law assumes an ideal solution at low pressure. It fails for azeotropic systems such as ethanol–water (activity coefficients are needed)."));
    return out;
  },
  // 2성분이면 T–x–y(압력 고정) 또는 P–x–y(온도 고정). 성분 1 의 몰분율을 x 축에.
  chart(v, o) {
    const sys = calcFlashSystem(v);
    if (!sys.model || sys.z.length !== 2) return null;
    const name1 = sys.names[0] || "1";
    const xAxis = { label: tr(`${name1} 몰분율 x, y`, `${name1} mole fraction x, y`), unit: "—", min: 0, max: 1 };
    const isoP = CALC_FLASH_NEEDS_P.includes(v.solve);
    const P = o.P_out != null ? o.P_out : v.P;
    const T = o.T_out != null ? o.T_out : v.T;
    const curve = isoP ? calcSepBinaryTxy(sys.model, P) : calcSepBinaryPxy(sys.model, T);
    if (!curve) return null;
    const val = (p) => (isoP ? p.T - 273.15 : p.P / 1000);
    const state = isoP ? T - 273.15 : P / 1000;
    const K1 = sys.model.s(T)[0] / P, K2 = sys.model.s(T)[1] / P;
    const x1 = (1 - K2) / (K1 - K2), y1 = K1 * x1;   // 그 T·P 의 평형 조성(2성분)
    const markers = [];
    if (x1 >= 0 && x1 <= 1) markers.push({ x: x1, y: state, label: tr("액 x", "liquid x") }, { x: y1, y: state, label: tr("증기 y", "vapour y") });
    return {
      x: xAxis,
      y: isoP ? { label: tr(`온도 (P = ${calcFormatNumber(P / 1000)} kPa)`, `Temperature (P = ${calcFormatNumber(P / 1000)} kPa)`), unit: "°C" }
        : { label: tr(`압력 (T = ${calcFormatNumber(T - 273.15)} °C)`, `Pressure (T = ${calcFormatNumber(T - 273.15)} °C)`), unit: "kPa" },
      series: [
        { key: "bubble", label: tr("기포점 곡선 (액 x)", "Bubble curve (liquid x)"), points: curve.map(p => [p.x, val(p)]) },
        { key: "dew", label: tr("이슬점 곡선 (증기 y)", "Dew curve (vapour y)"), points: curve.map(p => [p.y, val(p)]) },
      ],
      markers,
      vlines: [{ x: sys.z[0], label: "z" }],
      hlines: [{ y: state, label: isoP ? "T" : "P" }],
      ariaLabel: tr(`${name1} 기준 ${isoP ? "T–x–y" : "P–x–y"} 선도`, `${isoP ? "T–x–y" : "P–x–y"} diagram for ${name1}`),
    };
  },
  formula: [
    "Raoult: Kᵢ = Pᵢˢᵃᵗ(T) / P,  log Pˢᵃᵗ = A − B / (C + T)",
    "Wilson: Kᵢ = (Pcᵢ / P) · exp[5.373 (1 + ωᵢ)(1 − Tcᵢ / T)]",
    tr("기포점: Σ zᵢ Kᵢ = 1,  이슬점: Σ zᵢ / Kᵢ = 1", "Bubble point: Σ zᵢ Kᵢ = 1,  dew point: Σ zᵢ / Kᵢ = 1"),
    "Rachford–Rice: Σ zᵢ (Kᵢ − 1) / [1 + β (Kᵢ − 1)] = 0,  β = V/F",
    "xᵢ = zᵢ / [1 + β (Kᵢ − 1)],  yᵢ = Kᵢ xᵢ",
  ],
  notes: [
    tr("Σ zK ≤ 1 이면 과냉 액체(β = 0), Σ z/K ≤ 1 이면 과열 증기(β = 1)로 판정하고, 그 사이에서만 Rachford–Rice 를 풉니다(β 이분법).",
      "If Σ zK ≤ 1 the feed is a subcooled liquid (β = 0); if Σ z/K ≤ 1 it is a superheated vapour (β = 1). Rachford–Rice is solved only between them (bisection on β)."),
    tr("기포점·이슬점 온도는 성분별 끓는 온도 사이에 있으므로 그 구간에서 이분법으로 찾습니다.", "Bubble and dew temperatures lie between the pure-component boiling temperatures, so they are bracketed there and found by bisection."),
    tr("ChemIP 에서 채운 Antoine 상수는 증기압 한 점과 끓는점 두 점으로 맞춘 Clausius–Clapeyron 꼴(C = 273.15)의 추정값입니다. 두 점 사이 온도에서만 믿을 만하고, 출처가 있는 상수가 있으면 그것을 넣으십시오.",
      "Antoine constants filled from ChemIP are estimates: a Clausius–Clapeyron form (C = 273.15) fitted through one vapour-pressure point and the boiling point. They are reliable only between those two temperatures; enter sourced constants when you have them."),
    tr("학습·사전 검토용입니다. 비이상 계·고압은 활동도 계수·상태방정식 모사기를 쓰십시오.", "For learning and screening. Use activity-coefficient or equation-of-state simulators for non-ideal systems and high pressure."),
  ],
  reference: [
    "Rachford, H.H. & Rice, J.D. (1952). Procedure for use of electronic digital computers in calculating flash vaporization hydrocarbon equilibrium. Journal of Petroleum Technology, 4(10), 19 and 3.",
    "Wilson, G.M. (1968). A modified Redlich–Kwong equation of state, application to general physical data calculations. AIChE 65th National Meeting, Paper 15C.",
    tr("Seader, Henley & Roper, Separation Process Principles 3판(2011), 4장 — 플래시와 Rachford–Rice 구간", "Seader, Henley & Roper, Separation Process Principles, 3rd ed. (2011), Ch. 4 — flash and the Rachford–Rice bracket"),
    tr("Smith, Van Ness & Abbott, Introduction to Chemical Engineering Thermodynamics 7판, 10장 — Raoult 식 기포점·이슬점·플래시 예제(시험 기준값)", "Smith, Van Ness & Abbott, Introduction to Chemical Engineering Thermodynamics, 7th ed., Ch. 10 — Raoult's-law bubble, dew and flash examples (test values)"),
    tr("Poling, Prausnitz & O'Connell, The Properties of Gases and Liquids 5판(2001) — 임계 상수·이심 인자", "Poling, Prausnitz & O'Connell, The Properties of Gases and Liquids, 5th ed. (2001) — critical constants and acentric factors"),
  ],
};

Object.assign(window, { CALC_DEF_FLASH, calcFlashSystem });
