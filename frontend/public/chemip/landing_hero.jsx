// 처음 화면 · 머리 — 무엇을 해 주는지 한 줄, 검색창. 문구: LANDING_LABELS.hero
// 2026-10-31: 예시 물질 단추는 바로 아래 "자주 찾는 물질"(landing_popular.jsx)로 옮겼다(같은 물질이 두 번 보이지 않게).
// 검색창은 통합 검색(?view=search)으로 연다. landingOpenSearch 는 물질 검색 화면을 여는 길(바닥글이 쓴다).

function landingOpenSearch(query, setView) {
  try {
    localStorage.setItem("chemip-view", "search");
    if (query) localStorage.setItem("chemip-search", query);
  } catch (e) {}
  setView && setView("product");
}

function LandingHero({ setView }) {
  const H = LANDING_LABELS.hero;
  const { data: catalog } = useTradeCatalog();
  const [q, setQ] = useState("");
  // 통합 검색(물질·계산기·용어·기술지침, usearch_link.jsx)으로 연다. 바닥글의 "물질 검색"은 landingOpenSearch 그대로.
  const submit = (e) => { e.preventDefault(); usearchOpen(q.trim(), setView); };
  return (
    <section className="ld-hero">
      <div className="ld-inner">
        <div className="hero-kicker"><span className="dot" /> {H.kicker}</div>
        <h1 className="ld-title">{H.title}<br /><span className="ld-title-sub">{H.titleSub}</span></h1>
        <p className="ld-lede">{landingFill(H.lede, catalog) || H.ledeFallback}</p>
        {H.en && <p className="ld-en" lang="en">{H.en}</p>}
        <form className="ld-search" onSubmit={submit} role="search">
          <Icon name="search" size={18} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={H.searchPlaceholder} aria-label={H.searchPlaceholder} />
          <button className="btn primary" type="submit">{H.searchButton}</button>
        </form>
        <LandingRecent setView={setView} />
        <div className="hero-cta">
          <button className="btn" onClick={() => setView && setView("board")}><Icon name="doc" size={14} /> {H.ctaBoard}</button>
          <a className="btn ghost" href="#ld-steps">{H.ctaHow} <Icon name="down" size={13} /></a>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { LandingHero, landingOpenSearch });
