// 물질 검색 화면 머리 — 제목, 검색창, 예시 검색어, 바로 열어 볼 물질. 문구: PRODUCT_LABELS.search.
// 예시 물질: FEATURED_CHEMICALS(landing_labels.jsx). 스타일: product_search.css(.ps-*).

function SearchHero({ q, setQ, onSubmit, onPick }) {
  const S = PRODUCT_LABELS.search;
  return (
    <div className="ps-hero">
      <h1 className="ps-title">{S.title}</h1>
      <div className="muted ps-sub">{S.sub}</div>
      <div className="ps-box">
        <Icon name="search" size={18} className="ps-box-icon" />
        <input
          className="ps-input"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onSubmit(); }}
          autoFocus
          placeholder={S.placeholder}
          aria-label={S.placeholder}
        />
        <button className="btn primary" onClick={onSubmit}>{S.button}</button>
      </div>
      <div className="ps-try">
        <span className="muted ps-try-label">{S.tryLabel}</span>
        {S.tryTerms.map(r => (
          <span key={r} className="chip ps-pick" onClick={() => onPick(r)}>{r}</span>
        ))}
      </div>
      <div className="ps-try ps-open">
        <span className="muted ps-try-label">{S.openLabel}</span>
        {FEATURED_CHEMICALS.map(c => (
          <a key={c.chem_id} className="btn sm ps-featured" href={`?view=product&pv=chemical&chem=${c.chem_id}`}>
            {c.name} <span className="kbd">{c.cas_no}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { SearchHero });
