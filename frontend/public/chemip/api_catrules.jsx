// API 층 · 물질 상세 "분류로 걸리는 규제"(참고용). 화면 컴포넌트는 fetch 하지 않고 여기 훅만 쓴다.
//   물성(MSDS 9항 인화점·끓는점·녹는점·폭발 한계)  fetchFacts → f/<CAS>.json (aplFirstProp, api_applicability.jsx)
//   EU 조화 분류                                    g/clp_annex6.json (fetchSafetyTable("clpAnnex6"), api_safety_tools.jsx)
//   KOSHA 분류·15항 위험물 글                       물질 상세 sections(없으면 f 파일 link 의 KOSHA 상세) → ghpMsdsItems / ghpKoshaClassification
//   이름으로 오른 목록 코드                          수출입 substance.list_codes + 국가별 규제 regulation 코드(fetchIntlCombined)
// 결과 { input(catEvaluate 의 입력), clp(부록 VI 줄 | null), atp, msdsOldEu } — 판정은 catrule_core.jsx.

const CATRULE_OLD_EU_RE = /(^|[\s;,|·(])R\d{2}(?![\d])/;

function catruleSections15Text(items) {
  return Object.values(items || {}).join(" | ");
}

async function fetchCatruleInput(cas, sections) {
  const [facts, annex6, intl, trade] = await Promise.all([
    fetchFacts(cas).catch(() => null),
    fetchSafetyTable("clpAnnex6"),
    fetchIntlCombined(cas).catch(() => null),
    fetchTradeControls(cas, "import", "").catch(() => null),
  ]);
  let secs = sections || [];
  if (!secs.length && facts && facts.link && facts.link !== cas) {
    const d = await fetchChemicalDetail(facts.link).catch(() => null);
    secs = (d && d.sections) || [];
  }
  const detail = { sections: secs };
  const s2 = ghpMsdsItems(detail, 2);
  const s15 = ghpMsdsItems(detail, 15);
  const clpRows = (annex6 && annex6.entries && annex6.entries[cas]) || null;
  const clp = clpRows ? [...new Set(clpRows.flatMap(r => r.hazards || []))] : null;
  const intlCodes = intl ? Object.values(intl.jurisdictions || {}).flat().map(x => x.regulation) : [];
  const listCodes = ((trade && trade.substance && trade.substance.list_codes) || []).concat(intlCodes);
  const input = {
    cas,
    flash: aplFirstProp(facts, "flash_point", -273, 600),
    bp: aplFirstProp(facts, "boiling_point", -273, 1500),
    mp: aplFirstProp(facts, "melting_point", -273, 3500),
    lfl: aplFirstProp(facts, "lfl", 0, 100),
    ufl: aplFirstProp(facts, "ufl", 0, 100),
    kosha: ghpKoshaClassification(s2.B02 || ""),
    clp,
    lists: [...new Set(listCodes)],
    s15: s15.O06 ? [s15.O06] : [],
  };
  return {
    input, clp, atp: (annex6 && annex6.atp) || "",
    msdsOldEu: CATRULE_OLD_EU_RE.test(catruleSections15Text(s15)),
  };
}

// sections 가 아직 오는 중이면(loading) 기다렸다가 한 번 받는다
function useCategoryRules(cas, sections, ready, inView) {
  const key = `${cas}|${(sections || []).length}`;
  return useApi(
    () => (cas && ready && inView ? fetchCatruleInput(cas, sections) : Promise.resolve(null)),
    [key, ready, inView]
  );
}

Object.assign(window, { CATRULE_OLD_EU_RE, fetchCatruleInput, useCategoryRules });
