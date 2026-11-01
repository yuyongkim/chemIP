// 통합 검색 묶음 · 화학사고 소식 — 화면 바로가기 한 줄(사고·누출 같은 낱말), 소식이 많은 물질(이름·CAS → ?view=feed&sub=<CAS>),
// 최근 소식 제목·물질 이름(→ 원문 새 창). CAS 를 넣으면 그 물질 파일(feed/by-cas)의 소식에서도 찾는다.
// 자료: fetchFeedLatest·fetchFeedByCas(api_feed.jsx, 정적 파일만). 받지 못하면 화면 줄만. 문구·낱말: FEED_LABELS(_KO·_EN 두 벌).

const USP_FEED_SCREEN_ID = "feed:screen";

function usFeedScreenDoc(labelsKo, labelsEn, labels) {
  const kw = [...(labelsKo?.usearch?.keywords || []), ...(labelsEn?.usearch?.keywords || [])];
  return {
    id: USP_FEED_SCREEN_ID,
    fields: [{ t: labelsKo.usearch.screenTitle, w: 1 }, { t: labelsEn.usearch.screenTitle, w: 1 }, ...usUnique(kw).map(t => ({ t, w: 0.8 }))],
    item: { id: USP_FEED_SCREEN_ID, title: labels.usearch.screenTitle, desc: labels.usearch.screenHint, badge: labels.usearch.badge, href: feedHref({}) },
  };
}

// latest.json substances: [[CAS, 이름, 건수]]
function usFeedSubstanceDocs(substances, labels) {
  return (substances || []).filter(s => Array.isArray(s) && s[0]).map(([cas, name, n]) => ({
    id: `feed:cas:${cas}`,
    fields: [{ t: name, w: 0.95 }, { t: cas, w: 1 }],
    item: { id: `feed:cas:${cas}`, title: labels.usearch.substanceTitle(name || cas), sub: labels.usearch.substanceSub(cas, n),
      badge: labels.usearch.badge, href: feedHref({ sub: cas }) },
  }));
}

function usFeedItemDocs(items, labels, sources) {
  return (items || []).map(it => ({
    id: `feed:${it.id}`,
    fields: [{ t: it.title, w: 0.9 }, ...(it.names || []).map(t => ({ t, w: 0.85 })), ...(it.cas || []).map(t => ({ t, w: 0.85 }))],
    item: { id: `feed:${it.id}`, title: it.title, sub: labels.usearch.itemSub(it.date, feedSourceName(it.source, labels, sources)),
      badge: labels.kinds[feedSourceKind(it.source)], href: it.url || feedHref({}), external: Boolean(it.url) },
  }));
}

const USP_FEED = {
  k: "feed",
  icon: "bolt",
  limit: 3,
  max: 20,
  search: async (q) => {
    const L = FEED_LABELS;
    const hasApi = typeof fetchFeedLatest === "function"; // api_feed.jsx 가 없는 화면(시험 등)에서는 화면 줄만
    const latest = hasApi ? await fetchFeedLatest().catch(() => null) : null;
    const byCas = hasApi && feedIsCas(q) ? await fetchFeedByCas(q).catch(() => null) : null;
    const seen = new Set();
    const pool = [...((byCas && byCas.items) || []), ...((latest && latest.items) || [])].filter(it => !seen.has(it.id) && seen.add(it.id));
    const docs = [usFeedScreenDoc(FEED_LABELS_KO, FEED_LABELS_EN, L), ...usFeedSubstanceDocs(latest && latest.substances, L),
      ...usFeedItemDocs(pool, L, latest && latest.sources)];
    const items = usRankDocs(q, docs);
    return { items, total: items.length, moreHref: "" };
  },
};

Object.assign(window, { USP_FEED, usFeedScreenDoc, usFeedSubstanceDocs, usFeedItemDocs });
