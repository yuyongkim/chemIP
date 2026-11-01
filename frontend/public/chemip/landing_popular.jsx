// 처음 화면 · "자주 찾는 물질" — 고정 목록(LANDING_POPULAR_CAS, landing_discover_data.jsx)의 물질 이름·CAS 단추. 문구: LANDING_DISCOVER.popular·names.

function LandingPopular() {
  const D = LANDING_DISCOVER;
  return (
    <div className="ld-disc-card ld-popular">
      <div className="ld-eyebrow">{D.popular.eyebrow}</div>
      <ul className="ld-popular-list">
        {LANDING_POPULAR_CAS.slice(0, LANDING_POPULAR_LIMIT).map(cas => (
          <li key={cas}>
            <a className="ld-popular-item" href={landingSubstanceHref(cas)}>
              <span className="ld-popular-name">{D.names[cas] || cas}</span>
              <span className="ld-popular-cas">{cas}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="ld-disc-note">{D.popular.note}</p>
    </div>
  );
}

Object.assign(window, { LandingPopular });
