// 검색어가 없을 때 보이는 안내 카드 3장(규제·MSDS·체크리스트). 문구: PRODUCT_LABELS.search.cards.

function SearchIntroCards() {
  return (
    <div className="ps-cards">
      {PRODUCT_LABELS.search.cards.map(card => (
        <div key={card.t} className="card ps-card">
          <Icon name={card.ic} size={18} className="ps-card-icon" />
          <h4 className="ps-card-title">{card.t}</h4>
          <div className="muted ps-card-key" lang="en">{card.k}</div>
          <p className="muted ps-card-desc">{card.desc}</p>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { SearchIntroCards });
