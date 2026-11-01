// 통합 검색 묶음 · 취급 사업장 지도(PRTR) — 자료 있는 물질(이름 한·영·CAS)과 화면 바로가기 한 줄(지도·배출량 같은 낱말).
// 물질 목록은 fetchPrtrIndex(api_prtr.jsx: 정적 prtr/index.json → PC 사이트면 /api/prtr/index). 목록을 못 받으면 화면 줄만.
// 문구·낱말: PRTR_MAP_LABELS(_KO·_EN 두 벌로 맞춘다), 링크: prtrMapHref(prtr_map_helpers.jsx).

const USP_PRTR_SCREEN_ID = "prtr:screen";

function usPrtrScreenDoc(labelsKo, labelsEn, labels) {
  const kw = [...(labelsKo?.usearch?.keywords || []), ...(labelsEn?.usearch?.keywords || [])];
  return {
    id: USP_PRTR_SCREEN_ID,
    fields: [{ t: labelsKo.usearch.screenTitle, w: 1 }, { t: labelsEn.usearch.screenTitle, w: 1 }, ...usUnique(kw).map(t => ({ t, w: 0.8 }))],
    item: { id: USP_PRTR_SCREEN_ID, title: labels.usearch.screenTitle, desc: labels.usearch.screenHint, badge: labels.usearch.badge, href: prtrMapHref("") },
  };
}

function usPrtrSubstanceDocs(substances, labels, lang) {
  return (substances || []).map(s => ({
    id: `prtr:${s.cas}`,
    fields: [{ t: s.name_ko, w: 1 }, { t: s.name_en, w: 1 }, { t: s.cas, w: 1 }],
    item: {
      id: `prtr:${s.cas}`,
      title: labels.usearch.title(prtrSubstanceName(s, lang)),
      sub: labels.usearch.sub(s.cas, s.facilities),
      badge: labels.usearch.badge,
      href: prtrMapHref(s.cas),
    },
  }));
}

const USP_PRTR = {
  k: "prtr",
  icon: "layers",
  limit: 3,
  max: 20,
  search: async (q) => {
    const L = PRTR_MAP_LABELS;
    const index = typeof fetchPrtrIndex === "function" ? await fetchPrtrIndex().catch(() => null) : null;
    const docs = [...usPrtrSubstanceDocs(prtrSubstances(index), L, CHEMIP_LANG), usPrtrScreenDoc(PRTR_MAP_LABELS_KO, PRTR_MAP_LABELS_EN, L)];
    const items = usRankDocs(q, docs);
    return { items, total: items.length };
  },
};

Object.assign(window, { USP_PRTR, usPrtrScreenDoc, usPrtrSubstanceDocs });
