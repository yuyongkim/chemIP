// 처음 화면(랜딩) — 실무자 대상 한국어 안내. 절 순서만 여기서 정한다.
// 문구: landing_labels.jsx · 절: landing_hero / landing_discover(자주 찾는 물질·오늘의 물질) / landing_feed_slot / landing_tools /
// landing_faq / landing_paper(연구 논문 요약) / landing_outputs / landing_steps / landing_sme / landing_disclaimer / landing_footer.
// 예전 영문 개발자 소개 절은 dev_overview.jsx(연구·개발 화면)로 옮겼다.

// 2026-10-28: 사례 FAQ(LandingFaq) 다음에 논문 요약(LandingPaper)을 둔다(사장님 결정 — 둘 다 유지).
// 2026-10-31: 포털 순서 — 검색(머리) → 자주 찾는 물질·오늘의 물질(LandingDiscover) → 최근 사고 소식(파일이 있을 때만) → 도구 → 기존 안내 절.
const LANDING_SECTIONS = [
  LandingHero, LandingDiscover, LandingFeedSlot, LandingTools,
  LandingFaq, LandingPaper, LandingOutputs, LandingSteps, LandingSmeNotice, LandingDisclaimer, LandingFooter,
];

// views: 등록된 화면 key(app.jsx APP_VIEWS) — 도구·소식 "모두 보기"는 그 화면이 있을 때만 보인다.
function Landing({ setView, views }) {
  return <>{LANDING_SECTIONS.map((S, i) => <S key={i} setView={setView} views={views || []} />)}</>;
}

Object.assign(window, { Landing });
