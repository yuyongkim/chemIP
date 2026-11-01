// Product · Thin link-style views — Patents, Trade, Guides (상세 탭을 화면 하나로 크게 보인다).
// 의약품: product_view_drugs.jsx. 공용 제목·빈 화면: product_view_common.jsx. 문구: PRODUCT_LABELS.views.

// 고른 물질이 있으면 제목 + 검색어 + 탭 본문, 없으면 빈 화면
function SelectedChemView({ V, icon, selected, Body }) {
  if (!selected) {
    return <EmptyView icon={icon} title={V.title.ko} hint={V.emptyHint} />;
  }
  return (
    <div>
      <ViewTitle t={V.title} />
      <div className="sub">{V.sub} <span className="mono">{chemDisplayNames(selected).enName || chemDisplayNames(selected).krName}</span></div>
      <Body selected={selected} />
    </div>
  );
}

function PatentsView({ selected }) {
  return <SelectedChemView V={PRODUCT_LABELS.views.patents} icon="doc" selected={selected} Body={PatentsTab} />;
}

function TradeView({ selected }) {
  return <SelectedChemView V={PRODUCT_LABELS.views.trade} icon="globe" selected={selected} Body={MarketTab} />;
}

function GuidesView({ selected }) {
  return <SelectedChemView V={PRODUCT_LABELS.views.guides} icon="book" selected={selected} Body={GuidesTab} />;
}

Object.assign(window, { PatentsView, TradeView, GuidesView });
