// 개발자용 소개 위쪽 — 상태 띠, 머리(소개·바로가기·예시 콘솔), 숫자 띠. 문구·자료: dev_overview_data.jsx.

function Banner() {
  const B = DEV_OVERVIEW.banner;
  return (
    <div className="banner">
      <span className="dot" />
      <span>{B.status}</span>
      <span className="sep">·</span>
      <span>{B.license}</span>
    </div>
  );
}

function DevHero({ setView }) {
  const H = DEV_OVERVIEW.hero;
  const openSearch = () => {
    try { localStorage.setItem("chemip-view", "search"); } catch (e) {}
    setView && setView("product");
  };
  return (
    <section className="hero">
      <div className="hero-inner">
        <div>
          <div className="hero-kicker"><span className="dot" /> {H.kicker}</div>
          <h1>{H.titleA}<br />{H.titleB}<em>{H.titleEm}</em></h1>
          <p className="lede">{H.ledeA}<b>{H.ledeBrand}</b>{H.ledeB}</p>
          <div className="hero-cta">
            <button className="btn primary" onClick={openSearch}><Icon name="search" size={14} /> {H.start}</button>
            <a className="btn" href={DEV_REPO_URL} target="_blank" rel="noopener"><Icon name="git" size={14} /> {H.clone} <span className="kbd">{H.repoSlug}</span></a>
            <a className="btn ghost" href="#quickstart">{H.docs} <Icon name="ext" size={13} /></a>
          </div>
          <div className="hero-open">
            <span className="hero-open-label"><Icon name="atom" size={13} /> {H.openLabel}</span>
            {H.featured.map(c => (
              <a key={c.chem_id} className="btn sm" href={`/chemical/${c.chem_id}`}>
                {c.name_en} <span className="kbd">{c.cas_no}</span>
              </a>
            ))}
            <button className="btn sm ghost" onClick={openSearch}><Icon name="search" size={12} /> {H.directSearch}</button>
          </div>
          <div className="hero-meta">
            {H.meta.map(([v, label]) => <div key={label}><b>{v}</b>{label}</div>)}
          </div>
        </div>
        <div>
          <QueryConsole />
        </div>
      </div>
    </section>
  );
}

function QueryConsole() {
  const C = DEV_OVERVIEW.console;
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), C.tickMs); return () => clearInterval(t); }, []);
  const cur = C.queries[tick % C.queries.length];
  return (
    <div className="query-console">
      <div className="console-head">
        <div className="tl"><span /><span /><span /></div>
        <div className="dvo-center">{C.title}</div>
        <div>{C.live}</div>
      </div>
      <div className="console-body">
        <div><span className="ln-num">01</span><span className="com"># single query fans out to 9 sources</span></div>
        <div><span className="ln-num">02</span><span className="kw">POST</span> /api/chemicals <span className="com">+</span> /patents <span className="com">+</span> /trade</div>
        <div><span className="ln-num">03</span>  <span className="kw">q</span>: <span className="str">"{cur.q}"</span>,</div>
        <div><span className="ln-num">04</span>  <span className="kw">fanout</span>: [<span className="str">"kosha"</span>, <span className="str">"kipris"</span>, <span className="str">"kotra"</span>, <span className="str">"mfds"</span>, <span className="str">"pubmed"</span>]</div>
        <div><span className="ln-num">05</span></div>
        <div><span className="ln-num">06</span><span className="com">→ resolved · {cur.label}</span></div>
        <div><span className="ln-num">07</span>  <span className="kw">msds.sections</span>: 16/16  <span className="com">(cached)</span></div>
        <div><span className="ln-num">08</span>  <span className="kw">patents.kr</span>: 42  <span className="kw">patents.us</span>: 178</div>
        <div><span className="ln-num">09</span>  <span className="kw">trade.countries</span>: 6  <span className="kw">guides</span>: 11</div>
        <div><span className="ln-num">10</span>  <span className="kw">ai.confidence</span>: 0.86  <span className="kw">sources</span>: 7</div>
        <div><span className="ln-num">11</span><span className="cursor" /></div>
      </div>
      <div className="console-foot">
        {C.foot.map(t => <span key={t}>{t}</span>)}
      </div>
    </div>
  );
}

function StatsStrip() {
  return (
    <div className="stats">
      {DEV_OVERVIEW.stats.map(s => (
        <div key={s.label} className="stat">
          <div className="label">{s.label}</div>
          <div className="value tnum">{s.value}<span className="unit">{s.unit}</span></div>
          <div className="note">{s.note}</div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { Banner, DevHero, QueryConsole, StatsStrip });
