// 통합 검색 묶음 · KOSHA 안전보건 기술지침 — 지침 번호·제목, 그리고 본문(2026-10-31).
// 자료 순서: (1) 정적 본문 색인 gs/(제목 목록 포함, fetchGuideFullText, api_guide_text.jsx) → 제목 맞춤 + 본문 맞춤(쪽·발췌)
//            (2) 없으면 정적 제목 목록 g/guide_index.json(fetchGuideIndexRows) → 제목·번호만
//            (3) 둘 다 없으면 집 PC 의 /api/guides/search(fetchGuideSearchLive, 서버가 본문 발췌를 준다).
// 행 모양은 한 가지: [지침 번호, 제목, 공표일, 원문 파일 주소, …] (scripts/static_export/CONTRACT.md "g/guide_index.json", "gs/").

const USP_GUIDE_TEXT_SCORE = 40;   // 본문에만 맞은 지침의 기본 점수(제목 '포함' 55 보다 낮게) + 맞은 곳 수(최대 9)

function usGuideDocs(rows, labels) {
  return (rows || []).filter(r => Array.isArray(r) && r[0]).map(([no, title, date, url]) => ({
    id: `g:${no}`,
    fields: [{ t: title, w: 1 }, { t: no, w: 1 }],
    item: {
      id: `g:${no}`,
      title: title || no,
      sub: labels.guideSub(no, date),
      badge: labels.badges.guide,
      href: url || "",
      external: true,
    },
  }));
}

// /api/guides/search 응답 → 정적 목록과 같은 행 모양(파일 경로 등 다른 칸은 버린다). 발췌는 usGuideSnippetsFromApi.
function usGuideRowsFromApi(data) {
  return ((data && data.items) || []).map(it => [it.guide_no, it.title, it.ofanc_ymd, it.file_download_url]);
}

function usGuideSnippetsFromApi(data) {
  const out = {};
  for (const it of (data && data.items) || []) if (it && it.guide_no && it.snippet) out[it.guide_no] = it.snippet;
  return out;
}

// 제목 순위(usRankDocs) + 본문 맞춤 → 한 목록. 둘 다 맞으면 제목 점수에 발췌를 붙인다. 본문만 맞으면 USP_GUIDE_TEXT_SCORE + 곳 수.
function usGuideMerge(q, rows, hits, labels) {
  const titled = usRankDocs(q, usGuideDocs(rows, labels));
  const byId = new Map(titled.map(it => [it.id, it]));
  const textOnly = [];
  for (const h of hits || []) {
    const row = rows[h.doc];
    if (!row) continue;
    const id = `g:${row[0]}`;
    const extra = { sub: `${labels.guideSub(row[0], row[2])} · ${labels.guideHit(h.page, h.count)}`, desc: h.snippet };
    if (byId.has(id)) Object.assign(byId.get(id), extra);
    else textOnly.push({ ...usGuideDocs([row], labels)[0].item, ...extra, score: USP_GUIDE_TEXT_SCORE + Math.min(9, h.count) });
  }
  return [...titled, ...textOnly].sort((a, b) => b.score - a.score);
}

const USP_GUIDES = {
  k: "guides",
  icon: "shield",
  limit: 3,
  max: 20,
  search: async (q) => {
    const L = USEARCH_LABELS;
    const full = await fetchGuideFullText(q).catch(() => null);
    if (full) {
      const items = usGuideMerge(q, full.rows, full.hits, L);
      return { items, total: items.length + full.unchecked };
    }
    const rows = await fetchGuideIndexRows();
    if (rows) {
      const items = usRankDocs(q, usGuideDocs(rows, L));
      return { items, total: items.length };
    }
    const live = await fetchGuideSearchLive(q);
    const snippets = usGuideSnippetsFromApi(live);
    // 서버 순서(본문 일치 포함)를 지키고, 점수는 제목·번호 맞춤으로만 매긴다(묶음 순서용).
    const items = usGuideDocs(usGuideRowsFromApi(live), L)
      .map(d => ({ ...d.item, desc: snippets[d.item.id.slice(2)] || "", score: usDocScore(q, d) }));
    return { items, total: Math.max(Number(live && live.total) || 0, items.length) };
  },
};

Object.assign(window, { USP_GUIDES, usGuideDocs, usGuideRowsFromApi, usGuideSnippetsFromApi, usGuideMerge });
