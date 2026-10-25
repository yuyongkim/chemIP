// 연구·개발 화면 — 논문 연구·벤치마크·모바일 시안으로 가는 카드와, 접어 둔 개발자용 소개(dev_overview.jsx).
// 카드 목록은 DEV_LABELS.cards(dev_labels.jsx). 화면 키는 app.jsx 의 APP_SCREENS 와 같다.

function DevHubView({ setView }) {
  const D = DEV_LABELS;
  const [showOverview, setShowOverview] = useState(false);
  return (
    <div>
      <div className="dev-hub">
        <h1 className="about-title">{D.title}</h1>
        <p className="about-lede">{D.lede}</p>
        <div className="dev-cards">
          {D.cards.map(c => (
            <button key={c.k} className="dev-card" onClick={() => setView && setView(c.k)}>
              <Icon name={c.icon} size={18} />
              <b>{c.title}</b>
              <span>{c.desc}</span>
              <span className="dev-card-open">{D.open} →</span>
            </button>
          ))}
        </div>
        <div className="dev-overview-bar">
          <div><b>{D.overviewTitle}</b><div className="muted">{D.overviewDesc}</div></div>
          <button className="btn sm" aria-expanded={showOverview} onClick={() => setShowOverview(v => !v)}>
            {showOverview ? D.hideOverview : D.showOverview}
          </button>
        </div>
      </div>
      {showOverview && <div lang="en"><DevOverview setView={setView} /></div>}
    </div>
  );
}

Object.assign(window, { DevHubView });
