// API 층 · 국가별 규제 화면 자료 한 덩어리: 국가별 규제 DB(intl, 정적 p/<cas>.json 먼저 → /api/regulations/international)
// + 같은 CAS 의 상대국 법령 목록(intl_lists/: 정적이면 p 파일의 intl_lists + g/rulebook.json 머리, /api 면 응답의 named_lists).
// p/ 내보내기 뒤에 추가된 목록(EU REACH 등록 등)은 g/intl_add.json 머리 + CAS 조각 g/intl_add_<n>.json 에서 더한다(CONTRACT.md).
// p/ 뒤에 적재한 국가별 규제 DB 코드(US DOT HMT·일본 化管法 등)는 g/intl_reg_add.json + g/intl_reg_add_<n>.json 에서 더한다(intl_reg_add.jsx).
// 조각 읽기(staticIntlAdded·staticIntlRegAdded)와 정적 intl·수출입 조립에 조각 합치기는 api_static_intl.jsx.
// 이름 표기만 다른 줄은 화면에서도 합친다(intl_merge.jsx intlCombine). 훅은 api_regulations.jsx 의 useIntlRegulations.

async function staticIntlNamedLists(cas) {
  const [page, added] = await Promise.all([staticPageForCas(cas), staticIntlAdded(cas)]);
  if ((!page || !Array.isArray(page.intl_lists)) && !added.lists.length) return null;
  const rulebook = await staticPagesFile(STATIC_LAYOUT.pages.rulebook).catch(() => null);
  const meta = Object.fromEntries([...added.meta, ...((rulebook && rulebook.intl_lists) || [])].map(m => [m.list_id, m]));
  return intlNamedItems(intlWithAdded(page && page.intl_lists, added.lists), meta);
}

async function fetchIntlCombined(cas) {
  const regAdded = await staticIntlRegAdded(cas).catch(() => null);
  const intl = intlWithRegAdded(await staticFirst(() => staticIntl(cas), () => originGet(`/regulations/international/${encodeURIComponent(cas)}`)
    .catch(e => { if (regAdded) return { cas_no: cas, count: 0, jurisdictions: {}, thresholds: [] }; throw e; })), regAdded);
  const named = intl && Array.isArray(intl.named_lists)
    ? intlNamedItems(intl.named_lists, null)
    : await staticIntlNamedLists(cas).catch(() => null);
  return intlCombine(intl, named);
}

Object.assign(window, { staticIntlNamedLists, fetchIntlCombined });
