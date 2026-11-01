// 처음 화면 · "오늘의 물질" — 날짜로 돌아가는 고정 목록(LANDING_TODAY_CAS)의 한 물질과 한 줄 설명. 고르기: landingTodayCas(날짜만 본다).
// 문구: LANDING_DISCOVER.today·names·hooks.

function LandingToday() {
  const D = LANDING_DISCOVER;
  const [today] = useState(() => new Date());
  const cas = landingTodayCas(LANDING_TODAY_CAS, today);
  if (!cas) return null;
  return (
    <div className="ld-disc-card ld-today">
      <div className="ld-eyebrow"><Icon name="bolt" size={12} /> {D.today.eyebrow}</div>
      <h3 className="ld-today-name">
        <a href={landingSubstanceHref(cas)}>{D.names[cas] || cas}</a>
        <span className="kbd">{cas}</span>
      </h3>
      {D.hooks[cas] && <p className="ld-today-hook">{D.hooks[cas]}</p>}
      <a className="btn sm ld-today-open" href={landingSubstanceHref(cas)}>{D.today.open} <Icon name="chev" size={12} /></a>
      <p className="ld-disc-note">{D.today.note}</p>
    </div>
  );
}

Object.assign(window, { LandingToday });
