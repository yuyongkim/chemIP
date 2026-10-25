// 처음 화면 · 면책 안내(법적 자문 아님, 원문 확인). 문구: LANDING_LABELS.disclaimer

function LandingDisclaimer() {
  const D = LANDING_LABELS.disclaimer;
  return (
    <section className="section">
      <div className="ld-inner">
        <div className="ld-disclaimer" role="note">
          <h2 className="ld-disclaimer-title"><Icon name="shield" size={16} /> {D.title}</h2>
          <ul>{D.items.map(t => <li key={t}>{t}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { LandingDisclaimer });
