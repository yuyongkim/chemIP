// 처음 화면(랜딩) — 중소기업 실무자 대상 한국어 안내. 절 순서만 여기서 정한다.
// 문구: landing_labels.jsx · 절: landing_hero / landing_outputs / landing_steps / landing_sme / landing_disclaimer / landing_footer.
// 예전 영문 개발자 소개 절은 dev_overview.jsx(연구·개발 화면)로 옮겼다.

const LANDING_SECTIONS = [LandingHero, LandingOutputs, LandingSteps, LandingSmeNotice, LandingDisclaimer, LandingFooter];

function Landing({ setView }) {
  return <>{LANDING_SECTIONS.map((S, i) => <S key={i} setView={setView} />)}</>;
}

Object.assign(window, { Landing });
