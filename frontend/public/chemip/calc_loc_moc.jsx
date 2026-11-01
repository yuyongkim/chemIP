// 계산기: 최소 산소 농도(LOC/MOC) 어림·불활성화 목표·가연 범위 그림(직각삼각형 꼴 연소 범위 도표).
// 필요 산소 z·양론 농도는 이론 공기량 계산기(calc_stoich_air.jsx)의 calcStoichO2·calcStoichCst 를 쓴다.
// 도표는 x = 연료 vol%, y = O₂ vol% (나머지 = N₂), 연소 범위는 공기선 위 LFL·UFL 과 양론선 위 LOC 꼭지점을 잇는 어림(Crowl & Louvar 6장).

const CALC_LOC_Y_MAX = 25;   // 그림 세로축 O₂ 상한 vol%

function calcLocAirO2() { return 100 * CALC_CONST.o2Air; }

// LOC 꼭지점(양론선 위) → 퍼지 경로 끝점. nose = [연료 %, O₂ %]
// OSFC: 공기를 넣어도 연소 범위에 들지 않는 최대 연료 농도(N₂ 로 빼낼 때), ISOC: 연료를 넣어도 안전한 최대 O₂ 농도(N₂ 로 채울 때)
function calcLocPurgePoints(nose) {
  const a = calcLocAirO2();
  const [F, O] = nose;
  return { osfc: a * F / (a - O), isoc: 100 * O / (100 - F) };
}

function calcLocChart(v, out) {
  const a = calcLocAirO2();
  const ufl = out.uflUsed;
  const xMax = Math.min(100, Math.max(ufl, out.osfc, 10) * 1.15);
  const airAt = (F) => a * (1 - F / 100);
  const nose = [out.locUsed / out.z, out.locUsed];
  const stoichF = Math.min(xMax, CALC_LOC_Y_MAX / out.z);
  return {
    x: { label: tr("연료", "Fuel"), unit: "vol%", min: 0, max: xMax },
    y: { label: tr("산소", "Oxygen"), unit: "vol% O₂", min: 0, max: CALC_LOC_Y_MAX },
    series: [
      { key: "zone", label: tr("연소 범위 (어림)", "Flammable zone (approx.)"), kind: "line",
        points: [[out.lflUsed, airAt(out.lflUsed)], nose, [ufl, airAt(ufl)], [out.lflUsed, airAt(out.lflUsed)]] },
      { key: "air", label: tr("공기선 (연료 + 공기)", "Air line (fuel + air)"), points: [[0, a], [xMax, airAt(xMax)]] },
      { key: "stoich", label: tr("양론선", "Stoichiometric line"), dashed: true, points: [[0, 0], [stoichF, stoichF * out.z]] },
      { key: "osfc", label: tr("빼낼 때 경로 (OSFC → 공기)", "Out-of-service path (OSFC → air)"), dashed: true, points: [[out.osfc, 0], [0, a]] },
      { key: "isoc", label: tr("채울 때 경로 (ISOC → 연료)", "Into-service path (ISOC → fuel)"), dashed: true, points: [[0, out.isoc], [xMax, out.isoc * (1 - xMax / 100)]] },
    ],
    markers: [{ x: nose[0], y: nose[1], label: "LOC" }],
    hlines: [{ y: out.target, label: tr("관리 목표 O₂", "Target O₂") }],
    ariaLabel: tr("연소 범위 도표: 연료·산소 농도(나머지 질소)", "Flammability diagram: fuel and oxygen concentration (balance nitrogen)"),
  };
}

const CALC_DEF_LOC_MOC = {
  key: "loc_moc",
  group: "flammability",
  title: tr("최소 산소 농도(LOC) · 불활성화 목표", "Limiting oxygen concentration (LOC) · inerting target"),
  summary: tr("연료 조성과 연소 한계로 최소 산소 농도(LOC, MOC)를 어림하고, 여유를 뺀 관리 목표 O₂, 필요한 질소 희석량, 빼낼 때·채울 때 퍼지 끝점(OSFC·ISOC)과 연소 범위 도표를 보입니다.",
    "Estimates the limiting oxygen concentration (LOC, MOC) from the fuel formula and flammable limits, then shows the O₂ control target after a margin, the nitrogen dilution needed, the out-of-service and into-service purge end points (OSFC, ISOC) and a flammability diagram."),
  inputs: [
    { key: "m", term: "fuel_formula", label: tr("탄소 원자 수 m", "Carbon atoms m"), unit: tr("C 개수", "C atoms"), default: 4, min: 0, hint: tr("기본값은 n-부탄 C₄H₁₀ (LFL 1.6 %, UFL 8.4 %)", "Default is n-butane C₄H₁₀ (LFL 1.6 %, UFL 8.4 %)") },
    { key: "x", term: "fuel_formula", label: tr("수소 원자 수 x", "Hydrogen atoms x"), unit: tr("H 개수", "H atoms"), default: 10, min: 0 },
    { key: "y", term: "fuel_formula", label: tr("산소 원자 수 y", "Oxygen atoms y"), unit: tr("O 개수", "O atoms"), default: 0, min: 0 },
    { key: "lfl", term: "lfl", label: tr("LFL (비우면 0.55 Cst)", "LFL (blank = 0.55 Cst)"), unit: "vol%", default: 1.6, optional: true, positive: true, max: 100 },
    { key: "ufl", term: "ufl", label: tr("UFL (비우면 3.50 Cst)", "UFL (blank = 3.50 Cst)"), unit: "vol%", default: 8.4, optional: true, positive: true, max: 100 },
    { key: "locMeas", term: "loc", label: tr("실측 LOC (선택)", "Measured LOC (optional)"), unit: "vol% O₂", default: "", optional: true, positive: true, max: 21,
      hint: tr("있으면 어림값 대신 씁니다(US Bureau of Mines Bulletin 503·627 등 출처가 있는 질소 희석 값)", "Used instead of the estimate when given (a sourced N₂-diluent value, e.g. US Bureau of Mines Bulletins 503 and 627)") },
    { key: "margin", term: "inert_margin", label: tr("안전 여유", "Safety margin"), unit: tr("%p (O₂)", "pp (O₂)"), default: 2, min: 0, max: 20 },
  ],
  outputs: [
    { key: "z", term: "stoich_o2", label: tr("필요 산소 z", "Oxygen required z"), unit: tr("mol O₂ / mol 연료", "mol O₂ / mol fuel"), digits: 4 },
    { key: "cst", term: "cst", label: tr("양론 농도 Cst", "Stoichiometric concentration Cst"), unit: "vol%", digits: 4 },
    { key: "lflUsed", term: "lfl", label: tr("쓴 LFL", "LFL used"), unit: "vol%", digits: 3 },
    { key: "uflUsed", term: "ufl", label: tr("쓴 UFL", "UFL used"), unit: "vol%", digits: 3 },
    { key: "locEst", term: "loc", label: tr("LOC 어림 (z × LFL)", "Estimated LOC (z × LFL)"), unit: "vol% O₂", digits: 3 },
    { key: "locUsed", term: "loc", label: tr("판단에 쓴 LOC", "LOC used"), unit: "vol% O₂", digits: 3 },
    { key: "basis", label: tr("LOC 근거", "LOC basis"), term: "loc", type: "text" },
    { key: "target", term: "o2_setpoint", label: tr("관리 목표 O₂ (LOC − 여유)", "O₂ control target (LOC − margin)"), unit: "vol% O₂", digits: 3 },
    { key: "n2PerAir", term: "inert_dilution", label: tr("공기 1 mol 당 더할 N₂", "N₂ to add per mol of air"), unit: "mol/mol", digits: 4 },
    { key: "inertFrac", term: "inert_dilution", label: tr("혼합 기체 중 더한 N₂ 비율", "Added N₂ fraction of the mixture"), unit: "%", digits: 3 },
    { key: "osfc", term: "osfc", label: "OSFC", unit: tr("vol% 연료", "vol% fuel"), digits: 3 },
    { key: "isoc", term: "isoc", label: "ISOC", unit: "vol% O₂", digits: 3 },
  ],
  compute(v) {
    const z = calcStoichO2(v.m, v.x, v.y);
    if (!(v.m + v.x > 0) || !(z > 0)) return { error: tr("탄소·수소가 있고 필요 산소 z 가 0 보다 커야 합니다.", "The fuel must contain carbon or hydrogen, and the oxygen required z must be greater than 0.") };
    const cst = calcStoichCst(z);
    const lflUsed = v.lfl || 0.55 * cst;
    const uflUsed = v.ufl || 3.5 * cst;
    if (uflUsed <= lflUsed) return { error: tr("UFL 이 LFL 보다 커야 합니다.", "UFL must be greater than LFL.") };
    const locEst = z * lflUsed;
    const locUsed = v.locMeas || locEst;
    const a = calcLocAirO2();
    if (locUsed >= a) return { error: tr("LOC 가 공기 중 산소(20.95 %) 이상입니다. 입력을 확인하십시오.", "LOC is at or above the oxygen in air (20.95 %). Check the inputs.") };
    const target = locUsed - v.margin;
    if (!(target > 0)) return { error: tr("안전 여유가 LOC 보다 큽니다.", "The safety margin is larger than the LOC.") };
    const nose = [locUsed / z, locUsed];
    const { osfc, isoc } = calcLocPurgePoints(nose);
    const warnings = [];
    if (!v.locMeas) warnings.push(tr("LOC 는 z × LFL 어림입니다. 실측값보다 낮게 나오는 경우가 많지만(예: 메탄 10 % 대 실측 약 12 %) 항상 그렇지는 않습니다. 출처가 있는 실측 LOC 를 우선합니다.",
      "The LOC is the z × LFL estimate. It is often below the measured value (e.g. methane 10 % vs about 12 % measured), but not always. Prefer a sourced measured LOC."));
    if (v.y > 0 || !v.lfl) warnings.push(tr("산소 함유 연료이거나 LFL 을 Cst 로 어림하면 오차가 더 큽니다.", "Errors are larger for oxygenated fuels or when the LFL is estimated from Cst."));
    return {
      z, cst, lflUsed, uflUsed, locEst, locUsed, target, osfc, isoc,
      basis: v.locMeas ? tr("입력한 실측 LOC", "Measured LOC entered") : tr("어림값 z × LFL", "Estimate z × LFL"),
      n2PerAir: a / target - 1, inertFrac: 100 * (1 - target / a), warnings,
    };
  },
  chart: calcLocChart,
  formula: [
    "z = m + x/4 − y/2,   Cst = 100 / (1 + z / 0.2095)",
    "LOC ≈ z · LFL   (LFL ≈ 0.55 Cst, UFL ≈ 3.50 Cst)",
    tr("관리 목표 O₂ = LOC − 여유,   더할 N₂ / 공기 = 20.95 / 목표 − 1", "O₂ target = LOC − margin,   added N₂ / air = 20.95 / target − 1"),
    tr("꼭지점 N = (LOC/z, LOC):  OSFC = 20.95·F_N / (20.95 − LOC),  ISOC = 100·LOC / (100 − F_N)", "Nose N = (LOC/z, LOC):  OSFC = 20.95·F_N / (20.95 − LOC),  ISOC = 100·LOC / (100 − F_N)"),
  ],
  notes: [
    tr("참고용 스크리닝입니다. 연소 범위 그림은 공기선 위 LFL·UFL 과 양론선 위 LOC 를 이은 어림이며, 순수 산소 쪽 한계는 그리지 않습니다. 압력·온도가 오르면 범위가 넓어집니다.",
      "Screening estimate only. The diagram joins the LFL and UFL on the air line with the LOC on the stoichiometric line; limits towards pure oxygen are not drawn. The zone widens at higher pressure and temperature."),
    tr("LFL·LOC 를 z × LFL 로 이으면 OSFC = LFL / (1 − z·LFL/20.95), ISOC = z·LFL / (1 − LFL/100) 가 되어 Mashuga & Crowl(1998)의 식과 같습니다.",
      "With LOC = z × LFL these reduce to OSFC = LFL / (1 − z·LFL/20.95) and ISOC = z·LFL / (1 − LFL/100), the forms of Mashuga & Crowl (1998)."),
    tr("안전 여유 2–4 %p 는 실무 관행(Kinsley 2001)입니다. 법정·설계 기준은 해당 규격을 직접 확인하십시오. 산소 목표는 퍼지 계산기에 그대로 넣을 수 있습니다.",
      "A 2–4 percentage-point margin is common practice (Kinsley 2001). Check the applicable standard for statutory or design limits. The O₂ target can be used directly in the purge calculator."),
  ],
  reference: [
    tr("Crowl & Louvar, Chemical Process Safety 3판(2011), 6장 — LOC ≈ z·LFL, 연소 범위 도표 그리기", "Crowl & Louvar, Chemical Process Safety, 3rd ed. (2011), Ch. 6 — LOC ≈ z·LFL, constructing the flammability diagram"),
    "Mashuga, C.V. & Crowl, D.A. (1998). Application of the flammability diagram for evaluation of fire and explosion hazards of flammable vapors. Process Saf. Prog. 17(3), 176–183.",
    "Coward, H.F. & Jones, G.W. (1952). Limits of Flammability of Gases and Vapors. U.S. Bureau of Mines Bulletin 503.",
    "Kinsley, G.R. (2001). Properly purge and inert storage vessels. Chem. Eng. Prog. 97(2), 57–61.",
  ],
};

Object.assign(window, { CALC_DEF_LOC_MOC, calcLocPurgePoints });
