// API 층 · 물성·식별자·운송 사실 — 화면·묶음이 부르는 함수와 훅. 자료는 정적 파일뿐이다(api_static_facts.jsx).
// 집 PC /api 에 같은 경로가 없어서 정적 자료가 꺼진 PC 사이트에서는 null(화면은 아무것도 보이지 않는다).
//   fetchFacts(cas)            f/<CAS>.json 또는 null
//   fetchIdLookup(key)         EC·KE·InChIKey 열쇠 → [[type, CAS, link, name_ko, name_en], ...] (없으면 [])
//   fetchUnEntry(un)           UN 번호 → { name, class, pg, mp, ems, n, cas } 또는 null
//   fetchFactsAnswer(q)        "물질 + 물성" 검색어 → 답 카드 모양(factsAnswer) 또는 null
//   useFacts(cas)              { data, loading, error } (useApi)

function fetchFacts(cas) {
  return staticFacts(cas);
}

async function fetchIdLookup(key) {
  const keys = await staticIdShard(key);
  return (keys && keys[key]) || [];
}

async function fetchUnEntry(un) {
  const rows = await staticUnIndex();
  return (rows && rows[un]) || null;
}

// 물성 낱말을 떼어 낸 물질 이름으로 물질 검색(정적 색인 먼저) → 고른 물질의 f/<CAS>.json → 답.
async function fetchFactsAnswer(q, labelSets = [FACTS_LABELS_KO, FACTS_LABELS_EN]) {
  const parsed = factsParseQuery(q, labelSets);
  if (!parsed) return null;
  const found = await fetchChemicalSearch(parsed.substance, 20);
  const item = factsPickItem(found && found.items, parsed.substance);
  if (!item) return null;
  const facts = await fetchFacts(item.cas_no);
  return factsAnswer(facts, parsed.prop, item, FACTS_LABELS, CHEMIP_LANG);
}

function useFacts(cas) {
  return useApi(() => (cas ? fetchFacts(cas) : Promise.resolve(null)), [cas]);
}

Object.assign(window, { fetchFacts, fetchIdLookup, fetchUnEntry, fetchFactsAnswer, useFacts });
