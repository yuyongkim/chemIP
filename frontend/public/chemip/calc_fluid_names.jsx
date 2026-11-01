// 실유체 물성 계산기(calc_fluid_props.jsx)의 유체 이름·고르기 묶음·CAS 연결. React 없음(자료 + 순수 함수).
// 유체 자체 자료(임계점·범위·CAS)는 calc_fluid_data.jsx(CoolProp 에서 만든 파일). 여기에는 보일 이름만 둔다.
// 이름이 없는 유체는 CoolProp 이름 그대로 보인다(영문 화학명이라 두 언어 공통).

const CALC_FLUID_NAMES = {
  Water: tr("물", "Water"), HeavyWater: tr("중수 D₂O", "Heavy water D₂O"), Air: tr("공기(유사순수)", "Air (pseudo-pure)"),
  Nitrogen: tr("질소", "Nitrogen"), Oxygen: tr("산소", "Oxygen"), Argon: tr("아르곤", "Argon"), Helium: tr("헬륨", "Helium"),
  Hydrogen: tr("수소", "Hydrogen"), ParaHydrogen: tr("파라수소", "Parahydrogen"), OrthoHydrogen: tr("오르토수소", "Orthohydrogen"),
  Deuterium: tr("중수소", "Deuterium"), ParaDeuterium: tr("파라중수소", "Paradeuterium"), OrthoDeuterium: tr("오르토중수소", "Orthodeuterium"),
  Neon: tr("네온", "Neon"), Krypton: tr("크립톤", "Krypton"), Xenon: tr("제논", "Xenon"), Fluorine: tr("플루오린", "Fluorine"),
  Chlorine: tr("염소", "Chlorine"), CarbonMonoxide: tr("일산화탄소", "Carbon monoxide"), CarbonylSulfide: tr("황화카르보닐", "Carbonyl sulfide"),
  HydrogenChloride: tr("염화수소", "Hydrogen chloride"), HydrogenSulfide: tr("황화수소", "Hydrogen sulfide"), NitrousOxide: tr("아산화질소", "Nitrous oxide"),
  SulfurDioxide: tr("이산화황", "Sulfur dioxide"), SulfurHexafluoride: tr("육플루오린화황 SF₆", "Sulfur hexafluoride SF₆"),
  Ammonia: tr("암모니아", "Ammonia"), CarbonDioxide: tr("이산화탄소", "Carbon dioxide"), "n-Propane": tr("프로판", "Propane"),
  IsoButane: tr("아이소뷰테인", "Isobutane"), "n-Butane": tr("뷰테인", "n-Butane"), Propylene: tr("프로필렌", "Propylene"),
  DimethylEther: tr("다이메틸에테르", "Dimethyl ether"), Methane: tr("메테인", "Methane"), Ethane: tr("에테인", "Ethane"),
  Ethylene: tr("에틸렌", "Ethylene"), "1-Butene": tr("1-뷰텐", "1-Butene"), IsoButene: tr("아이소뷰텐", "Isobutene"),
  "cis-2-Butene": tr("시스-2-뷰텐", "cis-2-Butene"), "trans-2-Butene": tr("트랜스-2-뷰텐", "trans-2-Butene"), Propyne: tr("프로핀", "Propyne"),
  "n-Pentane": tr("펜테인", "n-Pentane"), Isopentane: tr("아이소펜테인", "Isopentane"), Neopentane: tr("네오펜테인", "Neopentane"),
  "n-Hexane": tr("헥세인", "n-Hexane"), Isohexane: tr("아이소헥세인", "Isohexane"), "n-Heptane": tr("헵테인", "n-Heptane"),
  "n-Octane": tr("옥테인", "n-Octane"), "n-Nonane": tr("노네인", "n-Nonane"), "n-Decane": tr("데케인", "n-Decane"),
  "n-Undecane": tr("운데케인", "n-Undecane"), "n-Dodecane": tr("도데케인", "n-Dodecane"), CycloPropane: tr("사이클로프로페인", "Cyclopropane"),
  Cyclopentane: tr("사이클로펜테인", "Cyclopentane"), CycloHexane: tr("사이클로헥세인", "Cyclohexane"), Benzene: tr("벤젠", "Benzene"),
  Toluene: tr("톨루엔", "Toluene"), EthylBenzene: tr("에틸벤젠", "Ethylbenzene"), "o-Xylene": tr("o-자일렌", "o-Xylene"),
  "m-Xylene": tr("m-자일렌", "m-Xylene"), "p-Xylene": tr("p-자일렌", "p-Xylene"), Acetone: tr("아세톤", "Acetone"),
  Ethanol: tr("에탄올", "Ethanol"), Methanol: tr("메탄올", "Methanol"), DiethylEther: tr("다이에틸에테르", "Diethyl ether"),
  DimethylCarbonate: tr("다이메틸카보네이트", "Dimethyl carbonate"), Dichloroethane: tr("1,2-다이클로로에테인", "1,2-Dichloroethane"),
  EthyleneOxide: tr("산화에틸렌", "Ethylene oxide"), PropyleneGlycol: tr("프로필렌글라이콜", "Propylene glycol"),
  Tetrahydrofuran: tr("테트라하이드로퓨란 THF", "Tetrahydrofuran THF"), VinylChloride: tr("염화비닐", "Vinyl chloride"),
  R404A: tr("R404A (R125/R143a/R134a 혼합)", "R404A (R125/R143a/R134a blend)"), R407C: tr("R407C (R32/R125/R134a 혼합)", "R407C (R32/R125/R134a blend)"),
  R410A: tr("R410A (R32/R125 혼합)", "R410A (R32/R125 blend)"), R507A: tr("R507A (R125/R143a 혼합)", "R507A (R125/R143a blend)"),
  R40: tr("R40 염화메틸", "R40 Methyl chloride"),
};

// 고르기 묶음 순서와 이름. 냉매 묶음 안에서는 많이 쓰는 냉매를 먼저 둔다.
const CALC_FLUID_GROUPS = {
  ref: tr("냉매", "Refrigerants"),
  hc: tr("탄화수소", "Hydrocarbons"),
  org: tr("유기 용제·화학물질", "Organic solvents & chemicals"),
  gas: tr("물·공기·무기 기체", "Water, air & inorganic gases"),
  other: tr("실록산·에스터·기타 작동 유체", "Siloxanes, esters & other working fluids"),
};
const CALC_FLUID_POPULAR = ["R134a", "R32", "R410A", "R1234yf", "R1234ze(E)", "R404A", "R407C", "R507A", "R22", "Ammonia", "CarbonDioxide",
  "n-Propane", "IsoButane", "R123", "R245fa", "R1233zd(E)"];

function calcFluidById(id) {
  return CALC_FLUID_DATA.find(f => f.id === id) || null;
}

// 보일 이름: 천연 냉매는 "R717 암모니아", 이름이 있으면 그 이름, 없으면 CoolProp 이름
function calcFluidLabel(f) {
  const name = CALC_FLUID_NAMES[f.id] || f.id;
  return f.ash ? `${f.ash} ${name}` : name;
}

function calcFluidRank(f) {
  const i = CALC_FLUID_POPULAR.indexOf(f.id);
  return i === -1 ? CALC_FLUID_POPULAR.length : i;
}

// 고르기 칸 선택지 [{ v, label, group }] — 묶음 순서(CALC_FLUID_GROUPS) → 냉매 인기순 → 이름순
function calcFluidOptions() {
  const order = Object.keys(CALC_FLUID_GROUPS);
  return CALC_FLUID_DATA.slice()
    .sort((a, b) => order.indexOf(a.cat) - order.indexOf(b.cat) || calcFluidRank(a) - calcFluidRank(b) || calcFluidLabel(a).localeCompare(calcFluidLabel(b), "en"))
    .map(f => ({ v: f.id, label: calcFluidLabel(f), group: CALC_FLUID_GROUPS[f.cat] }));
}

// CAS → CoolProp 유체 id(없으면 null). 물질 상세 화면의 "실유체 물성" 링크가 쓴다.
function calcFluidForCas(cas) {
  const c = String(cas || "").trim();
  return c ? CALC_FLUID_DATA.find(f => f.cas === c)?.id || null : null;
}

Object.assign(window, { CALC_FLUID_NAMES, CALC_FLUID_GROUPS, calcFluidById, calcFluidLabel, calcFluidOptions, calcFluidForCas });
