// 통합 검색 묶음 · MSDS 항목 — 16개 항목(MSDS_SECTIONS, data.jsx)의 한·영 이름과 항목 안의 낱말
// (USEARCH_LABELS_KO·_EN.msdsKeywords, 예: 인화점 → 9항)로 맞춘다. 결과는 물질 상세의 MSDS 탭.

const USP_MSDS_HREF = "?view=product&pv=chemical";

function usMsdsDocs(sections, keywordsKo, keywordsEn, labels) {
  return (sections || []).map(s => {
    const ko = (keywordsKo && keywordsKo[s.n]) || [];
    const en = (keywordsEn && keywordsEn[s.n]) || [];
    const shown = (labels.msdsKeywords && labels.msdsKeywords[s.n]) || [];
    return {
      id: `m:${s.n}`,
      fields: [
        { t: s.kr, w: 1 },
        { t: s.en, w: 1 },
        { t: `MSDS ${s.n}`, w: 1 },
        ...usUnique([...ko, ...en]).map(t => ({ t, w: 0.9 })),
      ],
      item: {
        id: `m:${s.n}`,
        title: labels.msdsTitle(s.n, msdsSectionName(s)),
        sub: shown.slice(0, 8).join(" · "),
        desc: labels.msdsDesc,
        badge: labels.badges.section,
        href: USP_MSDS_HREF,
      },
    };
  });
}

const USP_MSDS = {
  k: "msds",
  icon: "doc",
  limit: 2,
  max: 6,
  search: (q) => {
    const items = usRankDocs(q, usMsdsDocs(MSDS_SECTIONS, USEARCH_LABELS_KO.msdsKeywords, USEARCH_LABELS_EN.msdsKeywords, USEARCH_LABELS));
    return { items, total: items.length };
  },
};

Object.assign(window, { USP_MSDS, usMsdsDocs });
