// 처음 화면 · 머리 — 무엇을 해 주는지 한 줄, 검색창, 바로 열어 볼 예시 물질. 문구: LANDING_LABELS.hero
// 검색은 제품 화면의 검색 상태(localStorage)를 채운 뒤 화면만 바꾼다(새로 읽지 않음).

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
  const submit = (e) => { e.preventDefault(); landingOpenSearch(q.trim(), setView); };
  return (
    <section className="ld-hero">
      <div className="ld-inner">
        <div className="hero-kicker"><span className="dot" /> {H.kicker}</div>
        <h1 className="ld-title">{H.title}<br /><span className="ld-title-sub">{H.titleSub}</span></h1>
        <p className="ld-lede">{landingFill(H.lede, catalog) || H.ledeFallback}</p>
        <p className="ld-en" lang="en">{H.en}</p>
        <form className="ld-search" onSubmit={submit} role="search">
          <Icon name="search" size={18} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={H.searchPlaceholder} aria-label={H.searchPlaceholder} />
          <button className="btn primary" type="submit">{H.searchButton}</button>
        </form>
        <div className="ld-examples">
          <span className="ld-examples-label">{H.examples}</span>
          {FEATURED_CHEMICALS.map(c => (
            <a key={c.chem_id} className="btn sm" href={`?view=product&pv=chemical&chem=${c.chem_id}`}>
              {c.name} <span className="kbd">{c.cas_no}</span>
            </a>
          ))}
        </div>
        <div className="hero-cta">
          <button className="btn" onClick={() => setView && setView("board")}><Icon name="doc" size={14} /> {H.ctaBoard}</button>
          <a className="btn ghost" href="#ld-steps">{H.ctaHow} <Icon name="down" size={13} /></a>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { LandingHero, landingOpenSearch });
