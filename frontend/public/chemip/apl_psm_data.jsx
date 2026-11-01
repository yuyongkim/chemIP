// 적용 법규 판정기 · 자료 — 산업안전보건법 시행령 [별표 13] 유해·위험물질 규정량(제43조제1항 관련) 옮겨 적기. React 없음(데이터만).
// 원문: law.go.kr DRF 산업안전보건법 시행령(대통령령 제36540호, 2026-07-28 공포, 2026-08-01 시행) XML 의 별표 13, 2026-10-24 받음
// (S:\chemip_trade_controls_raw\kr_safety\2026-10-24\osha_decree_288347.xml). 법령은 저작권 보호 대상이 아니다(저작권법 제7조).
// 행마다 ko·en 이름을 함께 두고 화면이 tr 로 고른다. 규정량 단위 kg. 제1·2호만 제조·취급과 저장 값이 다르고, 나머지는 "제조·취급·저장" 한 값.
//   conc: 표에 농도가 적힌 물질의 기준(중량 %, 이상) — 비고 6 "농도가 규정되어 있는 화학물질은 그 규정된 농도를 기준으로 한다"
//   form: 같은 CAS 가 두 줄인 물질(무수 / 수용액)을 가르는 성상 — "anhydrous" 는 수용액이 아닌 것, "solution" 은 수용액
//   alsoCas: 표에 없는 CAS 로도 찾는 경우(판정기 규칙) — 암모니아(7664-41-7)를 "수용액"으로 넣으면 제51호 암모니아수로 본다
//   check: 표의 조건을 화면이 숫자로 확인할 수 없는 줄(발연황산의 SO3 함량, 니트로셀룰로오스의 질소 함량) → 판정은 "확인 필요"

const APL_PSM = {
  source: {
    law: "산업안전보건법 시행령", lawEn: "Enforcement Decree of the Occupational Safety and Health Act",
    annex: "별표 13", annexEn: "Annex 13", article: "제43조제1항", articleEn: "Article 43(1)",
    act: "산업안전보건법 제44조", actEn: "Occupational Safety and Health Act, Article 44",
    promulgation: "대통령령 제36540호", promulgated: "2026-07-28", effective: "2026-08-01", retrieved: "2026-10-24",
    url: "https://www.law.go.kr/법령/산업안전보건법시행령/제43조",
    actUrl: "https://www.law.go.kr/법령/산업안전보건법/제44조",
  },
  // 제1호 인화성 가스·제2호 인화성 액체(CAS 없음, 성질로 정함)
  flam: {
    gas: { no: 1, ko: "인화성 가스", en: "Flammable gas", handle: 5000, store: 200000 },
    liquid: { no: 2, ko: "인화성 액체", en: "Flammable liquid", handle: 5000, store: 200000 },
    gasLfl: 13, gasRange: 12,   // 비고 1: 인화한계 하한 13 % 이하 또는 상·하한 차 12 % 이상, 101.3 kPa·20 ℃ 에서 가스
    liquidFlash: 60,            // 비고 3: 표준압력에서 인화점 60 ℃ 이하
    cityGas: 50000,             // 비고 2: 연료용 도시가스(0.1 MPa 미만, 메탄 85 % 이상) 취급 규정량
  },
  rows: [
    { no: 3, ko: "메틸 이소시아네이트", en: "Methyl isocyanate", cas: ["624-83-9"], q: 1000 },
    { no: 4, ko: "포스겐", en: "Phosgene", cas: ["75-44-5"], q: 500 },
    { no: 5, ko: "아크릴로니트릴", en: "Acrylonitrile", cas: ["107-13-1"], q: 10000 },
    { no: 6, ko: "암모니아", en: "Ammonia", cas: ["7664-41-7"], q: 10000, form: "anhydrous" },
    { no: 7, ko: "염소", en: "Chlorine", cas: ["7782-50-5"], q: 1500 },
    { no: 8, ko: "이산화황", en: "Sulfur dioxide", cas: ["7446-09-5"], q: 10000 },
    { no: 9, ko: "삼산화황", en: "Sulfur trioxide", cas: ["7446-11-9"], q: 10000 },
    { no: 10, ko: "이황화탄소", en: "Carbon disulfide", cas: ["75-15-0"], q: 10000 },
    { no: 11, ko: "시안화수소", en: "Hydrogen cyanide", cas: ["74-90-8"], q: 500 },
    { no: 12, ko: "불화수소(무수불산)", en: "Hydrogen fluoride (anhydrous)", cas: ["7664-39-3"], q: 1000, form: "anhydrous" },
    { no: 13, ko: "염화수소(무수염산)", en: "Hydrogen chloride (anhydrous)", cas: ["7647-01-0"], q: 10000, form: "anhydrous" },
    { no: 14, ko: "황화수소", en: "Hydrogen sulfide", cas: ["7783-06-4"], q: 1000 },
    { no: 15, ko: "질산암모늄", en: "Ammonium nitrate", cas: ["6484-52-2"], q: 500000 },
    { no: 16, ko: "니트로글리세린", en: "Nitroglycerin", cas: ["55-63-0"], q: 10000 },
    { no: 17, ko: "트리니트로톨루엔", en: "Trinitrotoluene", cas: ["118-96-7"], q: 50000 },
    { no: 18, ko: "수소", en: "Hydrogen", cas: ["1333-74-0"], q: 5000 },
    { no: 19, ko: "산화에틸렌", en: "Ethylene oxide", cas: ["75-21-8"], q: 1000 },
    { no: 20, ko: "포스핀", en: "Phosphine", cas: ["7803-51-2"], q: 500 },
    { no: 21, ko: "실란(Silane)", en: "Silane", cas: ["7803-62-5"], q: 1000 },
    { no: 22, ko: "질산(중량 94.5% 이상)", en: "Nitric acid (94.5 wt% or more)", cas: ["7697-37-2"], q: 50000, conc: 94.5 },
    { no: 23, ko: "발연황산(삼산화황 중량 65% 이상 80% 미만)", en: "Oleum (SO3 65 wt% to under 80 wt%)", cas: ["8014-95-7"], q: 20000, check: "oleum" },
    { no: 24, ko: "과산화수소(중량 52% 이상)", en: "Hydrogen peroxide (52 wt% or more)", cas: ["7722-84-1"], q: 10000, conc: 52 },
    { no: 25, ko: "톨루엔 디이소시아네이트", en: "Toluene diisocyanate", cas: ["91-08-7", "584-84-9", "26471-62-5"], q: 2000 },
    { no: 26, ko: "클로로술폰산", en: "Chlorosulfonic acid", cas: ["7790-94-5"], q: 10000 },
    { no: 27, ko: "브롬화수소", en: "Hydrogen bromide", cas: ["10035-10-6"], q: 10000 },
    { no: 28, ko: "삼염화인", en: "Phosphorus trichloride", cas: ["7719-12-2"], q: 10000 },
    { no: 29, ko: "염화 벤질", en: "Benzyl chloride", cas: ["100-44-7"], q: 2000 },
    { no: 30, ko: "이산화염소", en: "Chlorine dioxide", cas: ["10049-04-4"], q: 500 },
    { no: 31, ko: "염화 티오닐", en: "Thionyl chloride", cas: ["7719-09-7"], q: 10000 },
    { no: 32, ko: "브롬", en: "Bromine", cas: ["7726-95-6"], q: 1000 },
    { no: 33, ko: "일산화질소", en: "Nitric oxide", cas: ["10102-43-9"], q: 10000 },
    { no: 34, ko: "붕소 트리염화물", en: "Boron trichloride", cas: ["10294-34-5"], q: 10000 },
    { no: 35, ko: "메틸에틸케톤과산화물", en: "Methyl ethyl ketone peroxide", cas: ["1338-23-4"], q: 10000 },
    { no: 36, ko: "삼불화 붕소", en: "Boron trifluoride", cas: ["7637-07-2"], q: 1000 },
    { no: 37, ko: "니트로아닐린", en: "Nitroaniline", cas: ["88-74-4", "99-09-2", "100-01-6", "29757-24-2"], q: 2500 },
    { no: 38, ko: "염소 트리플루오르화", en: "Chlorine trifluoride", cas: ["7790-91-2"], q: 1000 },
    { no: 39, ko: "불소", en: "Fluorine", cas: ["7782-41-4"], q: 500 },
    { no: 40, ko: "시아누르 플루오라이드", en: "Cyanuric fluoride", cas: ["675-14-9"], q: 2000 },
    { no: 41, ko: "질소 트리플루오르화", en: "Nitrogen trifluoride", cas: ["7783-54-2"], q: 20000 },
    { no: 42, ko: "니트로 셀롤로오스(질소 함유량 12.6% 이상)", en: "Nitrocellulose (nitrogen 12.6% or more)", cas: ["9004-70-0"], q: 100000, check: "nitrocellulose" },
    { no: 43, ko: "과산화벤조일", en: "Benzoyl peroxide", cas: ["94-36-0"], q: 3500 },
    { no: 44, ko: "과염소산 암모늄", en: "Ammonium perchlorate", cas: ["7790-98-9"], q: 3500 },
    { no: 45, ko: "디클로로실란", en: "Dichlorosilane", cas: ["4109-96-0"], q: 1000 },
    { no: 46, ko: "디에틸 알루미늄 염화물", en: "Diethylaluminium chloride", cas: ["96-10-6"], q: 10000 },
    { no: 47, ko: "디이소프로필 퍼옥시디카보네이트", en: "Diisopropyl peroxydicarbonate", cas: ["105-64-6"], q: 3500 },
    { no: 48, ko: "불산(중량 10% 이상)", en: "Hydrofluoric acid (10 wt% or more)", cas: ["7664-39-3"], q: 10000, conc: 10, form: "solution" },
    { no: 49, ko: "염산(중량 20% 이상)", en: "Hydrochloric acid (20 wt% or more)", cas: ["7647-01-0"], q: 20000, conc: 20, form: "solution" },
    { no: 50, ko: "황산(중량 20% 이상)", en: "Sulfuric acid (20 wt% or more)", cas: ["7664-93-9"], q: 20000, conc: 20 },
    { no: 51, ko: "암모니아수(중량 20% 이상)", en: "Aqueous ammonia (20 wt% or more)", cas: ["1336-21-6"], alsoCas: ["7664-41-7"], q: 50000, conc: 20, form: "solution" },
  ],
  // 제43조제1항 각 호 — 이 업종의 사업장은 규정량과 관계없이 보유설비가 대상(제3호 합성수지 등은 별표 13 제1·2호 해당 시만)
  industries: [
    { k: "refining", ko: "원유 정제처리업", en: "Crude oil refining" },
    { k: "reprocess", ko: "기타 석유정제물 재처리업", en: "Other refined petroleum reprocessing" },
    { k: "petchem", ko: "석유화학계 기초화학물질 제조업 또는 합성수지 및 기타 플라스틱물질 제조업(합성수지 등은 별표 13 제1·2호 해당 시)", en: "Basic petrochemicals, or synthetic resins and other plastics (resins only when Annex 13 items 1–2 apply)" },
    { k: "nfert", ko: "질소질 비료 제조", en: "Nitrogen fertiliser manufacture" },
    { k: "cfert", ko: "복합비료 제조(단순혼합·배합 제외)", en: "Compound fertiliser manufacture (not simple mixing or blending)" },
    { k: "pesticide", ko: "화학 살균·살충제 및 농업용 약제 제조업(농약 원제 제조만)", en: "Agricultural chemicals (technical-grade active ingredients only)" },
    { k: "explosives", ko: "화약 및 불꽃제품 제조업", en: "Explosives and fireworks manufacture" },
  ],
  // 제43조제2항 — 유해하거나 위험한 설비로 보지 않는 설비(판정기는 사용자가 확인하도록 목록만 보인다)
  excluded: [
    { ko: "원자력 설비", en: "Nuclear facilities" },
    { ko: "군사시설", en: "Military facilities" },
    { ko: "사업장 내 직접 사용하는 난방용 연료의 저장·사용설비", en: "On-site heating-fuel storage and use" },
    { ko: "도매·소매시설", en: "Wholesale and retail facilities" },
    { ko: "차량 등의 운송설비", en: "Vehicles and other transport equipment" },
    { ko: "「액화석유가스의 안전관리 및 사업법」에 따른 액화석유가스의 충전·저장시설", en: "LPG filling and storage facilities under the LPG Safety Control Act" },
    { ko: "「도시가스사업법」에 따른 가스공급시설", en: "Gas supply facilities under the City Gas Business Act" },
    { ko: "고용노동부장관이 고시하는 설비", en: "Facilities designated by Ministry of Employment and Labor notice" },
  ],
};

Object.assign(window, { APL_PSM });
