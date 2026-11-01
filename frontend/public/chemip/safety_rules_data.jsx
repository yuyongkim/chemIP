// 생성된 파일 — 고치지 않는다. 원본: scripts/portal_build/safety_rules/*.json, 만드는 스크립트: scripts/portal_build/gen_frontend_rules.py
// 안전 도구(저장 혼촉 매트릭스·혼합물 GHS 분류)의 규칙 자료 한 벌: ghs = GHS 유해성 분류 표(KOSHA 분류 이름·CLP 코드·구분별 H 문구·그림문자·신호어),
// compat = 혼촉 체계 3개(kr 위험물 유별 혼재 기준·un IMDG 격리표·ghs 반응성 묶음)와 짝 규칙, mixture = 혼합물 분류 상수(CLP 부속서 I).
// 파이썬(scripts/portal_build)도 같은 JSON 을 읽는다. 문구의 ko/en 쌍은 화면이 tr 로 고른다.

const SAFETY_RULES = {
 "ghs": {
  "v": 1,
  "about": "GHS hazard classes used by the compatibility matrix (service 7) and the mixture GHS helper (service 8). Single source: Python (scripts/portal_build) reads this file, the browser reads the generated frontend/public/chemip/safety_rules_data.jsx (gen_frontend_rules.py). Category -> H statement / pictogram / signal word per UN GHS Rev.10 Annex 1 and CLP Annex I. kosha: regex on the KOSHA MSDS section 2 B02 class name (Korean, matched in source data). clp: CLP hazard class code prefix as written in CLP Annex VI.",
  "hazards": {
   "expl": {
    "group": "phys",
    "ko": "폭발성 물질",
    "en": "Explosives",
    "kosha": "^폭발성 물질",
    "clp": [
     "Unst. Expl",
     "Expl."
    ]
   },
   "flam_gas": {
    "group": "phys",
    "ko": "인화성 가스",
    "en": "Flammable gases",
    "kosha": "^인화성 가스",
    "clp": [
     "Flam. Gas"
    ]
   },
   "aerosol": {
    "group": "phys",
    "ko": "에어로졸",
    "en": "Aerosols",
    "kosha": "^에어로졸",
    "clp": [
     "Aerosol"
    ]
   },
   "ox_gas": {
    "group": "phys",
    "ko": "산화성 가스",
    "en": "Oxidizing gases",
    "kosha": "^산화성 가스",
    "clp": [
     "Ox. Gas"
    ]
   },
   "press_gas": {
    "group": "phys",
    "ko": "고압가스",
    "en": "Gases under pressure",
    "kosha": "^고압가스",
    "clp": [
     "Press. Gas"
    ]
   },
   "flam_liq": {
    "group": "phys",
    "ko": "인화성 액체",
    "en": "Flammable liquids",
    "kosha": "^인화성 액체",
    "clp": [
     "Flam. Liq."
    ]
   },
   "flam_sol": {
    "group": "phys",
    "ko": "인화성 고체",
    "en": "Flammable solids",
    "kosha": "^인화성 고체",
    "clp": [
     "Flam. Sol."
    ]
   },
   "self_react": {
    "group": "phys",
    "ko": "자기반응성 물질",
    "en": "Self-reactive substances",
    "kosha": "^자기반응성",
    "clp": [
     "Self-react.",
     "Self-React."
    ]
   },
   "pyr_liq": {
    "group": "phys",
    "ko": "자연발화성 액체",
    "en": "Pyrophoric liquids",
    "kosha": "^자연발화성 액체",
    "clp": [
     "Pyr. Liq."
    ]
   },
   "pyr_sol": {
    "group": "phys",
    "ko": "자연발화성 고체",
    "en": "Pyrophoric solids",
    "kosha": "^자연발화성 고체",
    "clp": [
     "Pyr. Sol."
    ]
   },
   "self_heat": {
    "group": "phys",
    "ko": "자기발열성 물질",
    "en": "Self-heating substances",
    "kosha": "^자기발열성",
    "clp": [
     "Self-heat."
    ]
   },
   "water_react": {
    "group": "phys",
    "ko": "물반응성 물질",
    "en": "Substances which, in contact with water, emit flammable gases",
    "kosha": "^물반응성",
    "clp": [
     "Water-react."
    ]
   },
   "ox_liq": {
    "group": "phys",
    "ko": "산화성 액체",
    "en": "Oxidizing liquids",
    "kosha": "^산화성 액체",
    "clp": [
     "Ox. Liq."
    ]
   },
   "ox_sol": {
    "group": "phys",
    "ko": "산화성 고체",
    "en": "Oxidizing solids",
    "kosha": "^산화성 고체",
    "clp": [
     "Ox. Sol."
    ]
   },
   "org_perox": {
    "group": "phys",
    "ko": "유기과산화물",
    "en": "Organic peroxides",
    "kosha": "^유기과산화물",
    "clp": [
     "Org. Perox."
    ]
   },
   "met_corr": {
    "group": "phys",
    "ko": "금속부식성 물질",
    "en": "Corrosive to metals",
    "kosha": "^금속부식성",
    "clp": [
     "Met. Corr."
    ]
   },
   "acute_oral": {
    "group": "health",
    "ko": "급성 독성(경구)",
    "en": "Acute toxicity (oral)",
    "kosha": "^급성 독성\\(경구\\)",
    "h_route": [
     "H300",
     "H301",
     "H302"
    ],
    "cats": {
     "1": [
      "H300",
      "GHS06",
      "danger"
     ],
     "2": [
      "H300",
      "GHS06",
      "danger"
     ],
     "3": [
      "H301",
      "GHS06",
      "danger"
     ],
     "4": [
      "H302",
      "GHS07",
      "warning"
     ]
    }
   },
   "acute_dermal": {
    "group": "health",
    "ko": "급성 독성(경피)",
    "en": "Acute toxicity (dermal)",
    "kosha": "^급성 독성\\(경피\\)",
    "h_route": [
     "H310",
     "H311",
     "H312"
    ],
    "cats": {
     "1": [
      "H310",
      "GHS06",
      "danger"
     ],
     "2": [
      "H310",
      "GHS06",
      "danger"
     ],
     "3": [
      "H311",
      "GHS06",
      "danger"
     ],
     "4": [
      "H312",
      "GHS07",
      "warning"
     ]
    }
   },
   "acute_inh_gas": {
    "group": "health",
    "ko": "급성 독성(흡입: 가스)",
    "en": "Acute toxicity (inhalation: gas)",
    "kosha": "^급성 독성\\(흡입: ?가스\\)",
    "cats": {
     "1": [
      "H330",
      "GHS06",
      "danger"
     ],
     "2": [
      "H330",
      "GHS06",
      "danger"
     ],
     "3": [
      "H331",
      "GHS06",
      "danger"
     ],
     "4": [
      "H332",
      "GHS07",
      "warning"
     ]
    }
   },
   "acute_inh_vap": {
    "group": "health",
    "ko": "급성 독성(흡입: 증기)",
    "en": "Acute toxicity (inhalation: vapour)",
    "kosha": "^급성 독성\\(흡입: ?증기\\)",
    "cats": {
     "1": [
      "H330",
      "GHS06",
      "danger"
     ],
     "2": [
      "H330",
      "GHS06",
      "danger"
     ],
     "3": [
      "H331",
      "GHS06",
      "danger"
     ],
     "4": [
      "H332",
      "GHS07",
      "warning"
     ]
    }
   },
   "acute_inh_dust": {
    "group": "health",
    "ko": "급성 독성(흡입: 분진/미스트)",
    "en": "Acute toxicity (inhalation: dust/mist)",
    "kosha": "^급성 독성\\(흡입: ?분진",
    "cats": {
     "1": [
      "H330",
      "GHS06",
      "danger"
     ],
     "2": [
      "H330",
      "GHS06",
      "danger"
     ],
     "3": [
      "H331",
      "GHS06",
      "danger"
     ],
     "4": [
      "H332",
      "GHS07",
      "warning"
     ]
    }
   },
   "acute_inh": {
    "group": "health",
    "ko": "급성 독성(흡입, 형태 미상)",
    "en": "Acute toxicity (inhalation, form not stated)",
    "kosha": "^급성 독성\\(흡입\\)",
    "h_route": [
     "H330",
     "H331",
     "H332"
    ],
    "cats": {
     "1": [
      "H330",
      "GHS06",
      "danger"
     ],
     "2": [
      "H330",
      "GHS06",
      "danger"
     ],
     "3": [
      "H331",
      "GHS06",
      "danger"
     ],
     "4": [
      "H332",
      "GHS07",
      "warning"
     ]
    }
   },
   "skin": {
    "group": "health",
    "ko": "피부 부식성/자극성",
    "en": "Skin corrosion/irritation",
    "kosha": "^피부 부식성",
    "clp": [
     "Skin Corr.",
     "Skin. Corr.",
     "Skin Irrit."
    ],
    "cats": {
     "1": [
      "H314",
      "GHS05",
      "danger"
     ],
     "1A": [
      "H314",
      "GHS05",
      "danger"
     ],
     "1B": [
      "H314",
      "GHS05",
      "danger"
     ],
     "1C": [
      "H314",
      "GHS05",
      "danger"
     ],
     "2": [
      "H315",
      "GHS07",
      "warning"
     ]
    }
   },
   "eye": {
    "group": "health",
    "ko": "심한 눈 손상성/눈 자극성",
    "en": "Serious eye damage/eye irritation",
    "kosha": "^심한 눈 손상",
    "clp": [
     "Eye Dam.",
     "Eye Irrit."
    ],
    "cats": {
     "1": [
      "H318",
      "GHS05",
      "danger"
     ],
     "2": [
      "H319",
      "GHS07",
      "warning"
     ]
    }
   },
   "resp_sens": {
    "group": "health",
    "ko": "호흡기 과민성",
    "en": "Respiratory sensitization",
    "kosha": "^호흡기 과민성",
    "clp": [
     "Resp. Sens."
    ],
    "cats": {
     "1": [
      "H334",
      "GHS08",
      "danger"
     ],
     "1A": [
      "H334",
      "GHS08",
      "danger"
     ],
     "1B": [
      "H334",
      "GHS08",
      "danger"
     ]
    }
   },
   "skin_sens": {
    "group": "health",
    "ko": "피부 과민성",
    "en": "Skin sensitization",
    "kosha": "^피부 과민성",
    "clp": [
     "Skin Sens."
    ],
    "cats": {
     "1": [
      "H317",
      "GHS07",
      "warning"
     ],
     "1A": [
      "H317",
      "GHS07",
      "warning"
     ],
     "1B": [
      "H317",
      "GHS07",
      "warning"
     ]
    }
   },
   "muta": {
    "group": "health",
    "ko": "생식세포 변이원성",
    "en": "Germ cell mutagenicity",
    "kosha": "^생식세포 변이원성",
    "clp": [
     "Muta."
    ],
    "cats": {
     "1": [
      "H340",
      "GHS08",
      "danger"
     ],
     "1A": [
      "H340",
      "GHS08",
      "danger"
     ],
     "1B": [
      "H340",
      "GHS08",
      "danger"
     ],
     "2": [
      "H341",
      "GHS08",
      "warning"
     ]
    }
   },
   "carc": {
    "group": "health",
    "ko": "발암성",
    "en": "Carcinogenicity",
    "kosha": "^발암성",
    "clp": [
     "Carc."
    ],
    "cats": {
     "1": [
      "H350",
      "GHS08",
      "danger"
     ],
     "1A": [
      "H350",
      "GHS08",
      "danger"
     ],
     "1B": [
      "H350",
      "GHS08",
      "danger"
     ],
     "2": [
      "H351",
      "GHS08",
      "warning"
     ]
    }
   },
   "repr": {
    "group": "health",
    "ko": "생식독성",
    "en": "Reproductive toxicity",
    "kosha": "^생식독성 : 구분",
    "clp": [
     "Repr."
    ],
    "cats": {
     "1": [
      "H360",
      "GHS08",
      "danger"
     ],
     "1A": [
      "H360",
      "GHS08",
      "danger"
     ],
     "1B": [
      "H360",
      "GHS08",
      "danger"
     ],
     "2": [
      "H361",
      "GHS08",
      "warning"
     ]
    }
   },
   "lact": {
    "group": "health",
    "ko": "생식독성(수유)",
    "en": "Effects on or via lactation",
    "kosha": "^생식독성 : 수유",
    "clp": [
     "Lact."
    ],
    "cats": {
     "1": [
      "H362",
      "",
      ""
     ]
    }
   },
   "stot_se": {
    "group": "health",
    "ko": "특정표적장기 독성(1회 노출)",
    "en": "STOT single exposure",
    "kosha": "^특정표적장기 ?독성\\(1회",
    "clp": [
     "STOT SE"
    ],
    "cats": {
     "1": [
      "H370",
      "GHS08",
      "danger"
     ],
     "2": [
      "H371",
      "GHS08",
      "warning"
     ],
     "3R": [
      "H335",
      "GHS07",
      "warning"
     ],
     "3N": [
      "H336",
      "GHS07",
      "warning"
     ]
    }
   },
   "stot_re": {
    "group": "health",
    "ko": "특정표적장기 독성(반복 노출)",
    "en": "STOT repeated exposure",
    "kosha": "^특정표적장기 ?독성\\(반복",
    "clp": [
     "STOT RE"
    ],
    "cats": {
     "1": [
      "H372",
      "GHS08",
      "danger"
     ],
     "2": [
      "H373",
      "GHS08",
      "warning"
     ]
    }
   },
   "asp": {
    "group": "health",
    "ko": "흡인 유해성",
    "en": "Aspiration hazard",
    "kosha": "^흡인 유해성",
    "clp": [
     "Asp. Tox."
    ],
    "cats": {
     "1": [
      "H304",
      "GHS08",
      "danger"
     ]
    }
   },
   "aq_acute": {
    "group": "env",
    "ko": "급성 수생환경 유해성",
    "en": "Hazardous to the aquatic environment, acute",
    "kosha": "^급성 수생환경",
    "clp": [
     "Aquatic Acute"
    ],
    "cats": {
     "1": [
      "H400",
      "GHS09",
      "warning"
     ]
    }
   },
   "aq_chronic": {
    "group": "env",
    "ko": "만성 수생환경 유해성",
    "en": "Hazardous to the aquatic environment, long-term",
    "kosha": "^만성 수생환경",
    "clp": [
     "Aquatic Chronic"
    ],
    "cats": {
     "1": [
      "H410",
      "GHS09",
      "warning"
     ],
     "2": [
      "H411",
      "GHS09",
      ""
     ],
     "3": [
      "H412",
      "",
      ""
     ],
     "4": [
      "H413",
      "",
      ""
     ]
    }
   },
   "ozone": {
    "group": "env",
    "ko": "오존층 유해성",
    "en": "Hazardous to the ozone layer",
    "kosha": "^오존층",
    "clp": [
     "Ozone"
    ],
    "cats": {
     "1": [
      "H420",
      "GHS07",
      "warning"
     ]
    }
   }
  },
  "clp_acute_tox": "Acute Tox.",
  "category_patterns": {
   "kosha": "구분\\s*(1A|1B|1C|1|2A|2B|2|3|4)|형식\\s*([A-G])|등급\\s*(1\\.[1-6])|(불안정한 폭발성)|(수유독성)|(액화가스|압축가스|용해가스|냉동액화가스)",
   "clp": "\\s(1A|1B|1C|1|2A|2B|2|3|4|[A-G]|1\\.[1-6])\\s*\\*{0,3}$"
  },
  "stot_se3": {
   "kosha_resp": "호흡기",
   "kosha_narc": "마취",
   "h_resp": "H335",
   "h_narc": "H336"
  },
  "category_alias": {
   "2A": "2",
   "2B": "2"
  },
  "h_text": {
   "H300": {
    "ko": "삼키면 치명적임",
    "en": "Fatal if swallowed"
   },
   "H301": {
    "ko": "삼키면 유독함",
    "en": "Toxic if swallowed"
   },
   "H302": {
    "ko": "삼키면 유해함",
    "en": "Harmful if swallowed"
   },
   "H304": {
    "ko": "삼켜서 기도로 유입되면 치명적일 수 있음",
    "en": "May be fatal if swallowed and enters airways"
   },
   "H310": {
    "ko": "피부와 접촉하면 치명적임",
    "en": "Fatal in contact with skin"
   },
   "H311": {
    "ko": "피부와 접촉하면 유독함",
    "en": "Toxic in contact with skin"
   },
   "H312": {
    "ko": "피부와 접촉하면 유해함",
    "en": "Harmful in contact with skin"
   },
   "H314": {
    "ko": "피부에 심한 화상과 눈에 손상을 일으킴",
    "en": "Causes severe skin burns and eye damage"
   },
   "H315": {
    "ko": "피부에 자극을 일으킴",
    "en": "Causes skin irritation"
   },
   "H317": {
    "ko": "알레르기성 피부 반응을 일으킬 수 있음",
    "en": "May cause an allergic skin reaction"
   },
   "H318": {
    "ko": "눈에 심한 손상을 일으킴",
    "en": "Causes serious eye damage"
   },
   "H319": {
    "ko": "눈에 심한 자극을 일으킴",
    "en": "Causes serious eye irritation"
   },
   "H330": {
    "ko": "흡입하면 치명적임",
    "en": "Fatal if inhaled"
   },
   "H331": {
    "ko": "흡입하면 유독함",
    "en": "Toxic if inhaled"
   },
   "H332": {
    "ko": "흡입하면 유해함",
    "en": "Harmful if inhaled"
   },
   "H334": {
    "ko": "흡입 시 알레르기성 반응, 천식 또는 호흡 곤란 등을 일으킬 수 있음",
    "en": "May cause allergy or asthma symptoms or breathing difficulties if inhaled"
   },
   "H335": {
    "ko": "호흡기 자극을 일으킬 수 있음",
    "en": "May cause respiratory irritation"
   },
   "H336": {
    "ko": "졸음 또는 현기증을 일으킬 수 있음",
    "en": "May cause drowsiness or dizziness"
   },
   "H340": {
    "ko": "유전적인 결함을 일으킬 수 있음",
    "en": "May cause genetic defects"
   },
   "H341": {
    "ko": "유전적인 결함을 일으킬 것으로 의심됨",
    "en": "Suspected of causing genetic defects"
   },
   "H350": {
    "ko": "암을 일으킬 수 있음",
    "en": "May cause cancer"
   },
   "H351": {
    "ko": "암을 일으킬 것으로 의심됨",
    "en": "Suspected of causing cancer"
   },
   "H360": {
    "ko": "태아 또는 생식능력에 손상을 일으킬 수 있음",
    "en": "May damage fertility or the unborn child"
   },
   "H361": {
    "ko": "태아 또는 생식능력에 손상을 일으킬 것으로 의심됨",
    "en": "Suspected of damaging fertility or the unborn child"
   },
   "H362": {
    "ko": "모유를 먹는 아이에게 유해할 수 있음",
    "en": "May cause harm to breast-fed children"
   },
   "H370": {
    "ko": "장기에 손상을 일으킴",
    "en": "Causes damage to organs"
   },
   "H371": {
    "ko": "장기에 손상을 일으킬 수 있음",
    "en": "May cause damage to organs"
   },
   "H372": {
    "ko": "장기간 또는 반복 노출되면 장기에 손상을 일으킴",
    "en": "Causes damage to organs through prolonged or repeated exposure"
   },
   "H373": {
    "ko": "장기간 또는 반복 노출되면 장기에 손상을 일으킬 수 있음",
    "en": "May cause damage to organs through prolonged or repeated exposure"
   },
   "H400": {
    "ko": "수생생물에 매우 유독함",
    "en": "Very toxic to aquatic life"
   },
   "H410": {
    "ko": "장기적인 영향에 의해 수생생물에게 매우 유독함",
    "en": "Very toxic to aquatic life with long lasting effects"
   },
   "H411": {
    "ko": "장기적인 영향에 의해 수생생물에게 유독함",
    "en": "Toxic to aquatic life with long lasting effects"
   },
   "H412": {
    "ko": "장기적인 영향에 의해 수생생물에게 유해함",
    "en": "Harmful to aquatic life with long lasting effects"
   },
   "H413": {
    "ko": "장기적인 영향에 의해 수생생물에 유해의 우려가 있음",
    "en": "May cause long lasting harmful effects to aquatic life"
   },
   "H420": {
    "ko": "대기 상층부의 오존층을 파괴하여 공공의 건강 및 환경에 유해함",
    "en": "Harms public health and the environment by destroying ozone in the upper atmosphere"
   }
  },
  "pictograms": {
   "GHS01": {
    "ko": "폭발성",
    "en": "Exploding bomb"
   },
   "GHS02": {
    "ko": "인화성",
    "en": "Flame"
   },
   "GHS03": {
    "ko": "산화성",
    "en": "Flame over circle"
   },
   "GHS04": {
    "ko": "고압가스",
    "en": "Gas cylinder"
   },
   "GHS05": {
    "ko": "부식성",
    "en": "Corrosion"
   },
   "GHS06": {
    "ko": "급성 독성",
    "en": "Skull and crossbones"
   },
   "GHS07": {
    "ko": "경고",
    "en": "Exclamation mark"
   },
   "GHS08": {
    "ko": "건강 유해성",
    "en": "Health hazard"
   },
   "GHS09": {
    "ko": "환경 유해성",
    "en": "Environment"
   }
  }
 },
 "compat": {
  "v": 1,
  "about": "Storage compatibility rules (service 7). Three systems, each from a public rule: kr = 위험물안전관리법 유별 and the 혼재 기준 (시행규칙 별표19 부표2), un = UN transport class with the IMDG Code 7.2.4 segregation table as a reference, ghs = reactive groups derived from GHS hazard classes (MSDS section 2 / CLP Annex VI) with ChemIP pair rules written from general segregation principles. No CRW (CCPS) or CAMEO (NOAA) data is used. Outcomes: x = incompatible (같이 두면 위험), c = caution (주의), o = OK. A pair takes the worst outcome over all systems; a substance with no class in any system is 'unknown', never OK.",
  "outcome_order": [
   "o",
   "c",
   "x"
  ],
  "sources": {
   "kr_hazmat": {
    "name": "위험물안전관리법 시행규칙 별표19 부표2 (유별을 달리하는 위험물의 혼재기준)",
    "url": "https://www.law.go.kr/법령/위험물안전관리법시행규칙",
    "license": "법령 — 저작권법 제7조 보호받지 못하는 저작물"
   },
   "imdg_7_2_4": {
    "name": "IMDG Code 7.2.4 Segregation table (reference)",
    "url": "https://www.imo.org/en/OurWork/Safety/Pages/DangerousGoods-default.aspx",
    "license": "Regulatory segregation codes cited as reference values; the IMDG Code text is not reproduced"
   },
   "ghs_groups": {
    "name": "ChemIP reactive groups from GHS hazard classes (UN GHS Rev.10; storage incompatibilities, Annex 4 A4.3.7.2)",
    "url": "https://unece.org/transport/standards/transport/dangerous-goods/ghs-rev10-2023",
    "license": "Rules written by ChemIP (AGPL-3.0 project data); GHS text © United Nations, free to consult"
   },
   "kosha_msds": {
    "name": "KOSHA MSDS §2·§9·§14·§15",
    "url": "https://msds.kosha.or.kr",
    "license": "공공데이터포털(data.go.kr) 한국산업안전보건공단 화학물질정보(MSDS) — 이용허락범위 제한 없음. 참고용"
   },
   "clp_annex6": {
    "name": "CLP Annex VI Table 3 (harmonised classification), ECHA table of ATP23",
    "url": "https://echa.europa.eu/information-on-chemicals/annex-vi-to-clp",
    "license": "EU legislation (EUR-Lex, reuse authorised by Decision 2011/833/EU); table compiled by ECHA, source: European Chemicals Agency"
   }
  },
  "systems": {
   "kr": {
    "ko": "위험물안전관리법 유별",
    "en": "Korean Dangerous Substances Safety Management Act class",
    "source": "kr_hazmat",
    "classes": {
     "1": {
      "ko": "제1류 산화성 고체",
      "en": "Class 1 oxidizing solids"
     },
     "2": {
      "ko": "제2류 가연성 고체",
      "en": "Class 2 flammable solids"
     },
     "3": {
      "ko": "제3류 자연발화성·금수성 물질",
      "en": "Class 3 pyrophoric and water-reactive substances"
     },
     "4": {
      "ko": "제4류 인화성 액체",
      "en": "Class 4 flammable liquids"
     },
     "5": {
      "ko": "제5류 자기반응성 물질",
      "en": "Class 5 self-reactive substances"
     },
     "6": {
      "ko": "제6류 산화성 액체",
      "en": "Class 6 oxidizing liquids"
     }
    },
    "item_keywords": {
     "4": [
      "특수인화물",
      "석유류",
      "알코올류",
      "동식물유류",
      "인화성액체"
     ],
     "5": [
      "유기과산화물",
      "질산에스테르류",
      "니트로화합물",
      "니트로소화합물",
      "아조화합물",
      "디아조화합물",
      "히드라진 유도체",
      "하이드라진 유도체"
     ],
     "3": [
      "알킬알루미늄",
      "알킬리튬",
      "황린",
      "금속의 수소화물",
      "칼슘 또는 알루미늄의 탄화물",
      "금수성"
     ],
     "2": [
      "황화린",
      "적린",
      "금속분",
      "마그네슘",
      "인화성고체"
     ],
     "1": [
      "염소산염류",
      "과염소산염류",
      "무기과산화물",
      "아염소산염류",
      "질산염류",
      "과망가니즈산염류",
      "과망간산염류",
      "중크롬산염류",
      "다이크로뮴산염류"
     ],
     "6": [
      "과염소산",
      "과산화수소",
      "질산"
     ]
    },
    "matrix_order": [
     "1",
     "2",
     "3",
     "4",
     "5",
     "6"
    ],
    "matrix": [
     [
      "-",
      "x",
      "x",
      "x",
      "x",
      "o"
     ],
     [
      "x",
      "-",
      "x",
      "o",
      "o",
      "x"
     ],
     [
      "x",
      "x",
      "-",
      "o",
      "x",
      "x"
     ],
     [
      "x",
      "o",
      "o",
      "-",
      "o",
      "x"
     ],
     [
      "x",
      "o",
      "x",
      "o",
      "-",
      "x"
     ],
     [
      "o",
      "x",
      "x",
      "x",
      "x",
      "-"
     ]
    ],
    "notes": {
     "x": {
      "ko": "혼재 기준상 함께 실을 수 없는 유별(지정수량 1/10 초과 시). 저장도 같은 저장소에 두지 않는다(별표18).",
      "en": "Classes that may not be loaded together under the mixing rule (above 1/10 of the designated quantity); also kept in separate storage (Annex 18)."
     },
     "o": {
      "ko": "혼재 기준상 함께 실을 수 있는 유별",
      "en": "Classes that may be loaded together under the mixing rule"
     },
     "-": {
      "ko": "같은 유별",
      "en": "Same class"
     }
    }
   },
   "un": {
    "ko": "UN 운송 위험 등급 (IMDG 격리표 참고)",
    "en": "UN transport hazard class (IMDG segregation table as reference)",
    "source": "imdg_7_2_4",
    "classes": {
     "1": {
      "ko": "1 화약류",
      "en": "1 Explosives"
     },
     "2.1": {
      "ko": "2.1 인화성 가스",
      "en": "2.1 Flammable gases"
     },
     "2.2": {
      "ko": "2.2 비인화성·비독성 가스",
      "en": "2.2 Non-flammable, non-toxic gases"
     },
     "2.3": {
      "ko": "2.3 독성 가스",
      "en": "2.3 Toxic gases"
     },
     "3": {
      "ko": "3 인화성 액체",
      "en": "3 Flammable liquids"
     },
     "4.1": {
      "ko": "4.1 인화성 고체",
      "en": "4.1 Flammable solids"
     },
     "4.2": {
      "ko": "4.2 자연발화성 물질",
      "en": "4.2 Spontaneously combustible"
     },
     "4.3": {
      "ko": "4.3 물반응성 물질",
      "en": "4.3 Dangerous when wet"
     },
     "5.1": {
      "ko": "5.1 산화성 물질",
      "en": "5.1 Oxidizing substances"
     },
     "5.2": {
      "ko": "5.2 유기과산화물",
      "en": "5.2 Organic peroxides"
     },
     "6.1": {
      "ko": "6.1 독성 물질",
      "en": "6.1 Toxic substances"
     },
     "6.2": {
      "ko": "6.2 감염성 물질",
      "en": "6.2 Infectious substances"
     },
     "7": {
      "ko": "7 방사성 물질",
      "en": "7 Radioactive material"
     },
     "8": {
      "ko": "8 부식성 물질",
      "en": "8 Corrosive substances"
     },
     "9": {
      "ko": "9 기타 위험물",
      "en": "9 Miscellaneous"
     }
    },
    "matrix_order": [
     "1",
     "2.1",
     "2.2",
     "2.3",
     "3",
     "4.1",
     "4.2",
     "4.3",
     "5.1",
     "5.2",
     "6.1",
     "6.2",
     "7",
     "8",
     "9"
    ],
    "matrix": [
     [
      "*",
      "4",
      "2",
      "2",
      "4",
      "4",
      "4",
      "4",
      "4",
      "4",
      "2",
      "4",
      "2",
      "4",
      "X"
     ],
     [
      "4",
      "X",
      "X",
      "X",
      "2",
      "1",
      "2",
      "X",
      "2",
      "2",
      "X",
      "4",
      "2",
      "1",
      "X"
     ],
     [
      "2",
      "X",
      "X",
      "X",
      "1",
      "X",
      "1",
      "X",
      "X",
      "1",
      "X",
      "2",
      "1",
      "X",
      "X"
     ],
     [
      "2",
      "X",
      "X",
      "X",
      "2",
      "X",
      "2",
      "X",
      "X",
      "2",
      "X",
      "2",
      "1",
      "X",
      "X"
     ],
     [
      "4",
      "2",
      "1",
      "2",
      "X",
      "X",
      "2",
      "1",
      "2",
      "2",
      "X",
      "3",
      "2",
      "X",
      "X"
     ],
     [
      "4",
      "1",
      "X",
      "X",
      "X",
      "X",
      "1",
      "X",
      "1",
      "2",
      "X",
      "3",
      "2",
      "1",
      "X"
     ],
     [
      "4",
      "2",
      "1",
      "2",
      "2",
      "1",
      "X",
      "1",
      "2",
      "2",
      "1",
      "3",
      "2",
      "1",
      "X"
     ],
     [
      "4",
      "X",
      "X",
      "X",
      "1",
      "X",
      "1",
      "X",
      "2",
      "2",
      "X",
      "2",
      "2",
      "1",
      "X"
     ],
     [
      "4",
      "2",
      "X",
      "X",
      "2",
      "1",
      "2",
      "2",
      "X",
      "2",
      "1",
      "3",
      "1",
      "2",
      "X"
     ],
     [
      "4",
      "2",
      "1",
      "2",
      "2",
      "2",
      "2",
      "2",
      "2",
      "X",
      "1",
      "3",
      "2",
      "2",
      "X"
     ],
     [
      "2",
      "X",
      "X",
      "X",
      "X",
      "X",
      "1",
      "X",
      "1",
      "1",
      "X",
      "1",
      "X",
      "X",
      "X"
     ],
     [
      "4",
      "4",
      "2",
      "2",
      "3",
      "3",
      "3",
      "2",
      "3",
      "3",
      "1",
      "X",
      "3",
      "3",
      "X"
     ],
     [
      "2",
      "2",
      "1",
      "1",
      "2",
      "2",
      "2",
      "2",
      "1",
      "2",
      "X",
      "3",
      "X",
      "2",
      "X"
     ],
     [
      "4",
      "1",
      "X",
      "X",
      "X",
      "1",
      "1",
      "1",
      "2",
      "2",
      "X",
      "3",
      "2",
      "X",
      "X"
     ],
     [
      "X",
      "X",
      "X",
      "X",
      "X",
      "X",
      "X",
      "X",
      "X",
      "X",
      "X",
      "X",
      "X",
      "X",
      "X"
     ]
    ],
    "outcome_of": {
     "X": "o",
     "1": "c",
     "2": "x",
     "3": "x",
     "4": "x",
     "*": "c"
    },
    "notes": {
     "X": {
      "ko": "격리표상 일반 격리 요구 없음(개별 위험물 목록 확인)",
      "en": "No general segregation in the table (check the Dangerous Goods List entry)"
     },
     "1": {
      "ko": "격리표 1 \"Away from\" — 떨어뜨려 둔다",
      "en": "Table code 1 \"Away from\""
     },
     "2": {
      "ko": "격리표 2 \"Separated from\" — 분리해 둔다",
      "en": "Table code 2 \"Separated from\""
     },
     "3": {
      "ko": "격리표 3 \"Separated by a complete compartment or hold from\"",
      "en": "Table code 3 \"Separated by a complete compartment or hold from\""
     },
     "4": {
      "ko": "격리표 4 \"Separated longitudinally by an intervening complete compartment or hold from\"",
      "en": "Table code 4 \"Separated longitudinally by an intervening complete compartment or hold from\""
     },
     "*": {
      "ko": "화약류끼리는 적합성 그룹에 따름",
      "en": "Explosives with each other follow the compatibility groups"
     }
    }
   },
   "ghs": {
    "ko": "GHS 분류 기반 반응성 묶음",
    "en": "Reactive groups from GHS classification",
    "source": "ghs_groups",
    "classes": {
     "EX": {
      "ko": "폭발성",
      "en": "Explosive"
     },
     "OX": {
      "ko": "산화성",
      "en": "Oxidizer"
     },
     "OP": {
      "ko": "유기과산화물",
      "en": "Organic peroxide"
     },
     "SR": {
      "ko": "자기반응성",
      "en": "Self-reactive"
     },
     "FL": {
      "ko": "인화성·가연성",
      "en": "Flammable"
     },
     "PY": {
      "ko": "자연발화성",
      "en": "Pyrophoric"
     },
     "SH": {
      "ko": "자기발열성",
      "en": "Self-heating"
     },
     "WR": {
      "ko": "물반응성",
      "en": "Water-reactive"
     },
     "AC": {
      "ko": "부식성 산",
      "en": "Corrosive acid"
     },
     "BA": {
      "ko": "부식성 염기",
      "en": "Corrosive base"
     },
     "CO": {
      "ko": "부식성(산·염기 미상)",
      "en": "Corrosive (acid/base not known)"
     },
     "AG": {
      "ko": "산과 접촉 시 유독 기체 발생",
      "en": "Liberates toxic gas with acids"
     },
     "WT": {
      "ko": "물과 접촉 시 유독 기체 발생",
      "en": "Liberates toxic gas with water"
     }
    },
    "from_hazards": {
     "EX": [
      "expl"
     ],
     "OX": [
      "ox_gas",
      "ox_liq",
      "ox_sol"
     ],
     "OP": [
      "org_perox"
     ],
     "SR": [
      "self_react"
     ],
     "FL": [
      "flam_gas",
      "flam_liq",
      "flam_sol",
      "aerosol"
     ],
     "PY": [
      "pyr_liq",
      "pyr_sol"
     ],
     "SH": [
      "self_heat"
     ],
     "WR": [
      "water_react"
     ],
     "CO": [
      "skin:1",
      "skin:1A",
      "skin:1B",
      "skin:1C",
      "met_corr"
     ]
    },
    "from_supplemental": {
     "AG": [
      "EUH031",
      "EUH032"
     ],
     "WT": [
      "EUH029"
     ]
    },
    "acid_base": {
     "ph_acid_max": 2.0,
     "ph_base_min": 11.5,
     "acid_name": "(\\bacids?\\b|산$|염화수소|불화수소|브롬화수소|hydrogen (chloride|fluoride|bromide))",
     "base_name": "(hydroxide|수산화|ammonia|암모니아|amines?\\b|아민$|hydrazine|하이드라진|히드라진)"
    },
    "pairs": [
     [
      "EX",
      "OX",
      "x",
      "expl"
     ],
     [
      "EX",
      "OP",
      "x",
      "expl"
     ],
     [
      "EX",
      "SR",
      "x",
      "expl"
     ],
     [
      "EX",
      "FL",
      "x",
      "expl"
     ],
     [
      "EX",
      "PY",
      "x",
      "expl"
     ],
     [
      "EX",
      "SH",
      "x",
      "expl"
     ],
     [
      "EX",
      "WR",
      "x",
      "expl"
     ],
     [
      "EX",
      "AC",
      "x",
      "expl"
     ],
     [
      "EX",
      "BA",
      "x",
      "expl"
     ],
     [
      "EX",
      "CO",
      "x",
      "expl"
     ],
     [
      "OX",
      "FL",
      "x",
      "ox_fuel"
     ],
     [
      "OX",
      "OP",
      "x",
      "ox_fuel"
     ],
     [
      "OX",
      "SR",
      "x",
      "ox_fuel"
     ],
     [
      "OX",
      "PY",
      "x",
      "ox_fuel"
     ],
     [
      "OX",
      "SH",
      "x",
      "ox_fuel"
     ],
     [
      "OX",
      "WR",
      "x",
      "ox_wr"
     ],
     [
      "OX",
      "AC",
      "c",
      "ox_acid"
     ],
     [
      "OX",
      "BA",
      "c",
      "ox_base"
     ],
     [
      "OX",
      "CO",
      "c",
      "ox_acid"
     ],
     [
      "OP",
      "FL",
      "c",
      "perox_fire"
     ],
     [
      "OP",
      "AC",
      "x",
      "perox_decomp"
     ],
     [
      "OP",
      "BA",
      "x",
      "perox_decomp"
     ],
     [
      "OP",
      "CO",
      "x",
      "perox_decomp"
     ],
     [
      "OP",
      "PY",
      "x",
      "perox_ign"
     ],
     [
      "OP",
      "SH",
      "x",
      "perox_ign"
     ],
     [
      "OP",
      "WR",
      "c",
      "perox_wr"
     ],
     [
      "OP",
      "SR",
      "c",
      "perox_fire"
     ],
     [
      "SR",
      "FL",
      "c",
      "perox_fire"
     ],
     [
      "SR",
      "AC",
      "x",
      "perox_decomp"
     ],
     [
      "SR",
      "BA",
      "x",
      "perox_decomp"
     ],
     [
      "SR",
      "CO",
      "x",
      "perox_decomp"
     ],
     [
      "SR",
      "PY",
      "x",
      "perox_ign"
     ],
     [
      "SR",
      "SH",
      "x",
      "perox_ign"
     ],
     [
      "SR",
      "WR",
      "c",
      "perox_wr"
     ],
     [
      "FL",
      "PY",
      "x",
      "pyro_ign"
     ],
     [
      "FL",
      "SH",
      "c",
      "pyro_ign"
     ],
     [
      "FL",
      "WR",
      "c",
      "wr_fire"
     ],
     [
      "FL",
      "AC",
      "c",
      "acid_fuel"
     ],
     [
      "PY",
      "WR",
      "c",
      "pyro_wr"
     ],
     [
      "PY",
      "AC",
      "x",
      "pyro_acid"
     ],
     [
      "PY",
      "BA",
      "c",
      "pyro_acid"
     ],
     [
      "PY",
      "CO",
      "c",
      "pyro_acid"
     ],
     [
      "SH",
      "AC",
      "c",
      "pyro_acid"
     ],
     [
      "WR",
      "AC",
      "x",
      "wr_aq"
     ],
     [
      "WR",
      "BA",
      "x",
      "wr_aq"
     ],
     [
      "WR",
      "CO",
      "x",
      "wr_aq"
     ],
     [
      "AC",
      "BA",
      "x",
      "neutral"
     ],
     [
      "AC",
      "CO",
      "c",
      "neutral"
     ],
     [
      "BA",
      "CO",
      "c",
      "neutral"
     ],
     [
      "AC",
      "AG",
      "x",
      "toxic_gas"
     ],
     [
      "CO",
      "AG",
      "c",
      "toxic_gas"
     ],
     [
      "WT",
      "AC",
      "x",
      "toxic_gas_water"
     ],
     [
      "WT",
      "BA",
      "x",
      "toxic_gas_water"
     ],
     [
      "WT",
      "CO",
      "x",
      "toxic_gas_water"
     ]
    ],
    "notes": {
     "expl": {
      "ko": "폭발성 물질은 다른 위험물과 따로 저장한다.",
      "en": "Explosives are stored apart from other dangerous goods."
     },
     "ox_fuel": {
      "ko": "산화제는 가연물의 연소를 강렬하게 하거나 발화시킬 수 있다.",
      "en": "Oxidizers can ignite or intensify the burning of combustibles."
     },
     "ox_wr": {
      "ko": "물반응성 물질이 내는 인화성 기체와 산화제가 만나면 화재·폭발 위험이 커진다.",
      "en": "Flammable gas released by water-reactive substances plus an oxidizer increases fire and explosion risk."
     },
     "ox_acid": {
      "ko": "일부 산화제는 산과 만나 유독 기체를 내거나 발열한다(예: 염소산염·차아염소산염 + 산).",
      "en": "Some oxidizers release toxic gas or heat with acids (e.g. chlorates, hypochlorites + acid)."
     },
     "ox_base": {
      "ko": "일부 산화제는 염기·환원성 물질과 발열 반응한다. 개별 MSDS 7·10항을 확인한다.",
      "en": "Some oxidizers react exothermically with bases or reducing agents. Check SDS sections 7 and 10."
     },
     "perox_fire": {
      "ko": "가열·화재 시 함께 타며 불을 키운다. 따로 둔다.",
      "en": "Burns together and spreads fire when heated. Store apart."
     },
     "perox_decomp": {
      "ko": "산·염기는 유기과산화물·자기반응성 물질의 분해를 촉진한다.",
      "en": "Acids and bases accelerate the decomposition of organic peroxides and self-reactive substances."
     },
     "perox_ign": {
      "ko": "자연발화·자기발열 물질이 발화원이 되어 분해·폭발을 일으킬 수 있다.",
      "en": "Pyrophoric or self-heating substances can act as an ignition source for decomposition."
     },
     "perox_wr": {
      "ko": "물반응성 물질의 발열·기체 발생이 분해를 일으킬 수 있다.",
      "en": "Heat and gas from water-reactive substances may trigger decomposition."
     },
     "pyro_ign": {
      "ko": "자연발화성·자기발열성 물질이 인화성 물질의 발화원이 된다.",
      "en": "Pyrophoric or self-heating substances are an ignition source for flammables."
     },
     "wr_fire": {
      "ko": "물로 끌 수 없는 물질과 물로 끄는 물질이 섞여 소화 방법이 충돌한다.",
      "en": "Fire-fighting methods conflict: water must not be used on the water-reactive substance."
     },
     "acid_fuel": {
      "ko": "산화성 산(질산 등)은 유기물을 발화시킬 수 있다. 산의 종류를 확인한다.",
      "en": "Oxidizing acids (e.g. nitric acid) can ignite organics. Check the kind of acid."
     },
     "pyro_wr": {
      "ko": "둘 다 공기·물과의 접촉을 막아야 한다. 누출 시 반응이 겹친다.",
      "en": "Both must be kept from air and water; a leak combines the reactions."
     },
     "pyro_acid": {
      "ko": "산·수용액과 접촉하면 발화·발열할 수 있다.",
      "en": "May ignite or heat up on contact with acids or aqueous solutions."
     },
     "wr_aq": {
      "ko": "산·염기 수용액과 격렬히 반응해 인화성 기체·열을 낸다.",
      "en": "Reacts violently with aqueous acids or bases, releasing flammable gas and heat."
     },
     "neutral": {
      "ko": "산과 염기는 격렬한 중화 반응(발열·튐)을 일으킨다.",
      "en": "Acids and bases neutralize violently (heat, spattering)."
     },
     "toxic_gas": {
      "ko": "산과 접촉하면 유독 기체를 낸다(EUH031·EUH032).",
      "en": "Contact with acids liberates toxic gas (EUH031, EUH032)."
     },
     "toxic_gas_water": {
      "ko": "물·수용액과 접촉하면 유독 기체를 낸다(EUH029).",
      "en": "Contact with water or aqueous solutions liberates toxic gas (EUH029)."
     }
    }
   }
  }
 },
 "mixture": {
  "v": 1,
  "about": "Mixture classification constants (service 8). Values from CLP Annex I (Regulation (EC) No 1272/2008 as amended) and UN GHS Rev.10, Part 3-4; worked examples in ECHA Guidance on the Application of the CLP Criteria (Part 3 v5.0 Nov 2024, Parts 4-5 v4.0 Nov 2024). Read by the browser through the generated safety_rules_data.jsx; the classification itself runs in the browser (mixghs_core.jsx).",
  "total_tolerance": 0.5,
  "acute": {
   "routes": {
    "oral": {
     "unit": "mg/kg bw",
     "hazard": "acute_oral",
     "bounds": [
      5,
      50,
      300,
      2000
     ],
     "converted": [
      0.5,
      5,
      100,
      500
     ]
    },
    "dermal": {
     "unit": "mg/kg bw",
     "hazard": "acute_dermal",
     "bounds": [
      50,
      200,
      1000,
      2000
     ],
     "converted": [
      5,
      50,
      300,
      1100
     ]
    },
    "gas": {
     "unit": "ppmV",
     "hazard": "acute_inh_gas",
     "bounds": [
      100,
      500,
      2500,
      20000
     ],
     "converted": [
      10,
      100,
      700,
      4500
     ]
    },
    "vapour": {
     "unit": "mg/L",
     "hazard": "acute_inh_vap",
     "bounds": [
      0.5,
      2,
      10,
      20
     ],
     "converted": [
      0.05,
      0.5,
      3,
      11
     ]
    },
    "dust": {
     "unit": "mg/L",
     "hazard": "acute_inh_dust",
     "bounds": [
      0.05,
      0.5,
      1,
      5
     ],
     "converted": [
      0.005,
      0.05,
      0.5,
      1.5
     ]
    }
   },
   "inhalation_unstated": "vapour",
   "relevant_min": 1.0,
   "relevant_min_cat_1_3": 0.1,
   "unknown_correction_from": 10.0,
   "basis": "CLP Annex I 3.1.3.6 (additivity formula, 3.1.3.6.2.3 correction for unknown ingredients >= 10 %), Table 3.1.1 (category ranges), Table 3.1.2 (converted acute toxicity point estimates), 3.1.3.3(a) relevant ingredients, Table 1.1 generic cut-off 0.1 % for Categories 1-3"
  },
  "skin": {
   "relevant_min": 1.0,
   "corr_gcl": 5.0,
   "irrit_from_corr_gcl": 1.0,
   "irrit_gcl": 10.0,
   "basis": "CLP Annex I 3.2.3.3.4, Table 3.2.3 (additivity; SCLs replace GCLs: sum of C/limit >= 1)"
  },
  "eye": {
   "relevant_min": 1.0,
   "dam_gcl": 3.0,
   "irrit_from_dam_gcl": 1.0,
   "irrit_gcl": 10.0,
   "basis": "CLP Annex I 3.3.3.3, Table 3.3.3 (Skin Corr. 1 + Eye Dam. 1 summed for Eye Dam. 1; SCLs replace GCLs)"
  },
  "sens": {
   "resp_sens": {
    "1": 1.0,
    "1A": 0.1,
    "1B": 1.0
   },
   "resp_sens_gas": {
    "1": 0.2,
    "1A": 0.1,
    "1B": 0.2
   },
   "skin_sens": {
    "1": 1.0,
    "1A": 0.1,
    "1B": 1.0
   },
   "elicitation_fraction": 0.1,
   "basis": "CLP Annex I Table 3.4.5 (no additivity); EUH208 at 1/10 of the limit (Annex II 2.8)"
  },
  "cmr": {
   "muta": {
    "1": 0.1,
    "1A": 0.1,
    "1B": 0.1,
    "2": 1.0
   },
   "carc": {
    "1": 0.1,
    "1A": 0.1,
    "1B": 0.1,
    "2": 1.0
   },
   "repr": {
    "1": 0.3,
    "1A": 0.3,
    "1B": 0.3,
    "2": 3.0
   },
   "lact": {
    "1": 0.3
   },
   "basis": "CLP Annex I Tables 3.5.2, 3.6.2, 3.7.2 (no additivity across ingredients is applied here)"
  },
  "stot": {
   "cat1_to_1": 10.0,
   "cat1_to_2": 1.0,
   "cat2_to_2": 10.0,
   "cat3_sum": 20.0,
   "basis": "CLP Annex I Tables 3.8.3 and 3.9.4; 3.8.3.4.5 (Category 3: 20 % summed, respiratory irritation and narcotic effects separately)"
  },
  "asp": {
   "cat1_sum": 10.0,
   "viscosity_max_mm2s": 20.5,
   "basis": "CLP Annex I 3.10.3.3.1 (sum >= 10 % and kinematic viscosity <= 20.5 mm2/s at 40 C)"
  },
  "aquatic": {
   "trigger": 25.0,
   "relevant_min_cat1": 0.1,
   "relevant_min_other": 1.0,
   "basis": "CLP Annex I 4.1.3.5.5, Tables 4.1.1 and 4.1.2 (summation with M-factors, Chronic 1-4); relevant ingredients 4.1.3.1 (0.1 % / M for Acute 1 and Chronic 1, 1 % for others)"
  },
  "label": {
   "drop_ghs07_if": {
    "acute4": [
     "GHS06"
    ],
    "irritant": [
     "GHS05",
     "GHS08_resp"
    ],
    "skin_sens": [
     "GHS08_resp"
    ]
   },
   "drop_h_if": {
    "H318": [
     "H314"
    ],
    "H400": [
     "H410"
    ],
    "H319": [
     "H318",
     "H314"
    ],
    "H315": [
     "H314"
    ]
   },
   "basis": "CLP Article 26 (pictogram precedence) and Article 27 (hazard statements: H314 covers H318; Aquatic Acute 1 with Chronic 1 is labelled H410)"
  }
 }
};

Object.assign(window, { SAFETY_RULES });
