// 계산기: 포화 증기표(온도표·압력표) — 시작·끝·간격으로 포화 액체·증기 v·h·s 표를 만든다(IAPWS-IF97).
// 표는 정의의 table(values, outputs) → { columns, rows, filename }(calc_table_data.jsx 형식). 화면은 calc_table_out.jsx.

const STEAM_TABLE_MAX = 200;

// 시작·끝·간격 → 값 목록(끝 포함). 간격이 너무 작아 행이 많으면 null
function steamTableSteps(a, b, step, max = STEAM_TABLE_MAX) {
  const n = Math.floor((b - a) / step + 1e-9) + 1;
  if (n > max) return null;
  const out = [];
  for (let i = 0; i < n; i++) out.push(a + i * step);
  if (b - out[out.length - 1] > step * 1e-9) {
    if (out.length >= max) return null;
    out.push(b);
  }
  return out;
}

function steamTableList(v) {
  return v.basis === "T" ? steamTableSteps(v.T1, v.T2, v.dT) : steamTableSteps(v.p1, v.p2, v.dp);
}

// 포화표 한 행(SI). 임계점 바로 옆에서 풀지 못하면 null
function steamSatRow(T) {
  const sat = if97SatPair(T);
  if (!sat) return null;
  const L = sat.liq, V = sat.vap;
  return { T, p: sat.p, vf: L.v, vg: V.v, uf: L.u, ug: V.u, hf: L.h, hfg: V.h - L.h, hg: V.h, sf: L.s, sg: V.s };
}

const STEAM_TABLE_COLUMNS = [
  { key: "T", label: "T", dim: "temperature", unit: "K", show: "C", digits: 6 },
  { key: "p", label: "p", dim: "pressure", unit: "Pa", show: "kPa", digits: 6 },
  { key: "vf", label: "v_f", dim: "spvolume", unit: "m3kg", digits: 6 },
  { key: "vg", label: "v_g", dim: "spvolume", unit: "m3kg", digits: 6 },
  { key: "uf", label: "u_f", dim: "spenergy", unit: "Jkg", show: "kJkg", digits: 6 },
  { key: "ug", label: "u_g", dim: "spenergy", unit: "Jkg", show: "kJkg", digits: 6 },
  { key: "hf", label: "h_f", dim: "spenergy", unit: "Jkg", show: "kJkg", digits: 6 },
  { key: "hfg", label: "h_fg", dim: "spenergy", unit: "Jkg", show: "kJkg", digits: 6 },
  { key: "hg", label: "h_g", dim: "spenergy", unit: "Jkg", show: "kJkg", digits: 6 },
  { key: "sf", label: "s_f", dim: "spentropy", unit: "JkgK", show: "kJkgK", digits: 6 },
  { key: "sg", label: "s_g", dim: "spentropy", unit: "JkgK", show: "kJkgK", digits: 6 },
];

const CALC_DEF_STEAM_TABLE = {
  key: "steam_table",
  group: "chem",
  title: tr("포화 증기표 (온도표 · 압력표)", "Saturated steam table (by temperature · by pressure)"),
  summary: tr("시작·끝·간격을 넣으면 포화 온도·압력과 포화 액체·증기의 비체적·내부에너지·엔탈피·엔트로피 표를 만듭니다. 표는 복사하거나 CSV 로 받을 수 있습니다.",
    "Builds a table of saturation temperature and pressure with the specific volume, internal energy, enthalpy and entropy of saturated liquid and vapor, from a start, end and step. Copy the table or download it as CSV."),
  inputs: [
    { key: "basis", type: "choice", label: tr("표 기준", "Table by"), term: "saturation_table", default: "T",
      options: [{ v: "T", label: tr("온도표", "Temperature") }, { v: "p", label: tr("압력표", "Pressure") }] },
    { key: "T1", label: tr("시작 온도", "Start temperature"), term: "saturation", dim: "temperature", unit: "K", show: "C", default: 0.01, min: 273.15, max: IF97_TC, when: c => c.basis === "T" },
    { key: "T2", label: tr("끝 온도", "End temperature"), term: "saturation", dim: "temperature", unit: "K", show: "C", default: 200, min: 273.15, max: IF97_TC, when: c => c.basis === "T" },
    { key: "dT", label: tr("온도 간격", "Temperature step"), term: "table_step", dim: "tempdiff", unit: "K", show: "C", default: 10, positive: true, when: c => c.basis === "T" },
    { key: "p1", label: tr("시작 압력 (절대)", "Start pressure (absolute)"), term: "absolute_pressure", dim: "pressure", unit: "Pa", show: "kPa", default: 100, min: IF97_PTRIPLE, max: IF97_PC, when: c => c.basis === "p" },
    { key: "p2", label: tr("끝 압력 (절대)", "End pressure (absolute)"), term: "absolute_pressure", dim: "pressure", unit: "Pa", show: "kPa", default: 1000, min: IF97_PTRIPLE, max: IF97_PC, when: c => c.basis === "p" },
    { key: "dp", label: tr("압력 간격", "Pressure step"), term: "table_step", dim: "pressure", unit: "Pa", show: "kPa", default: 100, positive: true, when: c => c.basis === "p" },
  ],
  outputs: [
    { key: "n", label: tr("표 행 수", "Rows in table"), term: "saturation_table", unit: "—", digits: 4 },
  ],
  compute(v) {
    const [a, b] = v.basis === "T" ? [v.T1, v.T2] : [v.p1, v.p2];
    if (!(b >= a)) return { error: tr("끝 값이 시작 값보다 작습니다.", "The end value is smaller than the start value.") };
    const list = steamTableList(v);
    if (!list) return { error: tr(`행이 ${STEAM_TABLE_MAX}개를 넘습니다. 간격을 넓히십시오.`, `More than ${STEAM_TABLE_MAX} rows. Use a larger step.`) };
    const warnings = [];
    const Ts = v.basis === "T" ? list : list.map(calcWaterTsat);
    if (Ts.some(T => !steamSatRow(T))) warnings.push(tr("임계점 바로 옆 행은 풀지 못해 뺐습니다.", "Rows right next to the critical point could not be solved and were left out."));
    return { n: Ts.filter(T => steamSatRow(T)).length, warnings };
  },
  table(values) {
    const list = steamTableList(values);
    if (!list) return null;
    const Ts = values.basis === "T" ? list : list.map(calcWaterTsat);
    return {
      caption: values.basis === "T" ? tr("포화 증기표 — 온도 기준", "Saturated steam — by temperature") : tr("포화 증기표 — 압력 기준", "Saturated steam — by pressure"),
      columns: STEAM_TABLE_COLUMNS,
      rows: Ts.map(steamSatRow).filter(Boolean),
      filename: values.basis === "T" ? "steam_saturation_by_T.csv" : "steam_saturation_by_p.csv",
    };
  },
  formula: [
    tr("포화 압력·온도: IF97 4영역 식 p_sat(T), T_sat(p)", "Saturation pressure and temperature: IF97 Region 4 equations p_sat(T), T_sat(p)"),
    tr("포화 액체·증기: 623.15 K 까지 1·2영역 식, 그 위는 3영역 식에서 p(ρ,T) = p_sat 의 액체·증기 쪽 근", "Saturated liquid and vapor: Region 1 and 2 equations up to 623.15 K, above that the liquid- and vapor-side roots of p(ρ,T) = p_sat in Region 3"),
    "h_fg = h_g − h_f",
  ],
  notes: [
    tr(`행은 최대 ${STEAM_TABLE_MAX}개입니다. 끝 값이 간격에 딱 맞지 않으면 마지막 행으로 끝 값을 더합니다.`,
      `Up to ${STEAM_TABLE_MAX} rows. If the end value does not fall on a step, it is added as the last row.`),
    tr("엔탈피·엔트로피 기준은 삼중점 포화 액체(u = 0, s = 0)라 일반 증기표와 같습니다. 0 °C 는 삼중점 0.01 °C 와 0.01 K 차이가 있습니다.",
      "Enthalpy and entropy use the triple-point saturated liquid (u = 0, s = 0), as in common steam tables. 0 °C is 0.01 K below the triple point (0.01 °C)."),
  ],
  reference: [
    "IAPWS R7-97(2012), Revised Release on the IAPWS Industrial Formulation 1997 for the Thermodynamic Properties of Water and Steam.",
    "Wagner, W. et al. (2000). J. Eng. Gas Turbines Power 122, 150–182.",
  ],
};

Object.assign(window, { CALC_DEF_STEAM_TABLE, STEAM_TABLE_MAX, steamTableSteps, steamSatRow, STEAM_TABLE_COLUMNS });
