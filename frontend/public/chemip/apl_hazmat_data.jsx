// 적용 법규 판정기 · 자료 — 위험물안전관리법(지정수량·제조소등 구분·안전관리자·예방규정·정기점검·정기검사·자체소방대). React 없음.
// 원문(law.go.kr DRF XML, 2026-10-24 받음, S:\chemip_trade_controls_raw\kr_safety\2026-10-24\):
//   법   위험물안전관리법(법률 제20231호, 2025-08-07 시행) 제4조·제5조·제6조·제15조·제17조·제18조·제19조
//   령   같은 법 시행령(대통령령 제36432호, 2026-07-01 시행) 별표 1(위험물 및 지정수량, <개정 2024.4.30>)·제13조·별표 6·
//        제15조(예방규정)·제16조(정기점검)·제17조(정기검사)·제18조·별표 8(자체소방대)
//   규칙 같은 법 시행규칙(행정안전부령 제628호, 2026-07-01 시행) 별표 4 Ⅸ(제조소 옥외 취급탱크 방유제)·별표 6 Ⅸ(옥외탱크저장소 방유제)
// 법령은 저작권 보호 대상이 아니다(저작권법 제7조). 행마다 ko·en 을 함께 두고 화면이 tr 로 고른다.
// match: MSDS 15항(위험물안전관리법) 글에서 품명을 알아보는 정규식 — g/reactive_class.json 의 basis "s15:…" 에 쓴다(apl_hazmat_core.jsx).
//        유별을 먼저 정하고(그 유의 items 만) 배열 순서대로 처음 맞는 것을 쓴다 — 순서가 뜻을 가진다(아염소산염 → 과염소산염 → 염소산염).

const APL_HAZMAT = {
  source: {
    act: "위험물안전관리법", actEn: "Dangerous Substances Safety Management Act",
    decree: "위험물안전관리법 시행령", decreeEn: "Enforcement Decree of the Dangerous Substances Safety Management Act",
    rule: "위험물안전관리법 시행규칙", ruleEn: "Enforcement Rule of the Dangerous Substances Safety Management Act",
    decreePromulgation: "대통령령 제36432호", decreeEffective: "2026-07-01", annex1Amended: "2024-04-30", retrieved: "2026-10-24",
    actUrl: "https://www.law.go.kr/법령/위험물안전관리법",
    decreeUrl: "https://www.law.go.kr/법령/위험물안전관리법시행령",
    ruleUrl: "https://www.law.go.kr/법령/위험물안전관리법시행규칙",
  },
  // 시행령 별표 1. unit: kg | L. qty 가 둘 이상인 품명("그 밖에 행정안전부령으로 정하는 것")은 비고 25 → 가장 작은 값으로 두고 확인 필요
  items: [
    { k: "c1_chlorite", cls: 1, ko: "아염소산염류", en: "Chlorites", qty: 50, unit: "kg", match: /아염소산염/ },
    { k: "c1_perchlorate", cls: 1, ko: "과염소산염류", en: "Perchlorates", qty: 50, unit: "kg", match: /과염소산염/ },
    { k: "c1_chlorate", cls: 1, ko: "염소산염류", en: "Chlorates", qty: 50, unit: "kg", match: /염소산염/ },
    { k: "c1_peroxide", cls: 1, ko: "무기과산화물", en: "Inorganic peroxides", qty: 50, unit: "kg", match: /무기과산화물/ },
    { k: "c1_bromate", cls: 1, ko: "브로민산염류", en: "Bromates", qty: 300, unit: "kg", match: /브로민산염|브롬산염/ },
    { k: "c1_nitrate", cls: 1, ko: "질산염류", en: "Nitrates", qty: 300, unit: "kg", match: /질산염/ },
    { k: "c1_iodate", cls: 1, ko: "아이오딘산염류", en: "Iodates", qty: 300, unit: "kg", match: /아이오딘산염|요오드산염/ },
    { k: "c1_permanganate", cls: 1, ko: "과망가니즈산염류", en: "Permanganates", qty: 1000, unit: "kg", match: /과망가니즈산염|과망간산염/ },
    { k: "c1_dichromate", cls: 1, ko: "다이크로뮴산염류", en: "Dichromates", qty: 1000, unit: "kg", match: /다이크로뮴산염|중크롬산염/ },
    { k: "c1_other", cls: 1, ko: "제1류 그 밖의 것(50·300·1,000 kg 중)", en: "Class 1, other (50, 300 or 1,000 kg)", qty: 50, unit: "kg", multi: true },
    { k: "c2_sulfide", cls: 2, ko: "황화인", en: "Phosphorus sulfides", qty: 100, unit: "kg", match: /황화인|황화린/ },
    { k: "c2_redp", cls: 2, ko: "적린", en: "Red phosphorus", qty: 100, unit: "kg", match: /적린/ },
    { k: "c2_sulfur", cls: 2, ko: "황(순도 60 중량% 이상)", en: "Sulfur (60 wt% purity or more)", qty: 100, unit: "kg", match: /(^|[\s.:])황(?=[\s(]|$)|유황/, minConc: 60 },
    { k: "c2_iron", cls: 2, ko: "철분", en: "Iron powder", qty: 500, unit: "kg", match: /철분/ },
    { k: "c2_metal", cls: 2, ko: "금속분", en: "Metal powders", qty: 500, unit: "kg", match: /금속분/ },
    { k: "c2_mg", cls: 2, ko: "마그네슘", en: "Magnesium", qty: 500, unit: "kg", match: /마그네슘/ },
    { k: "c2_other", cls: 2, ko: "제2류 그 밖의 것(100·500 kg 중)", en: "Class 2, other (100 or 500 kg)", qty: 100, unit: "kg", multi: true },
    { k: "c2_flamsolid", cls: 2, ko: "인화성고체", en: "Flammable solids", qty: 1000, unit: "kg", match: /인화성\s*고체/ },
    { k: "c3_k", cls: 3, ko: "칼륨", en: "Potassium", qty: 10, unit: "kg", match: /칼륨/ },
    { k: "c3_na", cls: 3, ko: "나트륨", en: "Sodium", qty: 10, unit: "kg", match: /나트륨/ },
    { k: "c3_alkylal", cls: 3, ko: "알킬알루미늄", en: "Alkylaluminium", qty: 10, unit: "kg", match: /알킬알루미늄(?!\s*및)/ },
    { k: "c3_alkylli", cls: 3, ko: "알킬리튬", en: "Alkyllithium", qty: 10, unit: "kg", match: /알킬리튬(?!을)/ },
    { k: "c3_whitep", cls: 3, ko: "황린", en: "White phosphorus", qty: 20, unit: "kg", match: /황린/ },
    { k: "c3_alkali", cls: 3, ko: "알칼리금속(칼륨·나트륨 제외) 및 알칼리토금속", en: "Alkali metals (not K, Na) and alkaline earth metals", qty: 50, unit: "kg", match: /알칼리\s*(토)?금속/ },
    { k: "c3_organometal", cls: 3, ko: "유기금속화합물(알킬알루미늄·알킬리튬 제외)", en: "Organometallic compounds (not alkylaluminium or alkyllithium)", qty: 50, unit: "kg", match: /유기금속화합물/ },
    { k: "c3_hydride", cls: 3, ko: "금속의 수소화물", en: "Metal hydrides", qty: 300, unit: "kg", match: /수소화물/ },
    { k: "c3_phosphide", cls: 3, ko: "금속의 인화물", en: "Metal phosphides", qty: 300, unit: "kg", match: /금속의\s*인화물/ },
    { k: "c3_carbide", cls: 3, ko: "칼슘 또는 알루미늄의 탄화물", en: "Calcium or aluminium carbides", qty: 300, unit: "kg", match: /탄화물/ },
    { k: "c3_other", cls: 3, ko: "제3류 그 밖의 것(10·20·50·300 kg 중)", en: "Class 3, other (10, 20, 50 or 300 kg)", qty: 10, unit: "kg", multi: true },
    { k: "c4_special", cls: 4, ko: "특수인화물", en: "Special flammables", qty: 50, unit: "L", match: /특수\s*인화물/ },
    { k: "c4_p1", cls: 4, ko: "제1석유류 비수용성", en: "Class I petroleum, water-insoluble", qty: 200, unit: "L", match: /제?\s*1\s*석유류/, soluble: false },
    { k: "c4_p1s", cls: 4, ko: "제1석유류 수용성", en: "Class I petroleum, water-soluble", qty: 400, unit: "L", match: /제?\s*1\s*석유류/, soluble: true },
    { k: "c4_alcohol", cls: 4, ko: "알코올류", en: "Alcohols", qty: 400, unit: "L", match: /알코올류|알콜류/, minConc: 60 },
    { k: "c4_p2", cls: 4, ko: "제2석유류 비수용성", en: "Class II petroleum, water-insoluble", qty: 1000, unit: "L", match: /제?\s*2\s*석유류/, soluble: false },
    { k: "c4_p2s", cls: 4, ko: "제2석유류 수용성", en: "Class II petroleum, water-soluble", qty: 2000, unit: "L", match: /제?\s*2\s*석유류/, soluble: true },
    { k: "c4_p3", cls: 4, ko: "제3석유류 비수용성", en: "Class III petroleum, water-insoluble", qty: 2000, unit: "L", match: /제?\s*3\s*석유류/, soluble: false },
    { k: "c4_p3s", cls: 4, ko: "제3석유류 수용성", en: "Class III petroleum, water-soluble", qty: 4000, unit: "L", match: /제?\s*3\s*석유류/, soluble: true },
    { k: "c4_p4", cls: 4, ko: "제4석유류", en: "Class IV petroleum", qty: 6000, unit: "L", match: /제?\s*4\s*석유류/ },
    { k: "c4_animal", cls: 4, ko: "동식물유류", en: "Animal and vegetable oils", qty: 10000, unit: "L", match: /동식물\s*유류/ },
    { k: "c5_type1", cls: 5, ko: "제5류 제1종(유기과산화물·질산에스터류·나이트로화합물 등)", en: "Class 5, type 1 (organic peroxides, nitrate esters, nitro compounds …)", qty: 10, unit: "kg", match: /유기과산화물|질산\s*에스[터테]르?류|니트로|나이트로|아조|디아조|다이아조|히드라진|하이드라진|히드록실아민|하이드록실아민/, typed: true },
    { k: "c5_type2", cls: 5, ko: "제5류 제2종", en: "Class 5, type 2", qty: 100, unit: "kg", typed: true },
    { k: "c6_perchloric", cls: 6, ko: "과염소산", en: "Perchloric acid", qty: 300, unit: "kg", match: /과염소산(?!염)/ },
    { k: "c6_h2o2", cls: 6, ko: "과산화수소(농도 36 중량% 이상)", en: "Hydrogen peroxide (36 wt% or more)", qty: 300, unit: "kg", match: /과산화수소/, minConc: 36 },
    { k: "c6_nitric", cls: 6, ko: "질산(비중 1.49 이상)", en: "Nitric acid (specific gravity 1.49 or more)", qty: 300, unit: "kg", match: /질산(?!염|에스)/, check: "sg149" },
    { k: "c6_other", cls: 6, ko: "제6류 그 밖의 것", en: "Class 6, other", qty: 300, unit: "kg" },
  ],
  // MSDS 15항 글 읽기: 유별 숫자, 수용성(비수용성 아님), 수용성 여부를 적었는지
  text: { classRe: /([1-6])\s*류/, solubleRe: /(^|[^비])수용/, waterRe: /수용/, class4Re: /석유류|특수\s*인화물|알코올류|알콜류|동식물\s*유류/ },
  // 유별 이름(성질)
  classes: {
    1: { ko: "제1류 산화성고체", en: "Class 1 oxidising solids" },
    2: { ko: "제2류 가연성고체", en: "Class 2 flammable solids" },
    3: { ko: "제3류 자연발화성물질 및 금수성물질", en: "Class 3 pyrophoric and water-reactive substances" },
    4: { ko: "제4류 인화성액체", en: "Class 4 flammable liquids" },
    5: { ko: "제5류 자기반응성물질", en: "Class 5 self-reactive substances" },
    6: { ko: "제6류 산화성액체", en: "Class 6 oxidising liquids" },
  },
  // 제조소등 구분(시행령 별표 2·3) — 판정기의 "시설" 칸. 이송·주유·판매취급소·간이·이동·암반탱크는 고르지 않는다(확인 필요 안내만).
  facilities: {
    mfg: { ko: "제조소", en: "Manufacturing facility", kind: "mfg" },
    general: { ko: "일반취급소", en: "General handling facility", kind: "handle" },
    tank_out: { ko: "옥외탱크저장소", en: "Outdoor tank storage", kind: "store" },
    tank_in: { ko: "옥내탱크저장소", en: "Indoor tank storage", kind: "store" },
    tank_ug: { ko: "지하탱크저장소", en: "Underground tank storage", kind: "store" },
    warehouse: { ko: "옥내저장소", en: "Indoor storage (warehouse)", kind: "store" },
    yard: { ko: "옥외저장소", en: "Outdoor storage (yard)", kind: "store" },
  },
  // 시행령 별표 6 — 이 조건이면 낮은 자격(위험물기능사·안전관리자교육이수자·소방공무원경력자도 가능), 아니면 기능장·산업기사·2년 경력 기능사.
  //   only4: 제4류만, kinds: 그 품명들만, max: 지정수량 배수 이하(없으면 제한 없음)
  managerLow: {
    mfg: [{ only4: true, max: 5 }],
    warehouse: [{ only4: true, max: 5 }, { kinds: ["c4_alcohol", "c4_p2", "c4_p2s", "c4_p3", "c4_p3s", "c4_p4", "c4_animal"], max: 40 }],
    tank_out: [{ only4: true, max: 5 }, { kinds: ["c4_p2", "c4_p2s", "c4_p3", "c4_p3s", "c4_p4", "c4_animal"], max: 40 }],
    tank_in: [{ only4: true, max: 5 }, { kinds: ["c4_p2", "c4_p2s", "c4_p3", "c4_p3s", "c4_p4", "c4_animal"] }],
    tank_ug: [{ only4: true, max: 40 }, { kinds: ["c4_p1", "c4_p1s", "c4_alcohol", "c4_p2", "c4_p2s", "c4_p3", "c4_p3s", "c4_p4", "c4_animal"], max: 250 }],
    yard: [{ only4: true, max: 40 }],
    general: [{ only4: true, max: 10 }, { kinds: ["c4_p2", "c4_p2s", "c4_p3", "c4_p3s", "c4_p4", "c4_animal"], max: 20 }],
  },
  // 시행령 제15조제1항 — 예방규정을 정해야 하는 제조소등(배수 이상). 일반취급소 단서(보일러·버너, 옮겨 담기)는 확인 필요로 둔다.
  prevention: { mfg: 10, yard: 100, warehouse: 150, tank_out: 200, general: 10 },
  preventionAudit: 3000,   // 제15조제2항: 예방규정 대상 중 최대수량 합이 지정수량 3천배 이상 → 이행 실태 평가 대상
  inspectionAlways: ["tank_ug"], // 제16조: 예방규정 대상 + 지하탱크저장소 등 → 정기점검
  regularTankL: 500000,    // 제17조: 액체위험물 50만 L 이상 옥외탱크저장소 → 정기검사
  // 제18조·별표 8 — 제조소·일반취급소의 제4류 최대수량 합(배수) 구간, 옥외탱크저장소 제4류 50만배 이상
  brigade: [
    { min: 3000, max: 120000, trucks: 1, crew: 5 },
    { min: 120000, max: 240000, trucks: 2, crew: 10 },
    { min: 240000, max: 480000, trucks: 3, crew: 15 },
    { min: 480000, max: Infinity, trucks: 4, crew: 20 },
  ],
  brigadeTank: { min: 500000, trucks: 2, crew: 10 },
  // 방유제(시행규칙 별표 6 Ⅸ제1호가목·제2호, 별표 4 Ⅸ제1호나목) — apl_dike_core.jsx
  dike: {
    tank: { pct: 110, pctNonFlam: 100 },
    process: { first: 50, rest: 10 },
  },
};

Object.assign(window, { APL_HAZMAT });
