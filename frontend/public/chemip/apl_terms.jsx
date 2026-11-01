// 적용 법규 판정기 · 칸·결과 이름 → 용어 설명 key(TERM_GLOSSARY, term_glossary.jsx). 화면은 여기서만 key 를 읽는다.
// test_calculators.cjs 의 "쓰이지 않는 용어 없음" 점검이 이 목록도 쓰는 곳으로 센다.

const APL_TERMS = {
  qty: "apl_max_holding",
  conc: "mass_percent",
  density: "density",
  state: "apl_physical_state",
  use: "apl_facility_type",
  psmQty: "apl_psm_quantity",
  psmR: "apl_psm_r",
  ccaQty: "apl_cca_quantity",
  ccaTier: "apl_cca_tier",
  hzQty: "designated_quantity",
  hzMult: "apl_multiple",
  dike: "apl_dike_capacity",
};

const APL_TERM_KEYS = [...new Set(Object.values(APL_TERMS))];

Object.assign(window, { APL_TERMS, APL_TERM_KEYS });
