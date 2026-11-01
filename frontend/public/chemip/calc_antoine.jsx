// 계산기: Antoine 증기압 log P = A − B / (C + T) — 상수는 사용자가 넣는다(물질별 상수표는 싣지 않는다).

const CALC_ANTOINE_P_UNITS = ["mmHg", "kPa", "bar", "Pa"];
const CALC_ANTOINE_T_UNITS = ["C", "K"];

// 온도 [K] → 포화 증기압 [Pa]. C + T ≤ 0 이면 null
function calcAntoinePressure(v, Tk) {
  const t = calcConvert("temperature", Tk, "K", v.tu);
  if (v.C + t <= 0) return null;
  const p = v.base === "ln" ? Math.exp(v.A - v.B / (v.C + t)) : Math.pow(10, v.A - v.B / (v.C + t));
  return calcConvert("pressure", p, v.pu, "Pa");
}

// 그래프: 계산점 ±50 K 의 증기압 곡선(°C, kPa)과 1 atm 기준선
function calcAntoineChart(v, out) {
  const T0 = v.mode === "P" ? v.T : out.T_out;
  const P0 = v.mode === "P" ? out.P_out : v.P;
  const pts = calcChartRange(Math.max(T0 - 50, 1), T0 + 50, 50)
    .map(Tk => [Tk, calcAntoinePressure(v, Tk)])
    .filter(([, p]) => p != null && Number.isFinite(p) && p > 0)
    .map(([Tk, p]) => [calcConvert("temperature", Tk, "K", "C"), p / 1000]);
  const tC = CALC_UNITS.temperature.C.label;
  return {
    x: { label: tr("온도", "Temperature"), unit: tC },
    y: { label: tr("포화 증기압", "Vapor pressure"), unit: "kPa" },
    series: [{ key: "psat", label: tr("포화 증기압", "Vapor pressure"), points: pts }],
    markers: [{ x: calcConvert("temperature", T0, "K", "C"), y: P0 / 1000, label: tr("계산점", "Result") }],
    hlines: [{ y: CALC_CONST.atm / 1000, label: "1 atm" }],
    ariaLabel: tr("Antoine 식 증기압 곡선", "Antoine vapor pressure curve"),
  };
}

const CALC_DEF_ANTOINE = {
  key: "antoine",
  group: "chem",
  title: tr("Antoine 증기압", "Antoine vapor pressure"),
  summary: tr("Antoine 상수(A, B, C)로 온도 → 포화 증기압, 또는 압력 → 끓는 온도를 구합니다.", "Uses Antoine constants (A, B, C) to get the saturation vapor pressure from temperature, or the boiling temperature from pressure."),
  inputs: [
    { key: "mode", type: "choice", label: tr("구할 값", "Solve for"), default: "P",
      options: [{ v: "P", label: tr("온도 → 증기압", "Temperature → vapor pressure") }, { v: "T", label: tr("압력 → 끓는 온도", "Pressure → boiling temperature") }] },
    { key: "A", term: "antoine_constants", label: "A", unit: "—", default: 8.07131 },
    { key: "B", term: "antoine_constants", label: "B", unit: "—", default: 1730.63 },
    { key: "C", term: "antoine_constants", label: "C", unit: "—", default: 233.426 },
    { key: "base", type: "choice", label: tr("로그", "Logarithm"), default: "log10",
      options: [{ v: "log10", label: "log₁₀" }, { v: "ln", label: "ln" }] },
    { key: "pu", type: "choice", label: tr("상수의 압력 단위", "Pressure unit of constants"), default: "mmHg",
      options: CALC_ANTOINE_P_UNITS.map(u => ({ v: u, label: CALC_UNITS.pressure[u].label })) },
    { key: "tu", type: "choice", label: tr("상수의 온도 단위", "Temperature unit of constants"), default: "C",
      options: CALC_ANTOINE_T_UNITS.map(u => ({ v: u, label: CALC_UNITS.temperature[u].label })) },
    { key: "T", label: tr("온도", "Temperature"), dim: "temperature", unit: "K", show: "C", default: 100, positive: true, when: v => v.mode === "P" },
    { key: "P", label: tr("압력", "Pressure"), dim: "pressure", unit: "Pa", show: "kPa", default: 101.325, positive: true, when: v => v.mode === "T" },
  ],
  outputs: [
    { key: "P_out", term: "vapor_pressure", label: tr("포화 증기압", "Saturation vapor pressure"), dim: "pressure", unit: "Pa", show: "kPa", digits: 5 },
    { key: "T_out", term: "boiling_point", label: tr("끓는 온도", "Boiling temperature"), dim: "temperature", unit: "K", show: "C", digits: 5 },
  ],
  compute(v) {
    const log = v.base === "ln" ? Math.log : Math.log10;
    if (v.mode === "P") {
      const t = calcConvert("temperature", v.T, "K", v.tu);
      if (v.C + t <= 0) return { error: tr("C + T 가 0 이하입니다. 상수의 온도 단위를 확인하십시오.", "C + T is zero or negative. Check the temperature unit of the constants.") };
      return { P_out: calcAntoinePressure(v, v.T) };
    }
    const lp = log(calcConvert("pressure", v.P, "Pa", v.pu));
    if (v.A - lp <= 0) return { error: tr("A − log P 가 0 이하라 끓는 온도를 구할 수 없습니다. 상수와 단위를 확인하십시오.", "A − log P is zero or negative, so no boiling temperature can be found. Check the constants and units.") };
    const T_out = calcConvert("temperature", v.B / (v.A - lp) - v.C, v.tu, "K");
    if (!(T_out > 0)) return { error: tr("결과 온도가 0 K 이하입니다. 상수와 단위를 확인하십시오.", "The resulting temperature is at or below 0 K. Check the constants and units.") };
    return { T_out };
  },
  chart: calcAntoineChart,
  formula: ["log P = A − B / (C + T)", "T = B / (A − log P) − C", tr("log 는 log₁₀ 또는 ln, P·T 단위는 상수를 만든 단위 그대로", "log is log₁₀ or ln; P and T are in the units the constants were fitted in")],
  notes: [
    tr("상수는 맞춘 온도 범위 안에서만 씁니다. 범위를 벗어나면 결과를 믿을 수 없습니다.", "Use the constants only within their fitted temperature range. Results outside it are unreliable."),
    tr("기본 상수는 물(1–100 °C, mmHg·°C, log₁₀)의 예시값입니다. IAPWS-IF97 증기표와 25 °C 에서 −0.4 %, 100 °C 에서 −0.1 % 차이임을 시험으로 확인했습니다. 다른 물질은 출처가 있는 상수와 그 단위를 넣습니다.", "The default constants are example values for water (1–100 °C, mmHg and °C, log₁₀). Tests confirm they differ from the IAPWS-IF97 steam tables by −0.4 % at 25 °C and −0.1 % at 100 °C. For other substances enter sourced constants with their units."),
    tr("NIST Chemistry WebBook 의 상수는 log₁₀, bar, K 형식입니다(C 가 음수로 나옵니다).", "NIST Chemistry WebBook constants use log₁₀, bar and K (C comes out negative)."),
  ],
  reference: [
    "Antoine, C. (1888). Tensions des vapeurs; nouvelle relation entre les tensions et les températures. Comptes Rendus, 107, 681–684.",
    tr("Poling, B.E., Prausnitz, J.M. & O'Connell, J.P., The Properties of Gases and Liquids, 5판(2001), 7장 증기압", "Poling, B.E., Prausnitz, J.M. & O'Connell, J.P., The Properties of Gases and Liquids, 5th ed. (2001), Ch. 7 Vapor Pressure"),
    tr("IAPWS-IF97 (Wagner et al., 2000, J. Eng. Gas Turbines Power 122, 150–182) — 기본 상수 확인용 물 포화압력", "IAPWS-IF97 (Wagner et al., 2000, J. Eng. Gas Turbines Power 122, 150–182) — water saturation pressure used to check the default constants"),
  ],
};

Object.assign(window, { CALC_DEF_ANTOINE, calcAntoinePressure, calcAntoineChart });
