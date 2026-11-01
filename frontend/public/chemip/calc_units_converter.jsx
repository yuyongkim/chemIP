// 계산기: 공학 단위 변환기(key units) — 한 값을 그 물리량의 모든 단위로 한 번에 바꿔 보여 준다.
// 선형 단위는 calc_units.jsx 의 CALC_UNITS 표를 그대로 읽고(단위를 더하면 여기에도 나온다), 기체 유량·기체 농도는
// 기준 조건·분자량이 필요해 calc_units_gas.jsx 의 함수로 바꾼다. 파일 이름이 calc_units.jsx(단위 표)와 겹쳐 _converter 를 붙였다.
// 주소: ?view=calc&calc=units&kind=gasflow&mw=<분자량> — 물질 상세 링크(calcSubstanceUnitsHref, calc_link.jsx)가 쓴다.

// 물리량 목록(화면 순서). dim = CALC_UNITS 표, show = 처음 보이는 단위, def = 기본값(show 단위), term = 용어 설명.
const CALC_UC_KINDS = [
  { v: "pressure", label: tr("압력 (절대·게이지)", "Pressure (abs/gauge)"), dim: "pressure_ag", show: "barg", def: 10, term: "gauge_pressure" },
  { v: "temperature", label: tr("온도", "Temperature"), dim: "temperature", show: "C", def: 100, term: "absolute_temperature", min: 0 },
  { v: "gasflow", label: tr("기체 유량 (Nm³·Sm³·kg·kmol)", "Gas flow (Nm³, Sm³, kg, kmol)"), gas: true, term: "normal_m3" },
  { v: "massflow", label: tr("질량 유량", "Mass flow"), dim: "massflow", show: "kgh", def: 1000, term: "mass_flow" },
  { v: "flow", label: tr("부피 유량", "Volumetric flow"), dim: "flow", show: "m3h", def: 10, term: "volumetric_flow" },
  { v: "molarflow", label: tr("몰 유량", "Molar flow"), dim: "molarflow", show: "kmolh", def: 1, term: "molar_flow" },
  { v: "mass", label: tr("질량", "Mass"), dim: "mass", show: "kg", def: 1, term: "mass_quantity" },
  { v: "energy", label: tr("에너지·열량", "Energy & heat"), dim: "energy", show: "kcal", def: 1000, term: "energy" },
  { v: "power", label: tr("동력·열 유량", "Power & heat rate"), dim: "power", show: "kW", def: 1, term: "power" },
  { v: "heatflux", label: tr("열유속", "Heat flux"), dim: "heatflux", show: "kWm2", def: 1, term: "heat_flux" },
  { v: "viscosity", label: tr("점도", "Viscosity"), dim: "viscosity", show: "cP", def: 1, term: "viscosity", cross: "kinviscosity" },
  { v: "kinviscosity", label: tr("동점도", "Kinematic viscosity"), dim: "kinviscosity", show: "cSt", def: 1, term: "kinematic_viscosity", cross: "viscosity" },
  { v: "density", label: tr("밀도", "Density"), dim: "density", show: "kgm3", def: 1000, term: "density" },
  { v: "conductivity", label: tr("열전도도", "Thermal conductivity"), dim: "conductivity", show: "WmK", def: 1, term: "thermal_conductivity" },
  { v: "htc", label: tr("열전달 계수", "Heat transfer coefficient"), dim: "htc", show: "Wm2K", def: 1000, term: "heat_transfer_coeff" },
  { v: "conc", label: tr("기체 농도 (ppm ↔ mg/m³)", "Gas concentration (ppm ↔ mg/m³)"), conc: true, term: "ppm" },
];

const CALC_UC_TABLE_KINDS = CALC_UC_KINDS.filter(k => k.dim);
const calcUcIs = (...kinds) => c => kinds.includes(c.kind);

// 표의 기준 단위(f = 1, 기준점 없음) — compute 가 받는 단위
function calcUcBase(dim) {
  return Object.keys(CALC_UNITS[dim]).find(u => CALC_UNITS[dim][u].f === 1 && !CALC_UNITS[dim][u].o);
}

// 결과 줄 key — 표 단위는 "<dim>__<단위>", 기체 유량 "gas__<단위>", 농도 "conc__<단위>"
const calcUcKey = (dim, unit) => `${dim}__${unit}`;

function calcUcRowTerm(kind, dim, unit) {
  if (dim === "pressure_ag") return CALC_UNITS.pressure_ag[unit].gauge ? "gauge_pressure" : "absolute_pressure";
  return (CALC_UC_KINDS.find(k => k.dim === dim) || kind).term;
}

function calcUcTableOutputs() {
  return CALC_UC_TABLE_KINDS.flatMap(k => Object.entries(CALC_UNITS[k.dim]).map(([u, x]) => ({
    key: calcUcKey(k.dim, u), label: x.label, unit: "—", digits: 6, term: calcUcRowTerm(k, k.dim, u),
  })));
}

// 표 하나의 모든 단위로(절대 기준값 → 각 단위). 게이지 단위는 현지 대기압 patm 을 뺀다.
function calcUcRows(dim, base, patm) {
  const out = {};
  Object.entries(CALC_UNITS[dim]).forEach(([u, x]) => {
    out[calcUcKey(dim, u)] = x.gauge ? (base - patm) / x.f : calcConvert(dim, base, calcUcBase(dim), u);
  });
  return out;
}

function calcUcGasParams(v) {
  return { mw: v.mw, sref: v.sref, Tg: v.Tg, Pg: v.Pg, Z: v.Z };
}

function calcUcGas(v) {
  const p = calcUcGasParams(v);
  const n = calcGasToKmolh(v.gx, v.gu, p);
  const out = { gas_basis: CALC_GAS_REFS[v.sref].label };
  CALC_GAS_FLOW_UNITS.forEach(u => { out[`gas__${u.v}`] = calcGasFromKmolh(n, u.v, p); });
  out.gas_rho_n = v.mw / calcGasMolarVolume(calcGasBasis(CALC_GAS_FLOW_UNITS[0], p));
  return out;
}

function calcUcConc(v) {
  const vm = calcMolarVolumeL(v.Tg, v.Pg);
  const ppm = calcConcToPpm(v.cx, v.cu, v.mw, vm);
  const out = { conc_vm: vm };
  CALC_GAS_CONC_UNITS.forEach(u => { out[`conc__${u.v}`] = calcConcFromPpm(ppm, u.v, v.mw, vm); });
  const warnings = ppm > 1e6 ? [tr("100 vol% 를 넘는 농도입니다. 입력을 확인하십시오.", "The concentration exceeds 100 vol%. Check the input.")] : [];
  return { ...out, warnings };
}

function calcUcCompute(v, ctx = {}) {
  const k = CALC_UC_KINDS.find(x => x.v === v.kind);
  if (k.gas) return calcUcGas(v);
  if (k.conc) return calcUcConc(v);
  const field = `x_${k.v}`;
  let base = v[field];
  if (k.dim === "pressure_ag") {
    const chosen = CALC_UNITS.pressure_ag[ctx.units?.[field]];
    if (chosen?.gauge) base = base - chosen.o + v.patm;     // 표준 대기압 대신 현지 대기압 기준
    if (base < 0) return { error: tr("절대 압력이 0 보다 작습니다(완전 진공 아래). 게이지 값과 대기압을 확인하십시오.", "Absolute pressure is below zero (below perfect vacuum). Check the gauge value and atmospheric pressure.") };
  }
  const out = calcUcRows(k.dim, base, v.patm);
  if (k.cross && v.rho) {
    const other = k.dim === "viscosity" ? base / v.rho : base * v.rho;    // ν = μ / ρ
    Object.assign(out, calcUcRows(k.cross, other, v.patm));
  }
  return out;
}

const CALC_DEF_UNITS = {
  key: "units",
  group: "basic",
  title: tr("공학 단위 변환기", "Engineering unit converter"),
  summary: tr("값 하나를 그 물리량의 모든 단위로 한 번에 바꿉니다. 게이지·절대 압력, Nm³/h ↔ Sm³/h ↔ kg/h ↔ kmol/h(기준 조건·분자량), kcal ↔ kW, cP ↔ cSt, ppm ↔ mg/m³ 까지 다룹니다.",
    "Converts one value into every unit of its quantity at once — including gauge/absolute pressure, Nm³/h ↔ Sm³/h ↔ kg/h ↔ kmol/h (reference conditions and molar mass), kcal ↔ kW, cP ↔ cSt and ppm ↔ mg/m³."),
  inputs: [
    { key: "kind", type: "choice", term: "unit_conversion", label: tr("물리량", "Quantity"), default: "pressure",
      options: CALC_UC_KINDS.map(k => ({ v: k.v, label: k.label })) },
    ...CALC_UC_TABLE_KINDS.map(k => ({
      key: `x_${k.v}`, term: k.term, label: tr("바꿀 값", "Value to convert"), dim: k.dim, unit: calcUcBase(k.dim), show: k.show,
      default: k.def, min: k.min, when: calcUcIs(k.v),
    })),
    { key: "patm", term: "atmospheric_pressure", label: tr("현지 대기압", "Local atmospheric pressure"), dim: "pressure", unit: "Pa", show: "kPa", default: 101.325,
      positive: true, when: calcUcIs("pressure"), hint: tr("게이지(g) 값의 0 점. 해수면 표준 101.325 kPa", "Zero point of gauge (g) values. Sea-level standard 101.325 kPa") },
    { key: "rho", term: "density", label: tr("밀도 ρ (넣으면 점도 ↔ 동점도)", "Density ρ (enables viscosity ↔ kinematic)"), dim: "density", unit: "kgm3", show: "kgm3",
      default: 998.2, positive: true, optional: true, when: calcUcIs("viscosity", "kinviscosity"), hint: tr("기본값은 20 °C 물. 비우면 같은 종류 단위만", "Default is water at 20 °C. Leave empty for the same kind only") },
    { key: "gu", type: "choice", term: "normal_m3", label: tr("입력 단위", "Input unit"), default: "Nm3h", when: calcUcIs("gasflow"),
      options: CALC_GAS_FLOW_UNITS.map(u => ({ v: u.v, label: u.label })) },
    { key: "gx", term: "molar_flow", label: tr("기체 유량 (위에서 고른 단위)", "Gas flow (in the unit chosen above)"), unit: "", default: 1000, min: 0, when: calcUcIs("gasflow") },
    { key: "cu", type: "choice", term: "ppm", label: tr("입력 단위", "Input unit"), default: "ppm", when: calcUcIs("conc"),
      options: CALC_GAS_CONC_UNITS.map(u => ({ v: u.v, label: u.label })) },
    { key: "cx", term: "mgm3", label: tr("농도 (위에서 고른 단위)", "Concentration (in the unit chosen above)"), unit: "", default: 1, min: 0, when: calcUcIs("conc") },
    { key: "mw", term: "molar_mass", label: tr("분자량 M", "Molar mass M"), unit: "g/mol", default: 16.043, positive: true, when: calcUcIs("gasflow", "conc"),
      hint: tr("기본값은 메탄(16.043) 예시. 공기 28.966", "Default is methane (16.043) as an example. Air 28.966") },
    { key: "sref", type: "choice", term: "reference_conditions", label: tr("Sm³ 기준 조건", "Sm³ reference conditions"), default: "s15", when: calcUcIs("gasflow"),
      options: ["s15", "s20", "s60f"].map(r => ({ v: r, label: CALC_GAS_REFS[r].label })) },
    { key: "Tg", term: "absolute_temperature", label: tr("기체 온도 T (실제 조건)", "Gas temperature T (actual)"), dim: "temperature", unit: "K", show: "C", default: 25,
      positive: true, when: calcUcIs("gasflow", "conc") },
    { key: "Pg", term: "absolute_pressure", label: tr("기체 압력 P (절대, 실제 조건)", "Gas pressure P (absolute, actual)"), dim: "pressure", unit: "Pa", show: "kPa", default: 101.325,
      positive: true, when: calcUcIs("gasflow", "conc") },
    { key: "Z", term: "compressibility", label: tr("압축인자 Z (실제 조건)", "Compressibility Z (actual)"), unit: "—", default: 1, positive: true, when: calcUcIs("gasflow"),
      hint: tr("Am³/h 에만 씁니다. 표준 체적은 이상기체(Z = 1) 정의", "Used for Am³/h only. Standard volumes are defined for an ideal gas (Z = 1)") },
  ],
  outputs: [
    ...calcUcTableOutputs(),
    ...CALC_GAS_FLOW_UNITS.map(u => ({ key: `gas__${u.v}`, label: u.label, unit: "—", digits: 6, term: u.term })),
    { key: "gas_basis", term: "reference_conditions", label: tr("Sm³ 기준", "Sm³ basis"), type: "text" },
    { key: "gas_rho_n", term: "density", label: tr("표준 밀도 (0 °C, 101.325 kPa)", "Normal density (0 °C, 101.325 kPa)"), unit: "kg/Nm³", digits: 5 },
    ...CALC_GAS_CONC_UNITS.map(u => ({ key: `conc__${u.v}`, label: u.label, unit: "—", digits: 6, term: u.term })),
    { key: "conc_vm", term: "molar_volume", label: tr("사용한 몰부피 Vm = R·T/P", "Molar volume used, Vm = R·T/P"), unit: "L/mol", digits: 5 },
  ],
  keywords: ["barg", "bara", "psig", "psia", "kgf/cm²", "Nm³/h", "Nm3/h", "Sm³/h", "Sm3/h", "SCFM", "MMSCFD", "kcal/h", "cSt", "Btu"],
  compute: calcUcCompute,
  formula: [
    tr("값[목표] = (값 · f[원래] + o[원래] − o[목표]) / f[목표]   (f 배율, o 는 온도·게이지 압력의 0 점)", "value[to] = (value · f[from] + o[from] − o[to]) / f[to]   (f scale, o zero offset for temperature and gauge pressure)"),
    "P(a) = P(g) + P_atm",
    tr("n = P·V / (Z·R·T) — Nm³: 0 °C·101.325 kPa, SCF: 60 °F·14.696 psia, Sm³: 고른 기준", "n = P·V / (Z·R·T) — Nm³: 0 °C, 101.325 kPa; SCF: 60 °F, 14.696 psia; Sm³: chosen basis"),
    "ṁ = n · M,   ν = μ / ρ",
    "mg/m³ = ppm · M / Vm,   Vm = R·T / P",
  ],
  notes: [
    tr("온도는 눈금 값(점)을 바꿉니다. 온도 차이는 1 K = 1 °C = 1.8 °F 입니다.", "Temperature converts scale readings (points). For temperature differences, 1 K = 1 °C = 1.8 °F."),
    tr("게이지 압력(g)은 현지 대기압을 0 으로 잰 값입니다. 진공(음의 게이지 값)도 넣을 수 있습니다.", "Gauge pressure (g) is measured from local atmospheric pressure. Vacuum (negative gauge values) is allowed."),
    tr("Nm³·Sm³ 의 기준 조건은 회사·나라마다 다릅니다(일부는 Nm³ 를 20 °C 로 씁니다). 계약서·설계 기준의 정의를 확인하십시오.", "Reference conditions for Nm³ and Sm³ differ between companies and countries (some use 20 °C for Nm³). Check the definition in the contract or design basis."),
    tr("cal·kcal·Btu 는 국제표(IT) 값입니다(1 cal = 4.1868 J). 열화학 칼로리(4.184 J)와 0.06 % 다릅니다.", "cal, kcal and Btu are International Table (IT) values (1 cal = 4.1868 J), 0.06 % different from the thermochemical calorie (4.184 J)."),
    tr("농도 환산은 공기 중 기체·증기에만 씁니다. 노출기준 관례값(24.45 L/mol)으로 바꾸려면 'ppm ↔ mg/m³ 환산' 계산기를 쓰십시오.", "Concentration conversion applies to gases and vapours in air only. To use the exposure-limit convention (24.45 L/mol), use the 'ppm ↔ mg/m³ conversion' calculator."),
  ],
  reference: [
    tr("NIST Special Publication 811 (2008), Guide for the Use of the International System of Units (SI), 부록 B.8·B.9 환산 계수", "NIST Special Publication 811 (2008), Guide for the Use of the International System of Units (SI), Appendix B.8 and B.9 conversion factors"),
    tr("CODATA 2018 기본 상수 — 기체 상수 R = 8.314 462 618 J/(mol·K), 이상기체 몰부피 22.413 969 54 L/mol (273.15 K, 101.325 kPa)", "CODATA 2018 fundamental constants — gas constant R = 8.314 462 618 J/(mol·K), ideal-gas molar volume 22.413 969 54 L/mol (273.15 K, 101.325 kPa)"),
    tr("DIN 1343:1990 표준 상태(0 °C, 101.325 kPa) — Nm³ 기준", "DIN 1343:1990 reference conditions (0 °C, 101.325 kPa) — basis of Nm³"),
    tr("ISO 13443:1996 천연가스 표준 기준 조건(15 °C, 101.325 kPa)", "ISO 13443:1996 Natural gas — standard reference conditions (15 °C, 101.325 kPa)"),
    tr("GPSA Engineering Data Book, 1절 — 이상기체 379.49 scf/lb-mol (60 °F, 14.696 psia)", "GPSA Engineering Data Book, Sec. 1 — ideal gas 379.49 scf/lb-mol (60 °F, 14.696 psia)"),
  ],
};

Object.assign(window, { CALC_DEF_UNITS, CALC_UC_KINDS, calcUcBase, calcUcRows, calcUcCompute });
