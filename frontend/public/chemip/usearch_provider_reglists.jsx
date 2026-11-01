// 통합 검색 묶음 · 규제 목록 — 목록 이름(한·영)·법령·id·나라로 맞춘다. 누르면 ?view=reg&list=<id>.
// 자료: 정적 v1/reg/lists.json(fetchRegLists, api_reg.jsx). 파일이 없으면 결과 없음(집 PC /api 는 쓰지 않는다).

function usRegListDocs(lists, labels) {
  return (lists || []).filter(m => m && m.id).map(m => {
    const ko = m.title || m.id;
    const en = regListTitle(m, "en");
    return {
      id: `r:${m.id}`,
      fields: [{ t: ko, w: 1 }, { t: en, w: 1 }, { t: m.law, w: 0.7 }, { t: m.id.replace(/_/g, " "), w: 0.6 },
        { t: jurisdictionName(m.j), w: 0.5 }],
      item: {
        id: `r:${m.id}`,
        title: regListTitle(m),
        sub: labels.sub(jurisdictionName(m.j), m.n.toLocaleString("ko-KR")),
        desc: m.law || "",
        badge: labels.badge,
        href: regHref(m.id),
      },
    };
  });
}

const USP_REGLISTS = {
  k: "regLists",
  icon: "shield",
  limit: 3,
  max: 30,
  search: async (q) => {
    const data = await fetchRegLists().catch(() => null);
    const items = usRankDocs(q, usRegListDocs(data && data.lists, REG_LABELS.usearch));
    return { items, total: items.length };
  },
};

Object.assign(window, { USP_REGLISTS, usRegListDocs });
