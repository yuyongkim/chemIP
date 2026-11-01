// 통합 검색 묶음 · 화면 바로가기 — 최상위 화면(APP_LABELS.screens)과 물질 화면의 하위 화면(PRODUCT_LABELS.rail).
// 화면 하나 = 아래 목록 한 줄(키·주소·이름 읽는 곳). 설명·찾는 낱말은 USEARCH_LABELS_KO·_EN.screens[k].

const USEARCH_SCREEN_LINKS = [
  { k: "landing", href: "?view=landing", app: "landing" },
  { k: "productSearch", href: "?view=product&pv=search", rail: "search" },
  { k: "chemical", href: "?view=product&pv=chemical", rail: "chemical" },
  { k: "patents", href: "?view=product&pv=patents", rail: "patents" },
  { k: "trade", href: "?view=product&pv=trade", rail: "trade" },
  { k: "drugs", href: "?view=product&pv=drugs", rail: "drugs" },
  { k: "guides", href: "?view=product&pv=guides", rail: "guides" },
  { k: "calc", href: "?view=calc", app: "calc" },
  { k: "board", href: "?view=board", app: "board" },
  { k: "reg", href: "?view=reg", app: "reg" },
  { k: "sources", href: "?view=sources", app: "sources" },
  { k: "dev", href: "?view=dev", app: "dev" },
  { k: "glossary", href: "?view=glossary", app: "glossary" },
  { k: "compat", href: "?view=compat", app: "compat" },
  { k: "mixghs", href: "?view=mixghs", app: "mixghs" },
  { k: "hazop", href: "?view=hazop", app: "hazop" },
  { k: "applicability", href: "?view=applicability", app: "applicability" },
  { k: "law", href: "?view=law", app: "law" },
];

// 링크 한 줄의 이름 { ko, en, shown }. 최상위 화면은 APP_LABELS_KO·_EN, 하위 화면은 PRODUCT_LABELS.rail 의 { ko, en }.
function usScreenNames(link, appKo, appEn, rail) {
  if (link.app) {
    const ko = appKo?.screens?.[link.app] || link.app;
    const en = appEn?.screens?.[link.app] || ko;
    return { ko, en, shown: tr(ko, en) };
  }
  const r = rail?.[link.rail] || {};
  return { ko: r.ko || link.rail, en: r.en || r.ko || link.rail, shown: tr(r.ko || link.rail, r.en) };
}

function usScreenDocs(links, appKo, appEn, rail, labelsKo, labelsEn, labels) {
  return (links || []).map(link => {
    const n = usScreenNames(link, appKo, appEn, rail);
    const kw = [...(labelsKo?.screens?.[link.k]?.keywords || []), ...(labelsEn?.screens?.[link.k]?.keywords || [])];
    return {
      id: `v:${link.k}`,
      fields: [{ t: n.ko, w: 1 }, { t: n.en, w: 1 }, ...usUnique(kw).map(t => ({ t, w: 0.8 }))],
      item: {
        id: `v:${link.k}`,
        title: n.shown,
        desc: labels?.screens?.[link.k]?.hint || "",
        badge: labels.badges.screen,
        href: link.href,
      },
    };
  });
}

const USP_SCREENS = {
  k: "screens",
  icon: "layers",
  limit: 3,
  max: 12,
  search: (q) => {
    const items = usRankDocs(q, usScreenDocs(USEARCH_SCREEN_LINKS, APP_LABELS_KO, APP_LABELS_EN, PRODUCT_LABELS.rail,
      USEARCH_LABELS_KO, USEARCH_LABELS_EN, USEARCH_LABELS));
    return { items, total: items.length };
  },
};

Object.assign(window, { USP_SCREENS, USEARCH_SCREEN_LINKS, usScreenNames, usScreenDocs });
