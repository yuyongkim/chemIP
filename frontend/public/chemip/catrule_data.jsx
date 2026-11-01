// 물질 상세 "분류로 걸리는 규제"(참고용) · 자료 — 물질 이름 목록이 아니라 유해성 분류·성질(인화점·폭발 한계)로 정해지는 규정.
// React 없음(데이터만). 행마다 ko·en 을 함께 두고 화면이 tr 로 고른다. 수량은 아래 원문에서 옮겨 적었다(법령·지침은 재사용 허용).
// 한국 PSM(산업안전보건법 시행령 별표 13 제1·2호, 규정량·인화 기준)은 여기 두지 않고 적용 법규 판정기 자료 APL_PSM.flam 을 읽는다.
// 위험물안전관리법 품명·지정수량도 APL_HAZMAT(MSDS 15항 글 → aplHazmatGuess)을 그대로 쓴다.
//   kr_b9   산업안전보건기준에 관한 규칙 별표 9(위험물질의 기준량, 제273조 관련) 제4호가·나·다, 제5호아 —
//           backend/data/trade_controls/kr_lists/KR_OSH_DANGEROUS_SUBSTANCES.json family_entries(법제처, 2026-10-24 받음)와 같은 값
//   us_psm  29 CFR 1910.119(a)(1)(ii) — eCFR 본문(EPC engineering datasets/ecfr_rag, ecfr:ECFR-29-1910.119-03950~03952)
//   seveso  Directive 2012/18/EU(Seveso III) 부록 I 머리말·1부·2부 제18호 — EUR-Lex 본문(EPC engineering datasets/jurisdictions/eu)
// 유해성 key 는 SAFETY_RULES.ghs 와 같다("flam_gas:1" — CLP 부록 VI 표 g/clp_annex6.json, KOSHA MSDS 2항 ghpKoshaClassification).
// apl_cites.jsx·apl_hazmat_data.jsx 뒤에 읽는다(APL_LAW_URL·APL_HAZMAT). 판정 순수 함수: catrule_core.jsx. 시험: frontend/scripts/tests/test_catrules.cjs

const CATRULE_DATA = {
  sources: {
    kr_psm: { ko: "산업안전보건법 시행령 별표 13 (공정안전보고서 규정량)", en: "Enforcement Decree of the OSH Act, Annex 13 (PSM threshold quantities)", url: `${APL_LAW_URL}산업안전보건법시행령/제43조`, lic: "law.go.kr" },
    kr_b9: { ko: "산업안전보건기준에 관한 규칙 별표 9 (위험물질의 기준량)", en: "Rules on OSH Standards, Annex 9 (reference quantities of dangerous substances)", url: `${APL_LAW_URL}산업안전보건기준에관한규칙/제273조`, lic: "law.go.kr" },
    kr_hazmat: { ko: "위험물안전관리법 시행령 별표 1 (지정수량)", en: "Dangerous Substances Safety Management Act Decree, Annex 1 (designated quantities)", url: APL_HAZMAT.source.decreeUrl, lic: "law.go.kr" },
    us_psm: { ko: "29 CFR 1910.119(a)(1)(ii) (OSHA 공정안전관리)", en: "29 CFR 1910.119(a)(1)(ii) (OSHA process safety management)", url: "https://www.ecfr.gov/current/title-29/section-1910.119#p-1910.119(a)(1)(ii)", lic: "US federal work, public domain" },
    seveso: { ko: "Seveso III 지침(2012/18/EU) 부록 I", en: "Seveso III Directive (2012/18/EU), Annex I", url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32012L0018", lic: "© European Union, EUR-Lex (reuse authorised)" },
  },
  // 이 목록에 이름으로 올라 있으면 분류 규칙 대신 그 목록이 정한다(국내 목록·국가별 규제에 보인다)
  namedLists: { kr_b9: "KR_OSH_DANGEROUS_SUBSTANCES", us_psm: "US_OSHA_PSM", seveso: "EU_SEVESO_III" },
  // 산안규칙 별표 9 — 기준량은 설비에서 하루 최대 제조·취급량(별표 9 비고)
  kr_b9: [
    { k: "b9_4a", no: "제4호가", noEn: "item 4(a)", q: 200, unit: "L", state: "liquid", flashLt: 23, bpLe: 35,
      ko: "인화성 액체: 인화점 23 ℃ 미만이고 초기 끓는점 35 ℃ 이하", en: "Flammable liquid: flash point below 23 °C and initial boiling point 35 °C or lower" },
    { k: "b9_4b", no: "제4호나", noEn: "item 4(b)", q: 400, unit: "L", state: "liquid", flashLt: 23, bpGt: 35,
      ko: "인화성 액체: 인화점 23 ℃ 미만이고 초기 끓는점 35 ℃ 초과", en: "Flammable liquid: flash point below 23 °C and initial boiling point above 35 °C" },
    { k: "b9_4c", no: "제4호다", noEn: "item 4(c)", q: 1000, unit: "L", state: "liquid", flashGe: 23, flashLe: 60,
      ko: "인화성 액체: 인화점 23 ℃ 이상 60 ℃ 이하", en: "Flammable liquid: flash point 23 °C to 60 °C" },
    { k: "b9_5h", no: "제5호아", noEn: "item 5(h)", q: 50, unit: "m³", state: "gas", psmGas: true,
      ko: "인화성 가스: 영 별표 13 에 따른 인화성 가스", en: "Flammable gas as defined in Decree Annex 13" },
  ],
  krCityGasCas: ["74-82-8"], // 별표 13 비고 2 (연료용 도시가스, 메탄 85 % 이상) — APL_PSM.flam.cityGas
  // 29 CFR 1910.119(a)(1)(ii): "a Category 1 flammable gas (as defined in 1910.1200(c)) or a flammable liquid with a
  // flashpoint below 100 °F (37.8 °C) on site in one location, in a quantity of 10,000 pounds (4535.9 kg) or more"
  us_psm: { lb: 10000, kg: 4535.9, flashLtC: 37.8, flashLtF: 100, gasHazards: ["flam_gas:1", "flam_gas:1A", "flam_gas:1B"] },
  // 부록 I 1부: 분류 → 하위·상위 기준(톤). 머리말: 1부 분류에 들고 2부에도 이름이 있으면 2부 수량을 쓴다.
  seveso: [
    { code: "P2", ko: "인화성 가스 구분 1·2", en: "Flammable gases, Category 1 or 2", hz: ["flam_gas:1", "flam_gas:1A", "flam_gas:1B", "flam_gas:2"], lower: 10, upper: 50, liquefied: true },
    { code: "P4", ko: "산화성 가스 구분 1", en: "Oxidising gases, Category 1", hz: ["ox_gas:1"], lower: 50, upper: 200 },
    { code: "P5a", ko: "인화성 액체 구분 1", en: "Flammable liquids, Category 1", hz: ["flam_liq:1"], lower: 10, upper: 50 },
    { code: "P5c", ko: "인화성 액체 구분 2·3 (P5a·P5b 아닌 것)", en: "Flammable liquids, Category 2 or 3 not covered by P5a and P5b", hz: ["flam_liq:2", "flam_liq:3"], lower: 5000, upper: 50000, p5ab: true },
    { code: "P7", ko: "자연발화성 액체·고체 구분 1", en: "Pyrophoric liquids or solids, Category 1", hz: ["pyr_liq:1", "pyr_sol:1"], lower: 50, upper: 200 },
    { code: "P8", ko: "산화성 액체·고체 구분 1·2·3", en: "Oxidising liquids or solids, Category 1, 2 or 3", hz: ["ox_liq:1", "ox_liq:2", "ox_liq:3", "ox_sol:1", "ox_sol:2", "ox_sol:3"], lower: 50, upper: 200 },
    { code: "H1", ko: "급성 독성 구분 1 (모든 노출 경로)", en: "Acute toxic, Category 1, all exposure routes", hz: ["acute_oral:1", "acute_dermal:1", "acute_inh:1"], lower: 5, upper: 20 },
    { code: "H2", ko: "급성 독성 구분 2 (모든 경로), 구분 3 (흡입)", en: "Acute toxic, Category 2 (all routes), Category 3 (inhalation)", hz: ["acute_oral:2", "acute_dermal:2", "acute_inh:2", "acute_inh:3"], lower: 50, upper: 200 },
    { code: "H3", ko: "특정표적장기 독성 1회 노출 구분 1", en: "STOT single exposure, Category 1", hz: ["stot_se:1"], lower: 50, upper: 200 },
    { code: "E1", ko: "수생환경 유해성 급성 1 또는 만성 1", en: "Hazardous to the aquatic environment, Acute 1 or Chronic 1", hz: ["aq_acute:1", "aq_chronic:1"], lower: 100, upper: 200 },
    { code: "E2", ko: "수생환경 유해성 만성 2", en: "Hazardous to the aquatic environment, Chronic 2", hz: ["aq_chronic:2"], lower: 200, upper: 500 },
    { code: "O2", ko: "물과 접촉하여 인화성 가스 방출 구분 1", en: "Substances which in contact with water emit flammable gases, Category 1", hz: ["water_react:1"], lower: 100, upper: 500 },
  ],
  // 2부 제18호: "Liquefied flammable gases, Category 1 or 2 (including LPG) and natural gas" 50 / 200 t
  sevesoLiquefied: { entry: 18, lower: 50, upper: 200 },
};

Object.assign(window, { CATRULE_DATA });
