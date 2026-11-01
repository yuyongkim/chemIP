// 용어사전 · 화면 언어로 묶은 전체 항목 GLOSSARY_ENTRIES(한 번만 만든다). 만드는 규칙은 glossary_core.jsx,
// 자료는 glossary_registry.jsx(분류 자료)·term_glossary*.jsx(계산기 용어)·data*.jsx(약어)·calc_registry.jsx(용어 → 계산기).
// 화면(glossary_view.jsx)과 통합 검색(usearch_provider_terms.jsx)이 같은 목록을 읽는다.

const GLOSSARY_ENTRIES = glSort(glBuildEntries({
  cats: GLOSSARY_CATS,
  termKo: TERM_GLOSSARY_KO,
  termEn: TERM_GLOSSARY_EN,
  calcRegistry: CALC_REGISTRY,
  groupCat: GLOSSARY_CALC_GROUP_CAT,
  termCat: GLOSSARY_CALC_TERM_CAT,
  termView: GLOSSARY_TERM_VIEW_PREFIX,
  abbrKo: GLOSSARY_KO,
  abbrEn: GLOSSARY_EN,
  abbrCat: GLOSSARY_ABBR_CAT,
  lang: CHEMIP_LANG,
}), CHEMIP_LANG);

// 분류 순서(화면 단추): 등록 순서 + 약어
const GLOSSARY_CAT_ORDER = [...GLOSSARY_CATS.map(c => c.k), GLOSSARY_ABBR_CAT];

Object.assign(window, { GLOSSARY_ENTRIES, GLOSSARY_CAT_ORDER });
