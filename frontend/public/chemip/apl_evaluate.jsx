// 적용 법규 판정기 · 세 법 판정을 한 번에(순수 함수). 화면(apl_view.jsx)과 시험이 같은 길을 쓴다.
//   aplEvaluate(rows, infos, table, opts) → { psm, cca, hazmat, filled }
//   rows  : 취급량 표 행 [{ id, cas, name, qty, unit, density, conc, state, use, psmClass, hazmat }]
//   infos : { [id]: { ncis, lists, flash, lfl, ufl, density, s15 } }  (api_applicability.jsx aplSubstanceInfo)
//   table : g/hazchem_quantity.json 또는 null,  opts: { industry }

function aplEvaluate(rows, infos, table, opts = {}) {
  const filled = (rows || []).filter(r => r.cas || r.name);
  const hazmat = aplHazmat(filled, infos || {});
  const hazKeys = Object.fromEntries(hazmat.items.map(i => [i.id, i.key]));
  const psm = aplPsm(filled, infos || {}, hazKeys, opts);
  const cca = aplCca(filled, infos || {}, table);
  return { psm, cca, hazmat, filled };
}

Object.assign(window, { aplEvaluate });
