// API 층 · 정적 자료 — 국가별 규제(intl)와 수출입 조립에 p/ 내보내기 뒤 덧붙인 조각(sidecar)을 합친다.
//   g/intl_add.json + g/intl_add_<n>.json        상대국 법령 목록(intl_lists/) 추가분 — EU REACH 등록·EU 먹는물 지침 등
//   g/intl_reg_add.json + g/intl_reg_add_<n>.json 국가별 규제 DB 코드 추가분 — US DOT HMT·일본 化管法·캐나다 NPRI 등
// 형식: scripts/static_export/CONTRACT.md. 합치는 규칙은 순수 함수 intl_merge.jsx(intlWithAdded)·intl_reg_add.jsx(intlWithRegAdded).
// PC 백엔드는 같은 목록을 이미 응답에 넣으므로, 여기서 합쳐야 PC 꺼짐(정적)과 PC 켜짐(/api)이 같은 답이 된다
// (frontend/scripts/tests/test_static_trade.cjs). 파일 받기는 api_static.jsx(staticPagesFile·staticPageForCas).

// CAS → { lists: [{list_id, entries}], meta: [목록 머리] } (추가 목록이 없거나 파일이 없으면 빈 것)
async function staticIntlAdded(cas) {
  const L = STATIC_LAYOUT.pages.intlAdd;
  const head = await staticPagesFile(L.index).catch(() => null);
  if (!head || !(head.buckets > 0)) return { lists: [], meta: [] };
  const shard = await staticPagesFile(L.shard(ssiFnv1a32(cas) % head.buckets)).catch(() => null);
  return { lists: (shard && shard.cas && shard.cas[cas]) || [], meta: head.lists || [] };
}

// CAS → { 관할: [항목] } — p/ 뒤에 적재한 국가별 규제 DB 코드. 없으면 null.
async function staticIntlRegAdded(cas) {
  const L = STATIC_LAYOUT.pages.intlRegAdd;
  const head = await staticPagesFile(L.index).catch(() => null);
  if (!head || !(head.buckets > 0)) return null;
  const shard = await staticPagesFile(L.shard(ssiFnv1a32(cas) % head.buckets)).catch(() => null);
  return (shard && shard.cas && shard.cas[cas]) || null;
}

// 목록 머리(규칙집 intl_lists) + 추가분 머리 → 백엔드 load_intl_lists 와 같은 파일 이름 순서. 같은 list_id 는 규칙집 것.
function staticIntlMetaWithAdded(rulebookLists, addedMeta) {
  const base = rulebookLists || [];
  const have = new Set(base.map(m => m.list_id));
  const extra = (addedMeta || []).filter(m => m && m.list_id && !have.has(m.list_id))
    .map(m => ({ ...m, file: m.file || `intl_lists/${m.list_id}.json` }));
  if (!extra.length) return base;
  const key = m => String(m.file || `intl_lists/${m.list_id}.json`);
  return [...base, ...extra].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
}

// intl → 서버(backend intl_regulatory_store.get_by_cas)와 같은 모양: 목록마다 한 항목(이름 표기 합침, intlDedupe = intl_dedupe.py),
// 관할 안은 regulation 코드 순(서버 SQL ORDER BY regulation), count = 항목 수. 옛 p/ 파일의 겹친 줄도 여기서 합쳐진다.
function staticIntlLikeServer(intl) {
  if (!intl || !intl.jurisdictions) return intl;
  const jur = intlDedupe(intl.jurisdictions);
  const byCode = (a, b) => (a.regulation < b.regulation ? -1 : a.regulation > b.regulation ? 1 : 0);
  Object.keys(jur).forEach(code => { jur[code] = [...jur[code]].sort(byCode); });
  return { ...intl, count: Object.values(jur).reduce((n, xs) => n + xs.length, 0), jurisdictions: jur };
}

// 물질 파일 + 조각 → 조각을 합친 물질 파일·규칙집 (조각이 없으면 원래 것 그대로, changed=false)
function staticFactsWithSidecars(page, rulebook, added, regAdded) {
  const addLists = (added && added.lists) || [];
  const changed = addLists.length > 0 || !!(regAdded && Object.keys(regAdded).length);
  if (!changed) return { page: { ...page, intl: staticIntlLikeServer(page.intl || null) }, rulebook, changed };
  const facts = { ...page, intl: staticIntlLikeServer(intlWithRegAdded(page.intl || null, regAdded)), intl_lists: intlWithAdded(page.intl_lists, addLists) };
  const book = rulebook ? { ...rulebook, intl_lists: staticIntlMetaWithAdded(rulebook.intl_lists, added && added.meta) } : rulebook;
  return { page: facts, rulebook: book, changed };
}

// /api/regulations/international 의 named_lists 와 같은 모양(backend/core/intl_named_lists.py): 등재 항목이 있는 목록만, 파일 이름 순.
function staticNamedLists(intlLists, metaLists) {
  const order = new Map((metaLists || []).map((m, i) => [m.list_id, i]));
  const meta = new Map((metaLists || []).map(m => [m.list_id, m]));
  return (intlLists || [])
    .filter(m => m && (m.entries || []).length)
    .sort((a, b) => (order.has(a.list_id) ? order.get(a.list_id) : 1e9) - (order.has(b.list_id) ? order.get(b.list_id) : 1e9))
    .map(m => {
      const md = meta.get(m.list_id) || {};
      return {
        list_id: m.list_id || "", jurisdiction: md.jurisdiction || "", title: md.title || "", law: md.law || "",
        entries: m.entries.map(e => ({ name: e.name || "", detail: e.detail || "", ...intlEntryFacts(e) })),
      };
    });
}

async function staticSidecars(cas) {
  const [added, regAdded] = await Promise.all([staticIntlAdded(cas).catch(() => null), staticIntlRegAdded(cas).catch(() => null)]);
  return { added, regAdded };
}

// 국가별 규제 = 물질 파일의 intl + 국가별 규제 DB 추가분 + 상대국 법령 목록(named_lists). 물질 파일이 없으면 null(→ /api).
async function staticIntl(cas) {
  const page = await staticPageForCas(cas);
  if (!page || !page.intl) return null;
  const [{ added, regAdded }, rulebook] = await Promise.all([staticSidecars(cas), staticPagesFile(STATIC_LAYOUT.pages.rulebook).catch(() => null)]);
  if (!rulebook) return page.intl; // 규칙집이 없으면 옛 답 그대로(목록 이름을 붙일 수 없다)
  const merged = staticFactsWithSidecars(page, rulebook, added, regAdded);
  return { ...merged.page.intl, named_lists: staticNamedLists(merged.page.intl_lists, merged.rulebook.intl_lists) };
}

// 수출입 통제. 상대국 없는 기본 화면은 파일에 서버 응답 그대로 있다 — 조각이 이 CAS 에 뭔가 더하면 규칙집으로 다시 조립한다.
async function staticTradeControls(cas, direction, country) {
  const page = await staticPageForCas(cas);
  if (!page) return null;
  const dir = String(direction || "import").trim().toLowerCase();
  const ctry = String(country || "").trim().toUpperCase();
  const { added, regAdded } = await staticSidecars(cas);
  if (!ctry && !staticFactsWithSidecars(page, null, added, regAdded).changed && page.trade && page.trade[dir]) return page.trade[dir];
  const L = STATIC_LAYOUT.pages;
  const [rulebook, common] = await Promise.all([staticPagesFile(L.rulebook), staticPagesFile(L.tradeCommon)]);
  if (!rulebook || !common) return null;
  const merged = staticFactsWithSidecars(page, rulebook, added, regAdded);
  return assembleTradeControls(merged.page, merged.rulebook, common, cas, direction, country);
}

Object.assign(window, {
  staticIntlAdded, staticIntlRegAdded, staticIntlLikeServer, staticIntlMetaWithAdded, staticFactsWithSidecars, staticNamedLists, staticIntl, staticTradeControls,
});
