// 계산기: 연소 배가스 분석 — CₘHₓO_yS_sN_n 연료와 과잉 공기 → 습·건 배가스 조성, 측정 O₂·CO₂ → 과잉 공기율, 물·황산 이슬점, 배가스 손실(1. BImSchV).
// 이론 산소·공기량·연소 한계는 calc_stoich_air.jsx(key "stoich_air") — 여기서는 배가스 쪽만 다룬다. 순수 함수(React 없음).

// 1. BImSchV(2010) Anlage 2 Nr. 3.4.1 배가스 손실 계수 — 독일 법령(저작권 없음, §5 UrhG)
const CALC_FLUE_SIEGERT = {
  oil: { A: 0.68, B: 0.007, label: tr("경유(Heizöl EL)·식물성 기름", "Fuel oil EL · vegetable oils") },
  gas: { A: 0.66, B: 0.009, label: tr("도시가스(공공 가스 공급)", "Natural gas (public gas supply)") },
  coke: { A: 0.60, B: 0.011, label: tr("코크스로 가스", "Coke-oven gas") },
  lpg: { A: 0.63, B: 0.008, label: tr("LPG·LPG-공기 혼합", "LPG · LPG–air mixtures") },
};

// 연료 1 mol 기준 수지. e = 과잉 공기율(소수). 반환: 성분 몰수와 건·습 합
function calcFlueBalance(f, e) {
  const o2Air = CALC_CONST.o2Air;
  const z = f.m + f.x / 4 + f.s - f.y / 2;
  const O2fed = z * (1 + e);
  const inert = O2fed * (1 - o2Air) / o2Air;   // N₂ + Ar
  const mol = { CO2: f.m, H2O: f.x / 2, SO2: f.s, O2: z * e, N2: inert + f.n / 2 };
  const dry = mol.CO2 + mol.SO2 + mol.O2 + mol.N2;
  return { z, mol, dry, wet: dry + mol.H2O, air: O2fed / o2Air };
}
// 건조 O₂ 분율 → e: o = z e / (A + B(1+e) + z e),  A = m + s + n/2, B = z(1 − 0.2095)/0.2095
function calcFlueExcessFromO2(f, o) {
  const z = f.m + f.x / 4 + f.s - f.y / 2;
  const A = f.m + f.s + f.n / 2;
  const B = z * (1 - CALC_CONST.o2Air) / CALC_CONST.o2Air;
  const den = z * (1 - o) - o * B;
  return den > 0 ? o * (A + B) / den : null;
}
// 건조 CO₂ 분율 → e: c = m / (A + B(1+e) + z e)
function calcFlueExcessFromCo2(f, c) {
  const z = f.m + f.x / 4 + f.s - f.y / 2;
  const A = f.m + f.s + f.n / 2;
  const B = z * (1 - CALC_CONST.o2Air) / CALC_CONST.o2Air;
  return (f.m / c - A - B) / (B + z);
}
// 황산 이슬점 — Verhoff & Banchero(1974): 1000/T = 2.276 − 0.0294 ln pH₂O − 0.0858 ln pSO₃ + 0.0062 ln pH₂O ln pSO₃ (p mmHg, T K)
function calcAcidDewPoint(pH2O_Pa, pSO3_Pa) {
  const mm = CALC_UNITS.pressure.mmHg.f;
  const a = Math.log(pH2O_Pa / mm), b = Math.log(pSO3_Pa / mm);
  return 1000 / (2.276 - 0.0294 * a - 0.0858 * b + 0.0062 * a * b);
}

function calcFlueFuel(v) {
  return { m: v.m, x: v.x, y: v.y, s: v.s, n: v.n };
}

function calcFlueChart(v, out) {
  const f = calcFlueFuel(v);
  const pts = calcChartRange(0, 2, 40).map(e => {
    const b = calcFlueBalance(f, e);
    return [100 * e, 100 * b.mol.O2 / b.dry, 100 * b.mol.CO2 / b.dry];
  });
  return {
    x: { label: tr("과잉 공기율", "Excess air"), unit: "%", min: 0 },
    y: { label: tr("건조 배가스 농도", "Dry flue gas concentration"), unit: "vol%", min: 0 },
    series: [
      { key: "o2", label: "O₂", points: pts.map(p => [p[0], p[1]]) },
      { key: "co2", label: "CO₂", points: pts.map(p => [p[0], p[2]]) },
    ],
    vlines: [{ x: out.excess, label: tr("계산점", "Result") }],
    ariaLabel: tr("과잉 공기율에 따른 건조 배가스 O₂·CO₂", "Dry flue gas O₂ and CO₂ versus excess air"),
  };
}

const CALC_DEF_FLUE_GAS = {
  key: "flue_gas",
  group: "reaction",
  title: tr("연소 배가스 분석 (조성 · 과잉 공기 · 이슬점 · 배가스 손실)", "Flue gas analysis (composition · excess air · dew point · stack loss)"),
  summary: tr("연료 분자식과 과잉 공기율로 습·건 배가스 조성을, 또는 측정한 건조 O₂·CO₂ 로 과잉 공기율을 구합니다. 수증기·황산 이슬점과 배가스 손실(1. BImSchV 식)도 보입니다. 이론 공기량·연소 한계는 \"이론 공기량\" 계산기에 있습니다.",
    "Gives wet and dry flue gas composition from the fuel formula and excess air, or the excess air from measured dry O₂ or CO₂. Also shows the water and sulfuric acid dew points and the stack loss (1. BImSchV formula). Stoichiometric air and flammable limits are in the \"Stoichiometric air\" calculator."),
  inputs: [
    { key: "m", label: tr("탄소 원자 수 m", "Carbon atoms m"), unit: tr("C 개수", "C atoms"), default: 1, min: 0, hint: tr("기본값은 메탄 CH₄", "Default is methane CH₄") },
    { key: "x", label: tr("수소 원자 수 x", "Hydrogen atoms x"), unit: tr("H 개수", "H atoms"), default: 4, min: 0 },
    { key: "y", label: tr("산소 원자 수 y", "Oxygen atoms y"), unit: tr("O 개수", "O atoms"), default: 0, min: 0 },
    { key: "s", label: tr("황 원자 수 s", "Sulfur atoms s"), unit: tr("S 개수", "S atoms"), default: 0, min: 0 },
    { key: "n", label: tr("질소 원자 수 (연료)", "Nitrogen atoms (fuel)"), unit: tr("N 개수", "N atoms"), default: 0, min: 0 },
    { key: "mode", type: "choice", label: tr("알고 있는 값", "Known value"), default: "excess",
      options: [
        { v: "excess", label: tr("과잉 공기율", "Excess air") },
        { v: "o2", label: tr("측정 O₂ (건조)", "Measured O₂ (dry)") },
        { v: "co2", label: tr("측정 CO₂ (건조)", "Measured CO₂ (dry)") },
      ] },
    { key: "excess", label: tr("과잉 공기율", "Excess air"), term: "excess_air", unit: "%", default: 10, min: 0, max: 1000, when: c => c.mode === "excess" },
    { key: "o2m", label: tr("측정 O₂ (건조 기준)", "Measured O₂ (dry basis)"), term: "fg_dry_basis", unit: "vol%", default: 3, min: 0, max: 20.9, when: c => c.mode === "o2" },
    { key: "co2m", label: tr("측정 CO₂ (건조 기준)", "Measured CO₂ (dry basis)"), term: "fg_dry_basis", unit: "vol%", default: 9.5, positive: true, max: 100, when: c => c.mode === "co2" },
    { key: "P", label: tr("배가스 압력 (절대)", "Flue gas pressure (absolute)"), term: "absolute_pressure", dim: "pressure", unit: "Pa", show: "kPa", default: 101.325, positive: true },
    { key: "so3", label: tr("SO₂ → SO₃ 전환 비율", "SO₂ → SO₃ conversion"), unit: "%", default: 2, positive: true, max: 100,
      hint: tr("가정값 — 황이 있을 때만 씀", "Assumed value — used only when the fuel has sulfur") },
    { key: "fuel", type: "choice", label: tr("배가스 손실 계수 (연료)", "Stack-loss coefficients (fuel)"), term: "fg_stack_loss", default: "gas",
      options: Object.entries(CALC_FLUE_SIEGERT).map(([k, s]) => ({ v: k, label: s.label })) },
    { key: "tA", label: tr("배가스 온도", "Flue gas temperature"), dim: "temperature", unit: "K", show: "C", default: 180, positive: true },
    { key: "tL", label: tr("연소 공기 온도", "Combustion air temperature"), dim: "temperature", unit: "K", show: "C", default: 20, positive: true },
  ],
  outputs: [
    { key: "excess", label: tr("과잉 공기율", "Excess air"), term: "excess_air", unit: "%", digits: 4 },
    { key: "lambda", label: tr("공기비 λ", "Air ratio λ"), unit: "—", digits: 4 },
    { key: "air", label: tr("공급 공기량", "Air supplied"), unit: tr("mol 공기 / mol 연료", "mol air / mol fuel"), digits: 4 },
    { key: "co2d", label: tr("CO₂ (건조)", "CO₂ (dry)"), term: "fg_dry_basis", unit: "vol%", digits: 4 },
    { key: "o2d", label: tr("O₂ (건조)", "O₂ (dry)"), unit: "vol%", digits: 4 },
    { key: "so2d", label: tr("SO₂ (건조)", "SO₂ (dry)"), unit: "ppmv", digits: 4 },
    { key: "n2d", label: tr("N₂ + Ar (건조)", "N₂ + Ar (dry)"), unit: "vol%", digits: 4 },
    { key: "co2w", label: tr("CO₂ (습)", "CO₂ (wet)"), unit: "vol%", digits: 4 },
    { key: "h2ow", label: tr("H₂O (습)", "H₂O (wet)"), unit: "vol%", digits: 4 },
    { key: "o2w", label: tr("O₂ (습)", "O₂ (wet)"), unit: "vol%", digits: 4 },
    { key: "dryMol", label: tr("건조 배가스량", "Dry flue gas"), unit: tr("mol / mol 연료", "mol / mol fuel"), digits: 4 },
    { key: "wetMol", label: tr("습 배가스량", "Wet flue gas"), unit: tr("mol / mol 연료", "mol / mol fuel"), digits: 4 },
    { key: "Tdew", label: tr("수증기 이슬점", "Water dew point"), term: "dew_point", dim: "temperature", unit: "K", show: "C", digits: 4 },
    { key: "Tacid", label: tr("황산 이슬점 (Verhoff–Banchero)", "Sulfuric acid dew point (Verhoff–Banchero)"), term: "fg_acid_dew_point", dim: "temperature", unit: "K", show: "C", digits: 4 },
    { key: "qA", label: tr("배가스 손실 qA", "Stack loss qA"), term: "fg_stack_loss", unit: tr("% (연료 열량 대비)", "% (of fuel heat input)"), digits: 3 },
  ],
  compute(v) {
    const f = calcFlueFuel(v);
    const z = f.m + f.x / 4 + f.s - f.y / 2;
    if (!(f.m + f.x + f.s > 0) || !(z > 0)) return { error: tr("탄소·수소·황이 있고 필요 산소가 0 보다 커야 합니다.", "The fuel must contain C, H or S, and the oxygen required must be greater than 0.") };
    let e = v.mode === "excess" ? v.excess / 100 : v.mode === "o2" ? calcFlueExcessFromO2(f, v.o2m / 100) : calcFlueExcessFromCo2(f, v.co2m / 100);
    if (v.mode === "co2" && !(f.m > 0)) return { error: tr("탄소가 없는 연료는 CO₂ 로 과잉 공기율을 구할 수 없습니다.", "Excess air cannot be found from CO₂ for a fuel without carbon.") };
    if (e == null || !Number.isFinite(e) || e < -1e-9) return { error: tr("측정값이 이론 연소(과잉 공기 0 %)와 맞지 않습니다. 연료 조성·측정값을 확인하십시오.", "The measured value is inconsistent with complete combustion at 0 % excess air or more. Check the fuel and the measurement.") };
    e = Math.max(e, 0);
    const b = calcFlueBalance(f, e);
    const { mol } = b;
    const o2d = 100 * mol.O2 / b.dry;
    const pH2O = v.P * mol.H2O / b.wet;
    const out = {
      excess: 100 * e, lambda: 1 + e, air: b.air,
      co2d: 100 * mol.CO2 / b.dry, o2d, n2d: 100 * mol.N2 / b.dry, so2d: f.s > 0 ? 1e6 * mol.SO2 / b.dry : undefined,
      co2w: 100 * mol.CO2 / b.wet, h2ow: 100 * mol.H2O / b.wet, o2w: 100 * mol.O2 / b.wet,
      dryMol: b.dry, wetMol: b.wet, warnings: [],
    };
    if (pH2O >= CALC_IF97_RANGE.Pmin) out.Tdew = calcWaterTsat(pH2O);
    if (f.s > 0 && pH2O > 0) {
      const pSO3 = v.P * (mol.SO2 * v.so3 / 100) / b.wet;
      out.Tacid = calcAcidDewPoint(pH2O, pSO3);
      out.warnings.push(tr("황산 이슬점은 SO₃ 전환 비율 가정에 크게 좌우됩니다. 배가스 온도는 이보다 충분히 높게 유지합니다.", "The acid dew point depends strongly on the assumed SO₃ conversion. Keep the flue gas well above it."));
    }
    const sg = CALC_FLUE_SIEGERT[v.fuel];
    out.qA = (v.tA - v.tL) * (sg.A / (21 - o2d) + sg.B);
    if (out.Tdew && v.tA < out.Tdew) out.warnings.push(tr("배가스 온도가 수증기 이슬점보다 낮습니다(응축). 응축식 보일러에는 이 손실 식이 맞지 않습니다.", "The flue gas temperature is below the water dew point (condensing). The stack-loss formula does not apply to condensing boilers."));
    return out;
  },
  chart: calcFlueChart,
  formula: [
    "CₘHₓO_yS_sN_n + z(1+e) (O₂ + 3.773 N₂·Ar) → m CO₂ + (x/2) H₂O + s SO₂ + z e O₂ + …,   z = m + x/4 + s − y/2",
    tr("측정 O₂(건조) → e = o(A + B) / (z(1 − o) − oB),  A = m + s + n/2,  B = z·0.7905/0.2095", "Measured dry O₂ → e = o(A + B) / (z(1 − o) − oB),  A = m + s + n/2,  B = z·0.7905/0.2095"),
    tr("수증기 이슬점 = p_H₂O 에서 물의 포화 온도(IAPWS-IF97),  p_H₂O = y_H₂O(습) × P", "Water dew point = water saturation temperature at p_H₂O (IAPWS-IF97),  p_H₂O = y_H₂O(wet) × P"),
    tr("황산 이슬점: 1000/T = 2.276 − 0.0294 ln p_H₂O − 0.0858 ln p_SO₃ + 0.0062 ln p_H₂O ln p_SO₃  (mmHg, K)", "Acid dew point: 1000/T = 2.276 − 0.0294 ln p_H₂O − 0.0858 ln p_SO₃ + 0.0062 ln p_H₂O ln p_SO₃  (mmHg, K)"),
    "qA = (t_A − t_L) · (A / (21 − O₂) + B)   [%, °C, vol% O₂ dry]",
  ],
  notes: [
    tr("완전 연소·건조 공기(O₂ 20.95 %) 기준입니다. CO·NOx·미연분과 연소 공기의 습기는 넣지 않습니다.", "Assumes complete combustion and dry air (20.95 % O₂). CO, NOx, unburned fuel and humidity of the combustion air are not included."),
    tr("배가스 손실 식과 계수는 독일 1. BImSchV(2010) 부록 2 의 소형 연소 설비 측정 식입니다. 국내 법정 효율 시험을 대신하지 않습니다.", "The stack-loss formula and coefficients are the small-furnace measurement formula in Annex 2 of the German 1. BImSchV (2010). They do not replace a statutory efficiency test."),
    tr("메탄·과잉 공기 10 %: 건조 CO₂ 10.53 %·O₂ 2.105 %(손계산, 공기 O₂ 20.95 % 기준). 공기 O₂ 를 21 % 로 잡는 교재는 10.55 %·2.11 % 가 나옵니다.", "Methane at 10 % excess air: dry CO₂ 10.53 %, O₂ 2.105 % (hand calculation with 20.95 % O₂ in air). Textbooks using 21 % O₂ get 10.55 % and 2.11 %."),
  ],
  reference: [
    tr("Himmelblau, D.M. & Riggs, J.B., Basic Principles and Calculations in Chemical Engineering 8판(2012), 연소·과잉 공기 절", "Himmelblau, D.M. & Riggs, J.B., Basic Principles and Calculations in Chemical Engineering, 8th ed. (2012), combustion and excess air sections"),
    tr("Felder, R.M. & Rousseau, R.W., Elementary Principles of Chemical Processes 4판(2015), 4.8절 연소 반응", "Felder, R.M. & Rousseau, R.W., Elementary Principles of Chemical Processes, 4th ed. (2015), Sec. 4.8 combustion reactions"),
    "Verhoff, F.H. & Banchero, J.T. (1974). Predicting dew points of flue gases. Chem. Eng. Prog. 70(8), 71–72.",
    tr("Erste Verordnung zur Durchführung des Bundes-Immissionsschutzgesetzes (1. BImSchV, 2010), Anlage 2 Nr. 3.4.1 — 배가스 손실 식·계수. https://www.gesetze-im-internet.de/bimschv_1_2010/anlage_2.html", "Erste Verordnung zur Durchführung des Bundes-Immissionsschutzgesetzes (1. BImSchV, 2010), Anlage 2 No. 3.4.1 — stack-loss formula and coefficients. https://www.gesetze-im-internet.de/bimschv_1_2010/anlage_2.html"),
    tr("IAPWS R7-97(2012) — 물 포화 온도(수증기 이슬점)", "IAPWS R7-97(2012) — water saturation temperature (water dew point)"),
  ],
};

Object.assign(window, { CALC_DEF_FLUE_GAS, calcFlueBalance, calcFlueExcessFromO2, calcFlueExcessFromCo2, calcAcidDewPoint, CALC_FLUE_SIEGERT });
