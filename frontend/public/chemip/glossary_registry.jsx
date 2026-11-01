// 용어사전 등록 목록 — 분류 하나 = 자료 파일 두 개(glossary_<분류>.jsx · _en.jsx) + 아래 GLOSSARY_CATS 한 줄(+ index.html 두 줄,
// 분류 이름은 glossary_labels.jsx·_en.jsx 의 cats[k]). 배열 순서 = 화면의 분류 순서.
// 이 밖에 두 자료를 함께 싣는다(정의는 그 파일 한 곳에만 있다):
//   계산기 용어 TERM_GLOSSARY(term_glossary.jsx) — 분류는 그 용어를 쓰는 첫 계산기의 묶음(GLOSSARY_CALC_GROUP_CAT), 예외만 GLOSSARY_CALC_TERM_CAT
//   자료원·규제 약어 GLOSSARY(data.jsx) — 분류 "abbr"
// 항목 모양은 glossary_core.jsx 머리 주석.

const GLOSSARY_CATS = [
  { k: "psm", ko: GLOSSARY_PSM_KO, en: GLOSSARY_PSM_EN },
  { k: "fire", ko: GLOSSARY_FIRE_KO, en: GLOSSARY_FIRE_EN },
  { k: "ih", ko: GLOSSARY_IH_KO, en: GLOSSARY_IH_EN },
  { k: "tox", ko: GLOSSARY_TOX_KO, en: GLOSSARY_TOX_EN },
  { k: "reg", ko: GLOSSARY_REG_KO, en: GLOSSARY_REG_EN },
  { k: "hazmat", ko: GLOSSARY_HAZMAT_KO, en: GLOSSARY_HAZMAT_EN },
  { k: "unitop", ko: GLOSSARY_UNITOP_KO, en: GLOSSARY_UNITOP_EN },
  { k: "thermo", ko: GLOSSARY_THERMO_KO, en: GLOSSARY_THERMO_EN },
  { k: "fluid", ko: GLOSSARY_FLUID_KO, en: GLOSSARY_FLUID_EN },
  { k: "control", ko: GLOSSARY_CONTROL_KO, en: GLOSSARY_CONTROL_EN },
];
const GLOSSARY_ABBR_CAT = "abbr";

// 계산기 묶음(CALC_GROUPS) → 용어사전 분류
const GLOSSARY_CALC_GROUP_CAT = { safety: "ih", flammability: "fire", release: "psm", fire: "fire", chem: "thermo", fluid: "fluid", heat: "fluid", process: "thermo", reaction: "thermo", sizing: "fluid", env: "reg" };
// 묶음과 다른 분류로 둘 계산기 용어
const GLOSSARY_CALC_TERM_CAT = {
  release_grade: "fire", release_characteristic: "fire", hypothetical_volume: "fire", lfl_safety_factor: "fire", ventilation_efficiency_factor: "fire",
  lfl: "fire", ufl: "fire", le_chatelier: "fire", stoich_o2: "fire", stoich_air: "fire", afr: "fire", excess_air: "fire", cst: "fire", loc: "fire",
  stability_class: "tox", dispersion_sigma: "tox", effective_height: "tox", wind_speed: "tox", emission_rate: "tox",
  vessel_head: "unitop", tangent_line: "unitop", liquid_level: "unitop", dry_bulb: "unitop", relative_humidity: "unitop",
  humidity_ratio: "unitop", dew_point: "unitop", moist_enthalpy: "unitop", specific_volume: "unitop",
};

// 시험 key(자료 파일의 exams) — 이름은 GLOSSARY_LABELS.exams
const GLOSSARY_EXAMS = ["pse", "ih", "hm", "ce"];
// 항목의 view 가 가리킬 수 있는 화면 key(APP_SCREENS) — 이름은 GLOSSARY_LABELS.screens
const GLOSSARY_VIEWS = ["sources", "product", "calc", "search", "applicability"];
// 계산기가 없는 계산기 용어(key 앞머리) → 그 용어를 쓰는 화면
const GLOSSARY_TERM_VIEW_PREFIX = { apl_: "applicability", designated_quantity: "applicability" };

Object.assign(window, { GLOSSARY_CATS, GLOSSARY_ABBR_CAT, GLOSSARY_CALC_GROUP_CAT, GLOSSARY_CALC_TERM_CAT, GLOSSARY_EXAMS, GLOSSARY_VIEWS, GLOSSARY_TERM_VIEW_PREFIX });
