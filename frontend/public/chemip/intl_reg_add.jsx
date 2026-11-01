// 국가별 규제 순수 함수 — p/ 내보내기 뒤에 적재한 국가별 규제 DB 코드(g/intl_reg_add_<n>.json 의 한 CAS 몫)를
// 물질 파일의 intl(= /api/regulations/international 응답)에 더한다. React·문구 없음. 형식: CONTRACT.md "g/intl_reg_add.json".
//   intlWithRegAdded(intl, added)   added = { 관할: [항목] } (API 항목 모양). 같은 관할에 같은 regulation 이 이미 있으면 응답 것.
//                                   intl 이 없으면(물질 파일·/api 모두 없음) added 만으로 같은 모양을 만든다.
// 시험: frontend/scripts/tests/test_intl_reg_add.cjs

function intlWithRegAdded(intl, added) {
  const extra = added || {};
  if (!Object.keys(extra).length) return intl;
  const base = (intl && intl.jurisdictions) || {};
  const jurisdictions = { ...base };
  Object.entries(extra).forEach(([code, items]) => {
    const have = new Set((base[code] || []).map(x => x.regulation));
    const fresh = (items || []).filter(x => x && !have.has(x.regulation));
    if (fresh.length) jurisdictions[code] = [...(base[code] || []), ...fresh];
  });
  const count = Object.values(jurisdictions).reduce((s, xs) => s + xs.length, 0);
  return { ...(intl || {}), cas_no: (intl && intl.cas_no) || "", count, jurisdictions, thresholds: (intl && intl.thresholds) || [] };
}

Object.assign(window, { intlWithRegAdded });
