// 공학 계산기 — 단위 환산표와 물리 상수(데이터만). 계산기 정의(calc_<이름>.jsx)는 입력·출력의 "기준 단위"만 적고,
// 화면에서 고른 단위 ↔ 기준 단위 환산은 여기 표로 한다. 환산: 기준값 = 값 × f + o (o 는 온도·게이지 압력만 쓴다).
// 근거: NIST SP 811 (2008) "Guide for the Use of the International System of Units", 부록 B 환산 계수(cal·Btu 는 IT 값).
// 공학 단위 변환기(calc_units_converter.jsx, key units)가 이 표를 그대로 보여 준다 — 단위를 더하면 변환기에도 나온다.

const CALC_UNITS = {
  pressure: {
    Pa: { label: "Pa", f: 1 },
    kPa: { label: "kPa", f: 1e3 },
    MPa: { label: "MPa", f: 1e6 },
    bar: { label: "bar", f: 1e5 },
    atm: { label: "atm", f: 101325 },
    psi: { label: "psi", f: 6894.757293168 },
    mmHg: { label: "mmHg", f: 133.322387415 },
    kgcm2: { label: "kgf/cm²", f: 98066.5 },
    mmH2O: { label: "mmH₂O", f: 9.80665 },
    inH2O: { label: "inH₂O", f: 249.0889 },
  },
  temperature: {
    K: { label: "K", f: 1, o: 0 },
    C: { label: "°C", f: 1, o: 273.15 },
    F: { label: "°F", f: 5 / 9, o: 459.67 * 5 / 9 },
    R: { label: "°R", f: 5 / 9, o: 0 },
  },
  mass: {
    kg: { label: "kg", f: 1 },
    g: { label: "g", f: 1e-3 },
    mg: { label: "mg", f: 1e-6 },
    t: { label: tr("t (톤)", "t (tonne)"), f: 1000 },
    lb: { label: "lb", f: 0.45359237 },
    oz: { label: "oz", f: 0.028349523125 },
    ston: { label: tr("short ton (미국 톤)", "short ton (US)"), f: 907.18474 },
  },
  length: {
    m: { label: "m", f: 1 },
    cm: { label: "cm", f: 1e-2 },
    mm: { label: "mm", f: 1e-3 },
    in: { label: "in", f: 0.0254 },
    ft: { label: "ft", f: 0.3048 },
    km: { label: "km", f: 1e3 },
    mi: { label: "mi", f: 1609.344 },
  },
  area: {
    m2: { label: "m²", f: 1 },
    cm2: { label: "cm²", f: 1e-4 },
    ft2: { label: "ft²", f: 0.09290304 },
    mm2: { label: "mm²", f: 1e-6 },
    in2: { label: "in²", f: 6.4516e-4 },
  },
  volume: {
    m3: { label: "m³", f: 1 },
    L: { label: "L", f: 1e-3 },
    mL: { label: "mL", f: 1e-6 },
    ft3: { label: "ft³", f: 0.028316846592 },
    gal: { label: "gal (US)", f: 3.785411784e-3 },
  },
  flow: {
    m3s: { label: "m³/s", f: 1 },
    m3min: { label: "m³/min", f: 1 / 60 },
    m3h: { label: "m³/h", f: 1 / 3600 },
    Ls: { label: "L/s", f: 1e-3 },
    Lmin: { label: "L/min", f: 1e-3 / 60 },
    cfm: { label: "ft³/min (cfm)", f: 0.028316846592 / 60 },
    gpm: { label: "gal/min (US)", f: 3.785411784e-3 / 60 },
    m3d: { label: "m³/d", f: 1 / 86400 },
    Lh: { label: "L/h", f: 1e-3 / 3600 },
    bbld: { label: "bbl/d (42 US gal)", f: 0.158987294928 / 86400 },
  },
  molarflow: {
    mols: { label: "mol/s", f: 1 },
    molh: { label: "mol/h", f: 1 / 3600 },
    kmols: { label: "kmol/s", f: 1000 },
    kmolh: { label: "kmol/h", f: 1000 / 3600 },
    lbmolh: { label: "lbmol/h", f: 453.59237 / 3600 },
  },
  massflow: {
    kgs: { label: "kg/s", f: 1 },
    kgh: { label: "kg/h", f: 1 / 3600 },
    gs: { label: "g/s", f: 1e-3 },
    gmin: { label: "g/min", f: 1e-3 / 60 },
    mgmin: { label: "mg/min", f: 1e-6 / 60 },
    lbh: { label: "lb/h", f: 0.45359237 / 3600 },
    kgmin: { label: "kg/min", f: 1 / 60 },
    th: { label: "t/h", f: 1000 / 3600 },
    td: { label: "t/d", f: 1000 / 86400 },
    lbs: { label: "lb/s", f: 0.45359237 },
    lbmin: { label: "lb/min", f: 0.45359237 / 60 },
  },
  power: {
    W: { label: "W", f: 1 },
    kW: { label: "kW", f: 1e3 },
    MW: { label: "MW", f: 1e6 },
    hp: { label: tr("hp (기계)", "hp (mech.)"), f: 745.69987158227 },
    kcalh: { label: "kcal/h", f: 4186.8 / 3600 },
    btuh: { label: "Btu/h", f: 1055.05585262 / 3600 },
    ps: { label: tr("PS (불마력)", "PS (metric hp)"), f: 735.49875 },
    Mcalh: { label: "Mcal/h", f: 4186.8e3 / 3600 },
    MMbtuh: { label: "MMBtu/h", f: 1055.05585262e6 / 3600 },
    rt: { label: tr("RT (미국 냉동톤)", "RT (US refrigeration ton)"), f: 12000 * 1055.05585262 / 3600 },
  },
  energy: {
    J: { label: "J", f: 1 },
    kJ: { label: "kJ", f: 1e3 },
    MJ: { label: "MJ", f: 1e6 },
    GJ: { label: "GJ", f: 1e9 },
    kWh: { label: "kWh", f: 3.6e6 },
    cal: { label: "cal (IT)", f: 4.1868 },
    kcal: { label: "kcal (IT)", f: 4186.8 },
    Mcal: { label: "Mcal (IT)", f: 4186.8e3 },
    btu: { label: "Btu (IT)", f: 1055.05585262 },
    MMbtu: { label: "MMBtu", f: 1055.05585262e6 },
  },
  heatflux: {
    Wm2: { label: "W/m²", f: 1 },
    kWm2: { label: "kW/m²", f: 1e3 },
    kcalhm2: { label: "kcal/(h·m²)", f: 4186.8 / 3600 },
    btuhft2: { label: "Btu/(h·ft²)", f: 1055.05585262 / 3600 / 0.09290304 },
  },
  conductivity: {
    WmK: { label: "W/(m·K)", f: 1 },
    kcalhmC: { label: "kcal/(h·m·°C)", f: 4186.8 / 3600 },
    calscmC: { label: "cal/(s·cm·°C)", f: 4.1868 / 1e-2 },
    btuhftF: { label: "Btu/(h·ft·°F)", f: 1055.05585262 / 3600 / 0.3048 / (5 / 9) },
  },
  htc: {
    Wm2K: { label: "W/(m²·K)", f: 1 },
    kWm2K: { label: "kW/(m²·K)", f: 1e3 },
    kcalhm2C: { label: "kcal/(h·m²·°C)", f: 4186.8 / 3600 },
    btuhft2F: { label: "Btu/(h·ft²·°F)", f: 1055.05585262 / 3600 / 0.09290304 / (5 / 9) },
  },
  velocity: {
    ms: { label: "m/s", f: 1 },
    fts: { label: "ft/s", f: 0.3048 },
  },
  density: {
    kgm3: { label: "kg/m³", f: 1 },
    gcm3: { label: "g/cm³", f: 1000 },
    lbft3: { label: "lb/ft³", f: 16.01846337 },
    lbgal: { label: "lb/gal (US)", f: 0.45359237 / 3.785411784e-3 },
  },
  time: {
    s: { label: "s", f: 1 },
    min: { label: "min", f: 60 },
    h: { label: "h", f: 3600 },
  },
  rate: {
    per_s: { label: "1/s", f: 1 },
    per_min: { label: "1/min", f: 1 / 60 },
    per_h: { label: "1/h", f: 1 / 3600 },
  },
  viscosity: {
    Pas: { label: "Pa·s", f: 1 },
    cP: { label: "cP (mPa·s)", f: 1e-3 },
    P: { label: "P (poise)", f: 0.1 },
    lbfts: { label: "lb/(ft·s)", f: 0.45359237 / 0.3048 },
    lbfth: { label: "lb/(ft·h)", f: 0.45359237 / 0.3048 / 3600 },
  },
  kinviscosity: {
    m2s: { label: "m²/s", f: 1 },
    cSt: { label: "cSt (mm²/s)", f: 1e-6 },
    St: { label: "St (stokes)", f: 1e-4 },
    m2h: { label: "m²/h", f: 1 / 3600 },
    ft2s: { label: "ft²/s", f: 0.09290304 },
  },
  // 증기표·습공기(calc_steam*.jsx·calc_psychro.jsx): 비엔탈피·비내부에너지 / 비엔트로피·비열 / 비체적 / 온도 차(간격)
  spenergy: {
    Jkg: { label: "J/kg", f: 1 },
    kJkg: { label: "kJ/kg", f: 1e3 },
    kcalkg: { label: "kcal/kg", f: 4186.8 },
    btulb: { label: "Btu/lb", f: 2326 },
  },
  spentropy: {
    JkgK: { label: "J/(kg·K)", f: 1 },
    kJkgK: { label: "kJ/(kg·K)", f: 1e3 },
    kcalkgK: { label: "kcal/(kg·K)", f: 4186.8 },
    btulbR: { label: "Btu/(lb·°R)", f: 4186.8 },
  },
  spvolume: {
    m3kg: { label: "m³/kg", f: 1 },
    Lkg: { label: "L/kg", f: 1e-3 },
    cm3g: { label: "cm³/g", f: 1e-3 },
    ft3lb: { label: "ft³/lb", f: 0.028316846592 / 0.45359237 },
  },
  tempdiff: {
    K: { label: "K", f: 1 },
    C: { label: "°C", f: 1 },
    F: { label: "°F", f: 5 / 9 },
  },
};

// 절대·게이지 압력(공학 단위 변환기 units 전용 — 압력 차이(ΔP)에 쓰는 pressure 표에는 게이지를 넣지 않는다).
// 배율은 위 pressure 표에서 그대로 읽고, 게이지(g)는 표준 대기압(o = 101 325 Pa)을 더해 절대로 바꾼다. 현지 대기압 보정은 계산기가 한다.
CALC_UNITS.pressure_ag = (() => {
  const P = CALC_UNITS.pressure, atm = P.atm.f;
  const a = (k, label) => ({ label, f: P[k].f });
  const g = (k, label) => ({ label, f: P[k].f, o: atm, gauge: true });
  return {
    kPa: a("kPa", "kPa(a)"), kPag: g("kPa", "kPa(g)"),
    MPa: a("MPa", "MPa(a)"), MPag: g("MPa", "MPa(g)"),
    bara: a("bar", "bar(a)"), barg: g("bar", "bar(g)"),
    kgcm2a: a("kgcm2", "kgf/cm²(a)"), kgcm2g: g("kgcm2", "kgf/cm²(g)"),
    psia: a("psi", "psia"), psig: g("psi", "psig"),
    atm: a("atm", "atm"), mmHg: a("mmHg", "mmHg(a)"),
    mmH2Og: g("mmH2O", "mmH₂O(g)"), Pa: a("Pa", "Pa(a)"),
  };
})();

// 물리 상수 — 값은 여기 한 곳. R 은 CODATA 2018(정의값에서 유도), g 는 표준 중력가속도(CGPM 1901).
const CALC_CONST = {
  R: 8.314462618,          // J/(mol·K)
  g: 9.80665,              // m/s²
  atm: 101325,             // Pa
  vm25: 24.45,             // L/mol — 25 °C·1 atm 관례값(ACGIH TLV 책자·NIOSH Pocket Guide 환산식)
  o2Air: 0.2095,           // 건조 공기 중 O₂ 몰분율(Crowl & Louvar 식 6-11 의 4.773 = 1/0.2095)
  mAir: 28.966,            // g/mol — 건조 공기 몰질량(ASHRAE Handbook Fundamentals 2017, 1장)
  mWater: 18.015268,       // g/mol — 물(ASHRAE 2017, 1장. 0.621945 = 18.015268 / 28.966)
};

function calcUnit(dim, unit) {
  const u = CALC_UNITS[dim]?.[unit];
  if (!u) throw new Error(tr(`단위 표에 없음: ${dim}/${unit}`, `Unit not in table: ${dim}/${unit}`));
  return u;
}

// 화면 단위 → 기준 단위. 두 단위 모두 같은 차원(dim) 표에 있어야 한다.
function calcConvert(dim, value, from, to) {
  if (from === to) return value;
  const a = calcUnit(dim, from);
  const b = calcUnit(dim, to);
  const base = value * a.f + (a.o || 0);
  return (base - (b.o || 0)) / b.f;
}

function calcUnitLabel(dim, unit) {
  return dim ? calcUnit(dim, unit).label : (unit || "");
}

Object.assign(window, { CALC_UNITS, CALC_CONST, calcConvert, calcUnitLabel, calcUnit });
