// 통합 검색 묶음 · 경고표지(GHS 라벨) 만들기 — 도구 한 건(GHS_LABELS_KO·_EN.search 의 이름·낱말)과
// 그림문자 9종(코드·한/영 이름 → 그 그림문자를 넣은 표지 만들기). 결과는 ?view=ghslabel(ghsLabelHref).

function usGhsLabelDocs(labelsKo, labelsEn, labels) {
  const S = labels.search;
  const tool = {
    id: "g:tool",
    fields: [
      { t: labelsKo.search.title, w: 1 },
      { t: labelsEn.search.title, w: 1 },
      ...usUnique([...labelsKo.search.keywords, ...labelsEn.search.keywords]).map(t => ({ t, w: 0.95 })),
    ],
    item: { id: "g:tool", title: S.title, desc: S.desc, badge: S.badge, href: ghsLabelHref() },
  };
  const picts = GHS_PICTOGRAM_CODES.map(code => ({
    id: `g:${code}`,
    fields: [
      { t: code, w: 0.9 },
      { t: labelsKo.pictograms[code], w: 0.8 },
      { t: labelsEn.pictograms[code], w: 0.8 },
    ],
    item: {
      id: `g:${code}`,
      title: S.pictTitle(code, labels.pictograms[code]),
      desc: S.pictDesc,
      badge: S.badge,
      href: ghsLabelHref({ pict: [code] }),
    },
  }));
  return [tool, ...picts];
}

const USP_GHS_LABEL = {
  k: "ghslabel",
  icon: "shield",
  limit: 2,
  max: 10,
  search: (q) => {
    const items = usRankDocs(q, usGhsLabelDocs(GHS_LABELS_KO, GHS_LABELS_EN, GHS_LABELS));
    return { items, total: items.length };
  },
};

Object.assign(window, { USP_GHS_LABEL, usGhsLabelDocs });
