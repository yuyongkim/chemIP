// Landing · 중소기업 안내 띠 — "무료·오픈소스(AGPL-3.0)·중소기업 누구나". 랜딩의 .section 형식을 그대로 쓴다.
// 문구: ABOUT_LABELS.sme (about_labels.jsx). 이용 집계 안내: UsageNotice (usage_notice.jsx).

function LandingSmeNotice({ setView }) {
  const S = ABOUT_LABELS.sme;
  return (
    <section className="section about-sme">
      <div className="ld-inner">
        <div className="about-sme-grid">
          <div>
            <div className="hero-kicker"><span className="dot" /> {S.kicker}</div>
            <h2 className="about-sme-title">{S.title}</h2>
            <p className="about-sme-body">{S.body}</p>
            <div className="hero-cta">
              <button className="btn primary" onClick={() => setView && setView("board")}><Icon name="doc" size={14} /> {S.ctaBoard}</button>
              <button className="btn" onClick={() => setView && setView("sources")}><Icon name="shield" size={14} /> {S.ctaSources}</button>
            </div>
          </div>
          <div>
            <ul className="about-sme-points">
              {S.points.map(p => <li key={p}><Icon name="check" size={14} /> {p}</li>)}
            </ul>
            <UsageNotice showStats={false} />
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { LandingSmeNotice });
