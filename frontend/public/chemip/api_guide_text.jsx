// API 층 · KOSHA 기술지침 본문 검색(정적 gs/). 파일 받기만 여기서 하고, 맞추기·순서·발췌는 guide_text_core.jsx 순수 함수.
// 형식: scripts/static_export/CONTRACT.md "gs/ — KOSHA guide full text". 정적 자료가 꺼져 있거나 색인이 없으면 null
// (→ usearch_provider_guides.jsx 가 제목 목록 g/guide_index.json, 그다음 집 PC /api/guides/search 로 넘어간다).

const GT_VERIFY = 12;   // 본문을 받아 정확히 맞는지 확인할 후보 수(지침 하나 약 10 KB gzip)

function gtFile(rel) {
  return staticPagesFile(rel);
}

async function fetchGuideTextManifest() {
  const m = await gtFile(STATIC_LAYOUT.pages.guideText.manifest);
  return m && m.norm === GT_NORM && Array.isArray(m.rows) && m.shards > 0 ? m : null;
}

// q → { rows, hits: [{ doc, count, page, snippet }], unchecked } 또는 null(색인 없음). hits 는 확인된 것만, 확인 순서대로.
async function fetchGuideFullText(q) {
  const manifest = await fetchGuideTextManifest();
  if (!manifest) return null;
  const L = STATIC_LAYOUT.pages.guideText;
  const qnorm = gtNorm(q);
  const bigrams = gtPickBigrams(gtBigrams(qnorm));
  if (!bigrams.length) return { rows: manifest.rows, hits: [], unchecked: 0 };
  const shards = await Promise.all(bigrams.map(b => gtFile(L.shard(gtShardOf(b, manifest.shards)))));
  const postings = {};
  bigrams.forEach((b, i) => { postings[b] = (shards[i] || {})[b] || []; });
  const ordered = gtOrderCandidates(gtCandidates(postings, bigrams), manifest.rows, qnorm);
  const check = ordered.slice(0, GT_VERIFY);
  const docs = await Promise.all(check.map(c => gtFile(L.doc(manifest.rows[c.doc][0])).catch(() => null)));
  const hits = [];
  check.forEach((c, i) => {
    const found = docs[i] && gtFindInPages(docs[i].pages, qnorm);
    if (found) hits.push({ doc: c.doc, ...found });
  });
  return { rows: manifest.rows, hits, unchecked: ordered.length - check.length };
}

Object.assign(window, { GT_VERIFY, fetchGuideTextManifest, fetchGuideFullText });
