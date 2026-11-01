// 계산기: CₘHₓO_y 연료의 이론 산소·공기량, 공연비, 양론 농도 Cst 와 이를 쓴 연소 한계·LOC 추정(Crowl & Louvar 6장).

const CALC_ATOM_MASS = { C: 12.011, H: 1.008, O: 15.999 };   // IUPAC 표준 원자량(2021) 관례값

// CₘHₓO_y 1 mol 의 완전 연소 필요 산소 z = m + x/4 − y/2 (loc_moc 도 쓴다)
function calcStoichO2(m, x, y) { return m + x / 4 - y / 2; }
// 공기 중 양론 농도 Cst [vol%] = 100 / (1 + z / 0.2095)
function calcStoichCst(z) { return 100 / (1 + z / CALC_CONST.o2Air); }

const CALC_DEF_STOICH_AIR = {
  key: "stoich_air",
  group: "flammability",
  title: tr("이론 공기량 · 양론 농도", "Stoichiometric air · Cst"),
  summary: tr("탄소·수소·산소로 된 연료의 완전 연소에 드는 산소·공기량과 공연비를 구하고, 양론 농도로 연소 하한·상한과 최소 산소 농도(LOC)를 어림합니다.",
    "Calculates the oxygen and air required for complete combustion of a C/H/O fuel and the air–fuel ratio, then uses the stoichiometric concentration to estimate the flammable limits and the limiting oxygen concentration (LOC)."),
  inputs: [
    { key: "m", label: tr("탄소 원자 수 m", "Carbon atoms m"), unit: tr("C 개수", "C atoms"), default: 6, min: 0, hint: tr("기본값은 헥산 C₆H₁₄", "Default is hexane C₆H₁₄") },
    { key: "x", label: tr("수소 원자 수 x", "Hydrogen atoms x"), unit: tr("H 개수", "H atoms"), default: 14, min: 0 },
    { key: "y", label: tr("산소 원자 수 y", "Oxygen atoms y"), unit: tr("O 개수", "O atoms"), default: 0, min: 0 },
    { key: "excess", label: tr("과잉 공기율", "Excess air"), term: "excess_air", unit: "%", default: 0, min: 0, max: 1000 },
    { key: "lfl", label: tr("실측 LFL (선택)", "Measured LFL (optional)"), term: "lfl", unit: "vol%", default: "", optional: true, positive: true, max: 100,
      hint: tr("넣으면 LOC 를 이 값으로 구합니다(MSDS 9항)", "If entered, LOC is calculated from this value (SDS Section 9)") },
  ],
  outputs: [
    { key: "z", label: tr("필요 산소 z", "Oxygen required z"), term: "stoich_o2", unit: tr("mol O₂ / mol 연료", "mol O₂ / mol fuel"), digits: 4 },
    { key: "air", label: tr("이론 공기량", "Stoichiometric air"), term: "stoich_air", unit: tr("mol 공기 / mol 연료", "mol air / mol fuel"), digits: 4 },
    { key: "afr", label: tr("질량 공연비 (이론)", "Air–fuel ratio by mass (stoichiometric)"), term: "afr", unit: tr("kg 공기 / kg 연료", "kg air / kg fuel"), digits: 4 },
    { key: "mw", label: tr("연료 분자량", "Fuel molecular weight"), unit: "g/mol", digits: 5 },
    { key: "cst", label: tr("양론 농도 Cst", "Stoichiometric concentration Cst"), term: "cst", unit: tr("vol% (공기 중)", "vol% (in air)"), digits: 4 },
    { key: "lflEst", label: tr("LFL 추정 (0.55 Cst)", "Estimated LFL (0.55 Cst)"), term: "lfl", unit: "vol%", digits: 3 },
    { key: "uflEst", label: tr("UFL 추정 (3.50 Cst)", "Estimated UFL (3.50 Cst)"), term: "ufl", unit: "vol%", digits: 3 },
    { key: "loc", label: tr("LOC 추정 (z × LFL)", "Estimated LOC (z × LFL)"), term: "loc", unit: "vol% O₂", digits: 3 },
    { key: "co2", label: tr("배기 CO₂ (건조 기준)", "Flue gas CO₂ (dry basis)"), unit: "vol%", digits: 4 },
    { key: "o2", label: tr("배기 O₂ (건조 기준)", "Flue gas O₂ (dry basis)"), unit: "vol%", digits: 4 },
  ],
  compute(v) {
    const z = calcStoichO2(v.m, v.x, v.y);
    if (!(v.m + v.x > 0) || !(z > 0)) return { error: tr("탄소·수소가 있고 필요 산소 z 가 0 보다 커야 합니다.", "The fuel must contain carbon or hydrogen, and the oxygen required z must be greater than 0.") };
    const o2 = CALC_CONST.o2Air;
    const air = z / o2;
    const mw = v.m * CALC_ATOM_MASS.C + v.x * CALC_ATOM_MASS.H + v.y * CALC_ATOM_MASS.O;
    const cst = calcStoichCst(z);
    const lflEst = 0.55 * cst;
    const ex = 1 + v.excess / 100;
    const inert = air * ex * (1 - o2);              // N₂ + Ar (공기의 O₂ 밖 성분)
    const o2Left = z * (ex - 1);
    const dry = v.m + inert + o2Left;
    const warnings = [];
    if (v.y > 0) warnings.push(tr("산소가 든 연료는 Cst 상관식의 오차가 더 큽니다. 실측 연소 한계를 우선합니다.", "The Cst correlations are less accurate for oxygenated fuels. Prefer measured flammable limits."));
    return {
      z, air, afr: air * CALC_CONST.mAir / mw, mw, cst,
      lflEst, uflEst: 3.5 * cst, loc: z * (v.lfl || lflEst),
      co2: 100 * v.m / dry, o2: 100 * o2Left / dry, warnings,
    };
  },
  formula: [
    "CₘHₓO_y + z O₂ → m CO₂ + (x/2) H₂O,   z = m + x/4 − y/2",
    tr("이론 공기량 = z / 0.2095,  공연비 = 공기량 × 28.966 / M_연료", "Stoichiometric air = z / 0.2095,  AFR = air × 28.966 / M_fuel"),
    "Cst = 100 / (1 + z / 0.2095) = 100 / (4.773 m + 1.19 x − 2.38 y + 1)  [vol%]",
    "LFL ≈ 0.55 Cst,  UFL ≈ 3.50 Cst,  LOC ≈ z × LFL",
  ],
  notes: [
    tr("LFL·UFL·LOC 추정은 Jones(1938) 상관식이라 탄화수소에서 대략 맞고, 수소·할로겐·산소 함유 물질에서는 오차가 큽니다. MSDS 9항의 실측값을 우선합니다.",
      "The LFL, UFL and LOC estimates use the Jones (1938) correlations: roughly valid for hydrocarbons, with large errors for hydrogen, halogenated and oxygenated compounds. Prefer measured values from SDS Section 9."),
    tr("배기 조성은 완전 연소·건조 공기 기준입니다(수분 응축 뒤 건조 기준 %). 질소산화물·일산화탄소는 셈하지 않습니다.",
      "Flue gas composition assumes complete combustion with dry air (dry-basis % after water condensation). NOx and CO are not included."),
  ],
  reference: [
    tr("Crowl & Louvar, Chemical Process Safety 3판(2011), 6장 — 식 6-11 Cst = 100/(4.773m + 1.19x − 2.38y + 1), LFL = 0.55 Cst, UFL = 3.50 Cst, LOC = z·LFL; 예제 6-4 헥산(Cst 2.16 %, LFL 1.19 %, UFL 7.56 %)",
      "Crowl & Louvar, Chemical Process Safety, 3rd ed. (2011), Ch. 6 — Eq. 6-11 Cst = 100/(4.773m + 1.19x − 2.38y + 1), LFL = 0.55 Cst, UFL = 3.50 Cst, LOC = z·LFL; Example 6-4 hexane (Cst 2.16 %, LFL 1.19 %, UFL 7.56 %)"),
    "Jones, G.W. (1938). Inflammation limits and their practical application in hazardous industrial operations. Chem. Rev. 22(1), 1–26.",
    tr("Turns, S.R., An Introduction to Combustion, 3판(2012), 2장 — 양론 공연비 정의(메탄 약 17.1–17.2)",
      "Turns, S.R., An Introduction to Combustion, 3rd ed. (2012), Ch. 2 — definition of stoichiometric air–fuel ratio (methane about 17.1–17.2)"),
  ],
};

Object.assign(window, { CALC_DEF_STOICH_AIR, calcStoichO2, calcStoichCst });
