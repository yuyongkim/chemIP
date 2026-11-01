// 통합 검색 · 머리 — 제목, 검색창, 예시 검색어. 모양은 물질 검색 머리(.ps-*, product_search.css)와 같다.

function UsBox({ q, setQ, onSubmit, onPick }) {
  const L = USEARCH_LABELS;
  const submit = (e) => { e.preventDefault(); onSubmit(); };
  return (
    <div className="ps-hero us-hero">
      <h1 className="ps-title us-title">{L.title}</h1>
      <div className="muted ps-sub">{L.sub}</div>
      <form className="ps-box" onSubmit={submit} role="search">
        <Icon name="search" size={18} className="ps-box-icon" />
        <input className="ps-input" type="search" value={q} onChange={e => setQ(e.target.value)} autoFocus
          placeholder={L.placeholder} aria-label={L.placeholder} />
        <button className="btn primary" type="submit">{L.button}</button>
      </form>
      <div className="ps-try">
        <span className="muted ps-try-label">{L.tryLabel}</span>
        {L.tryTerms.map(t => <button key={t} type="button" className="chip ps-pick" onClick={() => onPick(t)}>{t}</button>)}
      </div>
    </div>
  );
}

Object.assign(window, { UsBox });
